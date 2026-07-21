"""
HallSense USB serial → Firestore bridge.

Reads JSON lines from the Seeeduino Lotus, updates the live room,
appends history readings, and sends Expo push alerts on overheat.
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
load_dotenv(ROOT / "bridge" / ".env.example")

SERIAL_PORT = os.getenv("SERIAL_PORT", "COM3")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "9600"))
LIVE_ROOM_ID = os.getenv("LIVE_ROOM_ID", "vari-a")
THRESHOLD_C = float(os.getenv("THRESHOLD_C", "25"))
PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "hallsense-demo")
PUSH_COOLDOWN_SEC = int(os.getenv("PUSH_COOLDOWN_SEC", "60"))
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def init_firebase():
    try:
        get_app()
    except ValueError:
        if os.getenv("FIRESTORE_EMULATOR_HOST"):
            os.environ.setdefault("GCLOUD_PROJECT", PROJECT_ID)
            initialize_app(_EmulatorCredential(), {"projectId": PROJECT_ID})
        else:
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path and Path(cred_path).exists():
                initialize_app(credentials.Certificate(cred_path), {"projectId": PROJECT_ID})
            else:
                initialize_app(options={"projectId": PROJECT_ID})
    return firestore.client()


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


def write_reading(db, payload: dict[str, Any], now_ms: int) -> None:
    t = payload.get("t")
    h = payload.get("h")
    if t is None:
        return
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

    db.collection("readings_latest").document(LIVE_ROOM_ID).set(reading)
    db.collection("readings").add(reading)
    db.collection("rooms").document(LIVE_ROOM_ID).set(
        {
            "tempC": t,
            "humidity": h,
            "overheat": overheat,
            "source": "live",
            "updatedAt": now_ms,
        },
        merge=True,
    )


def maybe_push(db, overheat: bool, temp: float, was_overheat: bool, last_push: float) -> float:
    if not overheat:
        return last_push
    now = time.time()
    # Push on rising edge, or while overheating with cooldown
    rising = overheat and not was_overheat
    cooled = now - last_push >= PUSH_COOLDOWN_SEC
    if not (rising or cooled):
        return last_push

    doc = db.collection("devices").document("demo").get()
    token = None
    if doc.exists:
        token = (doc.to_dict() or {}).get("expoPushToken")
    if not token:
        print("[push] no demo Expo token registered yet")
        return last_push

    send_expo_push(
        token,
        "HallSense overheat alert",
        f"Vari Hall A is {temp:.1f}°C (above {THRESHOLD_C:.0f}°C).",
        {"roomId": LIVE_ROOM_ID, "tempC": temp},
    )
    return now


def open_serial():
    print(f"[serial] opening {SERIAL_PORT} @ {SERIAL_BAUD}")
    return serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)


def run_simulator(db) -> None:
    """Generate fake readings when no board is connected (demo / CI)."""
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
    db = init_firebase()
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
        print("Hint: set SERIAL_PORT in bridge/.env, or run with --sim")
        run_simulator(db)
        return 0

    was_overheat = False
    last_push = 0.0
    print("[serial] listening for JSON lines...")
    try:
        while True:
            raw = ser.readline().decode("utf-8", errors="ignore")
            payload = parse_line(raw)
            if not payload:
                continue
            print(f"[serial] {payload}")
            now_ms = int(time.time() * 1000)
            write_reading(db, payload, now_ms)
            t = float(payload["t"]) if payload.get("t") is not None else 0.0
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
