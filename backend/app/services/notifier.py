import asyncio
from ..models.incident import Severity
from .bipad import fetch_bipad_alerts
from .push import send_push_to_all

_seen_ids: set[str] = set()
_initialized = False

NOTIFY_SEVERITIES = {Severity.HIGH, Severity.CRITICAL}


async def _poll_loop():
    global _seen_ids, _initialized
    while True:
        try:
            incidents = fetch_bipad_alerts()
            current_ids = {i.id for i in incidents}

            if not _initialized:
                # First run: record existing incidents without notifying
                # so a server restart doesn't spam all devices
                _seen_ids = current_ids
                _initialized = True
                print(f"✓ Notifier initialised — tracking {len(_seen_ids)} existing incidents")
            else:
                new_incidents = [
                    i for i in incidents
                    if i.id not in _seen_ids and i.severity in NOTIFY_SEVERITIES
                ]
                for incident in new_incidents:
                    await send_push_to_all(
                        title=f"{incident.severity.value} — {incident.zone.district}",
                        body=incident.title,
                        data={
                            'incidentId': incident.id,
                            'lat': incident.latitude,
                            'lng': incident.longitude,
                        },
                    )
                _seen_ids = current_ids

        except Exception as e:
            print(f"✗ Notifier poll failed: {e}")

        await asyncio.sleep(60)


def start_notifier():
    asyncio.create_task(_poll_loop())
