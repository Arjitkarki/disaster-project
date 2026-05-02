# Codebase Reference — Nepal Disaster Awareness App

## Project Structure

test backend branch

```
disaster-project/
├── backend/                  Python FastAPI server
│   ├── main.py               App entry point, CORS config
│   ├── requirements.txt      Python dependencies
│   └── app/
│       ├── core/
│       │   └── config.py     Loads .env, exports URL constants
│       ├── models/
│       │   └── incident.py   Pydantic data models (source of truth for all shapes)
│       ├── services/
│       │   ├── usgs.py       Fetches earthquake data from USGS
│       │   └── gdacs.py      Fetches flood/disaster data from GDACS
│       └── api/v1/
│           ├── router.py     Combines all routes under /api/v1
│           ├── incidents.py  GET /api/v1/incidents
│           └── reports.py    POST /api/v1/reports, GET /api/v1/reports
│
└── mobile/                   React Native (Expo) app
    ├── App.tsx               Root component — wraps everything in providers
    ├── index.ts              Expo entry point (just re-exports App)
    ├── package.json          JS dependencies
    └── src/
        ├── types/
        │   └── index.ts      TypeScript types (mirrors backend Pydantic models)
        ├── constants/
        │   ├── api.ts        API_BASE_URL and MAPBOX_TOKEN (from env)
        │   └── colors.ts     SeverityColors and LifecycleColors maps
        ├── context/
        │   └── IncidentsContext.tsx  Shared state — fetches incidents, exposes to all screens
        ├── navigation/
        │   └── AppNavigator.tsx     Bottom tab navigator, 5 tabs, tab icons
        └── screens/
            ├── DashboardScreen.tsx   Home tab: stats, quick-nav cards, emergency guides
            ├── FeedScreen.tsx        List tab: scrollable incident list with severity badges
            ├── LiveMapScreen.tsx     Map tab: Mapbox dark map, heatmap + pins, fly-to
            ├── CitizenReportScreen.tsx  Report tab: form with GPS + photo, posts to backend
            └── SupportScreen.tsx    Support tab: hardcoded contact list, tap-to-call
```

---

## Data Flow

```
USGS Earthquake API ──┐
                      ├──► backend/app/services/  (fetch + normalize to Incident model)
GDACS Disaster API  ──┘         │
                                │ deduplicate, sort by date
                                ▼
                    GET /api/v1/incidents  (incidents.py)
                                │
                                │ fetch() on mount
                                ▼
                    IncidentsContext.tsx  (React context, shared state)
                    { incidents, loading, refreshing, refresh }
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
       DashboardScreen     FeedScreen        LiveMapScreen
       (reads incidents)   (reads incidents) (reads incidents)
```

Citizen reports flow separately:

```
CitizenReportScreen  ──►  POST /api/v1/reports  ──►  in-memory list (resets on restart)
                                                            │
                                                   GET /api/v1/reports
                                                            │
                                                       FeedScreen  (fetched locally)
```

---

## File-by-File Reference

### Backend

#### `backend/main.py`

- Creates the FastAPI `app` instance
- Adds CORS middleware (currently `allow_origins=['*']` — fine for dev)
- Mounts `v1_router` (all routes live under `/api/v1`)
- Exposes `GET /health` → `{"status": "ok"}`

#### `backend/app/core/config.py`

- Loads `.env` from the project root using `python-dotenv`
- Exports: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `USGS_BASE_URL`, `GDACS_BASE_URL`
- Supabase keys are loaded but not used yet — Supabase is dormant

#### `backend/app/models/incident.py`

The single source of truth for all data shapes. Everything else references these.

| Model            | Fields                                                                                          | Notes                                          |
| ---------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `Severity`       | LOW, MODERATE, HIGH, CRITICAL                                                                   | String enum                                    |
| `Lifecycle`      | REPORTED, VERIFIED, ACTIVE, RESOLVED                                                            | String enum                                    |
| `Zone`           | id, name, district, municipality?                                                               | Geographic admin boundary                      |
| `Incident`       | id, title, description, severity, lifecycle, zone, latitude, longitude, reported_at, updated_at | A confirmed/reported disaster event            |
| `ReportCreate`   | description, latitude, longitude, image_url?                                                    | Input shape for citizen report POST            |
| `ReportResponse` | id, description, latitude, longitude, image_url?, submitted_at, lifecycle                       | What the API returns after a report is created |

#### `backend/app/services/usgs.py`

