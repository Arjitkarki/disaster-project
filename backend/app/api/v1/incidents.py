from fastapi import APIRouter
from typing import List

from ...models.incident import Incident
from ...services.staticdata import fetch_incidents

router = APIRouter()


@router.get('/incidents', response_model=List[Incident])
async def list_incidents():
    return sorted(fetch_incidents(), key=lambda i: i.reported_at, reverse=True)
