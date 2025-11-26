from django.test import TestCase

import pandas as pd
 
from timetabling_system.utils.file_classifier import (

    detect_exam_file,

    detect_provision_file,

    detect_venue_file

)
 
 
class TestFileClassifier(TestCase):
 
    def test_detect_exam_file(self):

        df = pd.DataFrame({

            "exam_code": [1],

            "exam_name": ["Test"],

            "exam_date": ["2025-06-01"]

        })

        assert detect_exam_file(df) is True

        assert detect_provision_file(df) is False

        assert detect_venue_file(df) is False
 
    def test_detect_provision_file(self):

        df = pd.DataFrame({

            "student_id": ["12345"],

            "student_name": ["Alice"],

            "provisions": ["extra_time"]

        })

        assert detect_provision_file(df) is True

        assert detect_exam_file(df) is False

        assert detect_venue_file(df) is False
 
    def test_detect_venue_file(self):
        df = pd.DataFrame(
            [
                ["Monday", "Tuesday"],
                ["2025/07/28", "2025/07/29"],
                ["Room A", "Room B"],
            ]
        )

        assert detect_venue_file(df) is True

        assert detect_exam_file(df) is False

        assert detect_provision_file(df) is False

    def test_detect_provision_multiline_headers(self):
        df = pd.DataFrame(
            [
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Campus Exam",
                    "CHEM5022_1",
                    "Physical Chemistry",
                    "SCHOOL OF CHEMISTRY",
                    "82",
                    "Torres;Christian",
                    "Extra time 30 minutes every hour ; Separate room on own",
                    "Additional notes",
                ]
            ],
            columns=[
                "Main Venue",
                "Day",
                "Date",
                "Start Time",
                "Finish Time",
                "Duration",
                "Exam Type",
                "Exam Code",
                "Exam",
                "School",
                "Student ID\nMock IDs",
                "Student Name\nMock Names",
                "Exam Provision\nData as presented to Registry",
                "Additional Information \nStudent identifers have been removed",
            ],
        )

        assert detect_provision_file(df) is True
        assert detect_exam_file(df) is False
        assert detect_venue_file(df) is False

    def test_detect_venue_with_weekday_columns(self):
        df = pd.DataFrame(
            [
                [45866, 45867, 45868, 45869, 45870],
                ["Hetherington 118", "Hetherington 118", "Hetherington 130", "Hetherington 118", "Hetherington 118"],
            ],
            columns=[
                "Monday- 837630",
                "Tuesday- 837631",
                "Wednesday- 837635",
                "Thursday- 837639",
                "Friday- 837641",
            ],
        )

        assert detect_venue_file(df) is True
        assert detect_exam_file(df) is False
        assert detect_provision_file(df) is False

 