- Bounding box for Nepal: lat 26–30.5, lon 80–88.5
- Fetches `GET https://earthquake.usgs.gov/fdsnws/event/1/query` for the last 30 days
- Filters: `minmagnitude=3.0`, GeoJSON format
- Maps magnitude → Severity: `≥7.0 CRITICAL`, `≥5.5 HIGH`, `≥4.0 MODERATE`, else `LOW`
- Sets lifecycle to `VERIFIED` (USGS data is already authoritative)
- Returns `List[Incident]`

#### `backend/app/services/gdacs.py`

- Bounding box: `80,26,88,30.5` (lon-min, lat-min, lon-max, lat-max)
- Fetches `GET https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP` for last 90 days
- Maps alert score → Severity: `≥3.5 CRITICAL`, `≥2.0 HIGH`, `≥1.0 MODERATE`, else `LOW`
- Sets lifecycle to `ACTIVE`
- Returns `List[Incident]`

#### `backend/app/api/v1/incidents.py`

- `GET /api/v1/incidents` — calls both services in parallel (both are `async`), merges, deduplicates by `id`, sorts newest first
- On any exception → HTTP 502

#### `backend/app/api/v1/reports.py`

- In-memory `_reports` list (resets on server restart — Supabase replaces this later)
- `POST /api/v1/reports` — validates body against `ReportCreate`, assigns UUID + timestamp, appends to list, returns `ReportResponse`
- `GET /api/v1/reports` — returns reversed list (newest first)

#### `backend/app/api/v1/router.py`

- Creates `v1_router` with prefix `/api/v1`
- Includes `incidents_router` and `reports_router`

---

### Mobile

#### `mobile/App.tsx`

- Root component
- Wraps the app in `<IncidentsProvider>` so all screens can access incident state
- Renders `<AppNavigator>`

#### `mobile/src/types/index.ts`

TypeScript equivalents of the backend Pydantic models. Keep these in sync if backend models change.

| Type             | Fields                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `Severity`       | `'LOW' \| 'MODERATE' \| 'HIGH' \| 'CRITICAL'`                                                     |
| `Lifecycle`      | `'REPORTED' \| 'VERIFIED' \| 'ACTIVE' \| 'RESOLVED'`                                              |
| `Zone`           | `id, name, district, municipality?`                                                               |
| `Incident`       | `id, title, description, severity, lifecycle, zone, latitude, longitude, reported_at, updated_at` |
| `ReportCreate`   | `description, latitude, longitude, image_url?`                                                    |
| `ReportResponse` | `id, description, latitude, longitude, image_url?, submitted_at, lifecycle`                       |

#### `mobile/src/constants/api.ts`

- `API_BASE_URL` — from `EXPO_PUBLIC_API_BASE_URL` env var, defaults to `http://localhost:8000`
- `MAPBOX_TOKEN` — from `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` env var

#### `mobile/src/constants/colors.ts`

- `SeverityColors` — maps each Severity to a hex color (green → red scale)
- `LifecycleColors` — maps each Lifecycle to a hex color

```
Severity:  LOW=#16A34A  MODERATE=#D97706  HIGH=#EA580C  CRITICAL=#DC2626
Lifecycle: REPORTED=#6B7280  VERIFIED=#2563EB  ACTIVE=#DC2626  RESOLVED=#16A34A
```

#### `mobile/src/context/IncidentsContext.tsx`

- `IncidentsProvider` — fetches `GET /api/v1/incidents` on mount
- Exposes `{ incidents, loading, refreshing, refresh }` via `useIncidents()` hook
- `refresh()` re-fetches and sets `refreshing=true` during the request (used for pull-to-refresh)
- All four main screens call `useIncidents()`

#### `mobile/src/navigation/AppNavigator.tsx`

- Bottom tab navigator with 5 tabs: Dashboard, Feed, LiveMap, CitizenReport, Support
- Tab icons defined in `TAB_ICONS` map (active/inactive Ionicon name pairs)
- Active tint: `#DC2626` (red), Inactive: `#6B7280` (gray)
- `LiveMap` tab accepts optional params: `{ focusLat, focusLng, focusId }` — used when navigating from Feed to fly the camera to a specific incident

#### `mobile/src/screens/DashboardScreen.tsx`

- Reads `incidents` from context
- Computes: `critical` count, `high` count, `active` count
- Shows a red alert banner if any CRITICAL incidents exist
- `statsRow` — four chips showing count per severity
- `navGrid` — 2x2 grid of cards linking to Feed, LiveMap, CitizenReport, Support
- `GUIDES` — static emergency guide cards for Earthquake, Flood, Landslide

#### `mobile/src/screens/FeedScreen.tsx`

- Reads `incidents` from context
- `FlatList` — one card per incident, pull-to-refresh
- Each card: severity badge (colored fill), lifecycle badge (colored border), time-ago, title, description (2 lines), zone district, coordinates, "View on Map" button
- "View on Map" calls `navigation.navigate('LiveMap', { focusLat, focusLng, focusId })` which flies the camera to that incident

