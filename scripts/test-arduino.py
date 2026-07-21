"""
Test HallSense Arduino / Seeeduino Lotus over USB serial.

Usage:
  python scripts/test-arduino.py
  python scripts/test-arduino.py COM4
"""

from __future__ import annotations

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
        return 1

    time.sleep(2.5)  # allow MCU reset after DTR
    print("Listening 25s for HallSense JSON lines...")
    end = time.time() + 25
    count = 0
    while time.time() < end:
        raw = ser.readline().decode("utf-8", errors="ignore").strip()
        if not raw:
            continue
        print(f"RX: {raw}")
        count += 1
        if raw.startswith("{") and "t" in raw:
            print("\nPASS — firmware is streaming sensor JSON.")
            ser.close()
            return 0
        if count >= 8:
            break

    ser.close()
    print(
        "\nFAIL — port opened but no JSON received.\n"
        "1) Upload firmware/hallsense/hallsense.ino in Arduino IDE\n"
        "2) Select the correct board (Arduino Uno) and port\n"
        "3) Close Serial Monitor (it locks the port)\n"
        "4) Re-run: python scripts/test-arduino.py"
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
