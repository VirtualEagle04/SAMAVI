// Firmware SAMAVI: cuenta huevos por categoría con seis VL53L0X, publica cada
// conteo por MQTT en samavi/conteo y muestra el estado en la pantalla TFT y en una
// OLED por categoría. Su estado de conexión se publica retenido en
// samavi/dispositivos/<MAC>/estado.
//
// 1. Pantalla de arranque en la TFT: un chulito verde por cada paso (bus I2C,
//    XSHUT, cada sensor, multiplexor y OLED, Wi-Fi con la IP asignada y broker
//    MQTT). Una X roja indica el paso que falló y por qué.
// 2. Pantalla de conteo en la TFT, estilo tablero de planta: fondo negro, barra
//    con galpón, hora y pilotos de Wi-Fi y MQTT; total y bandejas en grande; y un
//    bloque de color sólido por categoría con su contador. El bloque se pone
//    blanco mientras hay un huevo al frente, se enmarca en verde con cada conteo y
//    se pone rojo con "FALLA" si el sensor no responde.
// 3. OLED: la del canal n del multiplexor PCA9548A muestra el conteo del sensor
//    n+1 y se invierte un instante con cada huevo.
//
// Los VL53L0X y el multiplexor comparten el bus principal (SDA 21 / SCL 22). Las
// OLED van detrás del multiplexor porque todas usan 0x3C. Tras dibujar en una OLED
// se apagan todos los canales, así el bus principal solo ve los sensores y el
// multiplexor mientras se leen los sensores.
//
// La detección de cada huevo está en deteccion.h (común con las pruebas). La red
// (Wi-Fi, MQTT y publicación) corre en una tarea propia en el núcleo 0: un intento
// de conexión puede tardar segundos y no debe frenar la lectura de los sensores,
// que corre en loop() en el núcleo 1. Los conteos pasan a la red por una cola: si
// Wi-Fi o MQTT se caen, el conteo local sigue y los conteos esperan en la cola
// (hasta CAPACIDAD_COLA_CONTEOS) para publicarse con su hora original al volver.

#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <Adafruit_SSD1306.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>
#include <Adafruit_VL53L0X.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>
#include <sys/time.h>
#include "config.h"
#include "deteccion.h"
#include "logo.h"

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
#define OLED_ANCHO 128
#define OLED_ALTO 64

const uint8_t pinesXSHUT[NUM_SENSORES] = {15, 4, 18, 13, 14, 33};
const char* categorias[NUM_SENSORES] = {"Y", "Ex", "AA", "A", "B", "C"};
const char* MQTT_TOPIC = "samavi/conteo";
// Galpón para el que cuenta este dispositivo (va en cada mensaje y en la pantalla).
const uint8_t GALPON_ID = 1;
// Con keep-alive de 5 s, una caída del broker se detecta en 10 s como máximo.
const uint16_t MQTT_KEEPALIVE_S = 5;
const uint8_t DIRECCION_DEFECTO = 0x29;
const uint8_t DIRECCION_BASE = 0x30;
const uint8_t INTENTOS_INICIO = 3;
// Cada cuánto se pregunta a los sensores si tienen una lectura nueva (miden cada
// PERIODO_MEDICION_MS). Un sensor sin lecturas nuevas por SIN_DATOS_MAX_MS se reinicia.
const unsigned long INTERVALO_SONDEO_MS = 10;
const unsigned long SIN_DATOS_MAX_MS = 1000;
// Con el canal vacío al arrancar, cada sensor se observa este tiempo para avisar si
// ve algo en la zona de detección (quedaría "con huevo al frente" para siempre).
const unsigned long OBSERVACION_REPOSO_MS = 500;
// VL53L0X, PCA9548A y SSD1306 admiten 400 kHz; a 100 kHz leer seis sensores a 30 Hz
// ocupa el bus casi la mitad del tiempo.
const uint32_t FRECUENCIA_I2C_HZ = 400000;
const uint16_t CAPACIDAD_COLA_CONTEOS = 200;
const uint32_t INTERVALO_RED_MS = 20;
const int HUEVOS_POR_BANDEJA = 30;
const unsigned long DURACION_DESTELLO_MS = 300;
const unsigned long DURACION_PRESENTACION_MS = 2500;
const unsigned long PAUSA_ARRANQUE_OK_MS = 1500;
const unsigned long PAUSA_ARRANQUE_FALLO_MS = 5000;
const unsigned long ESPERA_WIFI_ARRANQUE_MS = 15000;
const unsigned long REINTENTO_WIFI_MS = 10000;
const unsigned long REINTENTO_MQTT_MS = 5000;

// Multiplexor con A0, A1 y A2 a GND (datasheet, tabla 8-1). La OLED del sensor i
// va en el canal canalesOled[i].
const uint8_t DIRECCION_MUX = 0x70;
const uint8_t canalesOled[NUM_SENSORES] = {0, 1, 2, 3, 4, 5};
const uint8_t DIRECCIONES_OLED[] = {0x3C, 0x3D};
// OLED: categoría en las primeras 16 filas y número en el resto.
const int16_t Y_NUMERO_OLED = 16;

// Color de cada categoría en la TFT: saturados y con texto negro encima. Rojo y
// verde quedan reservados para falla y conteo.
const uint32_t acentosHex[NUM_SENSORES] = {0xFFD400, 0xFF8A00, 0xFF3FA4, 0x00D0FF, 0x4C8DFF, 0xB57CFF};

// Pantalla de arranque: barra superior, 11 pasos de 17 px y pie con el resumen.
const int16_t Y_PRIMER_PASO = 30;
const int16_t ALTO_PASO = 17;
const int16_t X_DETALLE_PASO = 96;
const uint8_t PASO_BUS = 0;
const uint8_t PASO_XSHUT = 1;
const uint8_t PRIMER_PASO_SENSOR = 2;
const uint8_t PASO_OLED = PRIMER_PASO_SENSOR + NUM_SENSORES;
const uint8_t PASO_WIFI = PASO_OLED + 1;
const uint8_t PASO_MQTT = PASO_WIFI + 1;

