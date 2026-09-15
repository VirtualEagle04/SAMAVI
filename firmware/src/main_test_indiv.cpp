#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>

#define SCL 22
#define SDA 21

#define TEST_SENSOR 6 // Reemplazar con el sensor que se desea probar

const int XSHUTpins[6] = {15, 4, 18, 13, 14, 33};

Adafruit_VL53L0X sensor;

void setup() {
    Serial.begin(115200);
    Wire.begin(SDA, SCL);
    
    int index = TEST_SENSOR - 1;
    
    for (int i = 0; i < 6; i++)
    {
        pinMode(XSHUTpins[i], OUTPUT);
        digitalWrite(XSHUTpins[i], LOW);
    }
    delay(10);
    
    digitalWrite(XSHUTpins[index], HIGH);
    delay(10);
    
    Serial.print("Probando sensor ");
    Serial.print(TEST_SENSOR);
    Serial.print(" (XSHUT en pin ");
    Serial.print(XSHUTpins[index]);
    Serial.println(")");
    
    if (!sensor.begin()) {
        Serial.println("ERROR: sensor no detectado");
        while(1);
    }
    
    sensor.startRangeContinuous();
    Serial.println("Sensor OK, iniciando lecturas...");
}

void loop()
{
    if (sensor.isRangeComplete()) {
        Serial.print("Distancia: ");
        Serial.println(sensor.readRange());
    }
}