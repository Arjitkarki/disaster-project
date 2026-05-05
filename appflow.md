# App Flow & Architecture — UI Branch

## Branch State

This is the `UI` branch. It contains the complete React Native mobile app and a FastAPI
backend wired to static placeholder data. GDACS and USGS have been removed. The backend
will be re-wired to Supabase in a future branch.

---

## Directory Map

```
disaster-project/
├── .env                              # All secrets — never committed
├── .gitignore                        # Excludes __pycache__, .pyc, Firebase creds, .env
├── appflow.md                        # This file
├── CLAUDE.md                         # Project rules and ubiquitous language
│
├── backend/
│   ├── main.py                       # FastAPI app + CORS + route registration
│   └── app/
│       ├── api/v1/
│       │   ├── router.py             # Groups routes under /api/v1
│       │   ├── incidents.py          # GET /api/v1/incidents
│       │   └── reports.py            # GET + POST /api/v1/reports
│       ├── core/
│       │   └── config.py             # Loads .env keys into memory on startup
│       ├── models/
│       │   └── incident.py           # Pydantic models: Incident, Zone, ReportCreate, ReportResponse
│       └── services/
│           ├── staticdata.py         # 12 hardcoded Nepal incidents (placeholder)
│           ├── gdacs.py              # GDACS service — no longer imported, kept for reference
│           └── usgs.py               # USGS service — no longer imported, kept for reference
│
└── mobile/
    ├── App.tsx                       # Entry point — wraps app in IncidentsProvider
    ├── index.ts                      # Metro bundler entry
    └── src/
        ├── constants/
        │   ├── api.ts                # API_BASE_URL, MAPBOX_TOKEN from env
        │   └── colors.ts             # SeverityColors, LifecycleColors
        ├── context/
        │   └── IncidentsContext.tsx  # Global incidents state, fetches on mount
        ├── navigation/
        │   └── AppNavigator.tsx      # Bottom tab navigator, 5 screens
        ├── screens/
        │   ├── DashboardScreen.tsx   # Summary stats, quick nav, emergency guides
        │   ├── FeedScreen.tsx        # Mixed incident + report list, filters, sort
        │   ├── LiveMapScreen.tsx     # Mapbox map, heatmap, pins, search, detail sheet
        │   ├── CitizenReportScreen.tsx # Report submission form
        │   └── SupportScreen.tsx     # Emergency contacts, tap-to-call
        └── types/
            └── index.ts              # TypeScript interfaces mirroring backend models
```

---

## How the App Starts

### 1. `index.ts` → `App.tsx`

Metro bundles and launches `App.tsx` first.

```typescript
// App.tsx
export default function App() {
  return (
    <IncidentsProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </IncidentsProvider>
  );
}
```

`IncidentsProvider` wraps everything — this means every screen shares the same incidents
state without needing to pass props around. `AppNavigator` draws the 5 bottom tabs.

### 2. `IncidentsContext.tsx` fires immediately

The moment `IncidentsProvider` mounts, `useEffect` triggers `fetchIncidents()`:

```typescript
fetch(`${API_BASE_URL}/api/v1/incidents`)
  .then(r => r.json())
  .then(data => setIncidents(Array.isArray(data) ? data : []))
  .finally(() => { setLoading(false); setRefreshing(false); });
```

`API_BASE_URL` resolves from:
```typescript
// constants/api.ts
process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
```

While the request is in flight, `loading = true`. Every screen that calls `useIncidents()`
shows a spinner until data arrives.

### 3. `AppNavigator.tsx` draws the tabs

```typescript
const Tab = createBottomTabNavigator<RootTabParamList>();
// Registers: Dashboard, Feed, LiveMap, CitizenReport, Support
```

`RootTabParamList` defines what params each tab accepts. LiveMap accepts optional
`{ focusLat, focusLng, focusId }` — used when navigating from Feed to jump to a
specific incident on the map.

---

## Backend Flow

### Starting the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- `main` = the file `main.py`, `app` = the FastAPI instance inside it
- `--reload` = restarts on file save (dev only)
- `--host 0.0.0.0` = listens on all network interfaces, so your phone on the same WiFi can reach it
- `--port 8000` = the port the mobile app calls

### `main.py` — entry point

