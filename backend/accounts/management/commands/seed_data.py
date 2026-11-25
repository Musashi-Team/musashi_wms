"""Isi database dengan data awal agar dashboard langsung terisi.

Jalankan:  python manage.py seed_data          (aman: berhenti jika sudah ada data)
           python manage.py seed_data --reset  (hapus SEMUA data lalu isi ulang)

Angka dashboard (128 aset, 24 WO aktif, 18 re-order alert, dst.) berasal dari baris-baris
yang dibuat di sini, lalu dihitung oleh API dari database.
"""
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Notification, User
from assets.models import Asset, AssetCategory
from inventory.models import InventoryItem, StockMovement
from maintenance.models import MaintenanceHistory, MaintenancePlan
from warehouses.models import Warehouse, WarehouseZone
from work_orders.models import WorkOrder, WorkOrderLog

ASSET_TYPES = [
    # (nama, kode, kategori, zona)
    ("Conveyor", "CV", "Conveyor", "A"),
    ("Forklift", "FL", "Material Handling", "C"),
    ("Dock leveler", "DL", "Loading Dock", "B"),
    ("HVAC", "AC", "HVAC", "D"),
    ("Hydraulic pump", "HP", "Hydraulic", "C"),
    ("Pallet rack", "PR", "Racking", "B"),
    ("Fire station", "FS", "Safety", "D"),
    ("Scanner", "SC", "Electronics", "A"),
]

WO_TITLES = [
    "Motor bearing lubrication", "Safety guard inspection", "Emergency stop test", "Battery pack check",
    "Roller replacement", "Belt tension adjustment", "Filter replacement", "Brake inspection",
    "Hydraulic hose check", "Rack anchor inspection", "Scanner calibration", "Thermostat calibration",
    "Door seal repair", "Lighting repair", "Chain lubrication", "Sensor alignment",
]

PART_NAMES = [
    "Conveyor belt 1.2m", "Bearing 6204", "Hydraulic oil 20L", "Air filter", "V-belt B52", "Forklift battery cell",
    "Safety gloves", "LED lamp 40W", "Fuse 10A", "Grease cartridge", "Support roller", "Chain link",
    "Hydraulic hose 1/2in", "Pressure sensor", "Contactor 24V", "Relay 24V", "Cable tie 300mm",
    "Lubricant spray", "Caster wheel", "Proximity sensor",
]


