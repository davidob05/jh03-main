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

 
