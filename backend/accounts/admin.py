from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Notification, User


@admin.register(User)
class WmsUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("WMS", {"fields": ("role", "phone", "warehouse")}),)
    list_display = ("username", "first_name", "last_name", "role", "is_active")


admin.site.register(Notification)
