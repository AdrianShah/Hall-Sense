# HallSense — ENG 1102 Phase 3 Prototype

Know the lecture hall before you walk across Keele.

HallSense monitors a Grove Beginner Kit / **Seeeduino Lotus** sensor, streams readings to **Firebase**, and shows live + mock Keele campus room temperatures on a **Next.js** dashboard and **Expo** phone app. When the live room exceeds **25°C**, the board buzzes, the OLED warns, and the demo phone gets a push alert.

## Architecture

```
Seeeduino Lotus (DHT + OLED + buzzer)
        │ USB serial JSON every 5s
        ▼
Python bridge ──► Firebase Firestore
        │                │
        │ Expo Push      ├─► Next.js web dashboard + Keele map
        ▼                └─► Expo mobile app
   Demo phone
```

## Repo layout

| Path | Purpose |
|------|---------|
| `firmware/hallsense/` | Arduino sketch for Seeeduino Lotus |
| `bridge/` | Python USB → Firestore + Expo push |
| `web/` | Next.js dashboard (live status, trend, map, search, admin login) |
| `mobile/` | Expo app (map, search, room detail, push registration) |
| `shared/campus-seed.json` | Keele buildings + mock rooms |
| `scripts/seed-firestore.mjs` | Seed Auth admin + campus data |
| `scripts/push-test.mjs` | Manual Expo push test |

## Hardware (Grove Beginner Kit / Seeeduino Lotus)

| Module | Pin |
|--------|-----|
| Temperature & humidity (DHT11) | D3 |
| Buzzer | D5 |
| OLED 0.96" | I2C |

1. Install Arduino libraries: **DHT sensor library** (Adafruit), **U8g2**.
2. If your kit has **DHT20** (I2C) instead of DHT11, set `#define DHT_KIND 2` in `hallsense.ino` and install the Seeed DHT library.
3. Upload `firmware/hallsense/hallsense.ino` (Board: **Arduino Uno**, Port: your COM port).
   - If compile fails or COM stays silent, upload `firmware/hallsense-serial-only/` first to prove USB serial works, then switch back to the full sketch.
4. Close Serial Monitor, then run `npm run arduino:test` — you should see JSON every few seconds:
   `{"t":22.4,"h":48,"overheat":false,"ts":5000}`
5. Open Serial Monitor at **9600** baud only for debugging; close it again before the Python bridge.

Warm the sensor past 25°C to hear the buzzer and see `STATUS: OVERHEAT!` on the OLED.

## Local-first setup (recommended)

### 1. Install dependencies

```powershell
cd "d:\D-York\Eng1102 Project"
npm install
python -m pip install -r bridge/requirements.txt
cd web; npm install; cd ..
cd mobile; npm install; cd ..
```

### 2. Start Firebase emulators

```powershell
npx firebase emulators:start --only auth,firestore
```

Emulator UI: http://127.0.0.1:4000

### 3. Seed campus data + admin user

In a second terminal:

```powershell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
node scripts/seed-firestore.mjs
```

**Demo admin login**

- Email: `admin@hallsense.demo`
- Password: `HallSense2026!`

### 4. Run the Python bridge

```powershell
copy bridge\.env.example bridge\.env
# Edit SERIAL_PORT (e.g. COM3) for your board
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
python bridge/main.py
```

No board connected? Simulate readings:

```powershell
python bridge/main.py --sim
```

### 5. Web dashboard

```powershell
cd web
# .env.local already points at emulators
npm run dev
```

Open http://localhost:3000 — live panel, last-hour trend, Keele map, search.

### 6. Expo mobile app

```powershell
cd mobile
npx expo start
```

- Sign in with the admin credentials.
- Open **Alerts → Register this phone** (physical device).
- On Android, remote push may require a **development build** (Expo Go limitations). iOS Expo Go often works for demos.

Physical device talking to emulators on your PC: set `extra.firestoreEmulatorHost` / `authEmulatorHost` in `mobile/app.json` to your LAN IP (e.g. `192.168.x.x:8080`), not `127.0.0.1`.

### 7. Test push wiring

After registering the phone:

```powershell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
node scripts/push-test.mjs
```

Or heat the sensor / let `--sim` cross 25°C — the bridge sends Expo pushes (rate-limited to once per minute while hot).

