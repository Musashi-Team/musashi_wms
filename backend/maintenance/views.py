import calendar as cal
from datetime import date, timedelta

from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import MAINT_MANAGERS, TECH
from work_orders.models import WorkOrder, log_event

from .models import MaintenanceHistory, MaintenancePlan, advance_date
from .serializers import MaintenanceHistorySerializer, MaintenancePlanSerializer


class MaintenancePlanViewSet(viewsets.ModelViewSet):
    queryset = MaintenancePlan.objects.select_related("asset", "warehouse", "assigned_to").all()
    serializer_class = MaintenancePlanSerializer
    write_roles = MAINT_MANAGERS
    action_roles = {"complete": MAINT_MANAGERS + (TECH,)}
    filterset_fields = ["plan_type", "frequency", "warehouse", "asset", "assigned_to", "is_active"]
    search_fields = ["title", "asset__name", "asset__asset_id"]
    ordering_fields = ["next_date", "title", "created_at"]

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        """Event kalender: kemunculan jadwal berulang + due date work order pada bulan ?month=YYYY-MM."""
        month_param = request.query_params.get("month")
        today = timezone.localdate()
        try:
            year, month = (int(x) for x in month_param.split("-")) if month_param else (today.year, today.month)
            start = date(year, month, 1)
        except (ValueError, TypeError):
            raise ValidationError({"month": "Gunakan format YYYY-MM."})
        end = date(year, month, cal.monthrange(year, month)[1])
        warehouse = request.query_params.get("warehouse")

        events = []
        plans = self.get_queryset().filter(is_active=True)
        if warehouse:
            plans = plans.filter(warehouse_id=warehouse)
        for plan in plans:
            current = plan.next_date
            guard = 0
            while current and current <= end and guard < 400:
                if current >= start:
                    events.append({
                        "date": current, "kind": "plan", "id": plan.id, "title": plan.title,
                        "type": plan.plan_type, "asset": plan.asset.name if plan.asset else None,
                    })
                current = advance_date(current, plan.frequency)
                guard += 1

        orders = WorkOrder.objects.filter(due_date__range=(start, end)).exclude(status="cancelled")
        if warehouse:
            orders = orders.filter(warehouse_id=warehouse)
        for wo in orders.select_related("asset"):
            events.append({
                "date": wo.due_date, "kind": "work_order", "id": wo.id, "title": f"{wo.wo_number} {wo.title}",
                "type": wo.status, "asset": wo.asset.name if wo.asset else None,
            })
        events.sort(key=lambda e: e["date"])
        return Response({"month": f"{year:04d}-{month:02d}", "events": events})

    @action(detail=False, methods=["get"])
    def reminders(self, request):
        """Jadwal yang sudah masuk periode reminder (next_date - reminder_days <= hari ini)."""
        today = timezone.localdate()
        qs = self.get_queryset().filter(is_active=True)
        warehouse = request.query_params.get("warehouse")
        if warehouse:
            qs = qs.filter(warehouse_id=warehouse)
        due = [p for p in qs if p.next_date - timedelta(days=p.reminder_days) <= today]
        data = self.get_serializer(due, many=True).data
        for item, plan in zip(data, due):
            item["days_left"] = (plan.next_date - today).days
        return Response(data)

    @action(detail=True, methods=["post"], url_path="generate-work-order")
    def generate_work_order(self, request, pk=None):
        """Buat work order dari jadwal, lalu majukan tanggal jadwal berikutnya."""
        plan = self.get_object()
        wo = WorkOrder.objects.create(
            title=plan.title, description=plan.description, asset=plan.asset, warehouse=plan.warehouse,
            zone=plan.asset.zone if plan.asset else None, wo_type=plan.plan_type, priority=plan.priority,
            status=WorkOrder.Status.SCHEDULED, due_date=plan.next_date, assigned_to=plan.assigned_to,
            created_by=request.user,
        )
        log_event(wo, request.user, "created", f"Dibuat dari maintenance plan #{plan.id}")
        nxt = advance_date(plan.next_date, plan.frequency)
        plan.last_date = plan.next_date
        if nxt:
            plan.next_date = nxt
        else:
            plan.is_active = False
        plan.save()
        return Response({"work_order": wo.id, "wo_number": wo.wo_number, "plan": self.get_serializer(plan).data})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Catat maintenance telah dilakukan (tanpa work order) dan majukan jadwal."""
        plan = self.get_object()
        if not plan.asset_id:
            raise ValidationError({"detail": "Plan tanpa aset tidak dapat dicatat ke riwayat aset."})
        MaintenanceHistory.objects.create(
            asset=plan.asset, plan=plan, maintenance_type=plan.plan_type,
            performed_by=request.user, performed_at=timezone.localdate(),
            notes=request.data.get("notes", "") or plan.title,
        )
        nxt = advance_date(plan.next_date, plan.frequency)
        plan.last_date = timezone.localdate()
        if nxt:
            plan.next_date = nxt
        else:
            plan.is_active = False
        plan.save()
        return Response(self.get_serializer(plan).data)


class MaintenanceHistoryViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    queryset = MaintenanceHistory.objects.select_related("asset", "performed_by", "work_order").all()
    serializer_class = MaintenanceHistorySerializer
    write_roles = MAINT_MANAGERS + (TECH,)
    filterset_fields = ["asset", "maintenance_type", "asset__warehouse"]
    search_fields = ["asset__name", "asset__asset_id", "notes"]
    ordering_fields = ["performed_at"]
