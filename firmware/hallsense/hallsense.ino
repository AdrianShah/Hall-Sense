/*
 * HallSense — Seeeduino Lotus / Grove Beginner Kit firmware
 *
 * Pins:
 *   DHT11 (classic)  → D3 one-wire
 *   DHT20 (newer)    → I2C @ 0x38 (same bus as OLED)
 *   Buzzer           → D5
 *   Mute button      → D6 (press to silence overheat alarm)
 *   OLED 0.96"       → I2C
 *
 * Libraries:
 *   DHT11 mode: "DHT sensor library" (Adafruit) + U8g2
 *   DHT20 mode: U8g2 only (DHT20 driver is built-in — no Seeed/Adafruit DHT needed)
 */

#include <Arduino.h>
#include <Wire.h>
#include <U8x8lib.h>

// -------- Config --------
#define SAMPLE_INTERVAL_MS 5000UL
#define OVERHEAT_C         25.0f
#define BUZZER_PIN         5
#define BUTTON_PIN         6
#define DHT_PIN            3
#define BUTTON_DEBOUNCE_MS 40UL

// 1 = DHT11 on D3 (needs Adafruit DHT library)
// 2 = DHT20 on I2C (built-in driver — use this for newer Grove Beginner Kit)
#define DHT_KIND 2

#define DEMO_FAKE_SENSOR 0

#if DHT_KIND == 1
#include <DHT.h>
DHT dht11(DHT_PIN, DHT11);
#endif

// ---- Built-in DHT20 / AHT20-compatible I2C reader (addr 0x38) ----
#if DHT_KIND == 2
class Dht20Sensor {
 public:
  static const uint8_t ADDR = 0x38;

  bool begin() {
    delay(100);
    Wire.beginTransmission(ADDR);
    if (Wire.endTransmission() != 0) {
      return false;
    }
    // Soft reset
    Wire.beginTransmission(ADDR);
    Wire.write(0xBA);
    Wire.endTransmission();
    delay(20);
    // Init / calibration command used by AHT20/DHT20
    Wire.beginTransmission(ADDR);
    Wire.write(0xBE);
    Wire.write(0x08);
    Wire.write(0x00);
    Wire.endTransmission();
    delay(10);
    return true;
  }

  bool read(float &temperatureC, float &humidityPct) {
    temperatureC = NAN;
    humidityPct = NAN;

    // Trigger measurement
    Wire.beginTransmission(ADDR);
    Wire.write(0xAC);
    Wire.write(0x33);
    Wire.write(0x00);
    if (Wire.endTransmission() != 0) {
      return false;
    }

    delay(80);

    // Wait until not busy (bit7 of status)
    for (int i = 0; i < 20; i++) {
      Wire.requestFrom((int)ADDR, 1);
      if (Wire.available() < 1) {
        delay(10);
        continue;
      }
      uint8_t status = Wire.read();
      if ((status & 0x80) == 0) {
        break;
      }
      delay(10);
    }

    Wire.requestFrom((int)ADDR, 6);
    if (Wire.available() < 6) {
      return false;
    }
    uint8_t data[6];
    for (int i = 0; i < 6; i++) {
      data[i] = Wire.read();
    }

    uint32_t rawH =
        ((uint32_t)data[1] << 12) | ((uint32_t)data[2] << 4) | ((uint32_t)data[3] >> 4);
    uint32_t rawT =
        (((uint32_t)data[3] & 0x0F) << 16) | ((uint32_t)data[4] << 8) | (uint32_t)data[5];

    humidityPct = (rawH * 100.0f) / 1048576.0f;
    temperatureC = (rawT * 200.0f) / 1048576.0f - 50.0f;

    if (humidityPct < 0.0f || humidityPct > 100.0f) {
      return false;
    }
    if (temperatureC < -40.0f || temperatureC > 80.0f) {
      return false;
    }
    return true;
  }
};

Dht20Sensor dht20;
#endif

U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(/* reset=*/U8X8_PIN_NONE);

unsigned long lastSampleMs = 0;
unsigned long lastBuzzToggleMs = 0;
unsigned long lastButtonChangeMs = 0;
bool overheat = false;
bool overheatDisplayPhase = false;
bool buzzerOn = false;
bool muted = false;
bool lastButtonRaw = false;
float lastTemp = NAN;
float lastHumi = NAN;

bool readTempHumidity(float &t, float &h) {
  t = NAN;
  h = NAN;
#if DHT_KIND == 1
  t = dht11.readTemperature();
  h = dht11.readHumidity();
  return !isnan(t) && !isnan(h);
#elif DHT_KIND == 2
  return dht20.read(t, h);
#endif
}