## Presentation demo script

1. Show Serial Monitor JSON every 5s.
2. Warm sensor → OLED `OVERHEAT!` + buzzer.
3. Web dashboard turns red; trend chart shows the spike (run bridge from the start of class for a fuller curve).
4. Phone receives push; map shows Vari Hall A among mock Keele rooms.
5. Search e.g. `CLH` or `LAS` to show pre-class room check.

## Production Firebase (cloud)

1. Create a Firebase project (Auth email/password + Firestore).
2. Download a service account JSON → `serviceAccount.json` (gitignored).
3. Copy web config into `web/.env.local` and set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`.
4. Update `mobile/app.json` `extra` with real Firebase keys and `"useEmulator": "false"`.
5. Unset emulator env vars for the bridge; set `GOOGLE_APPLICATION_CREDENTIALS` to the service account path.
6. Seed production:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS=".\serviceAccount.json"
node scripts/seed-firestore.mjs
```

7. Build & host the static web app:

```powershell
cd web
npm run build
cd ..
npx firebase deploy --only hosting,firestore:rules
```

Point `firebase use` at your real project id in `.firebaserc` before deploying.

## Making this a real (hosted) project

### Recommended production stack
1. **GitHub** — source of truth for the monorepo  
2. **Vercel** — hosts the Next.js web dashboard (always-on URL)  
3. **Firebase** — Auth + Firestore (and optional Hosting fallback)  
4. **Expo** — phone app; for demos use **tunnel** locally, or install a one-time **EAS APK** so the phone does not need Metro

### Expo QR: what “always works” actually means
- The Metro QR (`expo start`) **only works while that command is running**. That cannot be a permanent public QR.
- For an **always-available phone experience**, pick one:
  - **Best for class demo:** use the **Vercel web URL** on the phone browser (map + live status), and keep Expo for push-demo when Metro/tunnel is up.
  - **Best installable app:** `eas build -p android` → install the APK on the demo phone once (no QR each time).
  - Expo Go cannot stay “published forever” the old `expo publish` way; EAS Update still needs an Expo project and has Expo Go limits (especially Android push).

### Expo timeout fix (already applied)
Default mobile start now uses **tunnel** (`expo start --tunnel`) so the phone does not need to reach `10.0.0.178:8081` on LAN.

```powershell
# Stop the stuck Expo process (Ctrl+C), then:
npm run mobile
```

Skip the broken in-terminal login prompt if it appears again — press `Ctrl+C`, then in a separate terminal:

```powershell
cd mobile
npx expo login
```

Same Wi‑Fi is still ideal; tunnel works across networks but is slower.

### Firebase note
Your Google account is at **project quota** — MCP could not create `hallsense-eng1102`. Reuse an existing project (you have `testwebapp-974ae`, `potluck-io`, `soccer-wpm`, `flutter-ai-playground-203ff`) or free a slot at [Google Cloud Console → IAM → Quotas](https://console.cloud.google.com/), then tell me the project ID and I will wire apps + keys via MCP.

### What you do next (you), what I do (me)
**You**
1. Create an empty GitHub repo (e.g. `HallSense`) — `gh` is not installed on this machine, so use github.com → New repository.  
2. Reply with: repo URL + which Firebase project ID to use.  
3. (Optional) Create a free [Expo](https://expo.dev) account and stay logged in via `npx expo login`.

**Me (after you reply)**
1. `git init`, first commit if you ask, push instructions  
2. Point Firebase MCP at your project → create Web app → drop config into `web/.env.local` + `mobile/app.json` → enable Auth/Firestore → seed  
3. Deploy web to **Vercel** (MCP is authenticated) and give you the live URL  

## Admin credentials (demo)

| Field | Value |
|-------|-------|
| Email | `admin@hallsense.demo` |
| Password | `HallSense2026!` |

Change these via `HALLSENSE_ADMIN_EMAIL` / `HALLSENSE_ADMIN_PASSWORD` when seeding.

## Notes

- Mock rooms cover Vari, Curtis, Lassonde, Bergeron, Accolade East/West, and Life Sciences — not every Keele room.
- Only **Vari Hall A** (`vari-a`) is driven by the live sensor.
- Sampling interval is **5 seconds** for a snappy demo (plan default).
