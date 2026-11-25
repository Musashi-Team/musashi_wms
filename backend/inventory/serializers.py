from django.db import transaction
from rest_framework import serializers

from .models import InventoryItem, StockMovement


class InventoryItemSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True, default=None)
    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id", "sku", "name", "category", "unit", "warehouse", "warehouse_name", "zone", "zone_name",
            "quantity", "min_stock", "max_stock", "reorder_level", "reorder_quantity", "stock_status",
            "description", "updated_at",
        ]
        read_only_fields = ["sku", "updated_at"]

    def validate(self, attrs):
        g = lambda k: attrs.get(k, getattr(self.instance, k, 0)) or 0  # noqa: E731
        if g("max_stock") and g("max_stock") < g("min_stock"):
            raise serializers.ValidationError({"max_stock": "Maximum stock tidak boleh lebih kecil dari minimum stock."})
        if g("reorder_level") and g("reorder_level") < g("min_stock"):
            raise serializers.ValidationError({"reorder_level": "Re-order level tidak boleh di bawah minimum stock."})
        zone = attrs.get("zone", getattr(self.instance, "zone", None))
        warehouse = attrs.get("warehouse", getattr(self.instance, "warehouse", None))
        if zone and warehouse and zone.warehouse_id != warehouse.id:
            raise serializers.ValidationError({"zone": "Zona bukan bagian dari warehouse yang dipilih."})
        return attrs


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    created_by_name = serializers.CharField(source="created_by.display_name", read_only=True, default=None)
    movement_display = serializers.CharField(source="get_movement_type_display", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id", "item", "item_name", "item_sku", "movement_type", "movement_display", "quantity", "change",
            "balance_after", "reference", "notes", "created_by_name", "created_at",
        ]
        read_only_fields = ["change", "balance_after", "created_at"]

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Jumlah tidak boleh negatif.")
        return value

    def validate(self, attrs):
        if attrs["movement_type"] in ("in", "out") and attrs["quantity"] <= 0:
            raise serializers.ValidationError({"quantity": "Jumlah harus lebih dari 0."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        item = InventoryItem.objects.select_for_update().get(pk=validated_data["item"].pk)
        qty = validated_data["quantity"]
        kind = validated_data["movement_type"]
        if kind == "in":
            change = qty
        elif kind == "out":
            if qty > item.quantity:
                raise serializers.ValidationError({"quantity": f"Stok tidak cukup. Tersedia: {item.quantity}."})
            change = -qty
        else:
            change = qty - item.quantity
        item.quantity += change
        item.save(update_fields=["quantity", "updated_at"])
        validated_data["change"] = change
        validated_data["balance_after"] = item.quantity
        return super().create(validated_data)
