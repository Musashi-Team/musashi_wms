from rest_framework.routers import DefaultRouter

from .views import MaintenanceHistoryViewSet, MaintenancePlanViewSet

router = DefaultRouter()
router.register("plans", MaintenancePlanViewSet, basename="maintenance-plan")
router.register("histories", MaintenanceHistoryViewSet, basename="maintenance-history")

urlpatterns = router.urls
