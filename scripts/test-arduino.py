"""
Test HallSense Arduino / Seeeduino Lotus over USB serial.

Usage:
  python scripts/test-arduino.py
  python scripts/test-arduino.py COM4
  npm run arduino:test
"""

from __future__ import annotations

import json
import sys
import time

import serial
import serial.tools.list_ports


def list_ports() -> None:
    ports = list(serial.tools.list_ports.comports())
    if not ports:
        print("No serial ports found.")
        return
    print("Available ports:")
    for p in ports:
        print(f"  {p.device:8}  {p.description}")


def pick_default() -> str | None:
    for p in serial.tools.list_ports.comports():
        desc = (p.description or "").lower()
        if "cp210" in desc or "ch340" in desc or "arduino" in desc or "silabs" in desc:
            return p.device
    ports = list(serial.tools.list_ports.comports())
    return ports[0].device if ports else None


def main() -> int:
    list_ports()
    port = sys.argv[1] if len(sys.argv) > 1 else pick_default()
    if not port:
        print("No port to open.")
        return 1

    print(f"\nOpening {port} @ 9600 (board resets on open)...")
    try:
        ser = serial.Serial(port, 9600, timeout=1)
    except serial.SerialException as exc:
        print(f"FAIL: {exc}")
        print("Close Arduino Serial Monitor / bridge, then retry.")
        return 1

    time.sleep(2.5)
    print("Listening 30s for live temperature JSON...")
    end = time.time() + 30
    saw_boot = False
    null_samples = 0
    while time.time() < end:
        raw = ser.readline().decode("utf-8", errors="ignore").strip()
        if not raw:
            continue
        print(f"RX: {raw}")
        if '"boot"' in raw:
            saw_boot = True
            if "DHT20" in raw:
                print("  (DHT20 firmware detected)")
            elif "DHT11" in raw:
                print("  (DHT11 firmware detected)")
            continue
        if not raw.startswith("{"):
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if "t" not in data:
            continue
        t = data.get("t")
        h = data.get("h")
        if t is None:
            null_samples += 1
            print("  (temp still null — waiting…)")
            continue

        print(f"\nPASS — live sensor OK: t={t}°C h={h}%")
        ser.close()
        return 0

    ser.close()
    if saw_boot and null_samples:
        print(
            "\nFAIL — firmware is running but temperature stays null.\n"
            "If you just switched to DHT20:\n"
            "  1) Install Seeed library: Grove Temperature And Humidity Sensor\n"
            "     (Library Manager or Seeed GitHub ZIP)\n"
            "  2) Confirm #define DHT_KIND 2 and re-upload\n"
            "  3) Close Serial Monitor, then: npm run arduino:test\n"
            "If still null, try DHT_KIND 1 (DHT11 on D3)."
        )
        return 4
    if saw_boot:
        print("\nPARTIAL — boot only, no sensor samples.")
        return 3
    print(
        "\nFAIL — no JSON on serial.\n"
        "Upload firmware/hallsense/hallsense.ino, close Serial Monitor,\n"
        "then: npm run arduino:test"
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
