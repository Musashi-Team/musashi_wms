from rest_framework import serializers

from .models import Asset, AssetCategory


class AssetCategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(source="assets.count", read_only=True)

    class Meta:
        model = AssetCategory
        fields = ["id", "name", "description", "asset_count"]


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    condition_display = serializers.CharField(source="get_condition_display", read_only=True)

    class Meta:
        model = Asset
        fields = [
            "id", "asset_id", "name", "category", "category_name", "serial_number", "warehouse",
            "warehouse_name", "zone", "zone_name", "location_detail", "purchase_date", "condition",
            "condition_display", "status", "status_display", "description", "photo", "created_at", "updated_at",
        ]
        read_only_fields = ["asset_id", "created_at", "updated_at"]

    def validate(self, attrs):
        warehouse = attrs.get("warehouse", getattr(self.instance, "warehouse", None))
        zone = attrs.get("zone", getattr(self.instance, "zone", None))
        if zone and warehouse and zone.warehouse_id != warehouse.id:
            raise serializers.ValidationError({"zone": "Zona bukan bagian dari warehouse yang dipilih."})
        return attrs
