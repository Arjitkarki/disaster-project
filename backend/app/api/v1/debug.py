from collections import Counter
from typing import List

from fastapi import APIRouter

from ...models.incident import Incident
from ...services.bipad import fetch_bipad_alerts

router = APIRouter()


@router.get('/debug/bipad')
async def debug_bipad():
    incidents: List[Incident] = fetch_bipad_alerts()
    source = 'bipad' if incidents and incidents[0].id.startswith('bipad-') else 'static'
    counts = Counter(i.severity.value for i in incidents)
    return {
        'source': source,
        'count': len(incidents),
        'severity_breakdown': {
            'CRITICAL': counts.get('CRITICAL', 0),
            'HIGH':     counts.get('HIGH', 0),
            'MODERATE': counts.get('MODERATE', 0),
            'LOW':      counts.get('LOW', 0),
        },
        'sample': [i.model_dump() for i in incidents[:3]],
    }
