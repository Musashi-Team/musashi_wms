from rest_framework.routers import DefaultRouter

from .views import WarehouseViewSet, ZoneViewSet

router = DefaultRouter()
router.register("warehouses", WarehouseViewSet, basename="warehouse")
router.register("zones", ZoneViewSet, basename="zone")

urlpatterns = router.urls
