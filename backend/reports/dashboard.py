"""Statistik dashboard. Semua angka dihitung dari database (tidak ada data hardcoded)."""
from collections import OrderedDict
from datetime import timedelta

from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.alerts import generate_alerts
from assets.models import Asset
from inventory.models import InventoryItem
from maintenance.models import MaintenancePlan
from warehouses.models import Warehouse
from work_orders.models import WorkOrder, refresh_overdue


def _warehouse(request):
    wid = request.query_params.get("warehouse")
    return Warehouse.objects.filter(pk=wid).first() if wid else None


class DashboardStatsView(APIView):
    def get(self, request):
        refresh_overdue()
        warehouse = _warehouse(request)
        today = timezone.localdate()

        assets = Asset.objects.all()
        orders = WorkOrder.objects.all()
        items = InventoryItem.objects.all()
        plans = MaintenancePlan.objects.filter(is_active=True)
        if warehouse:
            assets = assets.filter(warehouse=warehouse)
            orders = orders.filter(warehouse=warehouse)
            items = items.filter(warehouse=warehouse)
            plans = plans.filter(warehouse=warehouse)
            generate_alerts(warehouse)

        active = orders.filter(status__in=WorkOrder.ACTIVE_STATUSES)
        reorder = items.filter(quantity__lte=F("reorder_level"))

        return Response({
            "assets": {
                "total": assets.count(),
                "operational": assets.filter(status="operational").count(),
                "maintenance": assets.filter(status="maintenance").count(),
                "offline": assets.filter(status="offline").count(),
            },
            "work_orders": {
                "active": active.count(),
                "overdue": orders.filter(status="overdue").count(),
                "due_today": active.filter(due_date=today).count(),
                "completed": orders.filter(status="completed").count(),
                "high_priority": active.filter(priority="high").count(),
            },
            "inventory": {
                "total_items": items.count(),
                # item di/bawah minimum stock (kritis)
                "below_min": items.filter(quantity__lte=F("min_stock"), min_stock__gt=0).count(),
                # item melebihi maximum stock
                "above_max": items.filter(quantity__gt=F("max_stock"), max_stock__gt=0).count(),
                # item yang sudah mencapai re-order level
                "reorder_alerts": reorder.count(),
                # total unit yang perlu dipesan untuk item di atas
                "reorder_quantity": reorder.aggregate(t=Sum("reorder_quantity"))["t"] or 0,
            },
            "maintenance": {
                "upcoming_7_days": plans.filter(next_date__lte=today + timedelta(days=7)).count(),
            },
        })


class DashboardActivityView(APIView):
    """Grafik Work Orders created vs completed. ?period=weekly|monthly|yearly"""

    def get(self, request):
        refresh_overdue()
        period = request.query_params.get("period", "weekly")
        warehouse = _warehouse(request)
        today = timezone.localdate()
        orders = WorkOrder.objects.all()
        if warehouse:
            orders = orders.filter(warehouse=warehouse)

        buckets = OrderedDict()  # key -> {label, created, completed}

        def day_key(d):
            return d.isoformat()

        if period == "yearly":
            for m in range(1, 13):
                buckets[(today.year, m)] = {"label": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1], "created": 0, "completed": 0}
            key_for = lambda d: (d.year, d.month) if d.year == today.year else None  # noqa: E731
        elif period == "monthly":
            start = today - timedelta(days=29)
            for i in range(6):
                s = start + timedelta(days=i * 5)
                buckets[i] = {"label": f"{s.strftime('%b')} {s.day}", "created": 0, "completed": 0}

            def key_for(d):
                offset = (d - start).days
                return offset // 5 if 0 <= offset < 30 else None
        else:
            start = today - timedelta(days=6)
            for i in range(7):
                d = start + timedelta(days=i)
                buckets[day_key(d)] = {"label": f"{d.strftime('%a')} {d.day}", "created": 0, "completed": 0}
            key_for = lambda d: day_key(d) if 0 <= (d - start).days <= 6 else None  # noqa: E731

        for created in orders.values_list("created_at", flat=True):
            k = key_for(timezone.localtime(created).date())
            if k in buckets:
                buckets[k]["created"] += 1
        for done in orders.filter(completed_at__isnull=False).values_list("completed_at", flat=True):
            k = key_for(timezone.localtime(done).date())
            if k in buckets:
                buckets[k]["completed"] += 1

        return Response({"period": period, "data": list(buckets.values())})
