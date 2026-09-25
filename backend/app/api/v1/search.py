"""Global search across assets, work orders, and SOPs."""
from fastapi import APIRouter, Query
from backend.app.database.equipment_repository import EquipmentRepository
from backend.app.database.work_order_repository import WorkOrderRepository
from backend.app.services import sop_service

router = APIRouter(prefix="/search", tags=["Search v1"])
equipment = EquipmentRepository()
work_orders = WorkOrderRepository()
MAX_PER_GROUP = 5


@router.get("")
def search(q: str = Query(..., min_length=2, max_length=100)):
    needle = q.strip().lower()
    assets = [
        {k: e[k] for k in ("machine_id", "name", "type", "location", "status")}
        for e in equipment.get_all_equipment()
        if any(needle in str(e[k]).lower() for k in ("machine_id", "name", "type", "location"))
    ][:MAX_PER_GROUP]
    orders, _ = work_orders.search_work_orders(q=q, limit=MAX_PER_GROUP)
    sops = sop_service.list_sops(q=q)[:MAX_PER_GROUP]
    return {
        "assets": assets,
        "work_orders": [{k: w[k] for k in ("work_order_id", "title", "machine_id", "status")} for w in orders],
        "sops": [{k: s[k] for k in ("id", "title", "file", "status")} for s in sops],
    }
