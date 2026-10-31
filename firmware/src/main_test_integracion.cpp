// Prueba de integración: los seis VL53L0X y la TFT de main.cpp, más el multiplexor
// PCA9548A (módulo HW-617) con dos OLED SSD1306 de 0.96" (128x64). Sin Wi-Fi ni
// MQTT: el conteo es local y se reinicia al apagar el ESP32.
//
// Los VL53L0X y el multiplexor comparten el bus principal (SDA 21 / SCL 22). Las
// OLED van detrás del multiplexor (canales 0 y 1) porque las dos usan 0x3C. Tras
// dibujar en una OLED se apagan todos los canales, así el bus principal solo ve
// los sensores y el multiplexor mientras se leen los sensores.
//
// 1. Pantalla de arranque en la TFT: bus I2C, XSHUT, cada sensor, multiplexor y
//    OLED. Una X roja indica el paso que falló y por qué.
// 2. Pantalla de conteo en la TFT (igual que tft_test). Cada OLED muestra el conteo
//    de una categoría (OLED 1 = S1 Y, OLED 2 = S2 Ex) y se invierte un instante
//    con cada huevo.
//
// Compilar y subir: pio run -e integracion_test -t upload
// Por el monitor serie se puede simular un conteo: "Y+", "Ex-", "A+", "0" (reinicia).
// Cada vez que se redibuja una OLED se imprime cuánto tardó: mientras tanto no se
// leen los sensores.

#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_VL53L0X.h>
#include "config.h"
#include "deteccion.h"

#define PIN_SCL 22
#define PIN_SDA 21
#define NUM_SENSORES 6

#define TFT_SCK 32
#define TFT_MOSI 23
#define TFT_RST 17
#define TFT_DC 16
#define TFT_CS 5
#define TFT_ANCHO 320
#define TFT_ALTO 240

#define PIN_RESET_MUX 27
#define NUM_OLED 2
#define OLED_ANCHO 128
#define OLED_ALTO 64

const uint8_t pinesXSHUT[NUM_SENSORES] = {15, 4, 18, 13, 14, 33};
const char* categorias[NUM_SENSORES] = {"Y", "Ex", "AA", "A", "B", "C"};
const uint8_t DIRECCION_DEFECTO = 0x29;
const uint8_t DIRECCION_BASE = 0x30;
const uint8_t INTENTOS_INICIO = 3;
// Rango de detección en config.h; histéresis y confirmación en deteccion.h.
// VL53L0X, PCA9548A y SSD1306 admiten 400 kHz (igual que main.cpp).
const uint32_t FRECUENCIA_I2C_HZ = 400000;
const unsigned long INTERVALO_LECTURA_MS = 10;
const int HUEVOS_POR_BANDEJA = 30;
const unsigned long DURACION_DESTELLO_MS = 300;
const unsigned long PAUSA_ARRANQUE_OK_MS = 1500;
const unsigned long PAUSA_ARRANQUE_FALLO_MS = 5000;

// Multiplexor con A0, A1 y A2 a GND (datasheet, tabla 8-1).
const uint8_t DIRECCION_MUX = 0x70;
// Canal del multiplexor y sensor (categoría) de cada OLED.
const uint8_t canalesOled[NUM_OLED] = {0, 1};
const uint8_t sensoresOled[NUM_OLED] = {0, 1};
const uint8_t DIRECCIONES_OLED[] = {0x3C, 0x3D};

// Color de acento por categoría (borde de CATEGORY_COLORS en el frontend).
const uint32_t acentosHex[NUM_SENSORES] = {0xD99B26, 0xC87A57, 0xA88C52, 0x6B8E62, 0xA66B48, 0xC05C56};

// Pantalla de arranque.
const int16_t Y_PRIMER_PASO = 40;
const int16_t ALTO_PASO = 18;
const uint8_t PASO_BUS = 0;
const uint8_t PASO_XSHUT = 1;
const uint8_t PRIMER_PASO_SENSOR = 2;
const uint8_t PASO_MUX = PRIMER_PASO_SENSOR + NUM_SENSORES;
const uint8_t PASO_OLED = PASO_MUX + 1;

