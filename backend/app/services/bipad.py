import httpx
from datetime import datetime
from typing import List

from ..models.incident import Incident, Severity, Lifecycle, Zone

BIPAD_ALERT_URL = "https://bipadportal.gov.np/api/v1/alert/"

_RANK_SEVERITY = {0: Severity.LOW, 1: Severity.MODERATE, 2: Severity.HIGH, 3: Severity.CRITICAL}


def _is_above_warning_level(description: str) -> bool:
    try:
        warning = None
        water = None
        for line in description.split('\n'):
            line = line.strip()
            if line.startswith('Warning level:'):
                warning = float(line.split(':', 1)[1].strip())
            elif line.startswith('Water level:'):
                water = float(line.split(':', 1)[1].strip())
        if warning is not None and water is not None:
            return water > warning
    except Exception:
        pass
    return False


def map_severity(record: dict) -> Severity:
    demography = record.get('affectedDemography') or {}
    count = demography.get('householdCount') or 0
    ref_type = (record.get('referenceType') or '').lower()
    description = record.get('description') or ''

    if count > 50000:
        rank = 3
    elif count > 10000:
        rank = 2
    elif count > 1000:
        rank = 1
    else:
        rank = 0

    if ref_type == 'earthquake':
        rank = max(rank, 2)
    elif ref_type == 'landslide':
        rank = max(rank, 2)
    elif ref_type == 'river' and _is_above_warning_level(description):
        rank = max(rank, 1)
    elif ref_type == 'fire':
        rank = max(rank, 1)
    elif ref_type in ('road', 'road_blockage', 'road blockage'):
        rank = max(rank, 1)
    elif ref_type in ('rainfall', 'heavy rainfall', 'heavy_rainfall'):
        rank = max(rank, 1)

    return _RANK_SEVERITY[rank]


def extract_district(title: str) -> str:
    try:
        if ',' in title:
            return title.split(',')[-1].strip()
    except Exception:
        pass
    return 'Nepal'


def fetch_bipad_alerts() -> List[Incident]:
    try:
        response = httpx.get(
            BIPAD_ALERT_URL,
            params={'limit': 100, 'public': 'true', 'ordering': '-id'},
            timeout=10.0,
        )
        response.raise_for_status()
        records = response.json().get('results', [])

        incidents: List[Incident] = []
        for rec in records:
            if not rec.get('verified'):
                continue
            if not rec.get('point'):
                continue

            demography = rec.get('affectedDemography') or {}
            household_count = demography.get('householdCount') or 0

            raw_desc = (rec.get('description') or '').strip()
            title_ne = rec.get('titleNe') or ''
            desc = raw_desc
            if title_ne:
                desc += f' (नेपाली: {title_ne})'
            if household_count > 0:
                desc += f' Affected households: {household_count}'

            coords = rec['point']['coordinates']  # GeoJSON: [longitude, latitude]

            incidents.append(Incident(
                id=f"bipad-{rec['id']}",
                title=rec.get('title') or '',
                title_ne=rec.get('titleNe') or None,
                description=desc,
                severity=map_severity(rec),
                lifecycle=Lifecycle.VERIFIED if rec.get('verified') else Lifecycle.REPORTED,
                zone=Zone(
                    id=str(rec['id']),
                    name=rec.get('referenceType') or 'unknown',
                    district=extract_district(rec.get('title') or ''),
                    municipality=None,
                ),
                latitude=coords[1],
                longitude=coords[0],
                reported_at=datetime.fromisoformat(rec['startedOn']),
                updated_at=datetime.fromisoformat(rec['createdOn']),
            ))

        incidents.sort(key=lambda i: i.reported_at, reverse=True)
        print(f"✓ Fetched {len(incidents)} alerts from Bipad Portal")
        return incidents

    except Exception as e:
        print(f"✗ Bipad API failed: {e}")
        return []
