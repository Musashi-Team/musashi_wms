from django.db.models import F
from django_filters import rest_framework as filters
from rest_framework import mixins, viewsets

from accounts.permissions import INVENTORY_ROLES

from .models import InventoryItem, StockMovement
from .serializers import InventoryItemSerializer, StockMovementSerializer


class InventoryItemFilter(filters.FilterSet):
    low_stock = filters.BooleanFilter(method="filter_low")

    class Meta:
        model = InventoryItem
        fields = ["warehouse", "zone", "category"]

    def filter_low(self, qs, name, value):
        if value:
            return qs.filter(quantity__lte=F("reorder_level"))
        return qs


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related("warehouse", "zone").all()
    serializer_class = InventoryItemSerializer
    write_roles = INVENTORY_ROLES
    filterset_class = InventoryItemFilter
    search_fields = ["sku", "name", "category"]
    ordering_fields = ["name", "sku", "quantity", "category", "updated_at"]


class StockMovementViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Stock In / Out / Adjustment. Riwayat tidak dapat diubah atau dihapus."""

    queryset = StockMovement.objects.select_related("item", "created_by").all()
    serializer_class = StockMovementSerializer
    write_roles = INVENTORY_ROLES
    filterset_fields = ["item", "movement_type", "item__warehouse"]
    search_fields = ["item__name", "item__sku", "reference", "notes"]
    ordering_fields = ["created_at", "quantity"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
