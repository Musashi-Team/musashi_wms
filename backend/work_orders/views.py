from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import status as http
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import MAINT_MANAGERS, TECH
from maintenance.models import MaintenanceHistory

from .models import WorkOrder, WorkOrderAttachment, log_event, refresh_overdue
from .serializers import AttachmentSerializer, LogSerializer, WorkOrderSerializer


class WorkOrderFilter(filters.FilterSet):
    due_from = filters.DateFilter(field_name="due_date", lookup_expr="gte")
    due_to = filters.DateFilter(field_name="due_date", lookup_expr="lte")
    due_today = filters.BooleanFilter(method="filter_due_today")
    active = filters.BooleanFilter(method="filter_active")

    class Meta:
        model = WorkOrder
        fields = ["status", "priority", "warehouse", "zone", "asset", "assigned_to", "wo_type"]

    def filter_due_today(self, qs, name, value):
        if value:
            return qs.filter(due_date=timezone.localdate(), status__in=WorkOrder.ACTIVE_STATUSES)
        return qs

    def filter_active(self, qs, name, value):
        if value:
            return qs.filter(status__in=WorkOrder.ACTIVE_STATUSES)
        return qs


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.select_related(
        "asset", "warehouse", "zone", "assigned_to", "created_by"
    ).prefetch_related("attachments").all()
    serializer_class = WorkOrderSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_class = WorkOrderFilter
    search_fields = ["wo_number", "title", "asset__name", "asset__asset_id", "description"]
    ordering_fields = ["due_date", "created_at", "priority", "status", "wo_number"]

    write_roles = MAINT_MANAGERS
    # teknisi boleh mengubah status/catatan & upload dokumentasi pada WO yang ditugaskan kepadanya
    action_roles = {
        "update": MAINT_MANAGERS + (TECH,),
        "partial_update": MAINT_MANAGERS + (TECH,),
        "attachments": MAINT_MANAGERS + (TECH,),
        "delete_attachment": MAINT_MANAGERS + (TECH,),
    }

    def list(self, request, *args, **kwargs):
        refresh_overdue()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        refresh_overdue()
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        if obj.status == WorkOrder.Status.COMPLETED:
            self._after_status_change(obj, None)
        log_event(obj, self.request.user, "created", f"Work order dibuat dengan status {obj.get_status_display()}")

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        partial = kwargs.pop("partial", False)
        data = request.data
        if request.user.role == TECH and not request.user.is_superuser:
            if obj.assigned_to_id != request.user.id:
                raise PermissionDenied("Anda hanya dapat mengubah work order yang ditugaskan kepada Anda.")
            data = {k: v for k, v in request.data.items() if k in ("status", "notes")}
            partial = True
        serializer = self.get_serializer(obj, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        old_status = obj.status
        new_obj = serializer.save()
        if new_obj.status != old_status:
            self._after_status_change(new_obj, old_status)
            log_event(
                new_obj, request.user, "status",
                f"Status diubah dari {old_status} ke {new_obj.status}",
            )
        else:
            log_event(new_obj, request.user, "updated", "Data work order diperbarui")
        return Response(self.get_serializer(new_obj).data)

    def _after_status_change(self, obj, old_status):
        if obj.status == WorkOrder.Status.COMPLETED:
            obj.completed_at = timezone.now()
            obj.save(update_fields=["completed_at"])
            if obj.asset_id:
                MaintenanceHistory.objects.get_or_create(
                    work_order=obj,
                    defaults={
                        "asset": obj.asset,
                        "maintenance_type": obj.wo_type,
                        "performed_by": obj.assigned_to,
                        "performed_at": timezone.localdate(),
                        "notes": obj.notes or obj.title,
                    },
                )
        elif obj.completed_at:
            obj.completed_at = None
            obj.save(update_fields=["completed_at"])

    @action(detail=True, methods=["get", "post"], parser_classes=[MultiPartParser, FormParser])
    def attachments(self, request, pk=None):
        obj = self.get_object()
        if request.method == "GET":
            return Response(AttachmentSerializer(obj.attachments.all(), many=True, context={"request": request}).data)
        upload = request.FILES.get("file")
        if not upload:
            raise ValidationError({"file": "File wajib dipilih."})
        att = WorkOrderAttachment.objects.create(
            work_order=obj, file=upload, description=request.data.get("description", ""), uploaded_by=request.user
        )
        log_event(obj, request.user, "attachment", f"Mengunggah dokumentasi: {upload.name}")
        return Response(AttachmentSerializer(att, context={"request": request}).data, status=http.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"attachments/(?P<att_id>\d+)")
    def delete_attachment(self, request, pk=None, att_id=None):
        obj = self.get_object()
        att = obj.attachments.filter(pk=att_id).first()
        if not att:
            raise ValidationError({"detail": "Lampiran tidak ditemukan."})
        att.file.delete(save=False)
        att.delete()
        return Response(status=http.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        obj = self.get_object()
        return Response(LogSerializer(obj.logs.select_related("user"), many=True).data)
