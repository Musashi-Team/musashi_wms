from django.contrib import admin

from .models import WorkOrder, WorkOrderAttachment, WorkOrderLog

admin.site.register(WorkOrder)
admin.site.register(WorkOrderAttachment)
admin.site.register(WorkOrderLog)
