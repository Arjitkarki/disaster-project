import httpx
from datetime import datetime, timedelta
from typing import List

from ..models.incident import Incident, Severity, Lifecycle, Zone
from ..core.config import GDACS_BASE_URL

_NEPAL_BBOX = '80,26,88,30.5'


def _extract_lon_lat(coords) -> tuple[float, float]:
    """Extract a representative lon/lat from any GeoJSON coordinate structure."""
    if not coords:
        return 84.0, 28.0
    if isinstance(coords[0], (int, float)):
        return float(coords[0]), float(coords[1]) if len(coords) > 1 else 28.0
    return _extract_lon_lat(coords[0])


def _alert_score_to_severity(score: float) -> Severity:
    if score >= 3.5:
        return Severity.CRITICAL
    if score >= 2.0:
        return Severity.HIGH
    if score >= 1.0:
        return Severity.MODERATE
    return Severity.LOW


async def fetch_incidents() -> List[Incident]:
    end   = datetime.utcnow()
    start = end - timedelta(days=90)
    params = {
        'fromDate': start.strftime('%Y-%m-%d'),
        'toDate':   end.strftime('%Y-%m-%d'),
        'bbox':     _NEPAL_BBOX,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f'{GDACS_BASE_URL}/events/geteventlist/MAP', params=params
        )
        if resp.status_code != 200:
            return []
        data = resp.json()

    incidents: List[Incident] = []
    for item in data.get('features', []):
        props    = item.get('properties', {})
        raw_coords = item.get('geometry', {}).get('coordinates', [84.0, 28.0])
        lon, lat   = _extract_lon_lat(raw_coords)
        event_id = str(props.get('eventid', ''))
        name     = props.get('name') or props.get('eventtype') or 'Disaster Event'
        score    = float(props.get('alertscore') or 0)
        fromdate = props.get('fromdate') or datetime.utcnow().isoformat()

        try:
            reported_at = datetime.fromisoformat(
                fromdate.replace('Z', '+00:00')
            ).replace(tzinfo=None)
        except Exception:
            reported_at = datetime.utcnow()

        incidents.append(Incident(
            id          = f'gdacs-{event_id}',
            title       = name,
            description = f'GDACS event: {name}. Alert score: {score:.1f}.',
            severity    = _alert_score_to_severity(score),
            lifecycle   = Lifecycle.ACTIVE,
            zone        = Zone(id=f'gdacs-{event_id}', name=name, district=name),
            latitude    = lat,
            longitude   = lon,
            reported_at = reported_at,
            updated_at  = reported_at,
        ))
    return incidents
