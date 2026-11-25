from rest_framework import viewsets

from accounts.permissions import ADMINS

from .models import Warehouse, WarehouseZone
from .serializers import WarehouseSerializer, ZoneSerializer


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.prefetch_related("zones").all()
    serializer_class = WarehouseSerializer
    write_roles = ADMINS
    filterset_fields = ["is_active"]
    search_fields = ["name", "code"]


class ZoneViewSet(viewsets.ModelViewSet):
    queryset = WarehouseZone.objects.select_related("warehouse").all()
    serializer_class = ZoneSerializer
    write_roles = ADMINS
    filterset_fields = ["warehouse"]
    search_fields = ["name", "code"]
