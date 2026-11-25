"""Role-based access control (RBAC).

Aturan:
- Semua user yang login boleh MEMBACA data (GET).
- Untuk menulis (POST/PUT/PATCH/DELETE), role harus termasuk di `write_roles`
  pada view, atau di `action_roles[<nama action>]` jika action tersebut diatur khusus.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

SUPER = "super_admin"
WH_ADMIN = "warehouse_admin"
SUPERVISOR = "maintenance_supervisor"
TECH = "technician"
STAFF = "warehouse_staff"

ADMINS = (SUPER, WH_ADMIN)
MAINT_MANAGERS = (SUPER, WH_ADMIN, SUPERVISOR)
INVENTORY_ROLES = (SUPER, WH_ADMIN, STAFF)
ALL_ROLES = (SUPER, WH_ADMIN, SUPERVISOR, TECH, STAFF)


class RolePermission(BasePermission):
    message = "Role Anda tidak memiliki hak akses untuk tindakan ini."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        if user.is_superuser:
            return True
        action = getattr(view, "action", None)
        action_roles = getattr(view, "action_roles", {})
        roles = action_roles.get(action, getattr(view, "write_roles", ADMINS))
        return user.role in roles
