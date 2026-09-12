#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>

Adafruit_VL53L0X sensor;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // SDA, SCL

  if (!sensor.begin()) {
    Serial.println("Error: sensor no detectado");
    while (1);
  }
  Serial.println("Sensor OK");
}

void loop() {
  VL53L0X_RangingMeasurementData_t medida;
  sensor.rangingTest(&medida, false);

  if (medida.RangeStatus != 4) {
    Serial.print("Distancia (mm): ");
    Serial.println(medida.RangeMilliMeter);
  } else {
    Serial.println("Fuera de rango");
  }
  delay(200);
}