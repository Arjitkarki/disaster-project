# Dev Setup & Testing Reference

## How the stack works

```
[Phone / Simulator]
       |
       | HTTP over WiFi (or localhost if simulator)
       v
[Your Laptop — FastAPI :8000]
       |
       | HTTPS
       v
[USGS / GDACS APIs]
```

The app is split into two separate programs that talk to each other:

- **The mobile app** (React Native / Expo) is what runs on your phone. It has no data or logic of its own — it is purely a UI. Every screen load, every refresh, every list of incidents comes from a network request it sends to the backend.
- **The backend** (FastAPI / Python) is a small web server that runs on your laptop during development. It is responsible for fetching raw earthquake/disaster data from USGS and GDACS, cleaning it into the Incident format the app understands, and serving it over HTTP when the app asks.
- **USGS / GDACS** are external APIs owned by third parties. The backend calls them — the phone never contacts them directly. This keeps the app simple and lets you control and transform the data in one place.

Because these are two separate programs, **both must be running at the same time** for the app to work. If the backend is off, the phone has nothing to talk to and every fetch fails.

---

## Why you need to start the backend manually

The backend is just a Python process — it has no built-in way to start itself. When you open a terminal and run `uvicorn`, you are manually launching that process. When you close the terminal or restart your Mac, the process dies. There is no magic keeping it alive in the background.

In a production app (one that real users install from the App Store), the backend would be deployed to a cloud server like Railway or Render that keeps it running 24/7 with a permanent URL like `https://api.yourdisasterapp.com`. At that point you would never need to start it manually — it just lives there. But during development, your laptop plays the role of that cloud server, so you have to start it yourself each session.

---

## Why WiFi needs to be configured for a physical device

Your phone and your laptop are two separate computers. They communicate over your local WiFi network, the same way any two computers on the same network talk to each other.

`localhost` is a special name that always means "this device itself." When the phone app tries to connect to `localhost:8000`, it looks for a server running on the phone — which doesn't exist. It has no idea your laptop is even on the network.

To fix this, you give the app your laptop's actual IP address on the WiFi network (e.g. `192.168.1.45`). Now when the app makes a request to `192.168.1.45:8000`, the WiFi router knows to send that request to your laptop, where the backend is listening.

This is also why **both devices must be on the same WiFi network**. If your phone is on mobile data and your laptop is on WiFi, they are on completely different networks and cannot reach each other at all.

The iOS Simulator is different — it runs directly on your Mac as a process, so it shares your Mac's network stack. That is why `localhost` works for the simulator but not a real device.

---

## Starting the stack

### Step 1 — Find your Mac's local IP (physical device only)

Your laptop's IP changes whenever you join a new network, so check it each time you switch networks.

```bash
ipconfig getifaddr en0
```

Update `mobile/.env` with the result:
```
EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:8000
```

Skip this step if you are using the iOS Simulator — leave it as `localhost`.

### Step 2 — Terminal 1: Start the backend

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- `source .venv/bin/activate` — activates the Python virtual environment where your dependencies are installed. Without this, Python won't find FastAPI, uvicorn, or any other package.
- `--reload` — watches your Python files and automatically restarts the server when you make changes. Without this you'd have to manually kill and restart it every time you edit code.
- `--host 0.0.0.0` — tells the server to listen on all network interfaces, not just localhost. This is what makes it reachable from your phone over WiFi. Without this flag, only your laptop itself could connect to it.
- `--port 8000` — the port number the server listens on. Must match the port in `mobile/.env`.

### Step 3 — Terminal 2: Start the mobile app

```bash
cd mobile
npx expo start
```

This starts the Expo development server, which is a tool that bundles your JavaScript and sends it to the phone. It is not the app itself — it is the bridge that gets your code onto the device during development.

- Scan the QR code with the Expo Go app on your phone, or press `i` to open the iOS Simulator.
- Every time you save a file in `mobile/src/`, Expo automatically pushes the updated JS to the device — no rebuild needed for JS changes.

---

## Killing a port that's already in use

If uvicorn complains `[Errno 48] Address already in use`, another process is holding port 8000. Kill it:

```bash
lsof -ti:8000 | xargs kill -9
```

Then restart normally. If you'd rather not kill the process, run on a different port and update `mobile/.env` to match:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

---

## Verifying the backend is up

Before running the app, confirm the backend is actually responding. Open this in your browser:
```
http://localhost:8000/api/v1/incidents
```
You should see a JSON array of incidents. If you see an error or a blank page, the backend is not running or has crashed — check Terminal 1.

---

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `Network request failed` on device | `localhost` in `.env` instead of your Mac's IP | Run `ipconfig getifaddr en0`, update `EXPO_PUBLIC_API_BASE_URL` |
| `Network request failed` on simulator | Backend not running | Start Terminal 1 |
| All fetches fail, backend terminal shows nothing | Phone and laptop on different networks | Connect both to the same WiFi |
| Mapbox map blank / 401 error | Token not embedded in native build | Rebuild with `expo run:ios` |
| Backend changes not showing up | Server not running with `--reload` | Restart uvicorn with the `--reload` flag |
| `ModuleNotFoundError` in backend | Virtual environment not activated | Run `source .venv/bin/activate` first |
| `Error loading ASGI app. Could not import module "app.main"` | Wrong module path — `main.py` is at `backend/main.py`, not `backend/app/main.py` | Use `uvicorn main:app`, not `uvicorn app.main:app` |
| `[Errno 48] Address already in use` | Another process is already on port 8000 | Run `lsof -ti:8000 \| xargs kill -9`, then retry |

---

## Environment files

| File | Purpose |
|---|---|
| `mobile/.env` | `EXPO_PUBLIC_API_BASE_URL` (backend URL), `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` |
| `.env` (root) | Backend secrets — Supabase, Firebase, etc. |

Never commit either `.env` file. They contain keys and your local IP, neither of which belongs in version control.