// Pantalla de conteo: encabezado y cuadrícula de 3x2 tarjetas.
const int16_t ALTO_ENCABEZADO = 40;
const int16_t MARGEN = 4;
const int16_t COLUMNAS = 3;
const int16_t ANCHO_TARJETA = (TFT_ANCHO - MARGEN * (COLUMNAS + 1)) / COLUMNAS;
const int16_t ALTO_TARJETA = (TFT_ALTO - ALTO_ENCABEZADO - MARGEN * 3) / 2;

enum EstadoPaso { PENDIENTE, EN_CURSO, CORRECTO, FALLIDO };

SPIClass spiTft(VSPI);
Adafruit_ST7789 tft(&spiTft, TFT_CS, TFT_DC, TFT_RST);
Adafruit_VL53L0X sensores[NUM_SENSORES];
Adafruit_SSD1306 oled1(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306 oled2(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306* oleds[NUM_OLED] = {&oled1, &oled2};

bool sensorDisponible[NUM_SENSORES] = {false};
DetectorHuevo detectores[NUM_SENSORES];
int32_t conteos[NUM_SENSORES] = {0};
bool tarjetaPendiente[NUM_SENSORES] = {false};
bool puntoPendiente[NUM_SENSORES] = {false};
bool puntoDibujado[NUM_SENSORES] = {false};
unsigned long finDestello[NUM_SENSORES] = {0};
bool destelloDibujado[NUM_SENSORES] = {false};
bool totalPendiente = true;
unsigned long ultimaLectura = 0;

bool muxDisponible = false;
bool oledDisponible[NUM_OLED] = {false};
bool oledPendiente[NUM_OLED] = {false};
bool oledInvertida[NUM_OLED] = {false};

uint16_t colorFondo;
uint16_t colorTarjeta;
uint16_t colorTexto;
uint16_t colorSecundario;
uint16_t colorApagado;
uint16_t colorCorrecto;
uint16_t colorFallo;
uint16_t colorEnCurso;
uint16_t acentos[NUM_SENSORES];

uint16_t hexA565(uint32_t hex) {
  return tft.color565((hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF);
}

// Separador de miles como en es-CO ("1.234").
String formatearMiles(int32_t valor) {
  String digitos = String(valor);
  String resultado;
  int largo = digitos.length();
  for (int i = 0; i < largo; i++) {
    resultado += digitos[i];
    int restantes = largo - i - 1;
    if (restantes > 0 && restantes % 3 == 0) {
      resultado += '.';
    }
  }
  return resultado;
}

int16_t anchoTexto(const String& texto, uint8_t tamano) {
  return texto.length() * 6 * tamano;
}

void imprimir(const String& texto, int16_t x, int16_t y, uint8_t tamano, uint16_t color, uint16_t fondo) {
  tft.setTextSize(tamano);
  tft.setTextColor(color, fondo);
  tft.setCursor(x, y);
  tft.print(texto);
}

bool responde(uint8_t direccion) {
  Wire.beginTransmission(direccion);
  return Wire.endTransmission() == 0;
}

// ---------------------------------------------------------------------------
// Multiplexor
// ---------------------------------------------------------------------------

// Escribe el registro de control: el bit n conecta el canal n. El canal queda
// conectado con el STOP que envía endTransmission().
bool seleccionarCanales(uint8_t mascara) {
  Wire.beginTransmission(DIRECCION_MUX);
  Wire.write(mascara);
  return Wire.endTransmission() == 0;
}

int leerCanales() {
  if (Wire.requestFrom(DIRECCION_MUX, (uint8_t)1) != 1) {
    return -1;
  }
  return Wire.read();
}

// Devuelve "" si el multiplexor quedó listo o el motivo del fallo.
String iniciarMux() {
  // RESET es activo en bajo: un pulso deja todos los canales apagados.
  pinMode(PIN_RESET_MUX, OUTPUT);
  digitalWrite(PIN_RESET_MUX, LOW);
  delayMicroseconds(10);
  digitalWrite(PIN_RESET_MUX, HIGH);
  delay(1);

  if (!responde(DIRECCION_MUX)) {
    return "no responde en 0x70";
  }
  bool guardaCanal = seleccionarCanales(1) && leerCanales() == 1;
  if (!seleccionarCanales(0) || !guardaCanal) {
    return "no guarda el canal elegido";
  }
  return "";
}

// Devuelve "" si la OLED quedó lista o el motivo del fallo.
String iniciarOled(uint8_t k) {
  if (!seleccionarCanales(1 << canalesOled[k])) {
    return "mux no cambia de canal";
  }
  uint8_t direccion = 0;
  for (uint8_t candidata : DIRECCIONES_OLED) {
    if (responde(candidata)) {
      direccion = candidata;
      break;
    }
  }
  String motivo;
  if (direccion == 0) {
    motivo = "no responde";
  } else if (!oleds[k]->begin(SSD1306_SWITCHCAPVCC, direccion, true, false)) {
    // periphBegin = false: el bus ya está iniciado en SDA 21 / SCL 22.
    motivo = "sin memoria";
  }
  seleccionarCanales(0);
  return motivo;
}

// ---------------------------------------------------------------------------
// Pantalla de arranque
// ---------------------------------------------------------------------------

void dibujarIcono(int16_t cx, int16_t cy, EstadoPaso estado) {
  const int16_t r = 8;
  tft.fillCircle(cx, cy, r + 1, colorFondo);
  switch (estado) {
    case PENDIENTE:
      tft.drawCircle(cx, cy, r, colorApagado);
      break;
    case EN_CURSO:
      tft.drawCircle(cx, cy, r, colorEnCurso);
      tft.drawCircle(cx, cy, r - 1, colorEnCurso);
      tft.fillCircle(cx, cy, 3, colorEnCurso);
      break;
    case CORRECTO:
      // Chulito blanco grueso sobre círculo verde.
      tft.fillCircle(cx, cy, r, colorCorrecto);
      for (int8_t d = 0; d < 2; d++) {
        tft.drawLine(cx - 4, cy + d, cx - 1, cy + 3 + d, colorTexto);
        tft.drawLine(cx - 1, cy + 3 + d, cx + 4, cy - 3 + d, colorTexto);
      }
      break;
    case FALLIDO:
      tft.fillCircle(cx, cy, r, colorFallo);
      for (int8_t d = 0; d < 2; d++) {
        tft.drawLine(cx - 3 + d, cy - 3, cx + 3 + d, cy + 3, colorTexto);
        tft.drawLine(cx - 3 + d, cy + 3, cx + 3 + d, cy - 3, colorTexto);
      }
      break;
  }
}

// Dibuja un paso: icono, nombre y detalle (el detalle va en rojo si falló).
void dibujarPaso(uint8_t paso, EstadoPaso estado, const String& nombre, const String& detalle) {
  int16_t y = Y_PRIMER_PASO + paso * ALTO_PASO;
  int16_t yCentro = y + ALTO_PASO / 2;
  dibujarIcono(14, yCentro, estado);

  uint16_t colorNombre = estado == PENDIENTE ? colorApagado : colorTexto;
  imprimir(nombre, 30, yCentro - 7, 2, colorNombre, colorFondo);

  tft.fillRect(130, y, TFT_ANCHO - 130, ALTO_PASO, colorFondo);
  uint16_t colorDetalle = estado == FALLIDO ? colorFallo : colorSecundario;
  imprimir(detalle, 130, yCentro - 3, 1, colorDetalle, colorFondo);
}

String nombreSensor(uint8_t i) {
  return "S" + String(i + 1) + " " + categorias[i];
}

String detalleSensor(uint8_t i) {
  char texto[32];
  snprintf(texto, sizeof(texto), "GPIO %u -> 0x%02X", pinesXSHUT[i], DIRECCION_BASE + i);
  return String(texto);
}

String detalleOledes() {
  String detalle;
  for (int k = 0; k < NUM_OLED; k++) {
    if (k > 0) {
      detalle += " / ";
    }
    detalle += "canal " + String(canalesOled[k]) + " " + categorias[sensoresOled[k]];
  }
  return detalle;
}

void dibujarPiePagina(const String& texto, uint16_t color) {
  tft.fillRect(0, TFT_ALTO - 18, TFT_ANCHO, 18, colorFondo);
  imprimir(texto, 8, TFT_ALTO - 14, 1, color, colorFondo);
}

void dibujarPantallaArranque() {
  tft.fillScreen(colorFondo);
  imprimir("SAMAVI", 8, 10, 2, colorTexto, colorFondo);
  imprimir("Sensores, mux y OLED", 8 + anchoTexto("SAMAVI", 2) + 12, 15, 1, colorSecundario, colorFondo);
  tft.drawFastHLine(8, 32, TFT_ANCHO - 16, colorApagado);

  dibujarPaso(PASO_BUS, PENDIENTE, "Bus I2C", "SDA 21 / SCL 22");
  dibujarPaso(PASO_XSHUT, PENDIENTE, "XSHUT", "nadie responde apagado");
  for (int i = 0; i < NUM_SENSORES; i++) {
    dibujarPaso(PRIMER_PASO_SENSOR + i, PENDIENTE, nombreSensor(i), detalleSensor(i));
  }
  dibujarPaso(PASO_MUX, PENDIENTE, "Mux", "0x70, RST GPIO 27");
  dibujarPaso(PASO_OLED, PENDIENTE, "OLED", detalleOledes());
}

// Devuelve "" si el sensor quedó listo o el motivo del último fallo.
String iniciarSensor(uint8_t i) {
  uint8_t direccion = DIRECCION_BASE + i;
  String motivo;

  for (uint8_t intento = 1; intento <= INTENTOS_INICIO; intento++) {
    String detalle = detalleSensor(i);
    if (intento > 1) {
      detalle += "  intento " + String(intento);
    }
    dibujarPaso(PRIMER_PASO_SENSOR + i, EN_CURSO, nombreSensor(i), detalle);

    digitalWrite(pinesXSHUT[i], LOW);
    delay(10);
    digitalWrite(pinesXSHUT[i], HIGH);
    delay(10);

    if (!responde(DIRECCION_DEFECTO)) {
      motivo = "no despierta (XSHUT/cables)";
    } else if (!sensores[i].begin(direccion)) {
      motivo = "fallo al configurar";
    } else if (!responde(direccion)) {
      char texto[32];
      snprintf(texto, sizeof(texto), "no responde en 0x%02X", direccion);
      motivo = texto;
    } else if (!sensores[i].startRangeContinuous(PERIODO_MEDICION_MS)) {
      motivo = "no inicia la medicion";
    } else {
      return "";
    }
    Serial.printf("S%d (%s) intento %u: %s\n", i + 1, categorias[i], intento, motivo.c_str());
  }

  // Se deja en reset para que no ocupe 0x29 durante el resto de la secuencia.
  digitalWrite(pinesXSHUT[i], LOW);
  return motivo;
}

void iniciarHardware() {
  dibujarPantallaArranque();
  delay(300);

  // Paso 1: el bus I2C debe estar en reposo (SDA y SCL en alto).
  dibujarPaso(PASO_BUS, EN_CURSO, "Bus I2C", "SDA 21 / SCL 22");
  pinMode(PIN_SDA, INPUT);
  pinMode(PIN_SCL, INPUT);
  bool busLibre = digitalRead(PIN_SDA) == HIGH && digitalRead(PIN_SCL) == HIGH;
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(FRECUENCIA_I2C_HZ);
  delay(150);
  dibujarPaso(PASO_BUS, busLibre ? CORRECTO : FALLIDO, "Bus I2C",
              busLibre ? "SDA 21 / SCL 22 libres" : "linea en bajo: bus trabado");

  // Paso 2: con todos los XSHUT en bajo ningún sensor debe responder.
  dibujarPaso(PASO_XSHUT, EN_CURSO, "XSHUT", "apagando sensores");
  for (int i = 0; i < NUM_SENSORES; i++) {
    pinMode(pinesXSHUT[i], OUTPUT);
    digitalWrite(pinesXSHUT[i], LOW);
  }
  delay(10);
  bool xshutCorrecto = !responde(DIRECCION_DEFECTO);
  delay(150);
  dibujarPaso(PASO_XSHUT, xshutCorrecto ? CORRECTO : FALLIDO, "XSHUT",
              xshutCorrecto ? "todos apagan" : "0x29 responde: XSHUT no apaga");

  // Paso 3: cada sensor, uno a uno.
  uint8_t listos = 0;
  for (int i = 0; i < NUM_SENSORES; i++) {
    String motivo = iniciarSensor(i);
    sensorDisponible[i] = motivo.length() == 0;
    if (sensorDisponible[i]) {
      listos++;
      dibujarPaso(PRIMER_PASO_SENSOR + i, CORRECTO, nombreSensor(i), detalleSensor(i));
    } else {
      dibujarPaso(PRIMER_PASO_SENSOR + i, FALLIDO, nombreSensor(i), motivo);
    }
  }

  // Paso 4: el multiplexor, después de los sensores para que la secuencia XSHUT
  // se haga con todos sus canales apagados.
  dibujarPaso(PASO_MUX, EN_CURSO, "Mux", "0x70, RST GPIO 27");
  String motivoMux = iniciarMux();
  muxDisponible = motivoMux.length() == 0;
  dibujarPaso(PASO_MUX, muxDisponible ? CORRECTO : FALLIDO, "Mux",
              muxDisponible ? "0x70, canales apagados" : motivoMux);
  if (!muxDisponible) {
    Serial.printf("Multiplexor: %s\n", motivoMux.c_str());
  }

  // Paso 5: cada OLED en su canal.
  dibujarPaso(PASO_OLED, EN_CURSO, "OLED", detalleOledes());
  uint8_t oledsListas = 0;
  String detalleOled;
  for (int k = 0; k < NUM_OLED; k++) {
    String motivo = muxDisponible ? iniciarOled(k) : "sin mux";
    oledDisponible[k] = motivo.length() == 0;
    if (oledDisponible[k]) {
      oledsListas++;
    } else {
      Serial.printf("OLED %d (canal %u): %s\n", k + 1, canalesOled[k], motivo.c_str());
    }
    if (k > 0) {
      detalleOled += " / ";
    }
    detalleOled += "canal " + String(canalesOled[k]) + " " + (oledDisponible[k] ? "ok" : motivo);
  }
  bool oledsCorrectas = oledsListas == NUM_OLED;
  dibujarPaso(PASO_OLED, oledsCorrectas ? CORRECTO : FALLIDO, "OLED", detalleOled);

  bool todoCorrecto = busLibre && xshutCorrecto && listos == NUM_SENSORES && muxDisponible && oledsCorrectas;
  String resumen = String(listos) + "/" + String(NUM_SENSORES) + " sensores, " + String(oledsListas) + "/" +
                   String(NUM_OLED) + " OLED";
  if (todoCorrecto) {
    dibujarPiePagina(resumen, colorCorrecto);
  } else {
    dibujarPiePagina(resumen + " - revisa los pasos en rojo", colorFallo);
  }
  Serial.println(resumen);
  delay(todoCorrecto ? PAUSA_ARRANQUE_OK_MS : PAUSA_ARRANQUE_FALLO_MS);
}

// ---------------------------------------------------------------------------
// Pantalla de conteo
// ---------------------------------------------------------------------------

int16_t xTarjeta(uint8_t i) {
  return MARGEN + (i % COLUMNAS) * (ANCHO_TARJETA + MARGEN);
}

int16_t yTarjeta(uint8_t i) {
  return ALTO_ENCABEZADO + MARGEN + (i / COLUMNAS) * (ALTO_TARJETA + MARGEN);
}

void dibujarBorde(uint8_t i, bool destello) {
  uint16_t color = destello ? colorCorrecto : colorTarjeta;
  int16_t x = xTarjeta(i);
  int16_t y = yTarjeta(i);
  tft.drawRoundRect(x, y, ANCHO_TARJETA, ALTO_TARJETA, 8, color);
  tft.drawRoundRect(x + 1, y + 1, ANCHO_TARJETA - 2, ALTO_TARJETA - 2, 7, color);
}

void dibujarPunto(uint8_t i) {
  int16_t cx = xTarjeta(i) + ANCHO_TARJETA - 14;
  int16_t cy = yTarjeta(i) + 18;
  tft.fillCircle(cx, cy, 5, colorTarjeta);
  if (!sensorDisponible[i]) {
    return;
  }
  if (detectores[i].activo) {
    tft.fillCircle(cx, cy, 5, colorCorrecto);
  } else {
    tft.drawCircle(cx, cy, 5, colorApagado);
  }
}

void dibujarTarjeta(uint8_t i) {
  int16_t x = xTarjeta(i);
  int16_t y = yTarjeta(i);
  tft.fillRoundRect(x, y, ANCHO_TARJETA, ALTO_TARJETA, 8, colorTarjeta);
  // Franja de color de la categoría a la izquierda del código.
  tft.fillRoundRect(x + 8, y + 10, 4, 16, 2, sensorDisponible[i] ? acentos[i] : colorApagado);
  imprimir(categorias[i], x + 16, y + 11, 2, sensorDisponible[i] ? colorTexto : colorApagado, colorTarjeta);

  int32_t huevos = max<int32_t>(0, conteos[i]);
  String numero = formatearMiles(huevos);
  uint8_t tamano = numero.length() <= 3 ? 4 : 3;
  uint16_t colorNumero = huevos > 0 ? colorTexto : colorApagado;
  int16_t yNumero = y + 38 + (tamano == 4 ? 0 : 4);
  imprimir(numero, x + (ANCHO_TARJETA - anchoTexto(numero, tamano)) / 2, yNumero, tamano, colorNumero, colorTarjeta);

  String pie;
  uint16_t colorPie = colorSecundario;
  if (!sensorDisponible[i]) {
    pie = "sin sensor";
    colorPie = colorFallo;
  } else {
    pie = String(huevos / HUEVOS_POR_BANDEJA) + " band + " + String(huevos % HUEVOS_POR_BANDEJA);
  }
  imprimir(pie, x + (ANCHO_TARJETA - anchoTexto(pie, 1)) / 2, y + ALTO_TARJETA - 16, 1, colorPie, colorTarjeta);

  dibujarPunto(i);
  dibujarBorde(i, millis() < finDestello[i]);
}

void dibujarTotal() {
  int32_t total = 0;
  for (int i = 0; i < NUM_SENSORES; i++) {
    total += max<int32_t>(0, conteos[i]);
  }

  tft.fillRect(0, 0, TFT_ANCHO, ALTO_ENCABEZADO, colorFondo);
  imprimir("HOY", 8, 15, 1, colorSecundario, colorFondo);
  String numero = formatearMiles(total);
  imprimir(numero, 32, 8, 3, colorTexto, colorFondo);
  int16_t finHuevos = 32 + anchoTexto(numero, 3) + 6 + anchoTexto("huevos", 1);
  imprimir("huevos", 32 + anchoTexto(numero, 3) + 6, 22, 1, colorSecundario, colorFondo);

  // Con totales grandes las bandejas pasan a letra pequeña para no encimarse.
  String bandejas = String(total / HUEVOS_POR_BANDEJA) + " bandejas";
  uint8_t tamano = TFT_ANCHO - 8 - anchoTexto(bandejas, 2) > finHuevos + 8 ? 2 : 1;
  imprimir(bandejas, TFT_ANCHO - 8 - anchoTexto(bandejas, tamano), tamano == 2 ? 13 : 17, tamano,
           colorSecundario, colorFondo);
}

// Conteo de la categoría de la OLED: código arriba, huevos al centro y bandejas abajo.
void dibujarOled(uint8_t k) {
  uint8_t s = sensoresOled[k];
  Adafruit_SSD1306& p = *oleds[k];
  int32_t huevos = max<int32_t>(0, conteos[s]);

  p.clearDisplay();
  p.setTextColor(SSD1306_WHITE);
  p.setTextSize(2);
  p.setCursor(0, 0);
  p.print(categorias[s]);
  String sensor = "S" + String(s + 1);
  p.setTextSize(1);
  p.setCursor(OLED_ANCHO - anchoTexto(sensor, 1), 4);
  p.print(sensor);

  // Tamaño 4 = 24 px por carácter: caben 5 ("1.234").
  String numero = formatearMiles(huevos);
  uint8_t tamano = numero.length() <= 5 ? 4 : 3;
  p.setTextSize(tamano);
  p.setCursor((OLED_ANCHO - anchoTexto(numero, tamano)) / 2, tamano == 4 ? 20 : 24);
  p.print(numero);

  String pie = sensorDisponible[s]
                   ? String(huevos / HUEVOS_POR_BANDEJA) + " band + " + String(huevos % HUEVOS_POR_BANDEJA)
                   : String("sin sensor");
  p.setTextSize(1);
  p.setCursor((OLED_ANCHO - anchoTexto(pie, 1)) / 2, OLED_ALTO - 8);
  p.print(pie);

  unsigned long inicio = millis();
  if (seleccionarCanales(1 << canalesOled[k])) {
    p.display();
  } else {
    Serial.printf("OLED %u: el mux no cambia al canal %u\n", k + 1, canalesOled[k]);
  }
  seleccionarCanales(0);
  Serial.printf("OLED %u (%s) redibujada en %lu ms\n", k + 1, categorias[s], millis() - inicio);
}

void invertirOled(uint8_t k, bool invertir) {
  if (seleccionarCanales(1 << canalesOled[k])) {
    oleds[k]->invertDisplay(invertir);
  }
  seleccionarCanales(0);
}

void dibujarPantallaConteo() {
  tft.fillScreen(colorFondo);
  for (int i = 0; i < NUM_SENSORES; i++) {
    tarjetaPendiente[i] = true;
  }
  for (int k = 0; k < NUM_OLED; k++) {
    oledPendiente[k] = true;
  }
  totalPendiente = true;
}

// Redibuja solo lo que cambió para evitar parpadeo (y, en las OLED, para no ocupar
// el bus I2C más de lo necesario).
void actualizarPantalla() {
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (tarjetaPendiente[i]) {
      dibujarTarjeta(i);
      tarjetaPendiente[i] = false;
      puntoPendiente[i] = false;
      puntoDibujado[i] = detectores[i].activo;
      destelloDibujado[i] = millis() < finDestello[i];
      continue;
    }
    if (puntoPendiente[i] || puntoDibujado[i] != detectores[i].activo) {
      dibujarPunto(i);
      puntoDibujado[i] = detectores[i].activo;
      puntoPendiente[i] = false;
    }
    bool destello = millis() < finDestello[i];
    if (destello != destelloDibujado[i]) {
      dibujarBorde(i, destello);
      destelloDibujado[i] = destello;
    }
  }

  if (totalPendiente) {
    dibujarTotal();
    totalPendiente = false;
  }

  for (int k = 0; k < NUM_OLED; k++) {
    if (!oledDisponible[k]) {
      continue;
    }
    if (oledPendiente[k]) {
      dibujarOled(k);
      oledPendiente[k] = false;
    }
    bool destello = millis() < finDestello[sensoresOled[k]];
    if (destello != oledInvertida[k]) {
      invertirOled(k, destello);
      oledInvertida[k] = destello;
    }
  }
}

void registrarConteo(uint8_t indice, int8_t cantidad) {
  conteos[indice] += cantidad;
  if (conteos[indice] < 0) {
    conteos[indice] = 0;
  }
  if (cantidad > 0) {
    finDestello[indice] = millis() + DURACION_DESTELLO_MS;
  }
  tarjetaPendiente[indice] = true;
  totalPendiente = true;
  for (int k = 0; k < NUM_OLED; k++) {
    if (sensoresOled[k] == indice) {
      oledPendiente[k] = true;
    }
  }
  Serial.printf("Conteo %s: %+d -> %ld\n", categorias[indice], cantidad, (long)conteos[indice]);
}

void procesarComandoSerie() {
  static String linea;
  while (Serial.available()) {
    char c = Serial.read();
    if (c != '\n' && c != '\r') {
      linea += c;
      continue;
    }

    linea.trim();
    if (linea == "0") {
      for (int i = 0; i < NUM_SENSORES; i++) {
        conteos[i] = 0;
        tarjetaPendiente[i] = true;
      }
      for (int k = 0; k < NUM_OLED; k++) {
        oledPendiente[k] = true;
      }
      totalPendiente = true;
      Serial.println("Conteos reiniciados");
    } else if (linea.length() >= 2) {
      char signo = linea[linea.length() - 1];
      String codigo = linea.substring(0, linea.length() - 1);
      bool encontrado = false;
      for (int i = 0; i < NUM_SENSORES && (signo == '+' || signo == '-'); i++) {
        if (codigo.equalsIgnoreCase(categorias[i])) {
          registrarConteo(i, signo == '+' ? 1 : -1);
          encontrado = true;
          break;
        }
      }
      if (!encontrado) {
        Serial.println("Comando no reconocido. Usa <categoria>+ , <categoria>- o 0");
      }
    }
    linea = "";
  }
}

void leerSensores() {
  if (millis() - ultimaLectura < INTERVALO_LECTURA_MS) {
    return;
  }
  ultimaLectura = millis();

  for (int i = 0; i < NUM_SENSORES; i++) {
    if (!sensorDisponible[i] || !sensores[i].isRangeComplete()) {
      continue;
    }
    // En modo continuo se lee con readRangeResult(): readRange() lanza una
    // medición única encima de la continua y puede dejar el sensor trabado.
    uint16_t lectura = sensores[i].readRangeResult();

    if (sensores[i].Status != VL53L0X_ERROR_NONE) {
      continue;
    }

    if (procesarLectura(detectores[i], lectura, sensores[i].readRangeStatus()) == HUEVO_NUEVO) {
      registrarConteo(i, 1);
    }
  }
}

void setup() {
  Serial.begin(115200);

  spiTft.begin(TFT_SCK, -1, TFT_MOSI, TFT_CS);
  tft.init(TFT_ALTO, TFT_ANCHO);
  tft.setSPISpeed(40000000);
  // Girada 180° respecto a la rotación 1 por cómo va montada.
  tft.setRotation(3);
  tft.setTextWrap(false);

  colorFondo = hexA565(0x14110E);
  colorTarjeta = hexA565(0x2A251F);
  colorTexto = hexA565(0xFFFFFF);
  colorSecundario = hexA565(0xA59D94);
  colorApagado = hexA565(0x5A524A);
  colorCorrecto = hexA565(0x3FBF5F);
  colorFallo = hexA565(0xE5534B);
  colorEnCurso = hexA565(0xE8B33A);
  for (int i = 0; i < NUM_SENSORES; i++) {
    acentos[i] = hexA565(acentosHex[i]);
  }

  iniciarHardware();
  dibujarPantallaConteo();
  actualizarPantalla();
  Serial.println("Prueba de integracion lista");
}

void loop() {
  leerSensores();
  procesarComandoSerie();
  actualizarPantalla();
}
