import uuid
from datetime import datetime
from fastapi import APIRouter
from typing import List

from ...models.incident import ReportCreate, ReportResponse, Lifecycle

router = APIRouter()

# In-memory store — replaced by Supabase when activated
_reports: List[ReportResponse] = []


@router.post('/reports', response_model=ReportResponse, status_code=201)
async def create_report(payload: ReportCreate) -> ReportResponse:
    report = ReportResponse(
        id           = str(uuid.uuid4()),
        description  = payload.description,
        latitude     = payload.latitude,
        longitude    = payload.longitude,
        image_url    = payload.image_url,
        submitted_at = datetime.utcnow(),
        lifecycle    = Lifecycle.REPORTED,
    )
    _reports.append(report)
    return report


@router.get('/reports', response_model=List[ReportResponse])
async def list_reports() -> List[ReportResponse]:
    return list(reversed(_reports))
