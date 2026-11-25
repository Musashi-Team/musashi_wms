from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        WAREHOUSE_ADMIN = "warehouse_admin", "Warehouse Admin"
        MAINTENANCE_SUPERVISOR = "maintenance_supervisor", "Maintenance Supervisor"
        TECHNICIAN = "technician", "Technician"
        WAREHOUSE_STAFF = "warehouse_staff", "Warehouse Staff"

    role = models.CharField(max_length=30, choices=Role.choices, default=Role.WAREHOUSE_STAFF)
    phone = models.CharField(max_length=30, blank=True)
    warehouse = models.ForeignKey(
        "warehouses.Warehouse", null=True, blank=True, on_delete=models.SET_NULL, related_name="users"
    )

    class Meta:
        db_table = "users"
        ordering = ["first_name", "username"]

    @property
    def display_name(self):
        return self.get_full_name() or self.username


class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        DANGER = "danger", "Danger"

    # user kosong = notifikasi untuk semua user
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    warehouse = models.ForeignKey("warehouses.Warehouse", null=True, blank=True, on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    message = models.TextField(blank=True)
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.INFO)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