```python
app = FastAPI(title='Nepal Disaster API')
app.add_middleware(CORSMiddleware, allow_origins=['*'], ...)
app.include_router(v1_router)
```

CORS middleware runs on every request. `allow_origins=['*']` allows the mobile app
(on any IP/device) to call the backend without being blocked.

### `core/config.py` — loads on startup

Reads `.env` from the project root and exposes keys as module-level variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` — present, not yet used
- `USGS_BASE_URL`, `GDACS_BASE_URL` — present, no longer imported anywhere

### `router.py` — groups routes

```python
v1_router = APIRouter(prefix='/api/v1')
v1_router.include_router(incidents_router)
v1_router.include_router(reports_router)
```

All routes are prefixed `/api/v1`.

---

## The 4 Endpoints

### `GET /health`
Returns `{"status": "ok"}`. Just confirms the server is alive.

### `GET /api/v1/incidents`
```python
# incidents.py
@router.get('/incidents', response_model=List[Incident])
async def list_incidents():
    return sorted(fetch_incidents(), key=lambda i: i.reported_at, reverse=True)
```
Calls `staticdata.fetch_incidents()`, sorts newest first, returns JSON.
**This is what `IncidentsContext` fetches on app load.**

### `GET /api/v1/reports`
```python
return list(reversed(_reports))
```
Returns all citizen reports submitted this session, newest first.
Stored in a Python list in memory — wiped every time the server restarts.
**This is what `FeedScreen` fetches to show citizen report cards.**

### `POST /api/v1/reports`
```python
report = ReportResponse(id=uuid, description=..., latitude=..., longitude=..., submitted_at=now)
_reports.append(report)
return report
```
Accepts a new citizen report, saves it to memory, returns it with a generated UUID.
**This is what `CitizenReportScreen` calls on form submit.**

---

## Data Models

Defined in `backend/app/models/incident.py` (Python) and mirrored exactly in
`mobile/src/types/index.ts` (TypeScript). They must stay in sync.

```
Severity  enum: LOW | MODERATE | HIGH | CRITICAL
Lifecycle enum: REPORTED | VERIFIED | ACTIVE | RESOLVED

Zone      { id, name, district, municipality? }
Incident  { id, title, description, severity, lifecycle, zone, latitude, longitude, reported_at, updated_at }

