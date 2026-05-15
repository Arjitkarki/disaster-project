# Supabase Integration — Session Log (2026-05-05)

## What We Did

End-to-end Supabase persistence for citizen Reports: from the mobile CitizenReport form
through the FastAPI backend and into a real Postgres table, with the Feed updating automatically.

---

## 1. Backend — supabase_client.py

**File:** `backend/app/services/supabase_client.py`
**Status:** Already written before this session. No changes made, but reviewed in full.

**What it does:**
- Creates a single shared Supabase client at import time using `create_client()` from `supabase-py`
- Imported by any backend module that needs to query Supabase — Python module caching means only one client instance ever exists
- Uses `SUPABASE_SERVICE_KEY` (not `SUPABASE_ANON_KEY`) because this runs server-side and needs to bypass Row Level Security

```python
from supabase import create_client, Client
from ..core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```

---

## 2. Backend — config.py

**File:** `backend/app/core/config.py`
**Status:** Already written. No changes made.

Reads Supabase credentials from the project root `.env` file. Key names are case-sensitive:

```
Supabase_Url
Supabase_Anon_Key
Supabase_Secret_Key   ← loaded as SUPABASE_SERVICE_KEY in code
```

---

## 3. Backend — reports.py

**File:** `backend/app/api/v1/reports.py`
**Status:** Already written before this session. No changes made, but reviewed in full.

Two endpoints, both wired to Supabase:

### POST /api/v1/reports
Called by CitizenReportScreen on submit. Accepts `ReportCreate` payload:
- `description` (required)
- `latitude` (required)
- `longitude` (required)
- `image_url` (optional)

Assigns a UUID and UTC timestamp server-side, sets `lifecycle` to `REPORTED`, inserts into the
`reports` table, returns the inserted row as `ReportResponse`.

### GET /api/v1/reports
Called by FeedScreen on focus. Returns all rows from the `reports` table, ordered newest first.
Each row is validated against `ReportResponse` before returning.

---

## 4. Backend — requirements.txt

**File:** `backend/requirements.txt`
**Status:** Already included `supabase==2.9.0`. No changes made.

The package was not installed in the active Python environment at the start of this session.
Fixed by running:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 5. Supabase — Table Created

**Table name:** `reports`
**Created via:** Supabase SQL Editor (one-shot SQL, not the table editor UI)

```sql
create table reports (
  id           text primary key,
  description  text not null,
  latitude     float8 not null,
  longitude    float8 not null,
  image_url    text,
  submitted_at timestamptz not null,
  lifecycle    text not null default 'REPORTED'
);

alter table reports disable row level security;
```

RLS is disabled because the backend uses the service key — RLS would be redundant and would
block inserts during development. Re-enable with proper policies before any public deployment.

Column types match the `ReportResponse` Pydantic model exactly — no coercion needed.

---

## 6. Environment Variables — .env

**File:** `.env` (project root)
**Status:** All three keys were already present and correctly named. No changes made.

```
Supabase_Url=https://zzpdvxvaivfedzfpehws.supabase.co
Supabase_Anon_Key=eyJ...
Supabase_Secret_Key=eyJ...
```

---

## 7. Frontend — FeedScreen.tsx

**File:** `mobile/src/screens/FeedScreen.tsx`
**Status:** Two changes made.

### Problem
FeedScreen was fetching reports with a plain `useEffect(fn, [])`. Because FeedScreen stays
mounted inside the tab navigator, navigating away and back does not re-run `useEffect`. This
meant a report submitted in CitizenReportScreen would not appear in the Feed until a full app
reload. Pull-to-refresh also only refreshed incidents, not reports.

### Fix 1 — useFocusEffect instead of useEffect

```tsx
// Before
useEffect(() => {
  fetch(`${API_BASE_URL}/api/v1/reports`)
    .then(r => r.json())
    .then(data => setReports(Array.isArray(data) ? data : []))
    .catch(() => {});
}, []);

// After
const fetchReports = useCallback(() => {
  fetch(`${API_BASE_URL}/api/v1/reports`)
    .then(r => r.json())
    .then(data => setReports(Array.isArray(data) ? data : []))
    .catch(() => {});
}, []);

useFocusEffect(fetchReports);
```

`useFocusEffect` fires every time the Feed tab comes into focus, so switching back from
CitizenReport always gets the latest data from Supabase.

### Fix 2 — Pull-to-refresh includes reports

```tsx
// Before
<RefreshControl refreshing={refreshing} onRefresh={refresh} />

// After
<RefreshControl refreshing={refreshing} onRefresh={() => { refresh(); fetchReports(); }} />
```

`refresh` re-fetches incidents from the context; `fetchReports` re-fetches reports from
Supabase. Both now fire together on pull-to-refresh.

### Import change
Added `useFocusEffect` and `useCallback` to imports:
```tsx
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
```

---

## End-to-End Flow (After This Session)

1. Citizen opens CitizenReportScreen, fills in description, detects location, taps Submit
2. `POST /api/v1/reports` hits the FastAPI backend
3. Backend assigns UUID + timestamp, inserts row into Supabase `reports` table
4. Citizen navigates to Feed tab
5. `useFocusEffect` fires → `GET /api/v1/reports` fetches all rows from Supabase
6. New report appears as a purple "CITIZEN" card in the Feed, sorted by time alongside Incidents

---

## What Is Not Done Yet

- `image_url` is accepted in the payload but the app never uploads the image to storage —
  it only stores the local URI, which is useless server-side. Supabase Storage upload is a
  future task.
- RLS policies should be written before any real user data is stored.
- Incidents are not yet persisted to Supabase — they still come from USGS/GDACS at runtime.
