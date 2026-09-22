"""API v1 Router aggregation."""
from fastapi import APIRouter
from backend.app.api.v1.equipment import router as equipment_router
from backend.app.api.v1.fault_codes import router as fault_codes_router
from backend.app.api.v1.work_orders import router as work_orders_router
from backend.app.api.v1.inspections import router as inspections_router
from backend.app.api.v1.actions import router as actions_router
from backend.app.api.v1.telemetry import router as telemetry_router
from backend.app.auth.router import router as auth_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(equipment_router)
api_v1_router.include_router(fault_codes_router)
api_v1_router.include_router(work_orders_router)
api_v1_router.include_router(inspections_router)
api_v1_router.include_router(actions_router)
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(auth_router)
