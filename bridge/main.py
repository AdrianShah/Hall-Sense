"""
HallSense USB serial → Firestore bridge.

Reads JSON lines from the Seeeduino Lotus, updates the live room,
appends history readings, and sends Expo push alerts on overheat.

Auth modes (first match wins):
  1) FIRESTORE_EMULATOR_HOST — anonymous emulator credential
  2) GOOGLE_APPLICATION_CREDENTIALS — service account JSON
  3) Client mode — sign in with FIREBASE_API_KEY + admin email/password
     (works with demo-open Firestore rules; no service account needed)
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import serial
from dotenv import load_dotenv
from firebase_admin import credentials, firestore, initialize_app, get_app
from google.auth.credentials import AnonymousCredentials


class _EmulatorCredential(credentials.Base):
    """firebase-admin credential that works without a service account (emulator)."""

    def __init__(self) -> None:
        super().__init__()
        self._g_credential = AnonymousCredentials()

    def get_credential(self):
        return self._g_credential


ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "bridge" / ".env")

SERIAL_PORT = os.getenv("SERIAL_PORT", "COM3")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "9600"))
LIVE_ROOM_ID = os.getenv("LIVE_ROOM_ID", "vari-a")
THRESHOLD_C = float(os.getenv("THRESHOLD_C", "25"))
PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "hallsense-demo")
PUSH_COOLDOWN_SEC = int(os.getenv("PUSH_COOLDOWN_SEC", "60"))
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

FIREBASE_API_KEY = os.getenv(
    "FIREBASE_API_KEY", "AIzaSyBw07M1-g7RWaqfIkzGH7YliriO9r8sDRo"
)
ADMIN_EMAIL = os.getenv("HALLSENSE_ADMIN_EMAIL", "admin@hallsense.demo")
ADMIN_PASSWORD = os.getenv("HALLSENSE_ADMIN_PASSWORD", "HallSense2026!")


class ClientFirestore:
    """Firestore writes via REST + Firebase Auth ID token (no service account)."""

    def __init__(self, project_id: str, api_key: str, email: str, password: str) -> None:
        self.project_id = project_id
        self.api_key = api_key
        self.email = email
        self.password = password
        self.id_token: str | None = None
        self.token_expires_at = 0.0
        self._sign_in()

    def _sign_in(self) -> None:
        url = (
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
            f"?key={self.api_key}"
        )
        resp = requests.post(
            url,
            json={
                "email": self.email,
                "password": self.password,
                "returnSecureToken": True,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        self.id_token = data["idToken"]
        # Refresh a minute early
        self.token_expires_at = time.time() + int(data.get("expiresIn", "3600")) - 60
        print(f"[firebase] client auth OK as {self.email}")

    def _ensure_token(self) -> str:
        if not self.id_token or time.time() >= self.token_expires_at:
            self._sign_in()
        assert self.id_token
        return self.id_token

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._ensure_token()}",
            "Content-Type": "application/json",
        }

    def _doc_url(self, *parts: str) -> str:
        path = "/".join(parts)
        return (
            f"https://firestore.googleapis.com/v1/projects/{self.project_id}"
            f"/databases/(default)/documents/{path}"
        )

    def _to_firestore_value(self, value: Any) -> dict[str, Any]:
        if value is None:
            return {"nullValue": None}
        if isinstance(value, bool):
            return {"booleanValue": value}
        if isinstance(value, int) and not isinstance(value, bool):
            return {"integerValue": str(value)}
        if isinstance(value, float):
            return {"doubleValue": value}
        if isinstance(value, str):
            return {"stringValue": value}
        raise TypeError(f"Unsupported Firestore value: {type(value)}")

    def _to_document(self, data: dict[str, Any]) -> dict[str, Any]:
        return {
            "fields": {k: self._to_firestore_value(v) for k, v in data.items()}
        }

    def set_doc(self, collection: str, doc_id: str, data: dict[str, Any], merge: bool = False) -> None:
        url = self._doc_url(collection, doc_id)
        if merge:
            mask = "&".join(f"updateMask.fieldPaths={k}" for k in data)
            url = f"{url}?{mask}"
            resp = requests.patch(url, headers=self._headers(), json=self._to_document(data), timeout=15)
        else:
            resp = requests.patch(url, headers=self._headers(), json=self._to_document(data), timeout=15)
        if resp.status_code == 404:
            # Create if missing
            parent = self._doc_url(collection)
            create_url = f"{parent}?documentId={doc_id}"
            resp = requests.post(
                create_url, headers=self._headers(), json=self._to_document(data), timeout=15
            )
        resp.raise_for_status()

    def add_doc(self, collection: str, data: dict[str, Any]) -> None:
        parent = self._doc_url(collection)
        resp = requests.post(
            parent, headers=self._headers(), json=self._to_document(data), timeout=15
        )
        resp.raise_for_status()

    def get_doc(self, collection: str, doc_id: str) -> dict[str, Any] | None:
        resp = requests.get(self._doc_url(collection, doc_id), headers=self._headers(), timeout=15)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        fields = resp.json().get("fields") or {}
        out: dict[str, Any] = {}
        for key, val in fields.items():
            if "stringValue" in val:
                out[key] = val["stringValue"]
            elif "doubleValue" in val:
                out[key] = float(val["doubleValue"])
            elif "integerValue" in val:
                out[key] = int(val["integerValue"])
            elif "booleanValue" in val:
                out[key] = bool(val["booleanValue"])
            elif "nullValue" in val:
                out[key] = None
        return out


class AdminFirestore:
    """Thin wrapper so write helpers share one API with ClientFirestore."""

    def __init__(self, db) -> None:
        self._db = db

    def set_doc(self, collection: str, doc_id: str, data: dict[str, Any], merge: bool = False) -> None:
        ref = self._db.collection(collection).document(doc_id)
        ref.set(data, merge=merge)

    def add_doc(self, collection: str, data: dict[str, Any]) -> None:
        self._db.collection(collection).add(data)

    def get_doc(self, collection: str, doc_id: str) -> dict[str, Any] | None:
        snap = self._db.collection(collection).document(doc_id).get()
        if not snap.exists:
            return None
        return snap.to_dict()


def init_db() -> AdminFirestore | ClientFirestore:
    if os.getenv("FIRESTORE_EMULATOR_HOST"):
        try:
            get_app()
        except ValueError:
            os.environ.setdefault("GCLOUD_PROJECT", PROJECT_ID)
            initialize_app(_EmulatorCredential(), {"projectId": PROJECT_ID})
        print(f"[firebase] emulator mode project={PROJECT_ID}")
        return AdminFirestore(firestore.client())

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and Path(cred_path).exists():
        try:
            get_app()
        except ValueError:
            initialize_app(credentials.Certificate(cred_path), {"projectId": PROJECT_ID})
        print(f"[firebase] service account mode project={PROJECT_ID}")
        return AdminFirestore(firestore.client())

    print(f"[firebase] client mode project={PROJECT_ID} (no service account)")
    return ClientFirestore(PROJECT_ID, FIREBASE_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD)


def parse_line(line: str) -> dict[str, Any] | None:
    line = line.strip()
    if not line or not line.startswith("{"):
        return None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None
    if "t" not in data:
        return None
    return data


def send_expo_push(token: str, title: str, body: str, data: dict[str, Any] | None = None) -> bool:
    if not token or not token.startswith("ExponentPushToken"):
        print(f"[push] skip invalid token: {token!r}")
        return False
    payload = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
        "priority": "high",
    }
    try:
        resp = requests.post(
            EXPO_PUSH_URL,
            json=payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        resp.raise_for_status()
        print(f"[push] sent → {resp.status_code} {resp.text[:200]}")
        return True
    except requests.RequestException as exc:
        print(f"[push] failed: {exc}")
        return False


def write_reading(db: AdminFirestore | ClientFirestore, payload: dict[str, Any], now_ms: int) -> bool:
    t = payload.get("t")
    h = payload.get("h")

    # Always mark the bridge as alive (dashboard can show "waiting for DHT")
    db.set_doc(
        "config",
        "bridge",
        {
            "lastSeen": now_ms,
            "port": SERIAL_PORT,
            "liveRoomId": LIVE_ROOM_ID,
            "lastHadTemp": t is not None,
        },
        merge=True,
    )

    if t is None:
        print("[bridge] skipping null temperature (DHT still warming / wiring?)")
        return False

    t = float(t)
    h = float(h) if h is not None else 0.0
    overheat = bool(payload.get("overheat", t > THRESHOLD_C))

    reading = {
        "roomId": LIVE_ROOM_ID,
        "t": t,
        "h": h,
        "overheat": overheat,
        "ts": now_ms,
        "iso": datetime.now(timezone.utc).isoformat(),
    }

    db.set_doc("readings_latest", LIVE_ROOM_ID, reading, merge=False)
    db.add_doc("readings", reading)
    db.set_doc(
        "rooms",
        LIVE_ROOM_ID,
        {
            "tempC": t,
            "humidity": h,
            "overheat": overheat,
            "source": "live",
            "updatedAt": now_ms,
        },
        merge=True,
    )
    print(f"[firestore] wrote {LIVE_ROOM_ID} t={t:.1f}C h={h:.0f}% overheat={overheat}")
    return True


def maybe_push(
    db: AdminFirestore | ClientFirestore,
    overheat: bool,
    temp: float,
    was_overheat: bool,
    last_push: float,
) -> float:
    if not overheat:
        return last_push
    now = time.time()
    rising = overheat and not was_overheat
    cooled = now - last_push >= PUSH_COOLDOWN_SEC
    if not (rising or cooled):
        return last_push

    doc = db.get_doc("devices", "demo")
    token = (doc or {}).get("expoPushToken") if doc else None
    if not token:
        print("[push] no demo Expo token registered yet — open mobile Alerts → Register this phone")
        return last_push

    send_expo_push(
        str(token),
        "HallSense overheat alert",
        f"Vari Hall A is {temp:.1f}°C (above {THRESHOLD_C:.0f}°C).",
        {"roomId": LIVE_ROOM_ID, "tempC": temp},
    )
    return now


def open_serial():
    print(f"[serial] opening {SERIAL_PORT} @ {SERIAL_BAUD}")
    return serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)


def run_simulator(db: AdminFirestore | ClientFirestore) -> None:
    print("[sim] No serial device — running temperature simulator (Ctrl+C to stop)")
    t = 22.0
    direction = 0.4
    was_overheat = False
    last_push = 0.0
    while True:
        t = max(18.0, min(30.0, t + direction))
        if t >= 28.0:
            direction = -0.35
        elif t <= 20.0:
            direction = 0.4
        overheat = t > THRESHOLD_C
        payload = {"t": round(t, 1), "h": 50, "overheat": overheat, "ts": int(time.time() * 1000)}
        now_ms = int(time.time() * 1000)
        print(f"[sim] {payload}")
        write_reading(db, payload, now_ms)
        last_push = maybe_push(db, overheat, t, was_overheat, last_push)
        was_overheat = overheat
        time.sleep(5)


def main() -> int:
    db = init_db()
    emu = os.getenv("FIRESTORE_EMULATOR_HOST")
    print(f"[firebase] project={PROJECT_ID} emulator={emu or 'off'} liveRoom={LIVE_ROOM_ID}")

    use_sim = "--sim" in sys.argv or os.getenv("HALLSENSE_SIM") == "1"
    if use_sim:
        run_simulator(db)
        return 0

    try:
        ser = open_serial()
    except serial.SerialException as exc:
        print(f"[serial] failed: {exc}")
        print(
            "Close Arduino Serial Monitor and any other app using the port,\n"
            "then re-run: npm run bridge\n"
            "Or demo without hardware: npm run bridge:sim"
        )
        return 1

    was_overheat = False
    last_push = 0.0
    print("[serial] listening for JSON lines... (Ctrl+C to stop)")
    try:
        while True:
            raw = ser.readline().decode("utf-8", errors="ignore")
            payload = parse_line(raw)
            if not payload:
                continue
            print(f"[serial] {payload}")
            now_ms = int(time.time() * 1000)
            wrote = write_reading(db, payload, now_ms)
            if not wrote:
                continue
            t = float(payload["t"])
            overheat = bool(payload.get("overheat", t > THRESHOLD_C))
            last_push = maybe_push(db, overheat, t, was_overheat, last_push)
            was_overheat = overheat
    except KeyboardInterrupt:
        print("\n[bridge] stopped")
    finally:
        ser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