#### `mobile/src/screens/LiveMapScreen.tsx`

- Reads `incidents` from context
- Reads optional `{ focusLat, focusLng, focusId }` route params
- Initializes camera at Nepal center `[84.124, 28.394]` zoom 6
- When `focusLat/focusLng` are set → flies camera to that coordinate at zoom 12
- Builds a GeoJSON `FeatureCollection` from all incidents
- `MapboxGL.ShapeSource` holds the GeoJSON, three layers inside:
  - `HeatmapLayer` (id: `incidents-heat`) — visible below zoom 8
  - `CircleLayer` (id: `incidents-points`) — colored dots, visible above zoom 5
  - `CircleLayer` (id: `focus-glow`) — white glow ring around focused incident
  - `CircleLayer` (id: `focus-pin`) — larger pin on top of focused incident

#### `mobile/src/screens/CitizenReportScreen.tsx`

- Local state: `description`, `location`, `imageUri`, `submitting`, `locating`
- `detectLocation()` — requests foreground location permission, gets GPS coords via `expo-location`
- `pickImage()` — requests media library permission, opens image picker via `expo-image-picker`
- `submit()` — POSTs `{ description, latitude, longitude }` to `/api/v1/reports`
- Resets form on success

#### `mobile/src/screens/SupportScreen.tsx`

- Hardcoded `CONTACTS` array: 8 contacts across 3 categories (emergency, government, ngo)
- Tap any contact → `Linking.openURL('tel:PHONE_NUMBER')`
- Color-coded by category: red (emergency), blue (government), green (NGO)

---

## Key Concepts

**Incident lifecycle**: `REPORTED → VERIFIED → ACTIVE → RESOLVED`

- USGS data arrives as `VERIFIED` (authoritative seismic network)
- GDACS data arrives as `ACTIVE` (ongoing disaster events)
- Citizen Reports arrive as `REPORTED` (unverified)

**Severity** is independent of lifecycle. A CRITICAL incident can be RESOLVED.

**Zone** is a geographic admin boundary. USGS incidents derive the district from the USGS `place` string (e.g., `"Nepal"` or `"Sindhupalchok, Nepal"`). GDACS incidents default to `district='Nepal'`.

**GeoPin** — each incident has `latitude`/`longitude`. On the map these become `CircleLayer` dots colored by severity.

---

## Environment Variables

All secrets in `/.env` (project root). Never hardcode.

| Variable                          | Used in | Purpose                                        |
| --------------------------------- | ------- | ---------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`        | mobile  | Backend URL (default: `http://localhost:8000`) |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | mobile  | Mapbox map tiles                               |
| `USGS_BASE_URL`                   | backend | USGS earthquake API base                       |
| `GDACS_BASE_URL`                  | backend | GDACS disaster API base                        |
| `Supabase_Url`                    | backend | Dormant — for future DB                        |
| `Supabase_Anon_Key`               | backend | Dormant                                        |
| `Supabase_Secret_Key`             | backend | Dormant                                        |

---

## What's Built vs. What's Planned

| Feature                                          | Status      | Notes                                  |
| ------------------------------------------------ | ----------- | -------------------------------------- |
| Fetch incidents from USGS + GDACS                | Done        | Real live data                         |
| Dashboard with stats + emergency guides          | Done        |                                        |
| Feed — scrollable incident list                  | Done        |                                        |
| Feed — severity filter pills                     | Done        | ALL / CRITICAL / HIGH / MODERATE / LOW |
| Feed — citizen reports shown alongside incidents | Done        | Purple "CITIZEN" badge, sorted by date |
| LiveMap — heatmap                                | Done        | Shows below zoom 8                     |
| LiveMap — colored incident pins                  | Done        | Color = severity                       |
| LiveMap — fly-to from Feed                       | Done        |                                        |
| LiveMap — tap pin → incident detail sheet        | Done        | Bottom sheet, tap map to dismiss       |
| CitizenReport — submit form with GPS + photo     | Done        |                                        |
| Support — tap-to-call contacts                   | Done        |                                        |
| Supabase persistence                             | Not started | Reports reset on server restart        |
| Firebase FCM push notifications                  | Not started |                                        |
| Gorkha 2015 scenario simulation                  | Not started |                                        |
| Responder flow (verify/manage incidents)         | Not started |                                        |

---

## Running the Project

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/api/v1/incidents  (live data)
# → http://localhost:8000/docs              (Swagger UI)

# Mobile
cd mobile
npx expo start
# Scan QR with Expo Go, or press i (iOS simulator) / a (Android)
```
