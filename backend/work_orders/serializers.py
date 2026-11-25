from rest_framework import serializers

from .models import WorkOrder, WorkOrderAttachment, WorkOrderLog


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.display_name", read_only=True, default=None)

    class Meta:
        model = WorkOrderAttachment
        fields = ["id", "file", "description", "uploaded_by_name", "created_at"]
        read_only_fields = ["created_at"]


class LogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.display_name", read_only=True, default=None)

    class Meta:
        model = WorkOrderLog
        fields = ["id", "action", "detail", "user_name", "created_at"]


class WorkOrderSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True, default=None)
    asset_code = serializers.CharField(source="asset.asset_id", read_only=True, default=None)
    zone_name = serializers.CharField(source="zone.name", read_only=True, default=None)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.display_name", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.display_name", read_only=True, default=None)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = WorkOrder
        fields = [
            "id", "wo_number", "title", "description", "asset", "asset_name", "asset_code", "warehouse",
            "warehouse_name", "zone", "zone_name", "wo_type", "priority", "status", "due_date", "assigned_to",
            "assigned_to_name", "created_by_name", "notes", "completed_at", "created_at", "attachments",
        ]
        read_only_fields = ["wo_number", "completed_at", "created_at"]

    def validate(self, attrs):
        warehouse = attrs.get("warehouse", getattr(self.instance, "warehouse", None))
        zone = attrs.get("zone", getattr(self.instance, "zone", None))
        asset = attrs.get("asset", getattr(self.instance, "asset", None))
        if zone and warehouse and zone.warehouse_id != warehouse.id:
            raise serializers.ValidationError({"zone": "Zona bukan bagian dari warehouse yang dipilih."})
        if asset and warehouse and asset.warehouse_id != warehouse.id:
            raise serializers.ValidationError({"asset": "Aset bukan milik warehouse yang dipilih."})
        return attrs
