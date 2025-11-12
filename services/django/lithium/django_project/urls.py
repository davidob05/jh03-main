from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("timetabling_system.api.urls")),
    path("", include("timetabling_system.urls")),
    path("accounts/", include("allauth.urls")),
    path("", include("pages.urls")),
    path("api/", include("pages.api.urls"))
]

if settings.DEBUG:
    import debug_toolbar

    urlpatterns = [
        path("__debug__/", include(debug_toolbar.urls)),
    ] + urlpatterns
