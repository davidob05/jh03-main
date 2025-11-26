from datetime import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from timetabling_system.models import (
    Exam,
    ExamVenue,
    ExamVenueProvisionType,
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

    def test_provision_values_map_to_enum_slugs(self):
        exam = Exam.objects.create(
            exam_name="Discrete Maths",
            exam_length=120,
            start_time=timezone.make_aware(datetime(2025, 7, 2, 9, 0)),
            course_code="MATH101",
            exam_type="Written",
            no_students=0,
            exam_school="Mathematics",
            date_exam=timezone.now().date(),
            school_contact="",
        )

        result = {
            "status": "ok",
            "type": "Provisions",
            "rows": [
                {
                    "student_id": "S54321",
                    "student_name": "Bob Example",
                    "exam_code": exam.course_code,
                    "provisions": (
                        "Extra time 15 minutes every hour; "
                        "Assisted evacuation required; "
                        "Use of a computer"
                    ),
                }
            ],
        }

        summary = ingest_upload_result(result, file_name="prov.xlsx", uploaded_by=self.user)
        self.assertTrue(summary["handled"])
        self.assertEqual(summary["created"], 1)
        provision = Provisions.objects.get(student__student_id="S54321", exam=exam)
        self.assertEqual(
            provision.provisions,
            [
                "extra_time_15_per_hour",
                "assisted_evacuation_required",
                "use_computer",
            ],
        )
        self.assertTrue(StudentExam.objects.filter(student__student_id="S54321", exam=exam).exists())

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
                    "date": "2025-07-28",
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
        self.assertIn("2025-07-28", main_hall.availability)
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

    def test_venue_availability_merges_across_days(self):
        result = {
            "status": "ok",
            "type": "Venue",
            "days": [
                {
                    "day": "Monday",
                    "date": "2025-07-28",
                    "rooms": [{"name": "Room A"}],
                },
                {
                    "day": "Tuesday",
                    "date": "2025-07-29",
                    "rooms": [{"name": "Room A"}],
                },
            ],
        }

        ingest_upload_result(result, file_name="venues.xlsx", uploaded_by=self.user)
        room = Venue.objects.get(pk="Room A")
        self.assertEqual(sorted(room.availability), ["2025-07-28", "2025-07-29"])

        # Reupload with different capacity should update and retain availability
        result["days"][0]["rooms"][0]["capacity"] = 20
        ingest_upload_result(result, file_name="venues.xlsx", uploaded_by=self.user)
        room.refresh_from_db()
        self.assertEqual(sorted(room.availability), ["2025-07-28", "2025-07-29"])
        self.assertEqual(room.capacity, 20)

    def test_provision_values_map_to_enum_slugs(self):
        exam = Exam.objects.create(
            exam_name="Discrete Maths",
            exam_length=120,
            start_time=timezone.make_aware(datetime(2025, 7, 2, 9, 0)),
            course_code="MATH101",
            exam_type="Written",
            no_students=0,
            exam_school="Mathematics",
            date_exam=timezone.now().date(),
            school_contact="",
        )

        result = {
            "status": "ok",
            "type": "Provisions",
            "rows": [
                {
                    "student_id": "S54321",
                    "student_name": "Bob Example",
                    "exam_code": exam.course_code,
                    "provisions": (
                        "Extra time 15 minutes every hour; "
                        "Assisted evacuation required; "
                        "Use of a computer"
                    ),
                }
            ],
        }

        summary = ingest_upload_result(result, file_name="prov.xlsx", uploaded_by=self.user)
        self.assertTrue(summary["handled"])
        self.assertEqual(summary["created"], 1)
        provision = Provisions.objects.get(student__student_id="S54321", exam=exam)
        self.assertEqual(
            provision.provisions,
            [
                "extra_time_15_per_hour",
                "assisted_evacuation_required",
                "use_computer",
            ],
        )
        self.assertTrue(StudentExam.objects.filter(student__student_id="S54321", exam=exam).exists())

    def test_provisions_assign_existing_or_new_exam_venue(self):
        exam_date = datetime(2025, 7, 10).date()
        exam = Exam.objects.create(
            exam_name="Networks",
            exam_length=120,
            start_time=timezone.make_aware(datetime(2025, 7, 10, 9, 0)),
            course_code="NET101",
            exam_type="Written",
            no_students=0,
            exam_school="Engineering",
            date_exam=exam_date,
            school_contact="",
        )

        separate_room = Venue.objects.create(
            venue_name="Quiet Room 1",
            capacity=10,
            venuetype=VenueType.SEPARATE_ROOM,
            is_accessible=True,
            qualifications=[],
            availability=[exam_date.isoformat()],
            provision_capabilities=[ExamVenueProvisionType.SEPARATE_ROOM_ON_OWN],
        )
        existing_ev = ExamVenue.objects.create(
            exam=exam,
            venue=separate_room,
            provision_capabilities=[ExamVenueProvisionType.SEPARATE_ROOM_ON_OWN],
        )

        computer_lab = Venue.objects.create(
            venue_name="Computer Lab 1",
            capacity=25,
            venuetype=VenueType.COMPUTER_CLUSTER,
            is_accessible=True,
            qualifications=[],
            availability=[exam_date.isoformat()],
            provision_capabilities=[ExamVenueProvisionType.USE_COMPUTER],
        )

        # First upload should use existing separate room exam venue
        result = {
            "status": "ok",
            "type": "Provisions",
            "rows": [
                {
                    "student_id": "S70001",
                    "student_name": "Separate Room Student",
                    "exam_code": exam.course_code,
                    "provisions": "Separate room on own",
                }
            ],
        }
        ingest_upload_result(result, file_name="prov.xlsx", uploaded_by=self.user)
        se_student_exam = StudentExam.objects.get(student__student_id="S70001", exam=exam)
        self.assertEqual(se_student_exam.exam_venue_id, existing_ev.pk)

        # Second upload needs computer lab; should create new ExamVenue with that venue
        result["rows"][0] = {
            "student_id": "S70002",
            "student_name": "Computer Student",
            "exam_code": exam.course_code,
            "provisions": "Use of a computer",
        }
        ingest_upload_result(result, file_name="prov.xlsx", uploaded_by=self.user)
        comp_student_exam = StudentExam.objects.get(student__student_id="S70002", exam=exam)
        self.assertIsNotNone(comp_student_exam.exam_venue)
        self.assertEqual(comp_student_exam.exam_venue.venue, computer_lab)
        self.assertEqual(
            comp_student_exam.exam_venue.venue.provision_capabilities,
            [ExamVenueProvisionType.USE_COMPUTER],
        )

    def test_provisions_skip_exam_venue_if_venue_lacks_capability(self):
        exam_date = datetime(2025, 8, 1).date()
        exam = Exam.objects.create(
            exam_name="Data Science",
            exam_length=120,
            start_time=timezone.make_aware(datetime(2025, 8, 1, 9, 0)),
            course_code="DS101",
            exam_type="Written",
            no_students=0,
            exam_school="Computing",
            date_exam=exam_date,
            school_contact="",
        )

        venue_without_caps = Venue.objects.create(
            venue_name="Big Hall",
            capacity=200,
            venuetype=VenueType.MAIN_HALL,
            is_accessible=True,
            availability=[exam_date.isoformat()],
            provision_capabilities=[],
        )
        ExamVenue.objects.create(exam=exam, venue=venue_without_caps, provision_capabilities=[])

        computer_room = Venue.objects.create(
            venue_name="Comp Lab 2",
            capacity=30,
            venuetype=VenueType.COMPUTER_CLUSTER,
            is_accessible=True,
            availability=[exam_date.isoformat()],
            provision_capabilities=[ExamVenueProvisionType.USE_COMPUTER],
        )

        result = {
            "status": "ok",
            "type": "Provisions",
            "rows": [
                {
                    "student_id": "S80001",
                    "student_name": "Comp Student",
                    "exam_code": exam.course_code,
                    "provisions": "Use of a computer",
                }
            ],
        }

        ingest_upload_result(result, file_name="prov.xlsx", uploaded_by=self.user)
        student_exam = StudentExam.objects.get(student__student_id="S80001", exam=exam)
        self.assertIsNotNone(student_exam.exam_venue)
        self.assertEqual(student_exam.exam_venue.venue, computer_room)
