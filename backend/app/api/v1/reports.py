import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from typing import List

from ...models.incident import ReportCreate, ReportResponse, Lifecycle
from ...services.supabase_client import supabase

router = APIRouter()


@router.post('/reports', response_model=ReportResponse, status_code=201)
async def create_report(payload: ReportCreate) -> ReportResponse:
    row = {
        'id':           str(uuid.uuid4()),
        'description':  payload.description,
        'latitude':     payload.latitude,
        'longitude':    payload.longitude,
        'image_url':    payload.image_url,
        'submitted_at': datetime.now(timezone.utc).isoformat(),
        'lifecycle':    Lifecycle.REPORTED.value,
    }
    result = supabase.table('reports').insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail='Report insert failed')
    return ReportResponse(**result.data[0])


@router.get('/reports', response_model=List[ReportResponse])
async def list_reports() -> List[ReportResponse]:
    result = supabase.table('reports').select('*').order('submitted_at', desc=True).execute()
    return [ReportResponse(**row) for row in result.data]
