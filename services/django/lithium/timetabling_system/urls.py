from django.urls import path

from .views import (
    AboutPageView,
    HomePageView,
    healthz_view,
    upload_timetable_file,
)


urlpatterns = [
    path("", HomePageView.as_view(), name="home"),
    path("about/", AboutPageView.as_view(), name="about"),
    path("healthz/", healthz_view, name="healthz"),
    path("api/exams/upload/", upload_timetable_file, name="upload-exams"),
    path("api/exams/upload", upload_timetable_file),
]
