import httpx
from datetime import datetime, timedelta
from typing import List

from ..models.incident import Incident, Severity, Lifecycle, Zone
from ..core.config import USGS_BASE_URL

_NEPAL_BOUNDS = {
    'minlatitude':  26.0,
    'maxlatitude':  30.5,
    'minlongitude': 80.0,
    'maxlongitude': 88.5,
}


def _magnitude_to_severity(mag: float) -> Severity:
    if mag >= 7.0:
        return Severity.CRITICAL
    if mag >= 5.5:
        return Severity.HIGH
    if mag >= 4.0:
        return Severity.MODERATE
    return Severity.LOW


async def fetch_incidents(days_back: int = 30) -> List[Incident]:
    start = (datetime.utcnow() - timedelta(days=days_back)).strftime('%Y-%m-%d')
    params = {
        'format': 'geojson',
        'starttime': start,
        'minmagnitude': 3.0,
        **_NEPAL_BOUNDS,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f'{USGS_BASE_URL}/query', params=params)
        resp.raise_for_status()
        data = resp.json()

    incidents: List[Incident] = []
    for feature in data.get('features', []):
        props  = feature['properties']
        coords = feature['geometry']['coordinates']
        mag    = float(props.get('mag') or 0.0)
        place  = props.get('place') or 'Nepal'
        time_ms = int(props.get('time') or 0)
        reported_at = datetime.utcfromtimestamp(time_ms / 1000)

        district = place.split(', ')[-1] if ', ' in place else place

        incidents.append(Incident(
            id          = feature['id'],
            title       = f'M{mag:.1f} Earthquake — {place}',
            description = f'Magnitude {mag:.1f} earthquake recorded near {place}.',
            severity    = _magnitude_to_severity(mag),
            lifecycle   = Lifecycle.VERIFIED,
            zone        = Zone(id=feature['id'], name=place, district=district),
            latitude    = coords[1],
            longitude   = coords[0],
            reported_at = reported_at,
            updated_at  = reported_at,
        ))
    return incidents
