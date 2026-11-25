from django.db import models


class AssetCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "asset_categories"
        ordering = ["name"]
        verbose_name_plural = "asset categories"

    def __str__(self):
        return self.name


class Asset(models.Model):
    class Condition(models.TextChoices):
        EXCELLENT = "excellent", "Excellent"
        GOOD = "good", "Good"
        FAIR = "fair", "Fair"
        POOR = "poor", "Poor"

    class Status(models.TextChoices):
        OPERATIONAL = "operational", "Operational"
        MAINTENANCE = "maintenance", "Maintenance"
        OFFLINE = "offline", "Offline"

    asset_id = models.CharField(max_length=20, unique=True, blank=True)
    name = models.CharField(max_length=160)
    category = models.ForeignKey(AssetCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name="assets")
    serial_number = models.CharField(max_length=80, blank=True)
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.CASCADE, related_name="assets")
    zone = models.ForeignKey("warehouses.WarehouseZone", null=True, blank=True, on_delete=models.SET_NULL, related_name="assets")
    location_detail = models.CharField(max_length=120, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    condition = models.CharField(max_length=12, choices=Condition.choices, default=Condition.GOOD)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPERATIONAL)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="assets/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assets"
        ordering = ["asset_id"]

    def __str__(self):
        return f"{self.asset_id} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.asset_id:
            number = (Asset.objects.order_by("-id").values_list("id", flat=True).first() or 0) + 1
            while Asset.objects.filter(asset_id=f"AST-{number:04d}").exists():
                number += 1
            self.asset_id = f"AST-{number:04d}"
        super().save(*args, **kwargs)
