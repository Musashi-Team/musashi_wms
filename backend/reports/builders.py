"""Pembuat data laporan. Setiap builder mengembalikan (judul, header, baris)."""
from datetime import datetime

from django.db.models import Q
from django.utils import timezone

from assets.models import Asset
from inventory.models import InventoryItem, StockMovement
from maintenance.models import MaintenanceHistory
from work_orders.models import WorkOrder, refresh_overdue


def _fmt_dt(value):
    return timezone.localtime(value).strftime("%Y-%m-%d %H:%M") if value else ""


def asset_report(p):
    qs = Asset.objects.select_related("category", "warehouse", "zone")
    if p["warehouse"]:
        qs = qs.filter(warehouse_id=p["warehouse"])
    headers = ["Asset ID", "Name", "Category", "Serial Number", "Zone", "Purchase Date", "Condition", "Status"]
    rows = [
        [a.asset_id, a.name, a.category.name if a.category else "", a.serial_number,
         a.zone.name if a.zone else "", a.purchase_date or "", a.get_condition_display(), a.get_status_display()]
        for a in qs
    ]
    return "Asset Report", headers, rows


def maintenance_report(p):
    qs = MaintenanceHistory.objects.select_related("asset", "performed_by", "work_order")
    if p["warehouse"]:
        qs = qs.filter(asset__warehouse_id=p["warehouse"])
    if p["date_from"]:
        qs = qs.filter(performed_at__gte=p["date_from"])
    if p["date_to"]:
        qs = qs.filter(performed_at__lte=p["date_to"])
    headers = ["Date", "Asset ID", "Asset", "Type", "Work Order", "Performed By", "Notes"]
    rows = [
        [h.performed_at, h.asset.asset_id, h.asset.name, h.maintenance_type.title(),
         h.work_order.wo_number if h.work_order else "", h.performed_by.display_name if h.performed_by else "", h.notes]
        for h in qs
    ]
    return "Maintenance Report", headers, rows


def work_order_report(p):
    refresh_overdue()
    qs = WorkOrder.objects.select_related("asset", "zone", "assigned_to")
    if p["warehouse"]:
        qs = qs.filter(warehouse_id=p["warehouse"])
    if p["date_from"]:
        qs = qs.filter(due_date__gte=p["date_from"])
    if p["date_to"]:
        qs = qs.filter(due_date__lte=p["date_to"])
    headers = ["WO ID", "Title", "Asset", "Zone", "Type", "Priority", "Status", "Due Date", "Assigned To", "Completed At"]
    rows = [
        [w.wo_number, w.title, w.asset.name if w.asset else "", w.zone.name if w.zone else "", w.get_wo_type_display(),
         w.get_priority_display(), w.get_status_display(), w.due_date, w.assigned_to.display_name if w.assigned_to else "",
         _fmt_dt(w.completed_at)]
        for w in qs
    ]
    return "Work Order Report", headers, rows


def inventory_report(p):
    qs = InventoryItem.objects.select_related("zone")
    if p["warehouse"]:
        qs = qs.filter(warehouse_id=p["warehouse"])
    labels = {"ok": "OK", "reorder": "Re-order", "critical": "Critical", "out": "Out of stock", "over": "Overstock"}
    headers = ["SKU", "Name", "Category", "Unit", "Qty", "Min", "Max", "Re-Order Level", "Re-Order Qty", "Status"]
    rows = [
        [i.sku, i.name, i.category, i.unit, i.quantity, i.min_stock, i.max_stock, i.reorder_level,
         i.reorder_quantity, labels[i.stock_status]]
        for i in qs
    ]
    return "Inventory Report", headers, rows


def stock_movement_report(p):
    qs = StockMovement.objects.select_related("item", "created_by")
    if p["warehouse"]:
        qs = qs.filter(item__warehouse_id=p["warehouse"])
    if p["date_from"]:
        qs = qs.filter(created_at__date__gte=p["date_from"])
    if p["date_to"]:
        qs = qs.filter(created_at__date__lte=p["date_to"])
    headers = ["Date", "SKU", "Item", "Type", "Qty", "Change", "Balance", "Reference", "By"]
    rows = [
        [_fmt_dt(m.created_at), m.item.sku, m.item.name, m.get_movement_type_display(), m.quantity, m.change,
         m.balance_after, m.reference, m.created_by.display_name if m.created_by else ""]
        for m in qs
    ]
    return "Stock Movement Report", headers, rows


def asset_downtime_report(p):
    """Downtime = lama work order corrective (dibuat -> selesai, atau sampai sekarang jika masih aktif)."""
    now = timezone.now()
    qs = WorkOrder.objects.filter(wo_type="corrective", asset__isnull=False).exclude(status="cancelled").select_related("asset")
    if p["warehouse"]:
        qs = qs.filter(warehouse_id=p["warehouse"])
    if p["date_from"]:
        qs = qs.filter(created_at__date__gte=p["date_from"])
    if p["date_to"]:
        qs = qs.filter(created_at__date__lte=p["date_to"])
    data = {}
    for wo in qs:
        end = wo.completed_at or now
        hours = max((end - wo.created_at).total_seconds() / 3600, 0)
        row = data.setdefault(wo.asset_id, {"asset": wo.asset, "count": 0, "hours": 0.0})
        row["count"] += 1
        row["hours"] += hours
    headers = ["Asset ID", "Asset", "Current Status", "Corrective WOs", "Downtime (hours)"]
    rows = [
        [d["asset"].asset_id, d["asset"].name, d["asset"].get_status_display(), d["count"], round(d["hours"], 1)]
        for d in sorted(data.values(), key=lambda x: -x["hours"])
    ]
    return "Asset Downtime Report", headers, rows


BUILDERS = {
    "assets": asset_report,
    "maintenance": maintenance_report,
    "work-orders": work_order_report,
    "inventory": inventory_report,
    "stock-movements": stock_movement_report,
    "asset-downtime": asset_downtime_report,
}


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None
