import calendar
from datetime import timedelta

from django.conf import settings
from django.db import models


def advance_date(value, frequency):
    """Hitung tanggal berikutnya berdasarkan frekuensi. 'once' mengembalikan None."""
    if frequency == "daily":
        return value + timedelta(days=1)
    if frequency == "weekly":
        return value + timedelta(weeks=1)
    if frequency == "biweekly":
        return value + timedelta(weeks=2)
    months = {"monthly": 1, "quarterly": 3, "semiannual": 6, "yearly": 12}.get(frequency)
    if not months:
        return None
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


class MaintenancePlan(models.Model):
    class PlanType(models.TextChoices):
        PREVENTIVE = "preventive", "Preventive"
        CORRECTIVE = "corrective", "Corrective"

    class Frequency(models.TextChoices):
        ONCE = "once", "Once"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        BIWEEKLY = "biweekly", "Every 2 weeks"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        SEMIANNUAL = "semiannual", "Every 6 months"
        YEARLY = "yearly", "Yearly"

    title = models.CharField(max_length=200)
    plan_type = models.CharField(max_length=12, choices=PlanType.choices, default=PlanType.PREVENTIVE)
    asset = models.ForeignKey("assets.Asset", null=True, blank=True, on_delete=models.CASCADE, related_name="maintenance_plans")
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.CASCADE, related_name="maintenance_plans")
    frequency = models.CharField(max_length=12, choices=Frequency.choices, default=Frequency.MONTHLY)
    next_date = models.DateField()
    last_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=8, default="medium", choices=[("high", "High"), ("medium", "Medium"), ("low", "Low")])
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="maintenance_plans")
    reminder_days = models.PositiveIntegerField(default=3)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "maintenance_plans"
        ordering = ["next_date", "id"]

    def __str__(self):
        return self.title


class MaintenanceHistory(models.Model):
    asset = models.ForeignKey("assets.Asset", on_delete=models.CASCADE, related_name="maintenance_histories")
    plan = models.ForeignKey(MaintenancePlan, null=True, blank=True, on_delete=models.SET_NULL, related_name="histories")
    work_order = models.ForeignKey("work_orders.WorkOrder", null=True, blank=True, on_delete=models.SET_NULL, related_name="maintenance_histories")
    maintenance_type = models.CharField(max_length=12, default="preventive")
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    performed_at = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "maintenance_histories"
        ordering = ["-performed_at", "-id"]
