#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define XSHUT_1 15
#define XSHUT_2 2

Adafruit_VL53L0X sensor1;
Adafruit_VL53L0X sensor2;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  pinMode(XSHUT_1, OUTPUT);
  pinMode(XSHUT_2, OUTPUT);

  // 1. Apagar ambos sensores
  digitalWrite(XSHUT_1, LOW);
  digitalWrite(XSHUT_2, LOW);
  delay(10);

  // 2. Encender sensor 1, asignarle dirección 0x30
  digitalWrite(XSHUT_1, HIGH);
  delay(10);
  if (!sensor1.begin(0x30)) {
    Serial.println("Error sensor 1");
    while (1);
  }

  // 3. Encender sensor 2, dejarlo en 0x29 (o cambiarlo también)
  digitalWrite(XSHUT_2, HIGH);
  delay(10);
  if (!sensor2.begin(0x31)) {
    Serial.println("Error sensor 2");
    while (1);
  }

  Serial.println("Ambos sensores OK");
}

void loop() {
  VL53L0X_RangingMeasurementData_t m1, m2;
  sensor1.rangingTest(&m1, false);
  sensor2.rangingTest(&m2, false);

  Serial.print("S1: "); Serial.print(m1.RangeMilliMeter);
  Serial.print(" mm | S2: "); Serial.println(m2.RangeMilliMeter);
  delay(200);
}