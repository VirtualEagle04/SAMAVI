// Prueba de la pantalla TFT ST7789 (panel de 240x320) con el conteo por categoría.
// Sin Wi-Fi ni MQTT: el conteo es local y se reinicia al apagar el ESP32.
//
// 1. Pantalla de arranque: un chulito verde por cada paso (bus I2C, XSHUT y cada
//    sensor). Una X roja indica el paso que falló y por qué.
// 2. Pantalla de conteo: una tarjeta por categoría con el total de huevos, las
//    bandejas, un punto que se enciende mientras hay un huevo al frente y un
//    destello verde con cada conteo.
//
// Compilar y subir: pio run -e tft_test -t upload
// Por el monitor serie se puede simular un conteo: "A+", "AA-", "Ex+", "0" (reinicia).

#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <Adafruit_VL53L0X.h>

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

const uint8_t pinesXSHUT[NUM_SENSORES] = {15, 4, 18, 13, 14, 33};
const char* categorias[NUM_SENSORES] = {"Y", "Ex", "AA", "A", "B", "C"};
const uint8_t DIRECCION_DEFECTO = 0x29;
const uint8_t DIRECCION_BASE = 0x30;
const uint8_t INTENTOS_INICIO = 3;
const uint16_t DISTANCIA_MIN_MM = 10;
const uint16_t DISTANCIA_MAX_MM = 100;
// Histéresis: para soltar un huevo hace falta ver el canal libre varias lecturas
// seguidas (a 50 ms por lectura) o una distancia claramente mayor al umbral.
const uint16_t DISTANCIA_LIBERAR_MM = 120;
const uint8_t LECTURAS_PARA_LIBERAR = 3;
const unsigned long INTERVALO_LECTURA_MS = 50;
const int HUEVOS_POR_BANDEJA = 30;
const unsigned long DURACION_DESTELLO_MS = 300;
const unsigned long PAUSA_ARRANQUE_OK_MS = 1500;
const unsigned long PAUSA_ARRANQUE_FALLO_MS = 5000;

// Color de acento por categoría (borde de CATEGORY_COLORS en el frontend).
const uint32_t acentosHex[NUM_SENSORES] = {0xD99B26, 0xC87A57, 0xA88C52, 0x6B8E62, 0xA66B48, 0xC05C56};

// Pantalla de arranque.
const int16_t Y_PRIMER_PASO = 44;
const int16_t ALTO_PASO = 22;
const uint8_t PASO_BUS = 0;
const uint8_t PASO_XSHUT = 1;
const uint8_t PRIMER_PASO_SENSOR = 2;

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

bool sensorDisponible[NUM_SENSORES] = {false};
bool sensorActivo[NUM_SENSORES] = {false};
uint8_t lecturasLibres[NUM_SENSORES] = {0};
int32_t conteos[NUM_SENSORES] = {0};
bool tarjetaPendiente[NUM_SENSORES] = {false};
bool puntoPendiente[NUM_SENSORES] = {false};
bool puntoDibujado[NUM_SENSORES] = {false};
unsigned long finDestello[NUM_SENSORES] = {0};
bool destelloDibujado[NUM_SENSORES] = {false};
bool totalPendiente = true;
unsigned long ultimaLectura = 0;

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

void dibujarPiePagina(const String& texto, uint16_t color) {
  tft.fillRect(0, TFT_ALTO - 18, TFT_ANCHO, 18, colorFondo);
  imprimir(texto, 8, TFT_ALTO - 14, 1, color, colorFondo);
}

void dibujarPantallaArranque() {
  tft.fillScreen(colorFondo);
  imprimir("SAMAVI", 8, 10, 2, colorTexto, colorFondo);
  imprimir("Revisando sensores", 8 + anchoTexto("SAMAVI", 2) + 12, 15, 1, colorSecundario, colorFondo);
  tft.drawFastHLine(8, 34, TFT_ANCHO - 16, colorApagado);

  dibujarPaso(PASO_BUS, PENDIENTE, "Bus I2C", "SDA 21 / SCL 22");
  dibujarPaso(PASO_XSHUT, PENDIENTE, "XSHUT", "nadie responde apagado");
  for (int i = 0; i < NUM_SENSORES; i++) {
    dibujarPaso(PRIMER_PASO_SENSOR + i, PENDIENTE, nombreSensor(i), detalleSensor(i));
  }
}

bool responde(uint8_t direccion) {
  Wire.beginTransmission(direccion);
  return Wire.endTransmission() == 0;
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
    } else if (!sensores[i].startRangeContinuous()) {
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

void iniciarSensores() {
  dibujarPantallaArranque();
  delay(300);

  // Paso 1: el bus I2C debe estar en reposo (SDA y SCL en alto).
  dibujarPaso(PASO_BUS, EN_CURSO, "Bus I2C", "SDA 21 / SCL 22");
  pinMode(PIN_SDA, INPUT);
  pinMode(PIN_SCL, INPUT);
  bool busLibre = digitalRead(PIN_SDA) == HIGH && digitalRead(PIN_SCL) == HIGH;
  Wire.begin(PIN_SDA, PIN_SCL);
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

  bool todoCorrecto = busLibre && xshutCorrecto && listos == NUM_SENSORES;
  String resumen = String(listos) + "/" + String(NUM_SENSORES) + " sensores listos";
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
  if (sensorActivo[i]) {
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

void dibujarPantallaConteo() {
  tft.fillScreen(colorFondo);
  for (int i = 0; i < NUM_SENSORES; i++) {
    tarjetaPendiente[i] = true;
  }
  totalPendiente = true;
}

// Redibuja solo lo que cambió para evitar parpadeo.
void actualizarPantalla() {
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (tarjetaPendiente[i]) {
      dibujarTarjeta(i);
      tarjetaPendiente[i] = false;
      puntoPendiente[i] = false;
      puntoDibujado[i] = sensorActivo[i];
      destelloDibujado[i] = millis() < finDestello[i];
      continue;
    }
    if (puntoPendiente[i] || puntoDibujado[i] != sensorActivo[i]) {
      dibujarPunto(i);
      puntoDibujado[i] = sensorActivo[i];
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

    // Estado 0 = medición válida; 4 = nada al frente. Los estados 1-3 (p. ej. señal
    // débil) dan distancias poco fiables y no cambian el estado del sensor.
    uint8_t estado = sensores[i].readRangeStatus();
    bool huevoAlFrente = estado == 0 && lectura >= DISTANCIA_MIN_MM && lectura <= DISTANCIA_MAX_MM;
    bool canalLibre = estado == 4 || (estado == 0 && lectura > DISTANCIA_LIBERAR_MM);
    if (huevoAlFrente) {
      lecturasLibres[i] = 0;
      if (!sensorActivo[i]) {
        sensorActivo[i] = true;
        registrarConteo(i, 1);
      }
    } else if (canalLibre && sensorActivo[i] && ++lecturasLibres[i] >= LECTURAS_PARA_LIBERAR) {
      sensorActivo[i] = false;
      lecturasLibres[i] = 0;
    }
  }
}

void setup() {
  Serial.begin(115200);

  spiTft.begin(TFT_SCK, -1, TFT_MOSI, TFT_CS);
  tft.init(TFT_ALTO, TFT_ANCHO);
  tft.setSPISpeed(40000000);
  tft.setRotation(1);
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

  iniciarSensores();
  dibujarPantallaConteo();
  actualizarPantalla();
  Serial.println("Prueba TFT lista");
}

void loop() {
  leerSensores();
  procesarComandoSerie();
  actualizarPantalla();
}
