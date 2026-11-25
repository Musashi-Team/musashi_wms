from django.contrib import admin

from .models import MaintenanceHistory, MaintenancePlan

admin.site.register(MaintenancePlan)
admin.site.register(MaintenanceHistory)
