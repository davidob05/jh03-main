from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from timetabling_system.models import Notification


class NotificationViewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="secret",
            is_staff=True,
            is_superuser=True,
        )
        self.non_admin = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="secret",
        )
        self.client = APIClient()

    def test_requires_admin(self):
        self.client.force_authenticate(self.non_admin)

        response = self.client.get(reverse("api-notifications"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_recent_notifications_sorted_desc(self):
        cutoff = timezone.now() - timedelta(days=7, hours=1)
        Notification.objects.create(
            type="availability",
            message="Old",
            timestamp=cutoff - timedelta(hours=1),
        )
        n1 = Notification.objects.create(
            type="examChange",
            message="Recent",
            timestamp=timezone.now() - timedelta(days=2),
        )
        n2 = Notification.objects.create(
            type="venueChange",
            message="Newest",
            timestamp=timezone.now(),
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse("api-notifications"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        messages = [item["message"] for item in response.data]
        self.assertEqual(messages, ["Newest", "Recent"])
        self.assertNotIn("Old", messages)
        # Ensure ordering matches timestamp desc
        self.assertEqual(response.data[0]["id"], n2.id)
        self.assertEqual(response.data[1]["id"], n1.id)
