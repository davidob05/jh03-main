from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch


class TimetableUploadViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="uploader",
            email="uploader@example.com",
            password="secret",
        )
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
        mock_ingest.assert_called_once_with(
            {"status": "ok", "type": "Exam", "rows": []},
            file_name="exam.xlsx",
            uploaded_by=self.user,
        )
        self.assertEqual(response.data["status"], "ok")
        self.assertIn("ingest", response.data)
