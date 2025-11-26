from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ExamViewSet, TimetableUploadView

router = DefaultRouter()
router.register("exams", ExamViewSet, basename="exam")

urlpatterns = [
    path("exams/upload/", TimetableUploadView.as_view(), name="api-exam-upload"),
    path("exams/upload", TimetableUploadView.as_view()),
]

urlpatterns += router.urls
