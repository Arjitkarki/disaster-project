# Nepal Disaster App — Roadmap & Learning Guide

---

## Things to Learn Before Building Further

These are the concepts that will unblock you at every step below. You don't need to master all of them upfront — read each one when it becomes relevant to the phase you're working on.

### Cloud & Hosting Fundamentals
- **What a server actually is** — the difference between running `uvicorn` on your laptop vs running it on a machine in a data center that never turns off. Understand what a process, a port, and a host mean in that context.
- **Environment variables in production** — why you never hardcode secrets, how hosting platforms inject them at runtime, and how your app reads them via `os.getenv()` / `process.env`.
- **What a Dockerfile is** — a recipe that tells a cloud provider exactly how to install and run your app. You don't need to be a Docker expert, but understand the basic commands: `FROM`, `COPY`, `RUN`, `CMD`.
- **DNS and domains** — how a URL like `api.yourdomain.com` gets pointed at your server's IP address. Understand A records, CNAME records, and what a reverse proxy (like Nginx) does.
- **HTTP vs HTTPS** — why production apps must use HTTPS, what TLS certificates are, and how platforms like Railway/Render handle them automatically.
- **CORS** — why your React Native app gets blocked when it calls a different domain, and how the `Access-Control-Allow-Origin` header fixes it. You already have this in `main.py` but it's wide open (`*`) — learn when to restrict it.