ReportCreate   { description, latitude, longitude, image_url? }    ← what the app sends
ReportResponse { id, description, latitude, longitude, image_url?, submitted_at, lifecycle }  ← what comes back
```

### Colors (frontend)
```typescript
// constants/colors.ts
SeverityColors:  LOW=#16A34A  MODERATE=#D97706  HIGH=#EA580C  CRITICAL=#DC2626
LifecycleColors: REPORTED=#6B7280  VERIFIED=#2563EB  ACTIVE=#DC2626  RESOLVED=#16A34A
```

---

## Static Data (current placeholder)

`backend/app/services/staticdata.py` — 12 hardcoded incidents based on the Gorkha 2015
earthquake scenario. Covers all severity levels, all lifecycle states, and multiple
Nepal districts (Gorkha, Sindhupalchok, Kathmandu, Bhaktapur, Lalitpur, Rasuwa,
Dolakha, Dhading, Nuwakot, Kavrepalanchok).

Swap this file's import in `incidents.py` when Supabase is ready.
`gdacs.py` and `usgs.py` still exist but are not imported anywhere.

---

## Screen-by-Screen

### Dashboard — `DashboardScreen.tsx`
- Reads from `useIncidents()` — no direct API calls
- Computes: total incidents, active count, count per severity
- Shows red alert banner when any CRITICAL incidents exist
- Severity chips (CRITICAL / HIGH / MODERATE / LOW with counts)
- Quick nav grid (4 cards → Feed, LiveMap, CitizenReport, Support)
- Emergency guides: Earthquake, Flood, Landslide tips (hardcoded)
- Pull-to-refresh calls `refresh()` from context

### Feed — `FeedScreen.tsx`
- Reads incidents from `useIncidents()`
- Makes its own separate fetch: `GET /api/v1/reports` on mount
- Merges both into a single `FeedItem[]` list sorted by date
- Severity filter pills: All / Critical / High / Moderate / Low
- Sort toggle: Newest first / Oldest first
- IncidentCard: severity badge, lifecycle badge, title, description, district, coordinates, map button
- ReportCard: purple CITIZEN badge, lifecycle badge, description, coordinates
- Map button on IncidentCard calls `navigation.navigate('LiveMap', { focusLat, focusLng, focusId })`
- Pull-to-refresh refreshes incidents only (reports re-fetch would need separate trigger)

### LiveMap — `LiveMapScreen.tsx`
- Reads from `useIncidents()` — no direct API calls
- Mapbox GL map, centered on Nepal: `[84.124, 28.394]`, zoom 6
- Converts incidents to a GeoJSON FeatureCollection (id, severity, title per feature)
- HeatmapLayer: visible below zoom 8, colored blue→orange→red by density
- CircleLayer (pins): visible above zoom 5, colored by severity
- FocusPin + GlowRing layers: highlight selected/deep-linked incident
- Search bar: filters incidents by title or district (no API call — filters already-loaded data)
- `useFocusEffect` handles deep-link params from Feed: flies camera to coordinates, selects incident
- Bottom sheet slides up on pin press showing: severity, lifecycle, title, description, district, coordinates
- Zoom +/− buttons bottom right

### CitizenReport — `CitizenReportScreen.tsx`
- No read from context — purely a write screen
- Description text input (required)
- "Detect My Location" button: requests `expo-location` permission, gets GPS coords
- "Attach Photo" button: requests `expo-image-picker` permission, picks from library
- Submit: `POST /api/v1/reports` with `{ description, latitude, longitude }`
- Image URI is selected locally but not uploaded (image_url field sent as undefined for now)
- Clears form on success

### Support — `SupportScreen.tsx`
- Fully static — no API calls, no context
- 8 hardcoded contacts in 3 categories:
  - Emergency (red): Nepal Police 100, Fire 101, Ambulance 102
  - Government (blue): Nepal Army 115, NDRRMA +977-1-4200045
  - NGO (green): Red Cross, UNICEF, Oxfam
- Tap any row → `Linking.openURL('tel:<number>')` dials directly

---

## Full Request Flow

### App load → incidents appear

```
You open the app
  → App.tsx mounts IncidentsProvider
  → useEffect fires fetch(API_BASE_URL + '/api/v1/incidents')
  → HTTP GET travels over WiFi to your laptop
  → Uvicorn receives it on port 8000
  → FastAPI matches /api/v1/incidents → list_incidents()
  → staticdata.fetch_incidents() returns 12 Incident objects
  → sorted newest-first, serialized to JSON
  → HTTP 200 response travels back to phone
  → setIncidents(data), loading = false
  → Dashboard, Feed, LiveMap all re-render with data
```

### Citizen submits a report

```
User fills form, taps Submit
  → CitizenReportScreen POST /api/v1/reports
      body: { description, latitude, longitude }
  → FastAPI create_report() assigns UUID, saves to _reports[]
  → HTTP 201 returns the saved ReportResponse
  → Alert "Submitted", form clears
  → (Report lives in memory until server restarts)
```

### Feed taps "view on map"

```
User taps map icon on an incident card
  → navigation.navigate('LiveMap', { focusLat, focusLng, focusId })
  → LiveMapScreen useFocusEffect fires
  → camera.setCamera({ centerCoordinate, zoomLevel: 12, animationMode: 'flyTo' })
  → incidents.find(focusId) → setSelectedIncident
  → bottom sheet opens with that incident's details
```

---

## What Changes When Supabase Is Added

Only the backend services change. The mobile app is untouched.

| Now | With Supabase |
|-----|---------------|
| `staticdata.fetch_incidents()` | Supabase query on `incidents` table |
| `_reports[]` in-memory list | Supabase insert into `reports` table |
| Reports lost on server restart | Reports persist permanently |
| Incidents are hardcoded | Incidents managed in DB |

The Pydantic models in `incident.py` and the TypeScript types in `types/index.ts`
do not need to change. The JSON shape stays identical.

Steps when ready:
1. `pip install supabase`
2. Create `backend/app/services/supabase_client.py` using keys already in `config.py`
3. Replace the `staticdata` import in `incidents.py` with a Supabase query
4. Replace the `_reports[]` list in `reports.py` with Supabase inserts/selects
