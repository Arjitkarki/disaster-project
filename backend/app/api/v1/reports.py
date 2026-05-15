# reports.py
#
# Defines two endpoints:
#   POST /api/v1/reports  — citizen submits a new report
#   GET  /api/v1/reports  — fetch all reports (shown in the Feed)
#
# Previously, reports were stored in a Python list (_reports) that lived in memory.
# That list was wiped every time the server restarted.
#
# Now reports are persisted in a Supabase Postgres table called `reports`.
# The shape of each row matches the ReportResponse Pydantic model exactly.

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from typing import List

from ...models.incident import ReportCreate, ReportResponse, Lifecycle

# Import the shared Supabase client created in supabase_client.py
from ...services.supabase_client import supabase

router = APIRouter()

# ---------------------------------------------------------------------------
# POST /api/v1/reports
# ---------------------------------------------------------------------------
# Called by CitizenReportScreen when a user submits a report.
# Payload arrives as a ReportCreate (description, latitude, longitude, image_url?).
# We assign a UUID and timestamp here on the server, then insert into Supabase.

@router.post('/reports', response_model=ReportResponse, status_code=201)
async def create_report(payload: ReportCreate) -> ReportResponse:

    # Build the row we want to insert.
    # Supabase expects a plain dict — not a Pydantic model.
    row = {
        'id':           str(uuid.uuid4()),           # random unique ID
        'description':  payload.description,
        'latitude':     payload.latitude,
        'longitude':    payload.longitude,
        'image_url':    payload.image_url,           # None if not provided
        'submitted_at': datetime.now(timezone.utc).isoformat(),
        'lifecycle':    Lifecycle.REPORTED.value,    # always starts as REPORTED
    }

    # .table('reports')  — target the `reports` table in Supabase
    # .insert(row)       — insert our dict as a new row
    # .execute()         — actually send the request; returns a response object
    # .data              — the list of rows that were inserted (Supabase always returns a list)
    result = supabase.table('reports').insert(row).execute()

    # result.data is a list of inserted rows.
    # We expect exactly one row back. If it's empty, something went wrong.
    if not result.data:
        raise HTTPException(status_code=500, detail='Report insert failed')

    # Return the first (and only) inserted row, validated against ReportResponse.
    return ReportResponse(**result.data[0])


# ---------------------------------------------------------------------------
# GET /api/v1/reports
# ---------------------------------------------------------------------------
# Called by FeedScreen on mount to populate the citizen report cards.
# Returns all reports, newest first.

@router.get('/reports', response_model=List[ReportResponse])
async def list_reports() -> List[ReportResponse]:

    # .table('reports')              — target the `reports` table
    # .select('*')                   — fetch all columns
    # .order('submitted_at', desc=True)  — newest first
    # .execute()                     — send the request
    result = supabase.table('reports').select('*').order('submitted_at', desc=True).execute()

    # result.data is a list of row dicts.
    # We validate each one into a ReportResponse before returning.
    return [ReportResponse(**row) for row in result.data]
