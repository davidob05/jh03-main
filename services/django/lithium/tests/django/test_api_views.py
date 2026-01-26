import csv
import zipfile
from io import BytesIO
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch

from timetabling_system.models import (
    Exam,
    Venue,
    ExamVenue,
    Student,
    StudentExam,
    Provisions,
    Invigilator,
    InvigilatorAssignment,
    VenueType,
    ProvisionType,
)


class TimetableUploadViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="uploader",
            email="uploader@example.com",
            password="secret",
        )
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save(update_fields=["is_staff", "is_superuser"])
        self.client.force_authenticate(self.user)
        self.url = reverse("api-exam-upload")

    def test_missing_file_returns_400(self):
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "No file uploaded.")

    @patch("timetabling_system.api.views.ingest_upload_result")
    @patch("timetabling_system.api.views.parse_excel_file")
    def test_parser_exception_returns_400(self, mock_parse, mock_ingest):
        mock_parse.side_effect = Exception("boom")
        upload = SimpleUploadedFile("exam.xlsx", b"content", content_type="application/vnd.ms-excel")

        response = self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "Failed to parse uploaded file.")
        mock_parse.assert_called_once()
        mock_ingest.assert_not_called()

    @patch("timetabling_system.api.views.ingest_upload_result")
    @patch("timetabling_system.api.views.parse_excel_file")
    def test_parser_error_result_returns_400(self, mock_parse, mock_ingest):
        mock_parse.return_value = {"status": "error", "message": "Missing required columns"}
        upload = SimpleUploadedFile("exam.xlsx", b"content", content_type="application/vnd.ms-excel")

        response = self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Missing required columns")
        mock_parse.assert_called_once()
        mock_ingest.assert_not_called()

    @patch("timetabling_system.api.views.ingest_upload_result")
    @patch("timetabling_system.api.views.parse_excel_file")
    def test_successful_upload_calls_ingest_and_returns_result(self, mock_parse, mock_ingest):
        mock_parse.return_value = {"status": "ok", "type": "Exam", "rows": []}
        mock_ingest.return_value = {"handled": True, "created": 1, "updated": 0}
        upload = SimpleUploadedFile("exam.xlsx", b"content", content_type="application/vnd.ms-excel")

        response = self.client.post(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_parse.assert_called_once()
        # Call args may reflect mutation after ingest due to shared dict; check fields explicitly.
        ingest_args, ingest_kwargs = mock_ingest.call_args
        self.assertEqual(ingest_kwargs["file_name"], "exam.xlsx")
        self.assertEqual(ingest_kwargs["uploaded_by"], self.user)
        self.assertEqual(ingest_args[0]["status"], "ok")
        self.assertEqual(ingest_args[0]["type"], "Exam")
        self.assertIn("rows", ingest_args[0])
        self.assertEqual(response.data["status"], "ok")
        self.assertIn("ingest", response.data)


class ProvisionExportViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="admin",
            email="admin@example.com",
            password="secret",
        )
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save(update_fields=["is_staff", "is_superuser"])
        self.client.force_authenticate(self.user)
        self.url = reverse("api-provisions-export")

        self.exam = Exam.objects.create(
            exam_name="Physics",
            course_code="PHY101",
            exam_school="Science",
            exam_type="on_campus",
            no_students=120,
        )
        self.venue = Venue.objects.create(
            venue_name="Hall A",
            capacity=200,
            venuetype=VenueType.MAIN_HALL,
        )
        self.start_time = timezone.now()
        self.exam_venue = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.venue,
            start_time=self.start_time,
            exam_length=120,
            core=True,
        )
        self.student = Student.objects.create(student_id="S1", student_name="Ada Lovelace")
        StudentExam.objects.create(student=self.student, exam=self.exam, exam_venue=self.exam_venue)
        Provisions.objects.create(
            exam=self.exam,
            student=self.student,
            provisions=[ProvisionType.EXTRA_TIME_15_PER_HOUR],
            notes="Extra time 15 per hour",
        )

        self.other_exam = Exam.objects.create(
            exam_name="Chemistry",
            course_code="CHEM1",
            exam_school="Engineering",
            exam_type="on_campus",
            no_students=90,
        )
        self.other_venue = Venue.objects.create(
            venue_name="Hall B",
            capacity=180,
            venuetype=VenueType.MAIN_HALL,
        )
        self.other_exam_venue = ExamVenue.objects.create(
            exam=self.other_exam,
            venue=self.other_venue,
            start_time=self.start_time + timedelta(days=1),
            exam_length=90,
            core=True,
        )
        other_student = Student.objects.create(student_id="S2", student_name="Grace Hopper")
        StudentExam.objects.create(student=other_student, exam=self.other_exam, exam_venue=self.other_exam_venue)
        Provisions.objects.create(
            exam=self.other_exam,
            student=other_student,
            provisions=[ProvisionType.SEPARATE_ROOM_NOT_ON_OWN],
            notes="Separate room not on own",
        )

    def _parse_csv(self, content: bytes):
        rows = list(csv.reader(content.decode().splitlines()))
        return rows[0], rows[1:]

    def test_export_returns_csv_with_expected_fields(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        header, rows = self._parse_csv(response.content)
        self.assertIn("Exam Name", header)
        self.assertIn("Provisions", header)
        self.assertIn("Additional Info", header)
        self.assertEqual(len(rows), 2)
        self.assertIn("Physics", rows[0])
        self.assertIn("Extra time 15 per hour", rows[0])

    def test_export_filters_by_school(self):
        response = self.client.get(f"{self.url}?school=Science")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        _, rows = self._parse_csv(response.content)
        self.assertEqual(len(rows), 1)
        self.assertIn("Physics", rows[0])


class InvigilatorTimetableExportViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="admin",
            email="admin@example.com",
            password="secret",
        )
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save(update_fields=["is_staff", "is_superuser"])
        self.client.force_authenticate(self.user)
        self.url = reverse("api-invigilator-timetable-export")

        self.invigilator_user = get_user_model().objects.create_user(
            username="alice",
            email="alice@example.com",
            password="secret",
        )
        self.invigilator = Invigilator.objects.create(
            user=self.invigilator_user,
            preferred_name="Alice",
            full_name="Alice Example",
        )
        self.invigilator_user_2 = get_user_model().objects.create_user(
            username="bob",
            email="bob@example.com",
            password="secret",
        )
        self.invigilator_2 = Invigilator.objects.create(
            user=self.invigilator_user_2,
            preferred_name="Bob",
            full_name="Bob Example",
        )

        self.exam = Exam.objects.create(
            exam_name="Maths",
            course_code="MTH101",
            exam_school="Science",
            exam_type="on_campus",
            no_students=60,
        )
        self.venue = Venue.objects.create(
            venue_name="Room 1",
            capacity=80,
            venuetype=VenueType.MAIN_HALL,
        )
        base_time = timezone.now()
        self.exam_venue_confirmed = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.venue,
            start_time=base_time,
            exam_length=90,
            core=True,
        )
        self.exam_venue_pending = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.venue,
            start_time=base_time + timedelta(hours=3),
            exam_length=90,
            core=True,
        )
        self.exam_venue_requested = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.venue,
            start_time=base_time + timedelta(hours=6),
            exam_length=90,
            core=True,
        )
        self.exam_venue_cancelled = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.venue,
            start_time=base_time + timedelta(hours=9),
            exam_length=90,
            core=True,
        )
        self.exam_venue_other = ExamVenue.objects.create(
            exam=self.exam,
            venue=self.venue,
            start_time=base_time + timedelta(hours=12),
            exam_length=90,
            core=True,
        )

        InvigilatorAssignment.objects.create(
            invigilator=self.invigilator,
            exam_venue=self.exam_venue_confirmed,
            assigned_start=base_time - timedelta(minutes=15),
            assigned_end=base_time + timedelta(hours=2),
            confirmed=True,
            cancel=False,
        )
        InvigilatorAssignment.objects.create(
            invigilator=self.invigilator,
            exam_venue=self.exam_venue_pending,
            assigned_start=base_time + timedelta(hours=3),
            assigned_end=base_time + timedelta(hours=5),
            confirmed=False,
            cancel=False,
        )
        InvigilatorAssignment.objects.create(
            invigilator=self.invigilator,
            exam_venue=self.exam_venue_requested,
            assigned_start=base_time + timedelta(hours=6),
            assigned_end=base_time + timedelta(hours=8),
            confirmed=False,
            cancel=True,
        )
        InvigilatorAssignment.objects.create(
            invigilator=self.invigilator,
            exam_venue=self.exam_venue_cancelled,
            assigned_start=base_time + timedelta(hours=9),
            assigned_end=base_time + timedelta(hours=11),
            confirmed=True,
            cancel=True,
        )
        InvigilatorAssignment.objects.create(
            invigilator=self.invigilator_2,
            exam_venue=self.exam_venue_other,
            assigned_start=base_time + timedelta(hours=12),
            assigned_end=base_time + timedelta(hours=14),
            confirmed=True,
            cancel=False,
        )

        student = Student.objects.create(student_id="S10", student_name="Jamie")
        StudentExam.objects.create(
            student=student,
            exam=self.exam,
            exam_venue=self.exam_venue_confirmed,
        )
        Provisions.objects.create(
            exam=self.exam,
            student=student,
            provisions=[ProvisionType.EXTRA_TIME_15_PER_HOUR],
            notes="Needs extra time",
        )

    def _parse_csv(self, content: bytes):
        rows = list(csv.reader(content.decode().splitlines()))
        return rows[0], rows[1:]

    def test_missing_ids_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_confirmed_filters_rows(self):
        response = self.client.post(
            self.url,
            {"invigilator_ids": [self.invigilator.id], "only_confirmed": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        _, rows = self._parse_csv(response.content)
        self.assertEqual(len(rows), 1)
        self.assertIn("confirmed", rows[0])

    def test_include_cancelled_adds_cancelled_rows(self):
        response = self.client.post(
            self.url,
            {"invigilator_ids": [self.invigilator.id], "only_confirmed": True, "include_cancelled": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        _, rows = self._parse_csv(response.content)
        statuses = {row[4] for row in rows}
        self.assertEqual(len(rows), 2)
        self.assertIn("confirmed", statuses)
        self.assertIn("cancelled", statuses)

    def test_include_provisions_toggle(self):
        response = self.client.post(
            self.url,
            {"invigilator_ids": [self.invigilator.id], "include_provisions": False},
            format="json",
        )
        header, _ = self._parse_csv(response.content)
        self.assertNotIn("student_provisions", header)
        self.assertNotIn("provision_notes", header)

        response = self.client.post(
            self.url,
            {"invigilator_ids": [self.invigilator.id], "include_provisions": True},
            format="json",
        )
        header, rows = self._parse_csv(response.content)
        self.assertIn("student_provisions", header)
        self.assertIn("provision_notes", header)
        self.assertTrue(any("extra_time_15_per_hour" in row for row in rows))
        self.assertTrue(any("Needs extra time" in row for row in rows))

    def test_multi_invigilator_export_returns_zip(self):
        response = self.client.post(
            self.url,
            {"invigilator_ids": [self.invigilator.id, self.invigilator_2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/zip")
        zip_file = zipfile.ZipFile(BytesIO(response.content))
        combined_name = "invigilators_timetables.csv"
        alice_name = f"{slugify('alice')}_timetable.csv"
        bob_name = f"{slugify('bob')}_timetable.csv"
        self.assertIn(combined_name, zip_file.namelist())
        self.assertIn(alice_name, zip_file.namelist())
        self.assertIn(bob_name, zip_file.namelist())

        combined_rows = zip_file.read(combined_name).decode().splitlines()
        self.assertTrue(any(str(self.invigilator.id) in row for row in combined_rows))
        self.assertTrue(any(str(self.invigilator_2.id) in row for row in combined_rows))
