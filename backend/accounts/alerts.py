"""Pembuat notifikasi otomatis (aset offline, WO overdue, stok rendah, reminder maintenance).

Dipanggil saat dashboard dibuka. Notifikasi tidak dibuat dobel pada hari yang sama.
"""
from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from .models import Notification


def _once_per_day(warehouse, title, message, level):
    today = timezone.localdate()
    exists = Notification.objects.filter(
        warehouse=warehouse, title=title, created_at__date=today
    ).exists()
    if not exists:
        Notification.objects.create(warehouse=warehouse, title=title, message=message, level=level)


def generate_alerts(warehouse):
    from assets.models import Asset
    from inventory.models import InventoryItem
    from maintenance.models import MaintenancePlan
    from work_orders.models import WorkOrder

    if warehouse is None:
        return
    today = timezone.localdate()

    offline = Asset.objects.filter(warehouse=warehouse, status="offline").count()
    if offline:
        _once_per_day(warehouse, f"{offline} aset offline", "Periksa aset yang sedang offline.", "danger")

    overdue = WorkOrder.objects.filter(warehouse=warehouse, status="overdue").count()
    if overdue:
        _once_per_day(warehouse, f"{overdue} work order overdue", "Segera tindak lanjuti pekerjaan yang terlambat.", "danger")

    low = InventoryItem.objects.filter(warehouse=warehouse, quantity__lte=F("reorder_level")).count()
    if low:
        _once_per_day(warehouse, f"{low} item mencapai re-order level", "Lakukan pemesanan ulang stok.", "warning")

    soon = MaintenancePlan.objects.filter(
        warehouse=warehouse, is_active=True, next_date__lte=today + timedelta(days=3)
    ).count()
    if soon:
        _once_per_day(warehouse, f"{soon} maintenance akan jatuh tempo", "Jadwal maintenance dalam 3 hari ke depan.", "info")
