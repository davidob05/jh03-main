from django.urls import path
from rest_framework.routers import DefaultRouter

from timetabling_system.views import upload_timetable_file

from accounts.api import CurrentUserView, ObtainAuthTokenView
from .views import (
    ExamVenueViewSet,
    ExamViewSet,
    InvigilatorAssignmentViewSet,
    InvigilatorViewSet,
    TimetableUploadView,
    VenueViewSet,
)

router = DefaultRouter()
router.register("exams", ExamViewSet, basename="exam")
router.register("venues", VenueViewSet, basename="venue")
router.register("exam-venues", ExamVenueViewSet, basename="exam-venue")
router.register("invigilators", InvigilatorViewSet, basename="invigilator")
router.register("invigilator-assignments", InvigilatorAssignmentViewSet, basename="invigilator-assignment")

urlpatterns = [
    path("auth/token/login/", ObtainAuthTokenView.as_view(), name="api-login"),
    path("auth/me/", CurrentUserView.as_view(), name="api-auth-me"),
    path("exams-upload", TimetableUploadView.as_view(), name="api-exam-upload"),
]

urlpatterns += router.urls