void updateDisplay() {
  u8x8.clear();

  if (isnan(lastTemp)) {
    // Sensor failure — large "--.-" centered
    u8x8.setFont(u8x8_font_inb21_2x4_n);
    u8x8.drawString(2, 2, "--.-");
    u8x8.setFont(u8x8_font_chroma48medium8_r);
    u8x8.drawString(10, 4, "C");
    return;
  }

  if (overheat) {
    overheatDisplayPhase = !overheatDisplayPhase;
    if (!overheatDisplayPhase) {
      // Phase A: "OVERHEAT" full screen
      u8x8.setFont(u8x8_font_px437wyse700b_2x2_r);
      u8x8.drawString(0, 3, "OVERHEAT");
      return;
    }
    // Phase B: fall through to show temperature
  }

  // Normal / overheat phase B: large temperature
  char buf[8];
  dtostrf(lastTemp, 4, 1, buf);
  // Trim leading spaces
  char *p = buf;
  while (*p == ' ') p++;

  // Center: figure out width. Each char is 2 tiles wide.
  int len = strlen(p);
  int startCol = (16 - len * 2) / 2;
  if (startCol < 0) startCol = 0;

  u8x8.setFont(u8x8_font_inb21_2x4_n);
  u8x8.drawString(startCol, 2, p);

  // Small "C" after the number
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  int cCol = startCol + len * 2;
  if (cCol > 15) cCol = 15;
  u8x8.drawString(cCol, 4, "C");
}

void emitJson() {
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
#if DEMO_FAKE_SENSOR
  static float fakeT = 20.0f;
  static float step = 0.5f;
  fakeT += step;
  if (fakeT >= 28.0f) step = -0.5f;
  if (fakeT <= 20.0f) step = 0.5f;
  lastTemp = fakeT;
  lastHumi = 45.0f;
  bool wasOverheat = overheat;
  overheat = (lastTemp > OVERHEAT_C);
  if (overheat && !wasOverheat) {
    muted = false;
  }
  if (!overheat) {
    muted = false;
    digitalWrite(BUZZER_PIN, LOW);
    buzzerOn = false;
  }
  updateDisplay();
  emitJson();
  return;
#endif

  float t = NAN;
  float h = NAN;
  for (int attempt = 0; attempt < 3; attempt++) {
    if (readTempHumidity(t, h)) {
      break;
    }
    delay(300);
  }

  if (isnan(t) || isnan(h)) {
    updateDisplay();
    emitJson();
    return;
  }

  lastTemp = t;
  lastHumi = h;
  bool wasOverheat = overheat;
  overheat = (t > OVERHEAT_C);
  // New overheat episode re-enables the alarm; mute only lasts until cool-down
  if (overheat && !wasOverheat) {
    muted = false;
  }
  if (!overheat) {
    muted = false;
    digitalWrite(BUZZER_PIN, LOW);
    buzzerOn = false;
  }
  updateDisplay();
  emitJson();
}

void silenceBuzzer() {
  muted = true;
  buzzerOn = false;
  digitalWrite(BUZZER_PIN, LOW);
  updateDisplay();
}

void handleMuteButton() {
  // Grove button on D6: HIGH while pressed
  bool pressed = digitalRead(BUTTON_PIN) == HIGH;
  unsigned long now = millis();
  if (pressed == lastButtonRaw) {
    return;
  }
  if (now - lastButtonChangeMs < BUTTON_DEBOUNCE_MS) {
    return;
  }
  lastButtonChangeMs = now;
  lastButtonRaw = pressed;
  if (pressed) {
    silenceBuzzer();
  }
}

void handleBuzzer() {
  if (!overheat || muted) {
    if (buzzerOn) {
      buzzerOn = false;
      digitalWrite(BUZZER_PIN, LOW);
    }
    return;
  }
  unsigned long now = millis();
  if (now - lastBuzzToggleMs >= 200UL) {
    lastBuzzToggleMs = now;
    buzzerOn = !buzzerOn;
    digitalWrite(BUZZER_PIN, buzzerOn ? HIGH : LOW);
  }
}

void setup() {
  Serial.begin(9600);
  delay(300);
#if DHT_KIND == 2
  Serial.println(F("{\"boot\":\"HallSense\",\"sensor\":\"DHT20\",\"ver\":3}"));
#else
  Serial.println(F("{\"boot\":\"HallSense\",\"sensor\":\"DHT11\",\"ver\":3}"));
#endif

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(BUTTON_PIN, INPUT);

  Wire.begin();
#if DHT_KIND == 1
  dht11.begin();
  delay(1500);
#else
  if (!dht20.begin()) {
    Serial.println(F("{\"error\":\"dht20_not_found\"}"));
  }
  delay(500);
#endif

  u8x8.begin();
  u8x8.setPowerSave(0);
  u8x8.setFlipMode(1);
  u8x8.clear();
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  u8x8.drawString(0, 0, "HallSense");
#if DHT_KIND == 2
  u8x8.drawString(0, 2, "DHT20...");
#else
  u8x8.drawString(0, 2, "DHT11...");
#endif

  delay(500);
  Serial.println(F("{\"ready\":true}"));
  lastSampleMs = millis() - SAMPLE_INTERVAL_MS;
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
    lastSampleMs = now;
    sampleSensor();
  }
  handleMuteButton();
  handleBuzzer();
}
