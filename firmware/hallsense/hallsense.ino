/*
 * HallSense — Seeeduino Lotus / Grove Beginner Kit firmware
 *
 * Pins (Grove Beginner Kit defaults):
 *   DHT temp/humidity  → D3
 *   Buzzer             → D5
 *   OLED 0.96"         → I2C
 *
 * Some kits ship DHT11; newer kits may ship DHT20 (I2C).
 * Set DHT_KIND below to match your hardware.
 *
 * Libraries (Arduino Library Manager):
 *   - DHT sensor library (Adafruit)  — for DHT11
 *   - Grove Temperature And Humidity Sensor (Seeed) — optional DHT20
 *   - U8g2 (olikraus) for OLED
 */

#include <Arduino.h>
#include <Wire.h>
#include <U8x8lib.h>

// -------- Config --------
#define SAMPLE_INTERVAL_MS 5000UL
#define OVERHEAT_C         25.0f
#define BUZZER_PIN         5
#define DHT_PIN            3

// 1 = DHT11 on D3 (classic Grove Beginner Kit)
// 2 = DHT20 on I2C (some newer kits)
#define DHT_KIND 1

#if DHT_KIND == 1
#include <DHT.h>
#define DHTTYPE DHT11
DHT dht(DHT_PIN, DHTTYPE);
#elif DHT_KIND == 2
#include "DHT.h"  // Seeed DHT20 header may differ; adjust if needed
#define DHTTYPE DHT20
DHT dht(DHTTYPE);
#endif

U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(/* reset=*/U8X8_PIN_NONE);

unsigned long lastSampleMs = 0;
unsigned long lastBuzzToggleMs = 0;
bool overheat = false;
bool buzzerOn = false;
float lastTemp = NAN;
float lastHumi = NAN;

void updateDisplay() {
  u8x8.clear();
  u8x8.setFont(u8x8_font_chroma48medium8_r);

  char line1[17];
  if (isnan(lastTemp) || isnan(lastHumi)) {
    snprintf(line1, sizeof(line1), "Temp: --.-C");
  } else {
    snprintf(line1, sizeof(line1), "T:%.1fC H:%.0f%%", lastTemp, lastHumi);
  }
  u8x8.drawString(0, 0, line1);

  if (overheat) {
    u8x8.drawString(0, 2, "STATUS:");
    u8x8.drawString(0, 3, "OVERHEAT!");
  } else {
    u8x8.drawString(0, 2, "STATUS: OK");
  }
}

void emitJson() {
  // Compact JSON line for the Python bridge
  Serial.print(F("{\"t\":"));
  if (isnan(lastTemp)) {
    Serial.print(F("null"));
  } else {
    Serial.print(lastTemp, 1);
  }
  Serial.print(F(",\"h\":"));
  if (isnan(lastHumi)) {
    Serial.print(F("null"));
  } else {
    Serial.print(lastHumi, 0);
  }
  Serial.print(F(",\"overheat\":"));
  Serial.print(overheat ? F("true") : F("false"));
  Serial.print(F(",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void sampleSensor() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    // Keep previous values; still emit so bridge knows we're alive
    emitJson();
    return;
  }

  lastTemp = t;
  lastHumi = h;
  overheat = (t > OVERHEAT_C);

  updateDisplay();
  emitJson();

  if (!overheat) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerOn = false;
  }
}

void handleBuzzer() {
  if (!overheat) {
    return;
  }
  // Pulsed alert: 200ms on / 200ms off
  unsigned long now = millis();
  if (now - lastBuzzToggleMs >= 200UL) {
    lastBuzzToggleMs = now;
    buzzerOn = !buzzerOn;
    digitalWrite(BUZZER_PIN, buzzerOn ? HIGH : LOW);
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin();
  dht.begin();

  u8x8.begin();
  u8x8.setPowerSave(0);
  u8x8.setFlipMode(1);
  u8x8.clear();
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  u8x8.drawString(0, 0, "HallSense");
  u8x8.drawString(0, 2, "Starting...");

  delay(500);
  lastSampleMs = millis() - SAMPLE_INTERVAL_MS;  // sample immediately
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
    lastSampleMs = now;
    sampleSensor();
  }
  handleBuzzer();
}
