from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import ADMINS, MAINT_MANAGERS

from .models import Asset, AssetCategory
from .serializers import AssetCategorySerializer, AssetSerializer


class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    write_roles = MAINT_MANAGERS
    search_fields = ["name"]


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("category", "warehouse", "zone").all()
    serializer_class = AssetSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    write_roles = MAINT_MANAGERS
    action_roles = {"destroy": ADMINS}
    filterset_fields = ["status", "condition", "category", "warehouse", "zone"]
    search_fields = ["asset_id", "name", "serial_number", "description"]
    ordering_fields = ["asset_id", "name", "purchase_date", "status", "created_at"]

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Riwayat maintenance dan work order untuk satu aset."""
        asset = self.get_object()
        histories = asset.maintenance_histories.select_related("performed_by", "work_order").order_by("-performed_at", "-id")
        orders = asset.work_orders.select_related("assigned_to").order_by("-created_at")
        return Response({
            "maintenance": [
                {
                    "id": h.id,
                    "date": h.performed_at,
                    "type": h.maintenance_type,
                    "performed_by": h.performed_by.display_name if h.performed_by else None,
                    "work_order": h.work_order.wo_number if h.work_order else None,
                    "notes": h.notes,
                }
                for h in histories
            ],
            "work_orders": [
                {
                    "id": w.id,
                    "wo_number": w.wo_number,
                    "title": w.title,
                    "status": w.status,
                    "priority": w.priority,
                    "due_date": w.due_date,
                    "assigned_to": w.assigned_to.display_name if w.assigned_to else None,
                }
                for w in orders
            ],
        })
