from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    phone = models.CharField(max_length=50, blank=True, null=True)
    avatar = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.email
