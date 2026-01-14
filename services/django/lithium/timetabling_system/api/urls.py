from django.urls import path
from rest_framework.routers import DefaultRouter

from timetabling_system.views import upload_timetable_file

from accounts.api import (
    CurrentUserView,
    ObtainAuthTokenView,
    SessionListView,
    SessionRevokeOthersView,
    SessionRevokeView,
    SessionLogoutView,
)
from .views import (
    ExamVenueViewSet,
    ExamViewSet,
    InvigilatorAssignmentViewSet,
    InvigilatorViewSet,
    InvigilatorStatsView,
    InvigilatorNotificationsView,
    NotificationsView,
    TimetableUploadView,
    StudentProvisionListView,
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
    path("auth/sessions/", SessionListView.as_view(), name="api-auth-sessions"),
    path("auth/sessions/revoke/", SessionRevokeView.as_view(), name="api-auth-session-revoke"),
    path("auth/sessions/revoke-others/", SessionRevokeOthersView.as_view(), name="api-auth-session-revoke-others"),
    path("auth/logout/", SessionLogoutView.as_view(), name="api-auth-logout"),
    path("exams-upload", TimetableUploadView.as_view(), name="api-exam-upload"),
    path("notifications/", NotificationsView.as_view(), name="api-notifications"),
    path("invigilator/stats/", InvigilatorStatsView.as_view(), name="api-invigilator-stats"),
    path("invigilator/notifications/", InvigilatorNotificationsView.as_view(), name="api-invigilator-notifications"),
    path("students/provisions/", StudentProvisionListView.as_view(), name="api-student-provisions"),
]

urlpatterns += router.urls