class Command(BaseCommand):
    help = "Isi database dengan data sample MUSASHI WMS"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Hapus semua data sebelum seeding")

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts["reset"]:
            for model in (WorkOrderLog, WorkOrder, MaintenanceHistory, MaintenancePlan, StockMovement,
                          InventoryItem, Asset, AssetCategory, Notification, WarehouseZone, Warehouse, User):
                model.objects.all().delete()
        elif User.objects.filter(username="admin").exists():
            self.stdout.write(self.style.WARNING("Data sudah ada. Gunakan --reset untuk mengisi ulang."))
            return

        rng = random.Random(2026)
        today = timezone.localdate()
        now = timezone.now()

        # ---------- Warehouses & zones ----------
        main = Warehouse.objects.create(name="Main warehouse", code="MW-01", address="Plant 01 - All zones")
        north = Warehouse.objects.create(name="North depot", code="ND-02", address="Plant 02 - Cold storage")
        zones = {z: WarehouseZone.objects.create(warehouse=main, name=f"Zone {z}", code=z) for z in "ABCD"}
        n_zones = {z: WarehouseZone.objects.create(warehouse=north, name=f"Zone {z}", code=z) for z in "AB"}

        # ---------- Users ----------
        def make_user(username, first, last, role, password="Password123!", **extra):
            return User.objects.create_user(
                username=username, password=password, first_name=first, last_name=last,
                email=f"{username}@musashi.local", role=role, warehouse=main, **extra,
            )

        admin = make_user("admin", "Warehouse", "Admin", "super_admin", password="Admin123!",
                          is_superuser=True, is_staff=True)
        make_user("whadmin", "Dewi", "Lestari", "warehouse_admin")
        make_user("supervisor", "Hendra", "Gunawan", "maintenance_supervisor")
        techs = [
            make_user("tech1", "A.", "Pratama", "technician"),
            make_user("tech2", "B.", "Santoso", "technician"),
            make_user("tech3", "D.", "Wijaya", "technician"),
            make_user("tech4", "R.", "Putra", "technician"),
        ]
        make_user("staff", "Sari", "Wulandari", "warehouse_staff")

        # ---------- Assets (128 = 116 operational + 8 maintenance + 4 offline) ----------
        cats = {name: AssetCategory.objects.create(name=name) for _, _, name, _ in ASSET_TYPES}
        statuses = ["operational"] * 116 + ["maintenance"] * 8 + ["offline"] * 4
        rng.shuffle(statuses)
        by_name = {}
        for i in range(128):
            kind, code, cat, zone = ASSET_TYPES[i % 8]
            name = f"{kind} {code}-{i // 8 + 1:02d}"
            status = statuses[i]
            condition = {"offline": "poor", "maintenance": "fair"}.get(status) or rng.choice(["excellent", "good", "good", "fair"])
            asset = Asset.objects.create(
                name=name, category=cats[cat], serial_number=f"SN-{2018 + i % 7}-{1000 + i}", warehouse=main,
                zone=zones[zone], purchase_date=today - timedelta(days=rng.randint(200, 2800)),
                condition=condition, status=status, description=f"{kind} unit di {zones[zone].name}.",
            )
            by_name[name] = asset
        for i in range(12):
            kind, code, cat, _ = ASSET_TYPES[i % 8]
            Asset.objects.create(
                name=f"{kind} {code}-N{i + 1:02d}", category=cats[cat], serial_number=f"SN-N-{200 + i}",
                warehouse=north, zone=n_zones["AB"[i % 2]], purchase_date=today - timedelta(days=rng.randint(200, 1500)),
                condition="good", status="operational",
            )
        main_assets = list(Asset.objects.filter(warehouse=main))

        # ---------- Work orders ----------
        used_numbers = set()

        def make_wo(number, title, asset, priority, status, due, tech, wo_type="corrective",
                    created_ago=1, done_ago=None, warehouse=main):
            used_numbers.add(number)
            wo = WorkOrder.objects.create(
                wo_number=f"WO-{number}", title=title, asset=asset, warehouse=warehouse,
                zone=asset.zone if asset else None, wo_type=wo_type, priority=priority, status=status,
                due_date=due, assigned_to=tech, created_by=admin,
                description=f"{title} pada {asset.name}." if asset else title,
            )
            fields = {"created_at": now - timedelta(days=created_ago, hours=rng.randint(0, 5))}
            if done_ago is not None:
                fields["completed_at"] = now - timedelta(days=done_ago, hours=rng.randint(0, 4))
            WorkOrder.objects.filter(pk=wo.pk).update(**fields)
            WorkOrderLog.objects.create(work_order=wo, user=admin, action="created", detail="Data awal (seed)")
            return wo

        # 4 WO dari gambar referensi
        make_wo(1048, "Conveyor belt inspection", by_name["Conveyor CV-03"], "high", "overdue", today - timedelta(days=2), techs[0], "preventive", 6)
        make_wo(1052, "Hydraulic oil replacement", by_name["Forklift FL-07"], "high", "in_progress", today, techs[1], "preventive", 3)
        make_wo(1055, "Loading dock safety check", by_name["Dock leveler DL-02"], "medium", "open", today + timedelta(days=1), techs[2], "preventive", 2)
        make_wo(1057, "Cooling unit filter service", by_name["HVAC AC-04"], "low", "scheduled", today + timedelta(days=2), techs[3], "preventive", 1)

        counter = [1000]

        def next_number():
            counter[0] += 1
            while counter[0] in used_numbers:
                counter[0] += 1
            return counter[0]

        def pick():
            return rng.choice(main_assets), rng.choice(WO_TITLES), rng.choice(techs)

        # 5 overdue tambahan -> total overdue 6
        for k in range(1, 6):
            a, t, tech = pick()
            make_wo(next_number(), t, a, rng.choice(["high", "medium", "low"]), "overdue", today - timedelta(days=k), tech, created_ago=k + rng.randint(2, 6))
        # 3 jatuh tempo hari ini -> total due today 4
        for st in ("in_progress", "open", "open"):
            a, t, tech = pick()
            make_wo(next_number(), t, a, rng.choice(["high", "medium"]), st, today, tech, created_ago=rng.randint(1, 5))
        # 12 mendatang
        for k in range(12):
            a, t, tech = pick()
            make_wo(next_number(), t, a, rng.choice(["high", "medium", "low"]), ["open", "scheduled", "in_progress"][k % 3],
                    today + timedelta(days=k + 1), tech, rng.choice(["preventive", "corrective"]), created_ago=rng.randint(0, 6))
        # 120 selesai (60 dalam 7 hari terakhir, 60 sebelumnya) -> data grafik + riwayat maintenance
        for k in range(120):
            done_ago = rng.randint(0, 6) if k < 60 else rng.randint(7, 29)
            a, t, tech = pick()
            wo_type = rng.choice(["preventive", "corrective"])
            wo = make_wo(next_number(), t, a, rng.choice(["high", "medium", "low"]), "completed",
                         today - timedelta(days=done_ago), tech, wo_type,
                         created_ago=done_ago + rng.randint(1, 4), done_ago=done_ago)
            MaintenanceHistory.objects.create(
                asset=a, work_order=wo, maintenance_type=wo_type, performed_by=tech,
                performed_at=today - timedelta(days=done_ago), notes=t,
            )
        # 2 dibatalkan
        for _ in range(2):
            a, t, tech = pick()
            make_wo(next_number(), t, a, "low", "cancelled", today - timedelta(days=3), tech, created_ago=8)
        # warehouse ke-2
        n_assets = list(Asset.objects.filter(warehouse=north))
        make_wo(next_number(), "Cold room door seal check", n_assets[0], "medium", "open", today + timedelta(days=3), techs[0], warehouse=north)
        make_wo(next_number(), "Compressor service", n_assets[1], "high", "scheduled", today + timedelta(days=5), techs[1], warehouse=north)
        make_wo(next_number(), "Rack inspection", n_assets[2], "low", "completed", today - timedelta(days=1), techs[2], "preventive", 3, 1, warehouse=north)

        # ---------- Maintenance plans ----------
        plan_defs = [
            ("Monthly conveyor inspection", "Conveyor CV-01", "monthly", 1, "preventive"),
            ("Weekly forklift safety check", "Forklift FL-02", "weekly", 3, "preventive"),
            ("Quarterly HVAC filter service", "HVAC AC-02", "quarterly", 5, "preventive"),
            ("Dock leveler lubrication", "Dock leveler DL-03", "monthly", 7, "preventive"),
            ("Hydraulic pump oil change", "Hydraulic pump HP-02", "semiannual", 10, "preventive"),
            ("Pallet rack anchor inspection", "Pallet rack PR-02", "quarterly", 14, "preventive"),
            ("Fire station annual inspection", "Fire station FS-01", "yearly", 20, "preventive"),
            ("Scanner calibration", "Scanner SC-03", "monthly", 25, "preventive"),
            ("Conveyor motor bearing replacement", "Conveyor CV-05", "once", 30, "corrective"),
            ("Biweekly forklift battery check", "Forklift FL-04", "biweekly", 12, "preventive"),
        ]
        for idx, (title, asset_name, freq, days, kind) in enumerate(plan_defs):
            MaintenancePlan.objects.create(
                title=title, plan_type=kind, asset=by_name[asset_name], warehouse=main, frequency=freq,
                next_date=today + timedelta(days=days), priority=rng.choice(["high", "medium", "low"]),
                assigned_to=techs[idx % 4], reminder_days=3, description=f"{title} sesuai SOP.",
                last_date=today - timedelta(days=rng.randint(10, 40)) if kind == "preventive" else None,
            )

        # ---------- Inventory ----------
        def make_items(warehouse, count, zone_map):
            for i in range(count):
                name = f"{PART_NAMES[i % len(PART_NAMES)]}" + (f" #{i // len(PART_NAMES) + 1}" if i >= len(PART_NAMES) else "")
                if warehouse == main and i < 18:  # 18 item mencapai re-order level
                    qty = 0 if i == 0 else rng.randint(3, 20)
                elif warehouse == main and i < 24:  # 6 item melebihi max stock
                    qty = rng.randint(110, 140)
                else:
                    qty = rng.randint(30, 90)
                item = InventoryItem.objects.create(
                    name=name, category=["Spare part", "Consumable", "Electrical", "Safety"][i % 4],
                    unit="pcs", warehouse=warehouse, zone=zone_map[list(zone_map)[i % len(zone_map)]],
                    quantity=qty, min_stock=10, max_stock=100, reorder_level=20,
                    reorder_quantity=rng.choice([10, 20, 30, 50]),
                )
                out = rng.randint(2, 8) if i % 3 == 0 else 0
                StockMovement.objects.create(
                    item=item, movement_type="in", quantity=qty + out, change=qty + out,
                    balance_after=qty + out, reference="Initial stock", created_by=admin,
                )
                if out:
                    StockMovement.objects.create(
                        item=item, movement_type="out", quantity=out, change=-out,
                        balance_after=qty, reference="WO usage", created_by=admin,
                    )

        make_items(main, 40, zones)
        make_items(north, 8, n_zones)

        self.stdout.write(self.style.SUCCESS("Seed selesai."))
        self.stdout.write("Login: admin / Admin123!   (user lain: whadmin, supervisor, tech1-4, staff / Password123!)")
