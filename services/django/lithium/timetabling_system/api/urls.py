from django.urls import path
from rest_framework.routers import DefaultRouter

from timetabling_system.views import upload_timetable_file

from .views import ExamVenueViewSet, ExamViewSet, TimetableUploadView, VenueViewSet

router = DefaultRouter()
router.register("exams", ExamViewSet, basename="exam")
router.register("venues", VenueViewSet, basename="venue")
router.register("exam-venues", ExamVenueViewSet, basename="exam-venue")

urlpatterns = [
    path("exams-upload", TimetableUploadView.as_view(), name="api-exam-upload"),
]

urlpatterns += router.urls
