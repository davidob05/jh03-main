from datetime import date
from unittest import mock

from django.test import TestCase
from rest_framework.exceptions import ValidationError as DRFValidationError

from timetabling_system.api import views as api_views
from timetabling_system.api.serializers import (
    ExamVenueSerializer,
    ExamVenueWriteSerializer,
    InvigilatorSerializer,
)
from timetabling_system.models import (
    Exam,
    ExamVenue,
    Invigilator,
    InvigilatorAvailability,
    InvigilatorQualificationChoices,
    Venue,
    VenueType,
)


class ExamVenueSerializerTests(TestCase):
    def setUp(self):
        self.exam = Exam.objects.create(
            exam_name="Algorithms",
            course_code="CS101",
            exam_type="Written",
            no_students=100,
            exam_school="Engineering",
            school_contact="Dr. Smith",
        )

    def test_invalid_venue_name_rejected(self):
        serializer = ExamVenueWriteSerializer(
            data={
                "exam": self.exam.pk,
                "venue_name": "Missing Room",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(DRFValidationError):
            serializer.save()

    def test_missing_exam_raises_validation_error(self):
        serializer = ExamVenueWriteSerializer(data={"venue_name": ""})
        self.assertFalse(serializer.is_valid())

    def test_core_examvenue_cannot_be_updated(self):
        venue = Venue.objects.create(
            venue_name="Hall A",
            capacity=100,
            venuetype=VenueType.MAIN_HALL,
            is_accessible=True,
        )
        ev = ExamVenue.objects.create(
            exam=self.exam,
            venue=venue,
            start_time=None,
            exam_length=None,
            core=True,
        )
        serializer = ExamVenueWriteSerializer(
            instance=ev,
            data={"exam": self.exam.pk},
            partial=True,
        )
        with self.assertRaises(DRFValidationError):
            serializer.is_valid(raise_exception=True)

    def test_to_representation_reuses_read_serializer(self):
        venue = Venue.objects.create(
            venue_name="Hall B",
            capacity=50,
            venuetype=VenueType.MAIN_HALL,
            is_accessible=True,
        )
        ev = ExamVenue.objects.create(
            exam=self.exam,
            venue=venue,
            start_time=None,
            exam_length=90,
            core=False,
        )
        serializer = ExamVenueWriteSerializer()
        data = serializer.to_representation(ev)
        self.assertEqual(data["venue_name"], "Hall B")
        self.assertEqual(data["exam_length"], 90)


class InvigilatorSerializerTests(TestCase):
    def setUp(self):
        self.diet_range_patch = mock.patch(
            "timetabling_system.api.serializers.DIET_DATE_RANGES",
            {"DEC_2025": (date(2025, 1, 1), date(2025, 1, 1))},
        )
        self.diet_range_patch.start()
        self.addCleanup(self.diet_range_patch.stop)

    def test_create_invigilator_generates_availability(self):
        serializer = InvigilatorSerializer(
            data={
                "preferred_name": "Pat",
                "full_name": "Pat Invigilator",
                "qualifications": [{"qualification": InvigilatorQualificationChoices.CHECK_IN}],
                "restrictions": [
                    {"diet": "DEC_2025", "restrictions": [], "notes": "note"},
                ],
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        invig = serializer.save()
        self.assertEqual(invig.qualifications.count(), 1)
        # Single day diet range -> 3 slots
        self.assertEqual(InvigilatorAvailability.objects.filter(invigilator=invig).count(), 3)

    def test_update_replaces_qualifications_and_restrictions(self):
        invig = Invigilator.objects.create(preferred_name="Sam", full_name="Sam Invig")
        serializer = InvigilatorSerializer(
            instance=invig,
            data={
                "preferred_name": "Sam",
                "full_name": "Sam Invig",
                "qualifications": [{"qualification": InvigilatorQualificationChoices.AKT_TRAINED}],
                "restrictions": [{"diet": "DEC_2025", "restrictions": ["accessibility_required"], "notes": ""}],
            },
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        invig.refresh_from_db()
        self.assertEqual(invig.qualifications.count(), 1)
        self.assertEqual(invig.restrictions.count(), 1)
        self.assertEqual(InvigilatorAvailability.objects.filter(invigilator=invig).count(), 3)


class ApiViewHelpersTests(TestCase):
    def test_log_notification_swallows_exceptions(self):
        with mock.patch("timetabling_system.api.views.Notification.objects.create", side_effect=Exception("boom")):
            # Should not raise
            api_views.log_notification("test", "msg")

    def test_viewset_serializer_selection(self):
        venue_view = api_views.VenueViewSet()
        venue_view.action = "create"
        self.assertIs(api_views.VenueWriteSerializer, venue_view.get_serializer_class())

        examvenue_view = api_views.ExamVenueViewSet()
        examvenue_view.action = "partial_update"
        self.assertIs(api_views.ExamVenueWriteSerializer, examvenue_view.get_serializer_class())

    def test_log_notification_handles_exception(self):
        with mock.patch("timetabling_system.api.views.Notification.objects.create", side_effect=Exception("boom")):
            api_views.log_notification("test", "msg")
