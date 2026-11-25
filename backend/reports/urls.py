from django.urls import path

from .dashboard import DashboardActivityView, DashboardStatsView
from .views import ReportView

urlpatterns = [
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("dashboard/activity/", DashboardActivityView.as_view(), name="dashboard-activity"),
    path("reports/<slug:slug>/", ReportView.as_view(), name="report"),
]
