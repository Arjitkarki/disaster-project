# Nepal Disaster Awareness App — CLAUDE.md

## Project Overview
A mobile-first disaster awareness platform for Nepal, made for citizens. 
Frontend: React Native | Backend: FastAPI (Python) | 
DB: Supabase (PostgreSQL) | Push: Firebase Cloud Messaging | Maps: Mapbox

---

## Ubiquitous Language

These terms have precise meanings. Use them consistently in all code, 
variable names, API routes, comments, and documentation. 
Always ask for clarification if there is confusion before making changes into code (We want to focus on good scaling and token usage)


### Core Domain Terms

| Term | Definition | Avoid Using |
|------|-----------|-------------|
| **Incident** | A confirmed or reported disaster event (flood, earthquake, landslide, etc.) with a severity level, location, and lifecycle status | "event", "disaster", "alert" |
| **Report** | A citizen-submitted account of a potential Incident. Not yet verified. | "submission", "form", "entry" |
| **Severity** | Enum: LOW, MODERATE, HIGH, CRITICAL — assigned to an Incident | "level", "priority", "danger" |
| **Zone** | A geographic administrative boundary (district/municipality) in Nepal | "area", "region", "location" |
| **Responder** | An authorized user (NGO, government) who can verify Reports and manage Incidents | "admin", "user", "operator" |
| **Citizen** | An end-user who submits Reports via the mobile app | "user", "reporter", "person" |
| **Feed** | The real-time stream of Incidents shown on the Dashboard and Map | "list", "stream", "data" |
| **Lifecycle** | The status progression of an Incident: REPORTED → VERIFIED → ACTIVE → RESOLVED | "status", "stage", "phase" |
| **GeoPin** | A map marker representing an Incident at a coordinate | "marker", "pin", "dot" |
| **Notification** | A push message sent via FCM to Citizens or Responders | "alert", "message", "push" |

### Feature Module Names
- `Dashboard` — the summary/analytics screen (Containing all tabs/ more information)
- `Feed` - Similar to the map, but list view sorted by distance, ease of access again
- `LiveMap` — the Mapbox-powered map screen (Should include a heatmap/be interactive)
- `CitizenReport` — the report submission flow (EASY to use, reports can have as much or as little information as possible)
- `Support` - direct connection to a list of contacts, NGOS, polics, Fire department, etc. (Ease of access once again)


## Simulation Scenario

### Gorkha 2015 — Sindhupalchok
- Real event: April 25, 2015, 11:56 NST, Mw 7.8
- Sindhupalchok epicenter of worst damage: 3,440 deaths, 63,885 houses destroyed
- Mock data file: /mock-data/scenario_gorkha_2015.json
- ScenarioClock controls playback speed (default 60x: 1 real second = 1 scenario minute)
- All features must be tested against at least T+0, T+34, and T+90 scenario events

### Key simulation rules:
- Incidents arrive in Lifecycle order: REPORTED → VERIFIED → ACTIVE → RESOLVED
- Early CitizenReports may overlap with or predate official Incidents (realistic)
- Some Zones remain unreachable (no Reports filed) — this is expected and correct
- The May 12 Mw 7.3 aftershock is a second scenario phase, not part of the initial draft

## API & Service Configuration

### Environment variables
All secrets live in `.env` at the project root. Never hardcode any key.
Reference them in Python via `os.getenv("KEY_NAME")`.
Reference them in React Native via a library like `react-native-dotenv`.

### Service registry

| Service    | Key name(s)                          | Setup required | Notes                          |
|------------|--------------------------------------|----------------|--------------------------------|
| Mapbox     | MAPBOX_ACCESS_TOKEN                  | Yes            | mapbox.com → Access Tokens     |
| Supabase   | SUPABASE_URL, SUPABASE_ANON_KEY,     | Yes            | Not used in initial draft —    |
|            | SUPABASE_SERVICE_KEY                 |                | keys saved, no tables yet      |
| Firebase   | FCM_SERVER_KEY (backend)             | Yes            | google-services.json goes in   |
|            | google-services.json (RN app)        |                | the React Native project root  |
| USGS       | USGS_BASE_URL                        | No             | Open API, no key required      |
| GDACS      | GDACS_BASE_URL                       | No             | Open API, no key required      |

### Initial draft data rules
- USGS and GDACS are the only active data sources for the initial draft
- Supabase is configured but dormant — no queries, no table writes
- All seeded data flows through seed_scenario.py → /mock-data/incidents.json
- When Supabase is activated, the same Incident Pydantic model is used —
  no model changes should be needed

## Architecture Notes

- We will use GDACS/USGS for initila data
- All API routes follow: `/api/v1/{resource}` (e.g. `/api/v1/incidents`)
- Data from the UK professor will be ingested as flat files initially, these should come in CSV files that we will clean up eventually

