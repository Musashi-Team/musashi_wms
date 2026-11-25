// Cermin dari accounts/permissions.py di backend. Backend tetap menjadi penentu akhir.
const SUPER = 'super_admin';
const WH = 'warehouse_admin';
const SUP = 'maintenance_supervisor';
const TECH = 'technician';
const STAFF = 'warehouse_staff';

export const ROLE_LABELS = {
  [SUPER]: 'Super Admin',
  [WH]: 'Warehouse Admin',
  [SUP]: 'Maintenance Supervisor',
  [TECH]: 'Technician',
};

export const PERMS = {
  users: [SUPER],
  warehouses: [SUPER, WH],
  assets: [SUPER, WH, SUP],
  assetDelete: [SUPER, WH],
  workOrders: [SUPER, WH, SUP],
  workOrderUpdate: [SUPER, WH, SUP, TECH],
  maintenance: [SUPER, WH, SUP],
  maintenanceComplete: [SUPER, WH, SUP, TECH],
  inventory: [SUPER, WH, STAFF],
};

export const can = (user, key) => !!user && PERMS[key]?.includes(user.role);
