from django.db import models


class Warehouse(models.Model):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "warehouses"
        ordering = ["name"]

    def __str__(self):
        return self.name


class WarehouseZone(models.Model):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="zones")
    name = models.CharField(max_length=80)
    code = models.CharField(max_length=20)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "warehouse_zones"
        ordering = ["warehouse", "name"]
        unique_together = [("warehouse", "code")]

    def __str__(self):
        return f"{self.warehouse.code} / {self.name}"
