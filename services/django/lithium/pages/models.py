from django.db import models
from django.contrib.postgres.fields import ArrayField


# ---------- ENUM TYPES ----------

class ProvisionType(models.TextChoices):
    EXTRA_TIME = 'extra_time', 'Extra Time'
    COMPUTER_NEEDED = 'computer_needed', 'Computer Needed'
    READER = 'reader', 'Reader'
    SCRIBE = 'scribe', 'Scribe'


class VenueType(models.TextChoices):
    MAIN_HALL = 'main_hall', 'Main Hall'
    PURPLE_CLUSTER = 'purple_cluster', 'Purple Cluster'
    COMPUTER_CLUSTER = 'computer_cluster', 'Computer Cluster'
    SEPARATE_ROOM = 'separate_room', 'Separate Room'
    SCHOOL_TO_SORT = 'school_to_sort', 'School To Sort'


# ---------- MAIN TABLES ----------

class Exam(models.Model):
    exam_id = models.AutoField(primary_key=True)
    exam_name = models.CharField(max_length=30)
    exam_length = models.IntegerField()
    start_time = models.DateTimeField()
    course_code = models.CharField(max_length=30)
    exam_type = models.CharField(max_length=30)
    no_students = models.IntegerField()
    exam_school = models.CharField(max_length=30)
    date_exam = models.DateField()
    school_contact = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.exam_name} ({self.course_code})"


class Venue(models.Model):
    venue_name = models.CharField(max_length=255, primary_key=True)
    capacity = models.IntegerField()
    venuetype = models.CharField(
        max_length=30,
        choices=VenueType.choices
    )
    is_accessible = models.BooleanField(default=True)
    qualifications = ArrayField(
        models.CharField(max_length=255),
        blank=True,
        null=True
    )

    def __str__(self):
        return self.venue_name


class Student(models.Model):
    student_id = models.CharField(max_length=255, primary_key=True)
    student_name = models.CharField(max_length=255)

    def __str__(self):
        return self.student_name


class ExamVenue(models.Model):
    examvenue_id = models.AutoField(primary_key=True)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE)
    adj_starttime = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.exam} at {self.venue}"


class StudentExam(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('student', 'exam')

    def __str__(self):
        return f"{self.student} - {self.exam}"


class Provisions(models.Model):
    provision_id = models.AutoField(primary_key=True)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    provisions = ArrayField(
        models.CharField(max_length=30, choices=ProvisionType.choices),
        blank=True,
        null=True
    )
    notes = models.CharField(max_length=200, blank=True, null=True)

    def __str__(self):
        return f"Provisions for {self.student} in {self.exam}"
