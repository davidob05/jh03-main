from datetime import date, timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone
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
    InvigilatorAssignment,
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

    def test_create_allows_placeholder_when_venue_blank(self):
        serializer = ExamVenueWriteSerializer(
            data={
                "exam": self.exam.pk,
                "venue_name": "",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        ev = serializer.save()
        self.assertIsNone(ev.venue)

    def test_update_changes_venue_via_name(self):
        first = Venue.objects.create(
            venue_name="Hall C",
            capacity=40,
            venuetype=VenueType.MAIN_HALL,
            is_accessible=True,
        )
        second = Venue.objects.create(
            venue_name="Hall D",
            capacity=30,
            venuetype=VenueType.MAIN_HALL,
            is_accessible=True,
        )
        ev = ExamVenue.objects.create(
            exam=self.exam,
            venue=first,
            start_time=None,
            exam_length=75,
            core=False,
        )
        serializer = ExamVenueWriteSerializer(
            instance=ev,
            data={"exam": self.exam.pk, "venue_name": second.venue_name},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        self.assertEqual(updated.venue, second)


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

    def test_generate_availability_skips_unknown_diet_ranges(self):
        with mock.patch("timetabling_system.api.serializers.DIET_DATE_RANGES", {}):
            serializer = InvigilatorSerializer(
                data={
                    "preferred_name": "Lee",
                    "full_name": "Lee Invigilator",
                    "restrictions": [
                        {"diet": "DEC_2025", "restrictions": [], "notes": ""},
                    ],
                }
            )
            self.assertTrue(serializer.is_valid(), serializer.errors)
            invig = serializer.save()
            self.assertEqual(InvigilatorAvailability.objects.filter(invigilator=invig).count(), 0)


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


class ApiViewActionTests(TestCase):
    def setUp(self):
        self.exam = Exam.objects.create(
            exam_name="Physics",
            course_code="PHYS100",
            exam_type="Written",
            no_students=50,
            exam_school="Science",
            school_contact="Dr. Z",
        )
        self.venue = Venue.objects.create(
            venue_name="Main Hall",
            capacity=150,
            venuetype=VenueType.MAIN_HALL,
            is_accessible=True,
        )
        self.alt_venue = Venue.objects.create(
            venue_name="Side Hall",
            capacity=40,
            venuetype=VenueType.MAIN_HALL,
            is_accessible=True,
        )
        self.examvenue = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.venue,
            start_time=timezone.now(),
            exam_length=90,
            core=False,
        )
        self.invigilator = Invigilator.objects.create(preferred_name="Casey", full_name="Casey Invigilator")
        self.assignment = InvigilatorAssignment.objects.create(
            invigilator=self.invigilator,
            exam_venue=self.examvenue,
            role="lead",
            assigned_start=timezone.now(),
            assigned_end=timezone.now() + timedelta(hours=2),
        )

    def test_exam_and_venue_viewsets_log_notifications(self):
        exam_view = api_views.ExamViewSet()
        venue_view = api_views.VenueViewSet()
        venue_view.action = None
        self.assertIs(api_views.VenueSerializer, venue_view.get_serializer_class())

        exam_serializer = mock.Mock()
        exam_serializer.save.return_value = self.exam
        venue_serializer = mock.Mock()
        venue_serializer.save.return_value = self.venue

        with mock.patch("timetabling_system.api.views.log_notification") as log:
            exam_view.perform_update(exam_serializer)
            venue_view.perform_create(venue_serializer)
            venue_view.perform_update(venue_serializer)
            temp_venue = Venue.objects.create(
                venue_name="Temp Hall",
                capacity=10,
                venuetype=VenueType.MAIN_HALL,
                is_accessible=True,
            )
            venue_view.perform_destroy(temp_venue)
        self.assertGreaterEqual(log.call_count, 4)

    def test_examvenue_viewset_branches(self):
        view = api_views.ExamVenueViewSet()
        view.action = "list"
        self.assertIs(api_views.ExamVenueSerializer, view.get_serializer_class())

        serializer = mock.Mock()
        serializer.save.return_value = self.examvenue

        with mock.patch("timetabling_system.api.views.log_notification") as log:
            view.perform_update(serializer)
            view.perform_create(serializer)
        self.assertGreaterEqual(log.call_count, 2)

        to_delete = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.alt_venue,
            start_time=timezone.now(),
            exam_length=60,
            core=False,
        )
        with mock.patch("timetabling_system.api.views.log_notification") as log_destroy:
            view.perform_destroy(to_delete)
        self.assertEqual(log_destroy.call_count, 1)

    def test_invigilator_and_assignment_views_log(self):
        inv_view = api_views.InvigilatorViewSet()
        inv_serializer = mock.Mock()
        inv_serializer.save.return_value = self.invigilator
        with mock.patch("timetabling_system.api.views.log_notification") as log:
            inv_view.perform_update(inv_serializer)
        self.assertEqual(log.call_count, 1)

        assign_view = api_views.InvigilatorAssignmentViewSet()
        assign_serializer = mock.Mock()
        assign_serializer.save.return_value = self.assignment
        with mock.patch("timetabling_system.api.views.log_notification") as log_assign:
            assign_view.perform_create(assign_serializer)
            assign_view.perform_destroy(self.assignment)
        self.assertEqual(log_assign.call_count, 2)
