from django.test import TestCase
from django.lithium.timetabling_system.models import Exam, Venue, Student
 
class ExamTestCase(TestCase):
    def test_Exam_populated(self):
        # exam_timetable_for_invigilation, row 2
        examCOMPSCI4038_1 = Exam.objects.get(course_code =" COMPSCI4038_1", exam_length = 60)
        self.assertEqual(examCOMPSCI4038_1.exam_name, "Professional Skills&Issues (H)")
        self.assertEqual(examCOMPSCI4038_1.exam_length, 60)
        self.assertEqual(examCOMPSCI4038_1.start_time.hour, 9)
        self.assertEqual(examCOMPSCI4038_1.start_time.minute, 30)
        self.assertEqual(examCOMPSCI4038_1.course_code, "COMPSCI4038_1")
        self.assertEqual(examCOMPSCI4038_1.exam_type, "CMOL")
        self.assertEqual(examCOMPSCI4038_1.no_students, 3)
        self.assertEqual(examCOMPSCI4038_1.exam_school, "SCHOOL OF COMPUTING SCIENCE")
        self.assertEqual(examCOMPSCI4038_1.date_exam.day, 28)
        self.assertEqual(examCOMPSCI4038_1.date_exam.month, 7)
        self.assertEqual(examCOMPSCI4038_1.date_exam.year, 2025)
        self.assertEqual(examCOMPSCI4038_1.school_contact, "")

    def test_Venue_populated(self):
        # extra_exam_rooms C20
        venue_42ButeGardens712 = Venue.objects.get(venue_name = "42 Bute Gardens 712")
        self.assertEqual(venue_42ButeGardens712.capacity, None)
        self.assertEqual(venue_42ButeGardens712.venuetype, "SEPERATE_ROOM")
        self.assertEqual(venue_42ButeGardens712.is_accessible, False)
        self.assertEqual(venue_42ButeGardens712.qualifications, [])
        self.assertEqual(venue_42ButeGardens712.availability, [])
        self.assertEqual(venue_42ButeGardens712.provision_capabilities, "SEPERATE_ROOM_ON_OWN")

    def test_Student_populated(self):
        # exam_provisions_report row 2
        student82 = Student.objects.get(student_id = "82")
        self.assertEqual(student82.student_name, "Torres;Christian")