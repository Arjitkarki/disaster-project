from fastapi import APIRouter, HTTPException
from typing import List

from ...models.incident import Incident
from ...services import usgs, gdacs

router = APIRouter()


@router.get('/incidents', response_model=List[Incident])
async def list_incidents():
    try:
        usgs_incidents  = await usgs.fetch_incidents(days_back=30)
        gdacs_incidents = await gdacs.fetch_incidents()
        seen = set()
        unique = []
        for i in usgs_incidents + gdacs_incidents:
            if i.id not in seen:
                seen.add(i.id)
                unique.append(i)
        return sorted(unique, key=lambda i: i.reported_at, reverse=True)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Failed to fetch incidents: {exc}')
