from rest_framework import serializers

from .models import MaintenanceHistory, MaintenancePlan


class MaintenancePlanSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True, default=None)
    asset_code = serializers.CharField(source="asset.asset_id", read_only=True, default=None)
    assigned_to_name = serializers.CharField(source="assigned_to.display_name", read_only=True, default=None)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)
    plan_type_display = serializers.CharField(source="get_plan_type_display", read_only=True)

    class Meta:
        model = MaintenancePlan
        fields = [
            "id", "title", "plan_type", "plan_type_display", "asset", "asset_name", "asset_code", "warehouse",
            "warehouse_name", "frequency", "frequency_display", "next_date", "last_date", "priority",
            "assigned_to", "assigned_to_name", "reminder_days", "description", "is_active", "created_at",
        ]
        read_only_fields = ["last_date", "created_at"]

    def validate(self, attrs):
        warehouse = attrs.get("warehouse", getattr(self.instance, "warehouse", None))
        asset = attrs.get("asset", getattr(self.instance, "asset", None))
        if asset and warehouse and asset.warehouse_id != warehouse.id:
            raise serializers.ValidationError({"asset": "Aset bukan milik warehouse yang dipilih."})
        return attrs


class MaintenanceHistorySerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    asset_code = serializers.CharField(source="asset.asset_id", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.display_name", read_only=True, default=None)
    wo_number = serializers.CharField(source="work_order.wo_number", read_only=True, default=None)

    class Meta:
        model = MaintenanceHistory
        fields = [
            "id", "asset", "asset_name", "asset_code", "plan", "work_order", "wo_number", "maintenance_type",
            "performed_by", "performed_by_name", "performed_at", "notes",
        ]
