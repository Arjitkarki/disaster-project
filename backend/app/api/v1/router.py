from fastapi import APIRouter
from .incidents import router as incidents_router
from .reports import router as reports_router

v1_router = APIRouter(prefix='/api/v1')
v1_router.include_router(incidents_router)
v1_router.include_router(reports_router)
