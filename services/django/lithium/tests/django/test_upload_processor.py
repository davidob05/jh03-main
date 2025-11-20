from datetime import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from timetabling_system.models import Exam, Provisions, Student, StudentExam, UploadLog
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

        result["rows"][0]["exam_name"] = "Updated Algorithms"
        summary = ingest_upload_result(result, file_name="exam.xlsx", uploaded_by=self.user)
        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["updated"], 1)
        exam.refresh_from_db()
        self.assertEqual(exam.exam_name, "Updated Algorithms")
        self.assertEqual(UploadLog.objects.count(), 2)

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
        result = {"status": "ok", "type": "Venue", "days": []}
        summary = ingest_upload_result(result, file_name="venue.xlsx", uploaded_by=self.user)
        self.assertFalse(summary["handled"])
        self.assertIn("message", summary)
        self.assertEqual(UploadLog.objects.count(), 0)
