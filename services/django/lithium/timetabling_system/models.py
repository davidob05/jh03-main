from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Exam, Venue, Student, ExamVenue, StudentExam, Provisions


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ("exam_name", "course_code", "exam_school", "date_exam", "exam_type")
    search_fields = ("exam_name", "course_code", "exam_school")
    list_filter = ("exam_school", "exam_type", "date_exam")
    ordering = ("date_exam",)


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ("venue_name", "capacity", "venuetype", "is_accessible")
    search_fields = ("venue_name",)
    list_filter = ("venuetype", "is_accessible")


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("student_id", "student_name")
    search_fields = ("student_name", "student_id")



@admin.register(ExamVenue)
class ExamVenueAdmin(admin.ModelAdmin):
    list_display = ("exam", "venue", "adj_starttime")
    list_filter = ("venue",)
    search_fields = ("exam__exam_name", "venue__venue_name")


@admin.register(StudentExam)
class StudentExamAdmin(admin.ModelAdmin):
    list_display = ("student", "exam")
    search_fields = ("student__student_name", "exam__exam_name")


@admin.register(Provisions)
class ProvisionsAdmin(admin.ModelAdmin):
    list_display = ("student", "exam", "provisions", "notes")
    search_fields = ("student__student_name", "exam__exam_name", "notes")
    list_filter = ("exam",)

@admin.register(UploadLog)
class UploadLogAdmin(admin.ModelAdmin):
    list_display = ("file_name", "uploaded_by", "uploaded_at", "records_created", "records_updated")
    ordering = ("-uploaded_at",)from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models


# ---------- ENUM TYPES ----------

class ProvisionType(models.TextChoices):
    DATA_AS_PRESENTED_TO_REGISTRY = 'data_as_presented_to_registry', 'Data as presented to Registry'
    ACCESSIBLE_EXAM_HALL_GROUND_OR_LIFT = 'accessible_exam_hall_ground_or_lift', 'Accessible exam hall: must be ground floor or have reliable lift access available'
    ACCESSIBLE_HALL = 'accessible_hall', 'Accessible hall'
    ALLOWED_EAT_DRINK = 'allowed_eat_drink', 'Allowed to eat and drink'
    ASSISTED_EVAC_REQUIRED = 'assisted_evacuation_required', 'Assisted evacuation required'
    EXAM_ADDITIONAL_COMMENT = 'exam_additional_comment', 'Exam Additional Comment'
    ALTERNATIVE_FORMAT_PAPER = 'alternative_format_paper', 'Exam paper required in alternative format'
    EXTRA_TIME = 'extra_time', 'Extra Time'
    EXTRA_TIME_100 = 'extra_time_100', 'Extra time 100%'
    EXTRA_TIME_15_PER_HOUR = 'extra_time_15_per_hour', 'Extra time 15 minutes every hour'
    EXTRA_TIME_20_PER_HOUR = 'extra_time_20_per_hour', 'Extra time 20 minutes every hour'
    EXTRA_TIME_30_PER_HOUR = 'extra_time_30_per_hour', 'Extra time 30 minutes every hour'
    INVIGILATOR_AWARENESS = 'invigilator_awareness', 'Invigilator awareness'
    SEATED_AT_BACK = 'seated_at_back', 'Seated at back'
    SEPARATE_ROOM_NOT_ON_OWN = 'separate_room_not_on_own', 'Separate room not on own'
    SEPARATE_ROOM_ON_OWN = 'separate_room_on_own', 'Separate room on own'
    TOILET_BREAKS_REQUIRED = 'toilet_breaks_required', 'Toilet breaks required'
    USE_COMPUTER = 'use_computer', 'Use of a computer'
    USE_READER = 'use_reader', 'Use of a reader'
    USE_SCRIBE = 'use_scribe', 'Use of a scribe'
    READER = 'reader', 'Reader'
    SCRIBE = 'scribe', 'Scribe'


class ExamVenueProvisionType(models.TextChoices):
    SEPARATE_ROOM_ON_OWN = 'separate_room_on_own', 'Separate room on own'
    SEPARATE_ROOM_NOT_ON_OWN = 'separate_room_not_on_own', 'Separate room not on own'
    USE_COMPUTER = 'use_computer', 'Use of a computer'
    ACCESSIBLE_HALL = 'accessible_hall', 'Accessible hall'


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
    course_code = models.CharField(max_length=30)
    exam_type = models.CharField(max_length=30)
    no_students = models.IntegerField()
    exam_school = models.CharField(max_length=30)
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
    qualifications = models.JSONField(default=list, blank=True)
    availability = models.JSONField(default=list, blank=True)
    provision_capabilities = ArrayField(
        models.CharField(max_length=40, choices=ExamVenueProvisionType.choices),
        default=list,
        blank=True,
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
    start_time = models.DateTimeField(blank=True, null=True)
    exam_length = models.IntegerField(blank=True, null=True)
    core = models.BooleanField(default=False)
    provision_capabilities = ArrayField(
        models.CharField(max_length=40, choices=ExamVenueProvisionType.choices),
        default=list,
        blank=True,
    )

    def __str__(self):
        return f"{self.exam} at {self.venue}"


class StudentExam(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    exam_venue = models.ForeignKey(
        ExamVenue,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    class Meta:
        unique_together = ('student', 'exam')

    def __str__(self):
        return f"{self.student} - {self.exam}"


class Provisions(models.Model):
    provision_id = models.AutoField(primary_key=True)

    exam = models.ForeignKey(
        Exam,
        to_field="exam_id",
        on_delete=models.CASCADE
    )
    student = models.ForeignKey(
        Student,
        to_field="student_id",
        on_delete=models.CASCADE
    )

    provisions = ArrayField(
        models.CharField(max_length=50, choices=ProvisionType.choices),
        default=list,
        blank=True
    )

    notes = models.CharField(max_length=200, blank=True, null=True)

    def __str__(self):
        return f"Provisions for {self.student} in {self.exam}"


class UploadLog(models.Model):  # this lets us view upload history
    file_name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="exam_upload_logs",
        on_delete=models.SET_NULL,
        null=True,
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    records_created = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.file_name} by {self.uploaded_by} on {self.uploaded_at:%Y-%m-%d %H:%M}"
