import logging
from .bipad import fetch_bipad_alerts
from .supabase_client import supabase
from .cache import incidents_cache

logger = logging.getLogger(__name__)


def _incident_to_row(incident) -> dict:
    return {
        'id':               incident.id,
        'title':            incident.title,
        'description':      incident.description,
        'severity':         incident.severity.value,
        'lifecycle':        incident.lifecycle.value,
        'zone_id':          incident.zone.id,
        'zone_name':        incident.zone.name,
        'zone_district':    incident.zone.district,
        'zone_municipality': incident.zone.municipality,
        'latitude':         incident.latitude,
        'longitude':        incident.longitude,
        'reported_at':      incident.reported_at.isoformat(),
        'updated_at':       incident.updated_at.isoformat(),
    }


def sync_bipad_to_supabase() -> None:
    if not supabase:
        logger.warning('Supabase client not configured — skipping sync')
        return

    incidents = fetch_bipad_alerts()
    if not incidents:
        logger.warning('No incidents returned from BIPAD — skipping upsert')
        return

    rows = [_incident_to_row(i) for i in incidents]

    try:
        supabase.table('incidents').upsert(rows, on_conflict='id').execute()
        incidents_cache.clear()
        logger.info(f'Synced {len(rows)} incidents to Supabase')
    except Exception as e:
        logger.error(f'Supabase upsert failed: {e}')
