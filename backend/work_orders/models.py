from django.conf import settings
from django.db import models
from django.utils import timezone


class WorkOrder(models.Model):
    class Priority(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        OVERDUE = "overdue", "Overdue"
        CANCELLED = "cancelled", "Cancelled"

    class WOType(models.TextChoices):
        PREVENTIVE = "preventive", "Preventive"
        CORRECTIVE = "corrective", "Corrective"

    ACTIVE_STATUSES = ("open", "scheduled", "in_progress", "overdue")

    wo_number = models.CharField(max_length=20, unique=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    asset = models.ForeignKey("assets.Asset", null=True, blank=True, on_delete=models.SET_NULL, related_name="work_orders")
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.CASCADE, related_name="work_orders")
    zone = models.ForeignKey("warehouses.WarehouseZone", null=True, blank=True, on_delete=models.SET_NULL, related_name="work_orders")
    wo_type = models.CharField(max_length=12, choices=WOType.choices, default=WOType.CORRECTIVE)
    priority = models.CharField(max_length=8, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    due_date = models.DateField()
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_work_orders")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_work_orders")
    notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "work_orders"
        ordering = ["due_date", "-id"]

    def __str__(self):
        return f"{self.wo_number} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.wo_number:
            numbers = [
                int(n[3:]) for n in WorkOrder.objects.values_list("wo_number", flat=True) if n[3:].isdigit()
            ]
            self.wo_number = f"WO-{max(numbers, default=1000) + 1}"
        super().save(*args, **kwargs)


class WorkOrderAttachment(models.Model):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="work_orders/")
    description = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "work_order_attachments"
        ordering = ["-created_at"]


class WorkOrderLog(models.Model):
    """Riwayat perubahan work order."""

    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name="logs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=40)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "work_order_logs"
        ordering = ["-created_at", "-id"]


def log_event(work_order, user, action, detail=""):
    WorkOrderLog.objects.create(work_order=work_order, user=user, action=action, detail=detail)


def refresh_overdue():
    """Tandai work order aktif yang melewati due date sebagai Overdue."""
    return WorkOrder.objects.filter(
        status__in=["open", "scheduled", "in_progress"], due_date__lt=timezone.localdate()
    ).update(status="overdue")
