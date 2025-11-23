from datetime import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from timetabling_system.models import (
    Exam,
    ExamVenue,
    Provisions,
    Student,
    StudentExam,
    UploadLog,
    Venue,
    VenueType,
)
from timetabling_system.services import ingest_upload_result


class UploadProcessorTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="tester",
            email="tester@example.com",
            password="secret",
        )

    def test_exam_rows_create_and_update_records(self):
        result = {
            "status": "ok",
            "type": "Exam",
            "rows": [
                {
                    "exam_code": "ABC123",
                    "exam_name": "Algorithms 101",
                    "exam_date": "2025-07-01",
                    "exam_start": "09:00",
                    "exam_end": "11:00",
                    "exam_length": "2:00",
                    "exam_type": "Written",
                    "no_students": "150",
                    "school": "Engineering",
                    "school_contact": "Dr. Smith",
                    "main_venue": "Main Hall",
                }
            ],
        }

        summary = ingest_upload_result(result, file_name="exam.xlsx", uploaded_by=self.user)
        self.assertTrue(summary["handled"])
        self.assertEqual(summary["created"], 1)
        self.assertEqual(summary["updated"], 0)
        exam = Exam.objects.get(course_code="ABC123")
        self.assertEqual(exam.exam_name, "Algorithms 101"[:30])
        self.assertEqual(exam.exam_length, 120)
        self.assertEqual(exam.no_students, 150)
        self.assertEqual(UploadLog.objects.count(), 1)
        # Venue + ExamVenue created
        self.assertTrue(Venue.objects.filter(venue_name="Main Hall").exists())
        self.assertTrue(ExamVenue.objects.filter(exam=exam, venue__venue_name="Main Hall").exists())

        result["rows"][0]["exam_name"] = "Updated Algorithms"
        result["rows"][0]["main_venue"] = "Main Hall; Overflow Room"
        summary = ingest_upload_result(result, file_name="exam.xlsx", uploaded_by=self.user)
        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["updated"], 1)
        exam.refresh_from_db()
        self.assertEqual(exam.exam_name, "Updated Algorithms")
        self.assertEqual(UploadLog.objects.count(), 2)
        # New ExamVenue for new venue name
        self.assertTrue(Venue.objects.filter(venue_name="Overflow Room").exists())
        self.assertTrue(ExamVenue.objects.filter(exam=exam, venue__venue_name="Overflow Room").exists())

    def test_provision_rows_create_students_and_links(self):
        exam = Exam.objects.create(
            exam_name="Algorithms",
            exam_length=120,
            start_time=timezone.make_aware(datetime(2025, 7, 1, 9, 0)),
            course_code="ABC123",
            exam_type="Written",
            no_students=0,
            exam_school="Engineering",
            date_exam=timezone.now().date(),
            school_contact="",
        )

        result = {
            "status": "ok",
            "type": "Provisions",
            "rows": [
                {
                    "student_id": "S12345",
                    "student_name": "Alice Example",
                    "exam_code": exam.course_code,
                    "provisions": "extra time; reader",
                    "additional_info": "Seat at the front",
                }
            ],
        }

        summary = ingest_upload_result(result, file_name="prov.xlsx", uploaded_by=self.user)
        self.assertTrue(summary["handled"])
        self.assertEqual(summary["created"], 1)
        student = Student.objects.get(student_id="S12345")
        provision = Provisions.objects.get(student=student, exam=exam)
        self.assertEqual(provision.provisions, ["extra_time", "reader"])
        self.assertTrue(StudentExam.objects.filter(student=student, exam=exam).exists())
        self.assertEqual(UploadLog.objects.count(), 1)

    def test_unsupported_file_type_returns_summary(self):
        result = {"status": "ok", "type": "Unknown", "days": []}
        summary = ingest_upload_result(result, file_name="venue.xlsx", uploaded_by=self.user)
        self.assertFalse(summary["handled"])
        self.assertIn("message", summary)
        self.assertEqual(UploadLog.objects.count(), 0)

    def test_venue_days_create_and_update_records(self):
        result = {
            "status": "ok",
            "type": "Venue",
            "days": [
                {
                    "day": "Monday",
                    "date": "2025/07/28",
                    "rooms": [
                        {
                            "name": "Main Hall",
                            "capacity": 200,
                            "venuetype": VenueType.MAIN_HALL,
                            "accessible": False,
                            "qualifications": ["exam"],
                        },
                        {
                            "name": "Purple Lab",
                            "capacity": "50",
                            "venuetype": VenueType.PURPLE_CLUSTER,
                        },
                    ],
                }
            ],
        }

        summary = ingest_upload_result(result, file_name="venues.xlsx", uploaded_by=self.user)
        self.assertTrue(summary["handled"])
        self.assertEqual(summary["created"], 2)
        self.assertEqual(summary["updated"], 0)

        main_hall = Venue.objects.get(pk="Main Hall")
        self.assertEqual(main_hall.capacity, 200)
        self.assertEqual(main_hall.venuetype, VenueType.MAIN_HALL)
        self.assertFalse(main_hall.is_accessible)
        self.assertEqual(main_hall.qualifications, ["exam"])

        purple_lab = Venue.objects.get(pk="Purple Lab")
        self.assertEqual(purple_lab.capacity, 50)
        self.assertEqual(purple_lab.venuetype, VenueType.PURPLE_CLUSTER)
        self.assertTrue(purple_lab.is_accessible)
        self.assertEqual(UploadLog.objects.count(), 1)

        # Update capacities and accessibility to ensure updates are counted
        result["days"][0]["rooms"][0]["capacity"] = 180
        result["days"][0]["rooms"][0]["accessible"] = True
        result["days"][0]["rooms"][1]["capacity"] = 60

        summary = ingest_upload_result(result, file_name="venues.xlsx", uploaded_by=self.user)
        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["updated"], 2)
        main_hall.refresh_from_db()
        purple_lab.refresh_from_db()
        self.assertEqual(main_hall.capacity, 180)
        self.assertTrue(main_hall.is_accessible)
        self.assertEqual(purple_lab.capacity, 60)
        self.assertEqual(UploadLog.objects.count(), 2)
