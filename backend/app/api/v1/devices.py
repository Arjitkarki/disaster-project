from fastapi import APIRouter
from pydantic import BaseModel
from ...services.supabase_client import supabase

router = APIRouter()


class DeviceTokenPayload(BaseModel):
    token: str
    platform: str  # 'ios' or 'android'


@router.post('/devices', status_code=204)
async def register_device(payload: DeviceTokenPayload):
    supabase.table('device_tokens').upsert(
        {'token': payload.token, 'platform': payload.platform},
        on_conflict='token',
    ).execute()
