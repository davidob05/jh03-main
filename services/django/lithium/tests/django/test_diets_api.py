from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from timetabling_system.models import Diet, Invigilator


class DietApiTests(TestCase):
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
            is_staff=False,
            is_superuser=False,
        )
        self.client = APIClient()
        self.list_url = reverse("diet-list")

    def test_admin_can_crud_diets(self):
        self.client.force_authenticate(self.admin)
        payload = {
            "code": "SPRING_2027",
            "name": "Spring 2027",
            "start_date": "2027-03-01",
            "end_date": "2027-03-10",
            "restriction_cutoff": "2027-02-01",
            "is_active": True,
        }
        res = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["code"], "SPRING_2027")
        self.assertEqual(res.data["restriction_cutoff"], "2027-02-01")

        diet_id = res.data["id"]
        detail_url = reverse("diet-detail", args=[diet_id])
        res_update = self.client.put(
            detail_url,
            {
                **payload,
                "name": "Spring 2027 Updated",
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data["name"], "Spring 2027 Updated")
        self.assertFalse(res_update.data["is_active"])

        res_delete = self.client.delete(detail_url)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Diet.objects.filter(pk=diet_id).exists())

    def test_non_admin_cannot_create_diet(self):
        self.client.force_authenticate(self.non_admin)
        res = self.client.post(
            self.list_url,
            {
                "code": "FALL_2027",
                "name": "Fall 2027",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_list_diets(self):
        self.client.force_authenticate(self.non_admin)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unique_code_validation(self):
        self.client.force_authenticate(self.admin)
        Diet.objects.create(code="WINTER_2027", name="Winter 2027")
        res = self.client.post(
            self.list_url,
            {
                "code": "WINTER_2027",
                "name": "Duplicate",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_fields_validation(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.list_url, {"code": ""}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", res.data)

    def test_ordering_active_and_start_date(self):
        self.client.force_authenticate(self.admin)
        Diet.objects.create(code="B", name="Later", start_date=date(2027, 5, 1), end_date=date(2027, 5, 2), is_active=True)
        Diet.objects.create(code="A", name="Earlier", start_date=date(2027, 4, 1), end_date=date(2027, 4, 2), is_active=True)
        Diet.objects.create(code="C", name="Inactive", is_active=False)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [d["code"] for d in res.data]
        # active first (B then A by start_date desc), then inactive
        self.assertEqual(codes[:2], ["B", "A"])


class InvigilatorAvailabilityCutoffTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="invig", password="secret", email="invig@example.com")
        self.invigilator = Invigilator.objects.create(preferred_name="Invig", full_name="Invig User", user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_put_after_cutoff_is_blocked(self):
        today = date.today()
        diet = Diet.objects.create(
            code="SUMMER_2027",
            name="Summer 2027",
            start_date=today + timedelta(days=1),
            end_date=today + timedelta(days=5),
            restriction_cutoff=today,
            is_active=True,
        )

        res = self.client.put(
            reverse("api-invigilator-availability"),
            {
                "diet": diet.code,
                "unavailable": [
                    {"date": str(diet.start_date), "slot": "MORNING"},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Restrictions for", res.data.get("detail", ""))

    def test_put_before_cutoff_allowed(self):
        today = date.today()
        diet = Diet.objects.create(
            code="WINTER_2027",
            name="Winter 2027",
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=3),
            restriction_cutoff=today + timedelta(days=1),
            is_active=True,
        )
        res = self.client.put(
            reverse("api-invigilator-availability"),
            {
                "diet": diet.code,
                "unavailable": [
                    {"date": str(diet.start_date), "slot": "MORNING"},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("status"), "ok")

    def test_get_includes_cutoff(self):
        today = date.today()
        diet = Diet.objects.create(
            code="AUTUMN_2027",
            name="Autumn 2027",
            start_date=today + timedelta(days=1),
            end_date=today + timedelta(days=3),
            restriction_cutoff=today + timedelta(days=1),
            is_active=True,
        )
        res = self.client.get(reverse("api-invigilator-availability"), {"diet": diet.code})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("restriction_cutoff"), str(diet.restriction_cutoff))
        diets_payload = res.data.get("diets") or []
        self.assertTrue(any(d.get("restriction_cutoff") == str(diet.restriction_cutoff) for d in diets_payload))
