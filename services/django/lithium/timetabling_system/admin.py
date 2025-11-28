from django.contrib import admin


from .models import (
    Exam,
    Venue,
    Student,
    ExamVenue,
    StudentExam,
    Provisions,
    UploadLog,
)


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ("exam_name", "course_code", "exam_school", "exam_type")
    search_fields = ("exam_name", "course_code", "exam_school")
    list_filter = ("exam_school", "exam_type")


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
    list_display = ("exam", "venue", "start_time", "exam_length", "core")
    list_filter = ("venue", "core")
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
    ordering = ("-uploaded_at",)
