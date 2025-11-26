from django.urls import path
from rest_framework.routers import DefaultRouter

from timetabling_system.views import upload_timetable_file

from .views import ExamViewSet, TimetableUploadView

router = DefaultRouter()
router.register("exams", ExamViewSet, basename="exam")

urlpatterns = [
    path("exams-upload", TimetableUploadView.as_view(), name="api-exam-upload"),
]

urlpatterns += router.urls
