// Prueba de dos pantallas OLED SSD1306 de 0.96" (128x64, I2C) conectadas directo
// al ESP32, sin multiplexor. Sin sensores, Wi-Fi ni MQTT.
//
// Las dos OLED vienen con la misma dirección (0x3C), así que no pueden compartir
// bus: la OLED 1 va al bus principal (SDA 21 / SCL 22) y la OLED 2 al segundo
// controlador I2C del ESP32 (SDA 25 / SCL 26). Con el multiplexor (mux_test) las
// dos pasan a un solo bus.
//
// Compilar y subir: pio run -e oled_test -t upload
// Monitor serie (115200): pio device monitor -e oled_test
// Comandos por el monitor serie:
//   e  escanea los dos buses
//   r  reinicia las dos pantallas
//
// Qué revisa:
// - Cada bus debe estar en reposo (SDA y SCL en alto) antes de iniciarlo.
// - Cada OLED debe responder en 0x3C o 0x3D. Adafruit_SSD1306::begin() no verifica
//   que la pantalla conteste, por eso se busca antes en el bus.
// - En marcha cada OLED muestra su nombre, su bus, un marco en el borde (debe verse
//   completo; si falta una franja el panel no es de 128x64) y un contador por segundo.

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define NUM_OLED 2
#define OLED_ANCHO 128
#define OLED_ALTO 64

const uint8_t pinesSDA[NUM_OLED] = {21, 25};
const uint8_t pinesSCL[NUM_OLED] = {22, 26};
const uint8_t DIRECCIONES_OLED[] = {0x3C, 0x3D};
const unsigned long INTERVALO_REFRESCO_MS = 1000;

TwoWire* buses[NUM_OLED] = {&Wire, &Wire1};
Adafruit_SSD1306 oled1(OLED_ANCHO, OLED_ALTO, &Wire, -1);
Adafruit_SSD1306 oled2(OLED_ANCHO, OLED_ALTO, &Wire1, -1);
Adafruit_SSD1306* pantallas[NUM_OLED] = {&oled1, &oled2};

bool pantallaLista[NUM_OLED] = {false};
uint8_t direccionOled[NUM_OLED] = {0};
uint32_t segundos = 0;
unsigned long ultimoRefresco = 0;

bool responde(TwoWire& bus, uint8_t direccion) {
  bus.beginTransmission(direccion);
  return bus.endTransmission() == 0;
}

void escanearBus(uint8_t i) {
  Serial.printf("Escaneo bus de la OLED %u (SDA %u / SCL %u):", i + 1, pinesSDA[i], pinesSCL[i]);
  uint8_t encontrados = 0;
  for (uint8_t direccion = 0x08; direccion < 0x78; direccion++) {
    if (responde(*buses[i], direccion)) {
      Serial.printf(" 0x%02X", direccion);
      encontrados++;
    }
  }
  Serial.printf(encontrados == 0 ? " (nadie)\n" : " (%u)\n", encontrados);
}

void iniciarPantalla(uint8_t i) {
  pantallaLista[i] = false;
  direccionOled[i] = 0;
  for (uint8_t direccion : DIRECCIONES_OLED) {
    if (responde(*buses[i], direccion)) {
      direccionOled[i] = direccion;
      break;
    }
  }
  if (direccionOled[i] == 0) {
    Serial.printf("OLED %u: nadie responde en 0x3C ni 0x3D (revisa VCC, GND, SDA %u y SCL %u)\n",
                  i + 1, pinesSDA[i], pinesSCL[i]);
    return;
  }
  // periphBegin = false: el bus ya se inició con sus pines y begin() lo reiniciaría
  // en los pines por defecto.
  if (!pantallas[i]->begin(SSD1306_SWITCHCAPVCC, direccionOled[i], true, false)) {
    Serial.printf("OLED %u: sin memoria para el buffer de la pantalla\n", i + 1);
    return;
  }
  pantallaLista[i] = true;
  Serial.printf("OLED %u OK en 0x%02X\n", i + 1, direccionOled[i]);
}

void dibujarPantalla(uint8_t i) {
  Adafruit_SSD1306& p = *pantallas[i];
  p.clearDisplay();
  p.drawRect(0, 0, OLED_ANCHO, OLED_ALTO, SSD1306_WHITE);
  p.setTextColor(SSD1306_WHITE);

  p.setTextSize(2);
  p.setCursor(6, 4);
  p.printf("OLED %u", i + 1);

  p.setTextSize(1);
  p.setCursor(6, 24);
  p.printf("SDA %u  SCL %u", pinesSDA[i], pinesSCL[i]);
  p.setCursor(6, 34);
  p.printf("Direccion 0x%02X", direccionOled[i]);

  p.setTextSize(2);
  p.setCursor(6, 46);
  p.printf("%lu s", (unsigned long)segundos);
  p.display();
}

void iniciarTodas() {
  for (int i = 0; i < NUM_OLED; i++) {
    escanearBus(i);
    iniciarPantalla(i);
    if (pantallaLista[i]) {
      dibujarPantalla(i);
    }
  }
  uint8_t listas = 0;
  for (int i = 0; i < NUM_OLED; i++) {
    listas += pantallaLista[i] ? 1 : 0;
  }
  Serial.printf("OLED listas: %u/%u\n\n", listas, NUM_OLED);
}

void procesarComando() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 'r' || c == 'R') {
      iniciarTodas();
    } else if (c == 'e' || c == 'E') {
      for (int i = 0; i < NUM_OLED; i++) {
        escanearBus(i);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nPrueba de dos OLED sin multiplexor");

  for (int i = 0; i < NUM_OLED; i++) {
    pinMode(pinesSDA[i], INPUT);
    pinMode(pinesSCL[i], INPUT);
    Serial.printf("Bus OLED %u: SDA=%d SCL=%d antes de iniciarlo (deben ser 1; 0 = sin pull-up o bus trabado)\n",
                  i + 1, digitalRead(pinesSDA[i]), digitalRead(pinesSCL[i]));
    buses[i]->begin(pinesSDA[i], pinesSCL[i]);
  }
  iniciarTodas();
}

void loop() {
  procesarComando();
  if (millis() - ultimoRefresco >= INTERVALO_REFRESCO_MS) {
    ultimoRefresco = millis();
    segundos++;
    for (int i = 0; i < NUM_OLED; i++) {
      if (pantallaLista[i]) {
        dibujarPantalla(i);
      }
    }
  }
}
