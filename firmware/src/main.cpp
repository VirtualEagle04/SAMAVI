#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>
#include <sys/time.h>
#include "config.h"

#define PIN_SCL 22
#define PIN_SDA 21
#define NUM_SENSORES 6

const uint8_t pinesXSHUT[NUM_SENSORES] = {15, 4, 18, 13, 14, 33};
const char* categorias[NUM_SENSORES] = {"Y", "Ex", "AA", "A", "B", "C"};
const char* MQTT_TOPIC = "samavi/conteo";
const uint16_t DISTANCIA_MIN_MM = 10;
const uint16_t DISTANCIA_MAX_MM = 100;
const unsigned long INTERVALO_LECTURA_MS = 50;

Adafruit_VL53L0X sensores[NUM_SENSORES];
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
bool sensorActivo[NUM_SENSORES] = {false};
unsigned long ultimaLectura = 0;

void conectarWiFi();
void conectarMQTT();
String obtenerTimestamp();
void publicarConteo(uint8_t sensorIndex);

void setup() {
  Serial.begin(115200);
  Wire.begin(PIN_SDA, PIN_SCL);

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
      while (true) {
        delay(1000);
      }
    }
    sensores[i].startRangeContinuous();
  }

  conectarWiFi();
  configTime(-5 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  Serial.println("6 sensores OK");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }
  if (!mqttClient.connected()) {
    conectarMQTT();
  }
  mqttClient.loop();

  if (millis() - ultimaLectura < INTERVALO_LECTURA_MS) {
    return;
  }
  ultimaLectura = millis();

  for (int i = 0; i < NUM_SENSORES; i++) {
    if (sensores[i].isRangeComplete()) {
      uint16_t lectura = sensores[i].readRange();

      if (sensores[i].timeoutOccurred()) {
        sensorActivo[i] = false;
        continue;
      }

      bool dentroDelRango = lectura >= DISTANCIA_MIN_MM && lectura <= DISTANCIA_MAX_MM;
      if (dentroDelRango && !sensorActivo[i]) {
        publicarConteo(i);
        sensorActivo[i] = true;
      } else if (!dentroDelRango) {
        sensorActivo[i] = false;
      }

      Serial.printf("S%d: %4d | ", i + 1, lectura);
    }
  }
  Serial.println();
}

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado: " + WiFi.localIP().toString());
}

void conectarMQTT() {
  while (!mqttClient.connected()) {
    String clientId = "samavi-esp32-" + WiFi.macAddress();
    Serial.println("Conectando a MQTT...");

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT conectado");
    } else {
      Serial.printf("MQTT fallo, rc=%d. Reintentando en 2 segundos\n", mqttClient.state());
      delay(2000);
    }
  }
}

String obtenerTimestamp() {
  struct timeval tiempoActual;
  gettimeofday(&tiempoActual, nullptr);

  struct tm tiempo;
  if (!localtime_r(&tiempoActual.tv_sec, &tiempo)) {
    return "1970-01-01T00:00:00.000-05:00";
  }

  char timestamp[32];
  snprintf(
    timestamp,
    sizeof(timestamp),
    "%04d-%02d-%02dT%02d:%02d:%02d.%03ld-05:00",
    tiempo.tm_year + 1900,
    tiempo.tm_mon + 1,
    tiempo.tm_mday,
    tiempo.tm_hour,
    tiempo.tm_min,
    tiempo.tm_sec,
    tiempoActual.tv_usec / 1000
  );
  return String(timestamp);
}

void publicarConteo(uint8_t sensorIndex) {
  String payload = "{\"galponId\":1,\"categoriaPeso\":\"";
  payload += categorias[sensorIndex];
  payload += "\",\"cantidad\":1,\"timestamp\":\"";
  payload += obtenerTimestamp();
  payload += "\"}";

  bool publicado = mqttClient.publish(MQTT_TOPIC, payload.c_str(), false);
  Serial.printf("Conteo %s: %s\n", publicado ? "publicado" : "no publicado", payload.c_str());
}