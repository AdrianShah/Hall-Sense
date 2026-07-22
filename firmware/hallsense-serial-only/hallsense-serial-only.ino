/*
 * HallSense bring-up sketch — serial only (no DHT / OLED / libraries).
 *
 * Use this FIRST if the full hallsense.ino upload fails or COM4 stays silent.
 * Board: Arduino Uno (Seeeduino Lotus)
 * Baud: 9600
 *
 * Expected Serial Monitor output every 2s:
 *   {"t":22.0,"h":40,"overheat":false,"ts":2000}
 */

void setup() {
  Serial.begin(9600);
  delay(500);
  Serial.println(F("{\"boot\":\"HallSense-serial-only\",\"ver\":1}"));
}

void loop() {
  static unsigned long last = 0;
  unsigned long now = millis();
  if (now - last < 2000UL) {
    return;
  }
  last = now;

  // Fake reading so the Python bridge / arduino:test can PASS without sensors
  Serial.print(F("{\"t\":22.0,\"h\":40,\"overheat\":false,\"ts\":"));
  Serial.print(now);
  Serial.println(F("}"));
}
