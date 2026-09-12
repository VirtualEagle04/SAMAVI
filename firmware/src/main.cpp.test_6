#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define NUM_SENSORES 6
const int pinesXSHUT[NUM_SENSORES] = {15, 4, 18, 13, 14, 33};
Adafruit_VL53L0X sensores[NUM_SENSORES];

void setup() {
  Serial.begin(115200);
  Wire.begin(22, 21); // SDA=22, SCL=21

  for (int i = 0; i < NUM_SENSORES; i++) {
    pinMode(pinesXSHUT[i], OUTPUT);
    digitalWrite(pinesXSHUT[i], LOW);
  }
  delay(10);

  for (int i = 0; i < NUM_SENSORES; i++) {
    digitalWrite(pinesXSHUT[i], HIGH);
    delay(10);
    if (!sensores[i].begin(0x30 + i)) {
      Serial.print("Error sensor "); Serial.println(i + 1);
      while (1);
    }
    sensores[i].startRangeContinuous();
  }
  Serial.println("6 sensores listos");
}

void loop() {
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (sensores[i].isRangeComplete()) {
      Serial.print("S"); Serial.print(i + 1);
      Serial.print(": "); Serial.print(sensores[i].readRange());
      Serial.print(" | ");
    }
  }
  Serial.println();
}