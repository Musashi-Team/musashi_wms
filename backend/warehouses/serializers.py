from rest_framework import serializers

from .models import Warehouse, WarehouseZone


class ZoneSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = WarehouseZone
        fields = ["id", "warehouse", "warehouse_name", "name", "code", "description"]
        validators = []

    def validate(self, attrs):
        wh = attrs.get("warehouse", getattr(self.instance, "warehouse", None))
        code = attrs.get("code", getattr(self.instance, "code", None))
        qs = WarehouseZone.objects.filter(warehouse=wh, code=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"code": "Kode zona sudah dipakai di warehouse ini."})
        return attrs


class WarehouseSerializer(serializers.ModelSerializer):
    zones = ZoneSerializer(many=True, read_only=True)

    class Meta:
        model = Warehouse
        fields = ["id", "name", "code", "address", "is_active", "zones", "created_at"]
        read_only_fields = ["created_at"]
