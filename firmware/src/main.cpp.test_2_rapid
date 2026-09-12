#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define XSHUT_1 15
#define XSHUT_2 5
#define LED_PIN 2
#define UMBRAL_MM 150

Adafruit_VL53L0X sensor1;
Adafruit_VL53L0X sensor2;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  pinMode(LED_PIN, OUTPUT);

  pinMode(XSHUT_1, OUTPUT);
  pinMode(XSHUT_2, OUTPUT);
  digitalWrite(XSHUT_1, LOW);
  digitalWrite(XSHUT_2, LOW);
  delay(10);

  digitalWrite(XSHUT_1, HIGH);
  delay(10);
  sensor1.begin(0x30);

  digitalWrite(XSHUT_2, HIGH);
  delay(10);
  sensor2.begin(0x31);

  // Modo continuo: mucho más rápido que rangingTest() (que es single-shot)
  sensor1.startRangeContinuous();
  sensor2.startRangeContinuous();

  Serial.println("Listo");
}

void loop() {
  bool detectado = false;

  if (sensor1.isRangeComplete()) {
    uint16_t d1 = sensor1.readRange();
    if (d1 < UMBRAL_MM) detectado = true;
    Serial.print("S1: "); Serial.print(d1);
  }

  if (sensor2.isRangeComplete()) {
    uint16_t d2 = sensor2.readRange();
    if (d2 < UMBRAL_MM) detectado = true;
    Serial.print(" | S2: "); Serial.println(d2);
  }

  digitalWrite(LED_PIN, detectado ? HIGH : LOW);
}