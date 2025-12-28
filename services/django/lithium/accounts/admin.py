from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import CustomUserCreationForm, CustomUserChangeForm
from .models import CustomUser


class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser
    list_display = [
        "email",
        "username",
        "phone",
        "has_avatar",
        "is_staff",
        "is_active",
    ]
    list_filter = ["is_staff", "is_superuser", "is_active"]
    search_fields = ["email", "username", "phone"]
    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("phone", "avatar")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Profile", {"fields": ("phone", "avatar")}),
    )

    @admin.display(description="Avatar", boolean=True)
    def has_avatar(self, obj: CustomUser) -> bool:
        return bool(obj.avatar)


admin.site.register(CustomUser, CustomUserAdmin)