// Pantalla de conteo: barra de estado, panel del total y seis canales (2 columnas
// x 3 filas). Cada zona se dibuja en un lienzo en memoria y se copia de una vez a
// la TFT, así no parpadea al actualizarse.
const int16_t ALTO_BARRA = 28;
const int16_t Y_TOTAL = 30;
const int16_t ANCHO_TOTAL = 316;
const int16_t ALTO_TOTAL = 56;
const int16_t Y_CANALES = 90;
const int16_t ANCHO_CANAL = 157;
const int16_t ALTO_CANAL = 48;
const int16_t SEPARACION = 2;
const int16_t GROSOR_DESTELLO = 4;

enum EstadoPaso { PENDIENTE, EN_CURSO, CORRECTO, FALLIDO };

SPIClass spiTft(VSPI);
Adafruit_ST7789 tft(&spiTft, TFT_CS, TFT_DC, TFT_RST);
Adafruit_VL53L0X sensores[NUM_SENSORES];
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Adafruit_SSD1306 oled1(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306 oled2(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306 oled3(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306 oled4(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306 oled5(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306 oled6(OLED_ANCHO, OLED_ALTO, &Wire, -1, FRECUENCIA_I2C_HZ, FRECUENCIA_I2C_HZ);
Adafruit_SSD1306* oleds[NUM_SENSORES] = {&oled1, &oled2, &oled3, &oled4, &oled5, &oled6};

bool sensorDisponible[NUM_SENSORES] = {false};
DetectorHuevo detectores[NUM_SENSORES];
unsigned long ultimoDato[NUM_SENSORES] = {0};
int32_t conteos[NUM_SENSORES] = {0};
bool tarjetaPendiente[NUM_SENSORES] = {false};
bool puntoDibujado[NUM_SENSORES] = {false};
unsigned long finDestello[NUM_SENSORES] = {0};
bool destelloDibujado[NUM_SENSORES] = {false};
bool totalPendiente = true;
unsigned long ultimoSondeo = 0;

bool muxDisponible = false;
bool oledDisponible[NUM_SENSORES] = {false};
bool oledPendiente[NUM_SENSORES] = {false};
bool oledInvertida[NUM_SENSORES] = {false};

bool wifiDibujado = false;
bool mqttDibujado = false;
bool conexionesPendiente = true;
// Minuto del día dibujado en el encabezado (-1 sin hora, -2 sin dibujar).
int minutoDibujado = -2;
// Conteo pendiente de publicar, con la hora en que se detectó.
struct MensajeConteo {
  uint8_t sensor;
  char timestamp[32];
};
QueueHandle_t colaConteos;
// Los escribe la tarea de red y los lee la pantalla.
volatile bool wifiConectado = false;
volatile bool mqttConectado = false;
unsigned long ultimoIntentoWifi = 0;
unsigned long ultimoIntentoMqtt = 0;
bool horaConfigurada = false;

uint16_t colorNegro;
uint16_t colorBlanco;
uint16_t colorEtiqueta;
uint16_t colorOk;
uint16_t colorAlarma;
uint16_t colorDestacado;
uint16_t acentos[NUM_SENSORES];

GFXcanvas16 lienzoBarra(TFT_ANCHO, ALTO_BARRA);
GFXcanvas16 lienzoTotal(ANCHO_TOTAL, ALTO_TOTAL);
GFXcanvas16 lienzoCanal(ANCHO_CANAL, ALTO_CANAL);
GFXcanvas16 lienzoPaso(TFT_ANCHO, ALTO_PASO);

uint16_t hexA565(uint32_t hex) {
  return tft.color565((hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF);
}

// La TFT se dibuja en lienzos en memoria que se copian de una vez: así se puede
// usar fuentes FreeSans sin parpadeo (no tienen color de fondo).
enum Alineacion { IZQUIERDA, CENTRO, DERECHA };

int16_t anchoEnLienzo(GFXcanvas16& lienzo, const String& texto, const GFXfont* fuente) {
  int16_t x1, y1;
  uint16_t ancho, alto;
  lienzo.setFont(fuente);
  lienzo.getTextBounds(texto, 0, 0, &x1, &y1, &ancho, &alto);
  return ancho;
}

// Escribe con la línea base en "base"; x es el borde izquierdo, el centro o el
// borde derecho del texto según la alineación.
void escribir(GFXcanvas16& lienzo, const String& texto, const GFXfont* fuente, uint16_t color, int16_t x,
              int16_t base, Alineacion alineacion) {
  int16_t x1, y1;
  uint16_t ancho, alto;
  lienzo.setFont(fuente);
  lienzo.setTextColor(color);
  lienzo.getTextBounds(texto, 0, base, &x1, &y1, &ancho, &alto);
  int16_t inicio = alineacion == IZQUIERDA ? x : alineacion == CENTRO ? x - ancho / 2 : x - ancho;
  lienzo.setCursor(inicio - x1, base);
  lienzo.print(texto);
}

void copiarLienzo(GFXcanvas16& lienzo, int16_t x, int16_t y) {
  tft.drawRGBBitmap(x, y, lienzo.getBuffer(), lienzo.width(), lienzo.height());
}

// ---------------------------------------------------------------------------
// Pantalla de arranque
// ---------------------------------------------------------------------------

// Pendiente: círculo gris; en curso: amarillo; correcto: verde con chulito
// negro; fallido: rojo con X blanca.
void dibujarIcono(GFXcanvas16& lienzo, int16_t cx, int16_t cy, EstadoPaso estado) {
  const int16_t r = 6;
  switch (estado) {
    case PENDIENTE:
      lienzo.drawCircle(cx, cy, r, colorEtiqueta);
      break;
    case EN_CURSO:
      lienzo.fillCircle(cx, cy, r, colorDestacado);
      break;
    case CORRECTO:
      lienzo.fillCircle(cx, cy, r, colorOk);
      for (int8_t d = 0; d < 2; d++) {
        lienzo.drawLine(cx - 3, cy + d, cx - 1, cy + 2 + d, colorNegro);
        lienzo.drawLine(cx - 1, cy + 2 + d, cx + 3, cy - 2 + d, colorNegro);
      }
      break;
    case FALLIDO:
      lienzo.fillCircle(cx, cy, r, colorAlarma);
      for (int8_t d = 0; d < 2; d++) {
        lienzo.drawLine(cx - 3 + d, cy - 3, cx + 2 + d, cy + 2, colorBlanco);
        lienzo.drawLine(cx - 3 + d, cy + 2, cx + 2 + d, cy - 3, colorBlanco);
      }
      break;
  }
}

// Dibuja un paso: icono, nombre y detalle (amarillo en curso, rojo si falló).
void dibujarPaso(uint8_t paso, EstadoPaso estado, const String& nombre, const String& detalle) {
  lienzoPaso.fillScreen(colorNegro);
  dibujarIcono(lienzoPaso, 12, ALTO_PASO / 2, estado);
  escribir(lienzoPaso, nombre, &FreeSansBold9pt7b, estado == PENDIENTE ? colorEtiqueta : colorBlanco, 26, 13,
           IZQUIERDA);
  uint16_t colorDetalle = estado == FALLIDO ? colorAlarma : estado == EN_CURSO ? colorDestacado : colorEtiqueta;
  escribir(lienzoPaso, detalle, &FreeSans9pt7b, colorDetalle, X_DETALLE_PASO, 13, IZQUIERDA);
  copiarLienzo(lienzoPaso, 0, Y_PRIMER_PASO + paso * ALTO_PASO);
}

String nombreSensor(uint8_t i) {
  return "S" + String(i + 1) + " " + categorias[i];
}

String detalleSensor(uint8_t i) {
  char texto[32];
  snprintf(texto, sizeof(texto), "GPIO %u (0x%02X)", pinesXSHUT[i], DIRECCION_BASE + i);
  return String(texto);
}

String detalleBroker() {
  return String(MQTT_SERVER) + ":" + String(MQTT_PORT);
}

void dibujarPiePagina(const String& texto, uint16_t color) {
  lienzoPaso.fillScreen(colorNegro);
  escribir(lienzoPaso, texto, &FreeSansBold9pt7b, color, TFT_ANCHO / 2, 13, CENTRO);
  copiarLienzo(lienzoPaso, 0, TFT_ALTO - ALTO_PASO - 1);
}

void dibujarPantallaArranque() {
  tft.fillScreen(colorNegro);
  lienzoBarra.fillScreen(colorNegro);
  escribir(lienzoBarra, "SAMAVI", &FreeSansBold12pt7b, colorBlanco, 6, 22, IZQUIERDA);
  escribir(lienzoBarra, "ARRANQUE", &FreeSansBold9pt7b, colorDestacado, TFT_ANCHO - 6, 20, DERECHA);
  copiarLienzo(lienzoBarra, 0, 0);

  dibujarPaso(PASO_BUS, PENDIENTE, "Bus I2C", "SDA 21 / SCL 22");
  dibujarPaso(PASO_XSHUT, PENDIENTE, "XSHUT", "nadie responde apagado");
  for (int i = 0; i < NUM_SENSORES; i++) {
    dibujarPaso(PRIMER_PASO_SENSOR + i, PENDIENTE, nombreSensor(i), detalleSensor(i));
  }
  dibujarPaso(PASO_OLED, PENDIENTE, "OLED", "mux 0x70, canales 0-5");
  dibujarPaso(PASO_WIFI, PENDIENTE, "Wi-Fi", WIFI_SSID);
  dibujarPaso(PASO_MQTT, PENDIENTE, "MQTT", detalleBroker());
}

bool responde(uint8_t direccion) {
  Wire.beginTransmission(direccion);
  return Wire.endTransmission() == 0;
}

// ---------------------------------------------------------------------------
// Multiplexor y OLED
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
  pinMode(PIN_RESET_MUX, OUTPUT);
  String motivo;

  for (uint8_t intento = 1; intento <= INTENTOS_INICIO; intento++) {
    // RESET es activo en bajo: un pulso deja todos los canales apagados.
    digitalWrite(PIN_RESET_MUX, LOW);
    delayMicroseconds(10);
    digitalWrite(PIN_RESET_MUX, HIGH);
    delay(1);

    int leido = -1;
    if (!responde(DIRECCION_MUX)) {
      motivo = "mux no responde en 0x70";
    } else if (!seleccionarCanales(1)) {
      motivo = "mux no acepta el canal 0";
    } else if ((leido = leerCanales()) != 1) {
      char texto[40];
      snprintf(texto, sizeof(texto), leido < 0 ? "mux no deja leer el canal" : "mux guarda 0x%02X, no 0x01", leido);
      motivo = texto;
    } else if (!seleccionarCanales(0)) {
      motivo = "mux no apaga los canales";
    } else {
      return "";
    }
    Serial.printf("Multiplexor intento %u: %s\n", intento, motivo.c_str());
  }
  seleccionarCanales(0);
  return motivo;
}

// Devuelve "" si la OLED quedó lista o el motivo del fallo.
String iniciarOled(uint8_t i) {
  if (!seleccionarCanales(1 << canalesOled[i])) {
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
  } else if (!oleds[i]->begin(SSD1306_SWITCHCAPVCC, direccion, true, false)) {
    // periphBegin = false: el bus ya está iniciado en SDA 21 / SCL 22.
    motivo = "sin memoria";
  }
  seleccionarCanales(0);
  return motivo;
}

// Dibuja texto centrado en horizontal con su borde superior en y (las fuentes GFX
// se posicionan por la línea base, no por la esquina).
void imprimirCentrado(Adafruit_SSD1306& p, const String& texto, const GFXfont* fuente, int16_t y) {
  int16_t x1, y1;
  uint16_t ancho, alto;
  p.setFont(fuente);
  p.getTextBounds(texto, 0, 0, &x1, &y1, &ancho, &alto);
  p.setCursor((OLED_ANCHO - (int16_t)ancho) / 2 - x1, y - y1);
  p.print(texto);
}

// Categoría arriba y huevos en grande debajo.
void dibujarOled(uint8_t i) {
  Adafruit_SSD1306& p = *oleds[i];
  int32_t huevos = max<int32_t>(0, conteos[i]);

  p.clearDisplay();
  p.setTextColor(SSD1306_WHITE);
  imprimirCentrado(p, categorias[i], &FreeSans9pt7b, 0);

  if (!sensorDisponible[i]) {
    imprimirCentrado(p, "sin sensor", &FreeSans9pt7b, Y_NUMERO_OLED + 12);
  } else {
    // Sin separador de miles para que quepan 4 cifras en 24 pt; con 5 o más se baja a 18 pt.
    String numero = String(huevos);
    const GFXfont* fuente = numero.length() <= 4 ? &FreeSansBold24pt7b : &FreeSansBold18pt7b;
    int16_t x1, y1;
    uint16_t ancho, alto;
    p.setFont(fuente);
    p.getTextBounds(numero, 0, 0, &x1, &y1, &ancho, &alto);
    // Centrado en vertical entre la categoría y el borde inferior.
    int16_t espacio = OLED_ALTO - Y_NUMERO_OLED;
    imprimirCentrado(p, numero, fuente, Y_NUMERO_OLED + (espacio - (int16_t)alto) / 2);
  }
  p.setFont(nullptr);

  if (seleccionarCanales(1 << canalesOled[i])) {
    p.display();
  } else {
    Serial.printf("OLED %s: el mux no cambia al canal %u\n", categorias[i], canalesOled[i]);
  }
  seleccionarCanales(0);
}

void invertirOled(uint8_t i, bool invertir) {
  if (seleccionarCanales(1 << canalesOled[i])) {
    oleds[i]->invertDisplay(invertir);
  }
  seleccionarCanales(0);
}

// Un intento: despierta el sensor con XSHUT, le asigna su dirección y arranca la
// medición continua. Devuelve "" si quedó listo o el motivo del fallo.
String configurarSensor(uint8_t i) {
  uint8_t direccion = DIRECCION_BASE + i;
  digitalWrite(pinesXSHUT[i], LOW);
  delay(10);
  digitalWrite(pinesXSHUT[i], HIGH);
  delay(10);

  if (!responde(DIRECCION_DEFECTO)) {
    return "no despierta (XSHUT/cables)";
  }
  if (!sensores[i].begin(direccion)) {
    return "fallo al configurar";
  }
  if (!responde(direccion)) {
    char texto[32];
    snprintf(texto, sizeof(texto), "no responde en 0x%02X", direccion);
    return texto;
  }
  if (!sensores[i].startRangeContinuous(PERIODO_MEDICION_MS)) {
    return "no inicia la medicion";
  }
  return "";
}

// Hasta INTENTOS_INICIO intentos; con dibujar = true muestra cada intento en la
// pantalla de arranque. Devuelve "" si el sensor quedó listo o el último motivo.
String iniciarSensor(uint8_t i, bool dibujar) {
  String motivo;
  for (uint8_t intento = 1; intento <= INTENTOS_INICIO; intento++) {
    if (dibujar) {
      String detalle = detalleSensor(i);
      if (intento > 1) {
        detalle += "  intento " + String(intento);
      }
      dibujarPaso(PRIMER_PASO_SENSOR + i, EN_CURSO, nombreSensor(i), detalle);
    }
    motivo = configurarSensor(i);
    if (motivo.length() == 0) {
      detectores[i] = DetectorHuevo();
      ultimoDato[i] = millis();
      return "";
    }
    Serial.printf("S%d (%s) intento %u: %s\n", i + 1, categorias[i], intento, motivo.c_str());
  }

  // Se deja en reset para que no ocupe 0x29 durante el resto de la secuencia.
  digitalWrite(pinesXSHUT[i], LOW);
  return motivo;
}

// Con el canal vacío, un sensor no debe ver nada dentro de la zona de detección ni
// en su histéresis. Deja en avisos[i] "" si está despejado o el aviso con la
// distancia vista.
void observarReposo(String avisos[NUM_SENSORES]) {
  uint16_t lecturas[NUM_SENSORES] = {0};
  uint16_t ocupadas[NUM_SENSORES] = {0};
  uint16_t ultimaOcupada[NUM_SENSORES] = {0};
  unsigned long inicio = millis();
  while (millis() - inicio < OBSERVACION_REPOSO_MS) {
    for (int i = 0; i < NUM_SENSORES; i++) {
      if (!sensorDisponible[i] || !sensores[i].isRangeComplete()) {
        continue;
      }
      uint16_t mm = sensores[i].readRangeResult();
      if (sensores[i].Status != VL53L0X_ERROR_NONE) {
        continue;
      }
      uint8_t estado = sensores[i].readRangeStatus();
      lecturas[i]++;
      if (estado == ESTADO_VALIDO && clasificarLectura(mm, estado) != LECTURA_FUERA) {
        ocupadas[i]++;
        ultimaOcupada[i] = mm;
      }
    }
    delay(INTERVALO_SONDEO_MS);
  }
  for (int i = 0; i < NUM_SENSORES; i++) {
    avisos[i] = "";
    if (lecturas[i] > 0 && ocupadas[i] * 2 > lecturas[i]) {
      avisos[i] = "ve algo a " + String(ultimaOcupada[i]) + " mm en reposo";
      Serial.printf("S%d (%s): %s (zona %u-%u mm)\n", i + 1, categorias[i], avisos[i].c_str(),
                    DISTANCIA_MIN_MM, DISTANCIA_MAX_MM);
    }
  }
}

// Estado publicado en samavi/dispositivos/<MAC>/estado, p. ej.
// {"estado":"online","galponId":1,"ip":"192.168.1.50"}.
String mensajeEstado(const char* estado) {
  return "{\"estado\":\"" + String(estado) + "\",\"galponId\":" + String(GALPON_ID) +
         ",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
}

// Intenta conectar al broker una vez; no bloquea más que el intento.
bool conectarMQTT() {
  String dispositivoId = WiFi.macAddress();
  dispositivoId.replace(":", "");
  String clientId = "samavi-esp32-" + dispositivoId;
  String topicoEstado = "samavi/dispositivos/" + dispositivoId + "/estado";
  String offline = mensajeEstado("offline");
  Serial.println("Conectando a MQTT...");
  // LWT: si el ESP32 cae sin desconectarse, el broker publica "offline" retenido.
  if (mqttClient.connect(clientId.c_str(), topicoEstado.c_str(), 1, true, offline.c_str())) {
    mqttClient.publish(topicoEstado.c_str(), mensajeEstado("online").c_str(), true);
    Serial.println("MQTT conectado como " + clientId);
    return true;
  }
  Serial.printf("MQTT fallo, rc=%d\n", mqttClient.state());
  return false;
}

void iniciar() {
  dibujarPantallaArranque();
  delay(300);

  // Paso 1: el bus I2C debe estar en reposo (SDA y SCL en alto). Con el botón EN
  // solo se reinicia el ESP32: los sensores siguen en sus direcciones, el mux con
  // el último canal conectado y un esclavo cortado a mitad de transferencia puede
  // seguir reteniendo SDA. Se apagan los sensores, se resetea el mux (desconecta
  // las OLED) y, si SDA sigue en bajo, se liberan con 9 pulsos en SCL y un STOP.
  dibujarPaso(PASO_BUS, EN_CURSO, "Bus I2C", "SDA 21 / SCL 22");
  for (int i = 0; i < NUM_SENSORES; i++) {
    pinMode(pinesXSHUT[i], OUTPUT);
    digitalWrite(pinesXSHUT[i], LOW);
  }
  pinMode(PIN_RESET_MUX, OUTPUT);
  digitalWrite(PIN_RESET_MUX, LOW);
  delayMicroseconds(10);
  digitalWrite(PIN_RESET_MUX, HIGH);
  pinMode(PIN_SDA, INPUT);
  pinMode(PIN_SCL, INPUT);
  delay(10);
  bool liberado = false;
  if (digitalRead(PIN_SDA) == LOW && digitalRead(PIN_SCL) == HIGH) {
    pinMode(PIN_SCL, OUTPUT_OPEN_DRAIN);
    for (int pulso = 0; pulso < 9 && digitalRead(PIN_SDA) == LOW; pulso++) {
      digitalWrite(PIN_SCL, LOW);
      delayMicroseconds(5);
      digitalWrite(PIN_SCL, HIGH);
      delayMicroseconds(5);
    }
    // STOP: SDA sube mientras SCL está en alto.
    pinMode(PIN_SDA, OUTPUT_OPEN_DRAIN);
    digitalWrite(PIN_SCL, LOW);
    digitalWrite(PIN_SDA, LOW);
    delayMicroseconds(5);
    digitalWrite(PIN_SCL, HIGH);
    delayMicroseconds(5);
    digitalWrite(PIN_SDA, HIGH);
    delayMicroseconds(5);
    pinMode(PIN_SDA, INPUT);
    pinMode(PIN_SCL, INPUT);
    liberado = true;
    Serial.println("Bus I2C: SDA estaba en bajo, se intento liberar");
  }
  bool busLibre = digitalRead(PIN_SDA) == HIGH && digitalRead(PIN_SCL) == HIGH;
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(FRECUENCIA_I2C_HZ);
  delay(150);
  String detalleBus = liberado ? "SDA 21 / SCL 22 liberados" : "SDA 21 / SCL 22 libres";
  dibujarPaso(PASO_BUS, busLibre ? CORRECTO : FALLIDO, "Bus I2C",
              busLibre ? detalleBus : "linea en bajo: bus trabado");

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

  // Paso 3: cada sensor, uno a uno. Un sensor que falla no detiene el arranque.
  uint8_t listos = 0;
  for (int i = 0; i < NUM_SENSORES; i++) {
    String motivo = iniciarSensor(i, true);
    sensorDisponible[i] = motivo.length() == 0;
    if (sensorDisponible[i]) {
      dibujarPaso(PRIMER_PASO_SENSOR + i, EN_CURSO, nombreSensor(i), detalleSensor(i));
    } else {
      dibujarPaso(PRIMER_PASO_SENSOR + i, FALLIDO, nombreSensor(i), motivo);
    }
  }
  // Un sensor que en reposo ve algo en la zona queda listo pero se marca en rojo:
  // contaría una vez y quedaría "con huevo al frente".
  String avisos[NUM_SENSORES];
  observarReposo(avisos);
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (!sensorDisponible[i]) {
      continue;
    }
    if (avisos[i].length() > 0) {
      dibujarPaso(PRIMER_PASO_SENSOR + i, FALLIDO, nombreSensor(i), avisos[i]);
    } else {
      listos++;
      dibujarPaso(PRIMER_PASO_SENSOR + i, CORRECTO, nombreSensor(i), detalleSensor(i));
    }
  }

  // Paso 4: multiplexor y OLED, después de los sensores para que la secuencia
  // XSHUT se haga con todos los canales apagados.
  dibujarPaso(PASO_OLED, EN_CURSO, "OLED", "mux 0x70, canales 0-5");
  String motivoMux = iniciarMux();
  muxDisponible = motivoMux.length() == 0;
  uint8_t oledsListas = 0;
  String oledsFallidas;
  for (int i = 0; i < NUM_SENSORES; i++) {
    String motivo = muxDisponible ? iniciarOled(i) : motivoMux;
    oledDisponible[i] = motivo.length() == 0;
    if (oledDisponible[i]) {
      oledsListas++;
    } else {
      Serial.printf("OLED %s (canal %u): %s\n", categorias[i], canalesOled[i], motivo.c_str());
      oledsFallidas += (oledsFallidas.length() > 0 ? " " : "") + String(canalesOled[i]);
    }
  }
  bool oledsCorrectas = oledsListas == NUM_SENSORES;
  String detalleOled = String(oledsListas) + "/" + String(NUM_SENSORES) + " listas";
  if (!muxDisponible) {
    detalleOled = motivoMux;
  } else if (!oledsCorrectas) {
    detalleOled += ", fallan canales " + oledsFallidas;
  }
  dibujarPaso(PASO_OLED, oledsCorrectas ? CORRECTO : FALLIDO, "OLED", detalleOled);

  // Paso 5: Wi-Fi. Si no conecta a tiempo, se sigue reintentando en segundo plano.
  dibujarPaso(PASO_WIFI, EN_CURSO, "Wi-Fi", String("conectando a ") + WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long inicioWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicioWifi < ESPERA_WIFI_ARRANQUE_MS) {
    delay(250);
  }
  ultimoIntentoWifi = millis();
  wifiConectado = WiFi.status() == WL_CONNECTED;
  if (wifiConectado) {
    String ip = WiFi.localIP().toString();
    Serial.println("WiFi conectado: " + ip);
    dibujarPaso(PASO_WIFI, CORRECTO, "Wi-Fi", "IP " + ip);
    configTime(-5 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    horaConfigurada = true;
  } else {
    Serial.println("WiFi sin conexion, se reintenta en segundo plano");
    dibujarPaso(PASO_WIFI, FALLIDO, "Wi-Fi", String("sin conexion a ") + WIFI_SSID);
  }

  // Paso 6: broker MQTT (solo si hay Wi-Fi).
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setKeepAlive(MQTT_KEEPALIVE_S);
  mqttConectado = false;
  if (wifiConectado) {
    dibujarPaso(PASO_MQTT, EN_CURSO, "MQTT", detalleBroker());
    mqttConectado = conectarMQTT();
    dibujarPaso(PASO_MQTT, mqttConectado ? CORRECTO : FALLIDO, "MQTT",
                mqttConectado ? detalleBroker() : "no responde, rc=" + String(mqttClient.state()));
  } else {
    dibujarPaso(PASO_MQTT, FALLIDO, "MQTT", "esperando Wi-Fi");
  }
  ultimoIntentoMqtt = millis();

  bool todoCorrecto =
      busLibre && xshutCorrecto && listos == NUM_SENSORES && oledsCorrectas && wifiConectado && mqttConectado;
  String resumen = String(listos) + "/" + String(NUM_SENSORES) + " sensores, " + String(oledsListas) + "/" +
                   String(NUM_SENSORES) + " OLED";
  if (todoCorrecto) {
    dibujarPiePagina(resumen + ", conectado a Mosquitto", colorOk);
  } else {
    uint8_t fallos =
        !busLibre + !xshutCorrecto + (NUM_SENSORES - listos) + !oledsCorrectas + !wifiConectado + !mqttConectado;
    dibujarPiePagina(resumen + ", " + String(fallos) + (fallos == 1 ? " paso fallando" : " pasos fallando"),
                     colorAlarma);
  }
  Serial.println(resumen);
  delay(todoCorrecto ? PAUSA_ARRANQUE_OK_MS : PAUSA_ARRANQUE_FALLO_MS);
}

// ---------------------------------------------------------------------------
// Pantalla de conteo
// ---------------------------------------------------------------------------

int16_t xCanal(uint8_t i) {
  return SEPARACION + (i % 2) * (ANCHO_CANAL + SEPARACION);
}

int16_t yCanal(uint8_t i) {
  return Y_CANALES + (i / 2) * (ALTO_CANAL + SEPARACION);
}

// Píldora de estado: verde con texto negro si hay conexión, roja con texto blanco si no.
void dibujarPiloto(int16_t x, int16_t ancho, const char* etiqueta, bool encendido) {
  uint16_t fondo = encendido ? colorOk : colorAlarma;
  lienzoBarra.fillRoundRect(x, 4, ancho, ALTO_BARRA - 8, 6, fondo);
  escribir(lienzoBarra, etiqueta, &FreeSansBold9pt7b, encendido ? colorNegro : colorBlanco, x + ancho / 2, 20, CENTRO);
}

// Barra de estado: galpón, hora (Bogotá, por NTP) y pilotos de Wi-Fi y MQTT.
// Devuelve el minuto dibujado para redibujar solo cuando cambia.
int dibujarBarra() {
  struct tm tiempo;
  // Sin sincronizar, el reloj del ESP32 arranca en 1970.
  bool hayHora = getLocalTime(&tiempo, 0) && tiempo.tm_year + 1900 >= 2024;
  char hora[8] = "--:--";
  if (hayHora) {
    strftime(hora, sizeof(hora), "%H:%M", &tiempo);
  }
  bool wifi = wifiConectado;
  bool mqtt = mqttConectado;

  lienzoBarra.fillScreen(colorNegro);
  escribir(lienzoBarra, "GALPON " + String(GALPON_ID), &FreeSansBold9pt7b, colorBlanco, 6, 20, IZQUIERDA);
  escribir(lienzoBarra, hora, &FreeSansBold12pt7b, hayHora ? colorBlanco : colorEtiqueta, 150, 22, CENTRO);
  dibujarPiloto(200, 54, "WIFI", wifi);
  dibujarPiloto(260, 56, "MQTT", mqtt);
  copiarLienzo(lienzoBarra, 0, 0);

  wifiDibujado = wifi;
  mqttDibujado = mqtt;
  return hayHora ? tiempo.tm_hour * 60 + tiempo.tm_min : -1;
}

void dibujarConexiones() {
  minutoDibujado = dibujarBarra();
}

// Total de huevos a la izquierda y bandejas completas a la derecha.
void dibujarTotal() {
  int32_t total = 0;
  for (int i = 0; i < NUM_SENSORES; i++) {
    total += max<int32_t>(0, conteos[i]);
  }
  lienzoTotal.fillScreen(colorNegro);
  escribir(lienzoTotal, "TOTAL", &FreeSansBold9pt7b, colorEtiqueta, 6, 14, IZQUIERDA);
  escribir(lienzoTotal, String(total), &FreeSansBold24pt7b, colorBlanco, 6, 52, IZQUIERDA);
  escribir(lienzoTotal, "BANDEJAS", &FreeSansBold9pt7b, colorEtiqueta, ANCHO_TOTAL - 6, 14, DERECHA);
  escribir(lienzoTotal, String(total / HUEVOS_POR_BANDEJA), &FreeSansBold24pt7b, colorDestacado, ANCHO_TOTAL - 6,
           52, DERECHA);
  copiarLienzo(lienzoTotal, SEPARACION, Y_TOTAL);
}

// Bloque de una categoría: su color con el código y el conteo en negro; blanco
// mientras hay un huevo al frente; rojo con "FALLA" si el sensor no responde; y
// marco verde durante el destello de cada conteo.
void dibujarTarjeta(uint8_t i) {
  bool falla = !sensorDisponible[i];
  bool activo = !falla && detectores[i].activo;
  uint16_t fondo = falla ? colorAlarma : activo ? colorBlanco : acentos[i];
  uint16_t texto = falla ? colorBlanco : colorNegro;

  lienzoCanal.fillScreen(fondo);
  escribir(lienzoCanal, categorias[i], &FreeSansBold12pt7b, texto, 8, 32, IZQUIERDA);
  int16_t anchoCodigo = anchoEnLienzo(lienzoCanal, categorias[i], &FreeSansBold12pt7b);
  int16_t disponible = ANCHO_CANAL - 8 - (8 + anchoCodigo + 10);
  if (falla) {
    escribir(lienzoCanal, "FALLA", &FreeSansBold12pt7b, texto, ANCHO_CANAL - 8, 32, DERECHA);
  } else {
    String numero = String(max<int32_t>(0, conteos[i]));
    const GFXfont* fuente = anchoEnLienzo(lienzoCanal, numero, &FreeSansBold24pt7b) <= disponible
                                ? &FreeSansBold24pt7b
                                : &FreeSansBold18pt7b;
    escribir(lienzoCanal, numero, fuente, texto, ANCHO_CANAL - 8, fuente == &FreeSansBold24pt7b ? 41 : 37, DERECHA);
  }
  if (millis() < finDestello[i]) {
    for (int16_t g = 0; g < GROSOR_DESTELLO; g++) {
      lienzoCanal.drawRect(g, g, ANCHO_CANAL - 2 * g, ALTO_CANAL - 2 * g, colorOk);
    }
  }
  copiarLienzo(lienzoCanal, xCanal(i), yCanal(i));
}

void dibujarPantallaConteo() {
  tft.fillScreen(colorNegro);
  for (int i = 0; i < NUM_SENSORES; i++) {
    tarjetaPendiente[i] = true;
    oledPendiente[i] = true;
  }
  totalPendiente = true;
  conexionesPendiente = true;
  minutoDibujado = -2;
}

// Redibuja solo lo que cambió.
void actualizarPantalla() {
  for (int i = 0; i < NUM_SENSORES; i++) {
    bool destello = millis() < finDestello[i];
    if (tarjetaPendiente[i] || puntoDibujado[i] != detectores[i].activo || destello != destelloDibujado[i]) {
      dibujarTarjeta(i);
      tarjetaPendiente[i] = false;
      puntoDibujado[i] = detectores[i].activo;
      destelloDibujado[i] = destello;
    }
  }

  if (totalPendiente) {
    dibujarTotal();
    totalPendiente = false;
  }

  // Se consulta el reloj una vez por segundo; se redibuja la barra al cambiar el minuto.
  static unsigned long ultimaRevisionHora = 0;
  if (minutoDibujado == -2 || millis() - ultimaRevisionHora >= 1000) {
    ultimaRevisionHora = millis();
    struct tm tiempo;
    bool hayHora = getLocalTime(&tiempo, 0) && tiempo.tm_year + 1900 >= 2024;
    int minuto = hayHora ? tiempo.tm_hour * 60 + tiempo.tm_min : -1;
    if (minuto != minutoDibujado) {
      minutoDibujado = dibujarBarra();
    }
  }

  // Como mucho una OLED por llamada: cada redibujado ocupa el bus I2C unos 25 ms y
  // así los sensores se leen entre una y otra.
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (oledDisponible[i] && oledPendiente[i]) {
      dibujarOled(i);
      oledPendiente[i] = false;
      break;
    }
  }
  for (int i = 0; i < NUM_SENSORES; i++) {
    bool destello = millis() < finDestello[i];
    if (oledDisponible[i] && destello != oledInvertida[i]) {
      invertirOled(i, destello);
      oledInvertida[i] = destello;
    }
  }

  bool wifi = wifiConectado;
  bool mqtt = mqttConectado;
  if (conexionesPendiente || wifi != wifiDibujado || mqtt != mqttDibujado) {
    dibujarConexiones();
    conexionesPendiente = false;
  }
}

// ---------------------------------------------------------------------------
// Conexiones y publicación
// ---------------------------------------------------------------------------

// Reintenta Wi-Fi y MQTT. Corre en la tarea de red: un intento de MQTT con el
// broker caído tarda unos 3 s, pero no frena la lectura de los sensores.
void mantenerConexiones() {
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - ultimoIntentoWifi >= REINTENTO_WIFI_MS) {
      ultimoIntentoWifi = millis();
      Serial.println("Reintentando WiFi...");
      WiFi.reconnect();
    }
    return;
  }

  // Si el Wi-Fi no estaba al arrancar, la hora se pide al conectar por primera vez.
  if (!horaConfigurada) {
    configTime(-5 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    horaConfigurada = true;
  }

  if (!mqttClient.connected()) {
    if (millis() - ultimoIntentoMqtt >= REINTENTO_MQTT_MS) {
      ultimoIntentoMqtt = millis();
      conectarMQTT();
    }
    return;
  }
  mqttClient.loop();
}

void obtenerTimestamp(char* destino, size_t largo) {
  struct timeval tiempoActual;
  gettimeofday(&tiempoActual, nullptr);

  struct tm tiempo;
  if (!localtime_r(&tiempoActual.tv_sec, &tiempo)) {
    snprintf(destino, largo, "1970-01-01T00:00:00.000-05:00");
    return;
  }
  snprintf(
    destino,
    largo,
    "%04d-%02d-%02dT%02d:%02d:%02d.%03ld-05:00",
    tiempo.tm_year + 1900,
    tiempo.tm_mon + 1,
    tiempo.tm_mday,
    tiempo.tm_hour,
    tiempo.tm_min,
    tiempo.tm_sec,
    tiempoActual.tv_usec / 1000
  );
}

// Publica en orden los conteos de la cola. Si una publicación falla, el conteo se
// queda en la cola para el siguiente intento.
void publicarPendientes() {
  MensajeConteo mensaje;
  while (mqttClient.connected() && xQueuePeek(colaConteos, &mensaje, 0) == pdTRUE) {
    String payload = "{\"galponId\":" + String(GALPON_ID) + ",\"categoriaPeso\":\"";
    payload += categorias[mensaje.sensor];
    payload += "\",\"cantidad\":1,\"timestamp\":\"";
    payload += mensaje.timestamp;
    payload += "\"}";
    if (!mqttClient.publish(MQTT_TOPIC, payload.c_str(), false)) {
      Serial.printf("Conteo no publicado, se reintenta: %s\n", payload.c_str());
      return;
    }
    Serial.printf("Conteo publicado: %s\n", payload.c_str());
    xQueueReceive(colaConteos, &mensaje, 0);
  }
}

void tareaRed(void*) {
  for (;;) {
    mantenerConexiones();
    wifiConectado = WiFi.status() == WL_CONNECTED;
    mqttConectado = mqttClient.connected();
    publicarPendientes();
    vTaskDelay(pdMS_TO_TICKS(INTERVALO_RED_MS));
  }
}

// Suma el huevo al conteo local (pantallas) y lo deja en la cola para publicarlo.
void registrarConteo(uint8_t indice) {
  conteos[indice]++;
  finDestello[indice] = millis() + DURACION_DESTELLO_MS;
  tarjetaPendiente[indice] = true;
  oledPendiente[indice] = true;
  totalPendiente = true;

  MensajeConteo mensaje;
  mensaje.sensor = indice;
  obtenerTimestamp(mensaje.timestamp, sizeof(mensaje.timestamp));
  if (xQueueSend(colaConteos, &mensaje, 0) != pdTRUE) {
    Serial.printf("Cola de conteos llena: el huevo %s no se publicara\n", categorias[indice]);
    return;
  }
  Serial.printf("Huevo %s -> %ld (%u por publicar)\n", categorias[indice], (long)conteos[indice],
                (unsigned)uxQueueMessagesWaiting(colaConteos));
}

// Reinicia un sensor que dejó de entregar lecturas. Si no vuelve, queda como
// "sin sensor" en las pantallas.
void reiniciarSensor(uint8_t i) {
  Serial.printf("S%d (%s) sin lecturas por %lu ms, reiniciando\n", i + 1, categorias[i], SIN_DATOS_MAX_MS);
  String motivo = iniciarSensor(i, false);
  if (motivo.length() > 0) {
    sensorDisponible[i] = false;
    tarjetaPendiente[i] = true;
    oledPendiente[i] = true;
    Serial.printf("S%d (%s) no se recupero: %s\n", i + 1, categorias[i], motivo.c_str());
  }
  // Reiniciar bloquea cientos de ms: el plazo de los demás cuenta desde ahora.
  for (int k = 0; k < NUM_SENSORES; k++) {
    ultimoDato[k] = millis();
  }
}

void leerSensores() {
  if (millis() - ultimoSondeo < INTERVALO_SONDEO_MS) {
    return;
  }
  ultimoSondeo = millis();

  for (int i = 0; i < NUM_SENSORES; i++) {
    if (!sensorDisponible[i]) {
      continue;
    }
    if (millis() - ultimoDato[i] > SIN_DATOS_MAX_MS) {
      reiniciarSensor(i);
      continue;
    }
    if (!sensores[i].isRangeComplete()) {
      continue;
    }
    // En modo continuo se lee con readRangeResult(): readRange() lanza una
    // medición única encima de la continua y puede dejar el sensor trabado.
    uint16_t lectura = sensores[i].readRangeResult();
    if (sensores[i].Status != VL53L0X_ERROR_NONE) {
      continue;
    }
    ultimoDato[i] = millis();
    if (procesarLectura(detectores[i], lectura, sensores[i].readRangeStatus()) == HUEVO_NUEVO) {
      registrarConteo(i);
    }
  }
}

// Pantalla de presentación: el logo centrado sobre su mismo fondo (blanco).
// logo.h se genera con firmware/tools/generar_logo.py.
void mostrarPresentacion() {
  tft.fillScreen(LOGO_FONDO);
  tft.drawRGBBitmap((TFT_ANCHO - LOGO_ANCHO) / 2, (TFT_ALTO - LOGO_ALTO) / 2, LOGO, LOGO_ANCHO, LOGO_ALTO);
  delay(DURACION_PRESENTACION_MS);
}

void setup() {
  Serial.begin(115200);

  spiTft.begin(TFT_SCK, -1, TFT_MOSI, TFT_CS);
  tft.init(TFT_ALTO, TFT_ANCHO);
  tft.setSPISpeed(40000000);
  // Girada 180° respecto a la rotación 1 por cómo va montada.
  tft.setRotation(3);
  tft.setTextWrap(false);

  colorNegro = hexA565(0x000000);
  colorBlanco = hexA565(0xFFFFFF);
  colorEtiqueta = hexA565(0x9A9A9A);
  colorOk = hexA565(0x00E05A);
  colorAlarma = hexA565(0xFF2A2A);
  colorDestacado = hexA565(0xFFD400);
  for (int i = 0; i < NUM_SENSORES; i++) {
    acentos[i] = hexA565(acentosHex[i]);
  }

  mostrarPresentacion();
  iniciar();
  // El arranque (Wi-Fi incluido) tarda segundos: el plazo "sin lecturas" cuenta desde aquí.
  for (int i = 0; i < NUM_SENSORES; i++) {
    ultimoDato[i] = millis();
  }
  colaConteos = xQueueCreate(CAPACIDAD_COLA_CONTEOS, sizeof(MensajeConteo));
  xTaskCreatePinnedToCore(tareaRed, "red", 8192, nullptr, 1, nullptr, 0);
  dibujarPantallaConteo();
  actualizarPantalla();
}

void loop() {
  leerSensores();
  actualizarPantalla();
}
