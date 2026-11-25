from django.conf import settings
from django.db import models


class InventoryItem(models.Model):
    sku = models.CharField(max_length=20, unique=True, blank=True)
    name = models.CharField(max_length=160)
    category = models.CharField(max_length=80, blank=True)
    unit = models.CharField(max_length=20, default="pcs")
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.CASCADE, related_name="inventory_items")
    zone = models.ForeignKey("warehouses.WarehouseZone", null=True, blank=True, on_delete=models.SET_NULL, related_name="inventory_items")
    quantity = models.PositiveIntegerField(default=0)
    min_stock = models.PositiveIntegerField(default=0)
    max_stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=0)
    reorder_quantity = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_items"
        ordering = ["name"]

    def __str__(self):
        return f"{self.sku} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.sku:
            number = (InventoryItem.objects.order_by("-id").values_list("id", flat=True).first() or 0) + 1
            while InventoryItem.objects.filter(sku=f"SKU-{number:04d}").exists():
                number += 1
            self.sku = f"SKU-{number:04d}"
        super().save(*args, **kwargs)

    @property
    def stock_status(self):
        if self.quantity == 0:
            return "out"
        if self.quantity <= self.min_stock:
            return "critical"
        if self.quantity <= self.reorder_level:
            return "reorder"
        if self.max_stock and self.quantity > self.max_stock:
            return "over"
        return "ok"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        IN = "in", "Stock In"
        OUT = "out", "Stock Out"
        ADJUSTMENT = "adjustment", "Adjustment"

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField(max_length=12, choices=MovementType.choices)
    # in/out: jumlah yang masuk/keluar. adjustment: jumlah stok hasil hitung fisik (nilai baru).
    quantity = models.PositiveIntegerField()
    change = models.IntegerField(default=0)
    balance_after = models.PositiveIntegerField(default=0)
    reference = models.CharField(max_length=80, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_movements"
        ordering = ["-created_at", "-id"]
