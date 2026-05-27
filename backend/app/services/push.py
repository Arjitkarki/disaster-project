import httpx
from typing import Optional
from .supabase_client import supabase

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_to_all(title: str, body: str, data: Optional[dict] = None):
    result = supabase.table('device_tokens').select('token').execute()
    tokens = [row['token'] for row in (result.data or [])]
    if not tokens:
        return

    messages = [
        {
            'to': token,
            'title': title,
            'body': body,
            'data': data or {},
            'sound': 'default',
            'priority': 'high',
            'channelId': 'disaster-alerts',
        }
        for token in tokens
    ]

    try:
        async with httpx.AsyncClient() as client:
            await client.post(EXPO_PUSH_URL, json=messages, timeout=10.0)
        print(f"✓ Sent push to {len(tokens)} device(s): {title}")
    except Exception as e:
        print(f"✗ Push failed: {e}")
