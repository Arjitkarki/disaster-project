from fastapi import APIRouter, HTTPException
from typing import List

from ...models.incident import Incident, Severity, Lifecycle, Zone
from ...services.supabase_client import supabase
from ...services.cache import incidents_cache, INCIDENTS_KEY

router = APIRouter()


def _row_to_incident(row: dict) -> Incident:
    return Incident(
        id=row['id'],
        title=row['title'],
        description=row['description'],
        severity=Severity(row['severity']),
        lifecycle=Lifecycle(row['lifecycle']),
        zone=Zone(
            id=row['zone_id'],
            name=row['zone_name'],
            district=row['zone_district'],
            municipality=row.get('zone_municipality'),
        ),
        latitude=row['latitude'],
        longitude=row['longitude'],
        reported_at=row['reported_at'],
        updated_at=row['updated_at'],
    )


@router.get('/incidents', response_model=List[Incident])
async def list_incidents():
    cached = incidents_cache.get(INCIDENTS_KEY)
    if cached is not None:
        return cached

    if not supabase:
        raise HTTPException(status_code=503, detail='Database not available')

    result = supabase.table('incidents').select('*').order('reported_at', desc=True).execute()
    incidents = [_row_to_incident(row) for row in result.data]

    incidents_cache[INCIDENTS_KEY] = incidents
    return incidents