### Databases & Supabase Specifically
- **What a relational database is** — tables, rows, columns, primary keys, foreign keys. Postgres is what Supabase uses under the hood.
- **SQL basics** — `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `WHERE`, `ORDER BY`. You'll need these to write Supabase queries and migrations.
- **Row Level Security (RLS)** — Supabase's way of controlling who can read/write which rows. Critical before launch. Understand policies, the `auth.uid()` function, and the difference between anon and service role keys.
- **Database migrations** — the concept of versioned schema changes (adding a column, creating a table) in a way that's repeatable and reversible. Supabase has a migration CLI for this.
- **Indexes** — why querying a table with 100,000 rows by `district` is slow without one, and how adding an index on that column fixes it.
- **Supabase Realtime** — how Supabase streams Postgres changes to connected clients over WebSockets. This is how you'll eventually push live incident updates to the app without polling.
- **Supabase Storage** — object storage (like S3) for files. You'll need it for citizen report images. Understand buckets, policies, and signed URLs.

### Caching
- **Why caching exists** — if 1,000 users hit `/api/v1/incidents` per minute and you call USGS every time, you'll get rate-limited and your app will be slow. Caching stores the result and reuses it for N seconds.
- **In-memory caching** — the simplest form: store the result in a Python dictionary with a timestamp. Works for a single-server setup. Disappears on restart.
- **Redis** — a dedicated caching server. Survives restarts, shared across multiple backend instances. Worth learning when you scale beyond one server.
- **Cache invalidation** — knowing when to throw away a cached result and fetch fresh data. TTL (time-to-live) is the simplest strategy: cache for 60 seconds, then re-fetch.
- **HTTP caching headers** — `Cache-Control`, `ETag`, `Last-Modified`. The browser/client can cache responses too. Less relevant for a mobile app but good to know.

### Push Notifications (Firebase Cloud Messaging)
- **How FCM works at a high level** — your backend sends a message to Google's FCM servers, which forward it to a specific device token. The device doesn't need to have the app open.
- **Device tokens** — a unique string FCM assigns to each app install. You collect it on first launch and store it (in Supabase). When you want to notify a user, you send to their token.
- **Topic-based notifications** — instead of sending to individual tokens, you subscribe devices to a topic (e.g., `floods-sarlahi`) and send one message that reaches all subscribers. Easier to manage.
- **`google-services.json`** — Firebase's config file for Android. Goes in the React Native project root. The iOS equivalent is `GoogleService-Info.plist`.
- **Expo Push Notifications** — Expo wraps FCM/APNs into a simpler API. Worth using first before dropping down to raw FCM.
- **APNs (Apple Push Notification service)** — Apple's own notification layer that sits in front of FCM for iOS. Requires your Apple Developer account to be configured.

### App Store & Mobile Deployment
- **EAS (Expo Application Services)** — Expo's cloud build service. Replaces running Xcode locally. You push your code, EAS builds the `.ipa` (iOS) or `.apk` (Android) in the cloud.
- **`app.json` / `app.config.js`** — the manifest for your Expo app. Controls bundle identifier, version, permissions, icons, splash screens, and build profiles.
- **Bundle identifier** — a unique reverse-domain string like `com.yourname.nepaldisaster`. Set once, never changed, tied to your App Store listing.
- **Build profiles** — development vs preview vs production. Each can have different API URLs, feature flags, and signing certificates.
- **Code signing** — Apple requires every iOS app to be signed with a certificate tied to your developer account. EAS handles this automatically with `eas credentials`.
- **TestFlight** — Apple's beta testing platform. You submit a build, invite testers by email, they install it without going through the App Store review. Use this before your public launch.
- **App Store Connect** — Apple's portal for managing your app listing, screenshots, metadata, pricing, and submissions. You'll spend time here.

### API Design & Backend Patterns
- **REST conventions** — why routes follow `/api/v1/incidents` patterns, what each HTTP verb means (`GET` = read, `POST` = create, `PUT/PATCH` = update, `DELETE` = remove), and what status codes mean (200, 201, 400, 404, 500).
- **Async/await in Python** — your FastAPI routes use `async def`. Understand why this matters for I/O-bound work (network calls to USGS/GDACS/Supabase) and what `await` actually does.
- **Dependency injection in FastAPI** — the `Depends()` pattern. You'll use it to share DB connections, auth checks, and config across routes.
- **API versioning** — why you have `/api/v1/`. When you change a response shape, you bump to `/api/v2/` instead of breaking existing app installs.
- **Background tasks** — FastAPI's `BackgroundTasks` lets you do work after returning a response (e.g., send a push notification after a report is submitted without making the user wait).

---

## Phase 1 — Fix What's Already Broken

These are bugs and stubs in the current code. Do these before anything else.

- [ ] **Fix Mapbox token typo** — `mobile/.env` has `EXPO_PUBLIX_MAPBOX_ACCESS_TOKEN`, should be `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`. The map will not load on device without this.
- [ ] **Wire pull-to-refresh for reports** — `FeedScreen.tsx:136`, the `onRefresh` callback calls `refresh()` (incidents) but not `fetchReports()`. Add it so reports also reload on pull.
- [ ] **Remove or implement image upload** — `CitizenReportScreen` has a camera button that stores a local URI and sends it to the backend, where it is useless. Either wire Supabase Storage (Phase 3) or remove the button until you do.
- [ ] **Lock CORS before any cloud deploy** — `backend/main.py` has `allow_origins=['*']`. Replace with your actual production app origin before deploying publicly.

---

## Phase 2 — Activate Your Dormant Backend Services

You already wrote the USGS and GDACS integration code. It just isn't connected. This is the highest-leverage work available right now.

- [ ] **Activate USGS live data** — in `backend/app/api/v1/incidents.py`, replace the import from `staticdata` with `usgs`. Your app immediately shows real Nepal earthquake data. The service at `backend/app/services/usgs.py` already handles the bounding box, magnitude → severity mapping, and response shape.
- [ ] **Activate GDACS** — same pattern. `backend/app/services/gdacs.py` handles floods and multi-hazard events. Merge both sources into one list.
- [ ] **Deduplicate merged sources** — when USGS and GDACS both report the same earthquake, you'll get duplicate incidents. Add a simple dedup step: compare coordinates + time window, keep one.
- [ ] **Add a TTL cache to the incidents route** — USGS/GDACS should not be called on every request. Add a 60-second in-memory cache in `incidents.py`. A `dict` with a timestamp is enough to start:
  ```python
  _cache = {"data": [], "at": 0.0}
  TTL = 60
  if time.time() - _cache["at"] > TTL:
      _cache["data"] = await fetch_all()
      _cache["at"] = time.time()
  return _cache["data"]
  ```

---

## Phase 3 — Make Supabase Your Real Database

Supabase currently only stores citizen reports. Incidents have no database at all. Fix this in order.

### Incidents Table
- [ ] Create the `incidents` table in Supabase with columns mirroring `Incident` in `backend/app/models/incident.py`: `id`, `title`, `description`, `severity`, `lifecycle`, `latitude`, `longitude`, `reported_at`, `updated_at`, `zone_id`, `zone_name`, `zone_district`, `zone_municipality`.
- [ ] Update `backend/app/api/v1/incidents.py` to query Supabase instead of (or in addition to) USGS/GDACS. Live API data + Responder-created incidents from the DB, merged.
- [ ] Write a seed script (can use pandas + your existing `olddata/` files) to populate historical incidents on first deploy.

### Reports Table — Harden What Exists
- [ ] **Enable RLS on the `reports` table** — currently anyone with the anon key can read all reports. Add policies:
  - `INSERT`: allow anon (any citizen can submit)
  - `SELECT`: deny anon, allow service role only (backend reads, not raw clients)
  - `UPDATE`: service role only (Responders change lifecycle)
- [ ] **Add a `status` column** to `reports` for moderation: `PENDING | APPROVED | REJECTED`. Default `PENDING`.
- [ ] **Add indexes** on `submitted_at` and `lifecycle` — as the table grows, queries will slow without them.

### Image Upload
- [ ] Create a `report-images` bucket in Supabase Storage with public read, authenticated write.
- [ ] Update `CitizenReportScreen` to upload the image to Storage before submitting the form, then include the returned public URL in the `POST /api/v1/reports` body.
- [ ] Add a file size/type validation on the backend (reject anything over 5MB or not an image MIME type).

### Supabase Realtime (future, not blocking launch)
- [ ] Subscribe the mobile app to the `incidents` table via `supabase.channel()`. When a Responder verifies a report and creates an incident, the Feed and Map update automatically without pull-to-refresh.

---

## Phase 4 — Cloud Deployment

### Backend Hosting Options

| Option | Effort | Est. Cost | Best For |
|---|---|---|---|
| **Railway** | Lowest | ~$5/mo | Recommended first step. Auto-detects Python, gives you a URL in 30 min. |
| **Render** | Low | Free tier + $7/mo | Good free tier for testing, spins down after inactivity (bad for prod). |
| **Fly.io** | Medium | ~$3-6/mo | More control, stays warm, good global edge deployment. |
| **DigitalOcean App Platform** | Medium | ~$12/mo | Managed, reliable, good docs. |
| **AWS EC2 / Lightsail** | High | ~$5-10/mo | Most control, most complexity. Overkill for now. |
| **Supabase Edge Functions** | Low | Included | If you want to go all-in on Supabase and remove the FastAPI backend eventually. |

**Recommendation**: Start with Railway. When you outgrow it or need more control, migrate to Fly.io or DigitalOcean.

### Steps to Deploy the Backend
- [ ] Add a `Dockerfile` to `backend/`:
  ```dockerfile
  FROM python:3.13-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install -r requirements.txt
  COPY . .
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```
- [ ] Move all secrets from `.env` to your hosting platform's environment variable dashboard. Never commit `.env`.
- [ ] Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `USGS_BASE_URL`, `GDACS_BASE_URL` in the platform UI.
- [ ] Verify `/health` returns `{"status": "ok"}` at your production URL before touching anything else.
- [ ] Lock CORS to your production domain.

### Update the Mobile App to Use the Production URL
- [ ] In `mobile/src/constants/api.ts`, use a build-time switch:
  ```ts
  export const API_BASE_URL =
    process.env.EXPO_PUBLIC_ENV === 'production'
      ? 'https://your-backend.railway.app'
      : 'http://localhost:8000';
  ```
- [ ] Set `EXPO_PUBLIC_ENV=production` in your EAS production build profile.

### Custom Domain (optional but professional)
- [ ] Buy a domain (Namecheap, Cloudflare Registrar — ~$10/year).
- [ ] Point `api.yourdomain.com` at your Railway/Render deployment via a CNAME record.
- [ ] HTTPS is handled automatically by the platform.

---

## Phase 5 — Push Notifications (Firebase Cloud Messaging)

- [ ] Create a Firebase project at console.firebase.google.com. Add an iOS and Android app.
- [ ] Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS), place in the React Native project root.
- [ ] Install `expo-notifications` in the mobile app.
- [ ] On app launch, request notification permission and retrieve the Expo push token. Store it in Supabase (`POST /api/v1/devices` → `device_tokens` table).
- [ ] Add `FCM_SERVER_KEY` to your backend environment variables.
- [ ] When a Responder verifies a Report and creates an Incident (lifecycle = VERIFIED), the backend sends a push notification to all registered tokens in the affected district.
- [ ] Use topic-based subscriptions for districts: subscribe each device to `district-{zone_district}` on launch so you can target by zone without storing individual tokens.

---

## Phase 6 — App Store Submission

### Before You Build
- [ ] Apple Developer account enrolled ($99/year at developer.apple.com).
- [ ] Fill out `mobile/app.json`: `bundleIdentifier` (e.g., `com.yourname.nepaldisaster`), `version`, `buildNumber`, `name`, `slug`.
- [ ] Add all required permission strings to `app.json`:
  ```json
  "infoPlist": {
    "NSLocationWhenInUseUsageDescription": "Used to attach your location to disaster reports.",
    "NSCameraUsageDescription": "Used to attach photos to disaster reports.",
    "NSPhotoLibraryUsageDescription": "Used to attach photos to disaster reports."
  }
  ```
- [ ] Design and export app icons: 1024×1024 PNG (no alpha channel — Apple will reject it otherwise).
- [ ] Design a splash screen.

### Building with EAS
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Run `eas login` and `eas build:configure`
- [ ] Set up build profiles in `eas.json`: development, preview (TestFlight), production.
- [ ] Run `eas credentials` to let EAS manage your signing certificates automatically.
- [ ] Build: `eas build --platform ios --profile preview` → submit to TestFlight.
- [ ] Test on TestFlight with real users before submitting to App Store review.

### App Store Connect
- [ ] Create your app listing in App Store Connect (appstoreconnect.apple.com).
- [ ] Upload screenshots for iPhone 6.7" and iPhone 6.1" (required).
- [ ] Write the app description, keywords, support URL, privacy policy URL.
- [ ] Set age rating (likely 4+ or 12+ depending on disaster content classification).
- [ ] Submit for review. First review typically takes 1-3 days. Common rejection reasons:
  - Missing permission descriptions
  - App crashes on reviewer's device (test on physical device, not just simulator)
  - Demo account required if there's any login (you don't have one, so fine)
  - Misleading data presented as real-time without being real-time

### Before Your Public Submission Build
- [ ] All 5 screens must handle no-network gracefully (empty state, not a crash).
- [ ] The Gorkha 2015 scenario incidents must be clearly labeled as historical simulation, not live events.
- [ ] Remove any hardcoded test phone numbers from the Support screen if they aren't real.
- [ ] Verify the app works on a physical iPhone without a Mac or simulator.

---

## Recommended Order of Work

```
Week 1    Fix the 4 broken things (Phase 1)
          Activate USGS live data (Phase 2)

Week 2    Create incidents + harden reports in Supabase (Phase 3)
          Add TTL cache to incidents route (Phase 2)

Week 3    Deploy backend to Railway (Phase 4)
          Update mobile API URL for production (Phase 4)

Week 4    Wire image upload to Supabase Storage (Phase 3)

Week 5-6  Firebase FCM push notifications (Phase 5)

Week 7    EAS Build + TestFlight (Phase 6)
          Fix anything found in TestFlight testing

Week 8    App Store submission (Phase 6)
```

The biggest risk right now is not missing features — it's that the entire data layer is still static. Activating USGS and creating the Supabase incidents table (Weeks 1-2) should be the first priority before any deployment work.
