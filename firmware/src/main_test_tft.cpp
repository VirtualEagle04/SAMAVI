// Prueba de la pantalla TFT ST7789 (panel de 240x320) con el conteo por categoría.
// Sin Wi-Fi ni MQTT: el conteo es local y se reinicia al apagar el ESP32.
// Muestra lo mismo que el monitoreo en vivo del frontend: total del día y,
// por categoría, bandejas, huevos sueltos y una barra relativa a la mayor.
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
const uint16_t DISTANCIA_MIN_MM = 10;
const uint16_t DISTANCIA_MAX_MM = 100;
const unsigned long INTERVALO_LECTURA_MS = 50;
const int HUEVOS_POR_BANDEJA = 30;

// Colores de CATEGORY_COLORS (frontend/src/components/atoms/CategoryBadge.tsx).
struct ColoresCategoria {
  uint32_t fondo;
  uint32_t texto;
  uint32_t borde;
};
const ColoresCategoria coloresHex[NUM_SENSORES] = {
  {0xF7E5B5, 0x5C4333, 0xD99B26},  // Y
  {0xF3DFD5, 0x743F2A, 0xC87A57},  // Ex
  {0xEDE3D1, 0x665331, 0xA88C52},  // AA
  {0xE6EBDD, 0x40573A, 0x6B8E62},  // A
  {0xEFE3D9, 0x674433, 0xA66B48},  // B
  {0xF3DEDA, 0x753D39, 0xC05C56},  // C
};

// Disposición en horizontal (320x170).
const int16_t ALTO_ENCABEZADO = 52;
const int16_t ALTO_FILA = (TFT_ALTO - ALTO_ENCABEZADO) / NUM_SENSORES;
const int16_t X_INSIGNIA = 4;
const int16_t ANCHO_INSIGNIA = 40;
const int16_t X_BARRA = 52;
const int16_t ANCHO_BARRA = 120;
const int16_t ALTO_BARRA = 6;
const int16_t X_FIN_BANDEJAS = 262;
const int16_t X_FIN_HUEVOS = 314;

SPIClass spiTft(VSPI);
Adafruit_ST7789 tft(&spiTft, TFT_CS, TFT_DC, TFT_RST);
Adafruit_VL53L0X sensores[NUM_SENSORES];

bool sensorDisponible[NUM_SENSORES] = {false};
bool sensorActivo[NUM_SENSORES] = {false};
int32_t conteos[NUM_SENSORES] = {0};
bool filaPendiente[NUM_SENSORES] = {false};
bool totalPendiente = true;
int32_t maximoDibujado = -1;
unsigned long ultimaLectura = 0;

uint16_t colorFondo;
uint16_t colorTexto;
uint16_t colorSecundario;
uint16_t colorDeshabilitado;
uint16_t colorPrimario;
uint16_t colorDivisor;
uint16_t colorFondoBarra;

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

void textoAlineadoDerecha(const String& texto, int16_t xFin, int16_t y, uint8_t tamano) {
  int16_t ancho = texto.length() * 6 * tamano;
  tft.setTextSize(tamano);
  tft.setCursor(xFin - ancho, y);
  tft.print(texto);
}

int32_t totalHuevos() {
  int32_t total = 0;
  for (int i = 0; i < NUM_SENSORES; i++) {
    total += conteos[i];
  }
  return total;
}

int32_t maximoCategoria() {
  int32_t maximo = 0;
  for (int i = 0; i < NUM_SENSORES; i++) {
    maximo = max(maximo, conteos[i]);
  }
  return maximo;
}

int16_t yFila(uint8_t indice) {
  return ALTO_ENCABEZADO + indice * ALTO_FILA;
}

void dibujarEncabezado() {
  tft.setTextColor(colorSecundario, colorFondo);
  tft.setTextSize(1);
  tft.setCursor(X_INSIGNIA, 6);
  tft.print("PRODUCCION DE HOY");

  textoAlineadoDerecha("BANDEJAS", X_FIN_BANDEJAS, 40, 1);
  textoAlineadoDerecha("HUEVOS", X_FIN_HUEVOS, 40, 1);
  tft.drawFastHLine(0, ALTO_ENCABEZADO - 1, TFT_ANCHO, colorDivisor);
}

void dibujarTotal() {
  tft.fillRect(X_INSIGNIA, 18, 200, 24, colorFondo);
  String total = formatearMiles(max<int32_t>(0, totalHuevos()));
  tft.setTextColor(colorPrimario, colorFondo);
  tft.setTextSize(3);
  tft.setCursor(X_INSIGNIA, 18);
  tft.print(total);

  tft.setTextColor(colorSecundario, colorFondo);
  tft.setTextSize(1);
  tft.setCursor(tft.getCursorX() + 6, 32);
  tft.print("huevos");
}

void dibujarFila(uint8_t i, int32_t maximo) {
  int16_t y = yFila(i);
  int16_t yCentro = y + ALTO_FILA / 2;
  uint16_t fondoInsignia = hexA565(coloresHex[i].fondo);
  uint16_t textoInsignia = hexA565(coloresHex[i].texto);
  uint16_t bordeInsignia = hexA565(coloresHex[i].borde);

  // Insignia con el código de la categoría.
  int16_t yInsignia = yCentro - 12;
  tft.fillRoundRect(X_INSIGNIA, yInsignia, ANCHO_INSIGNIA, 24, 4, fondoInsignia);
  tft.drawRoundRect(X_INSIGNIA, yInsignia, ANCHO_INSIGNIA, 24, 4, bordeInsignia);
  tft.setTextColor(textoInsignia, fondoInsignia);
  tft.setTextSize(2);
  int16_t anchoCodigo = strlen(categorias[i]) * 12;
  tft.setCursor(X_INSIGNIA + (ANCHO_INSIGNIA - anchoCodigo) / 2, yInsignia + 5);
  tft.print(categorias[i]);

  // Barra proporcional a la categoría con más huevos.
  int16_t yBarra = yCentro - ALTO_BARRA / 2;
  int32_t huevos = max<int32_t>(0, conteos[i]);
  int16_t relleno = maximo > 0 ? (int32_t)ANCHO_BARRA * huevos / maximo : 0;
  if (huevos > 0 && relleno < 4) {
    relleno = 4;
  }
  tft.fillRoundRect(X_BARRA, yBarra, ANCHO_BARRA, ALTO_BARRA, 3, colorFondoBarra);
  if (relleno > 0) {
    tft.fillRoundRect(X_BARRA, yBarra, relleno, ALTO_BARRA, 3, bordeInsignia);
  }

  // Números: bandejas y huevos sueltos (o "--" si el sensor no respondió).
  int16_t xNumeros = X_BARRA + ANCHO_BARRA + 4;
  tft.fillRect(xNumeros, y + 1, X_FIN_HUEVOS - xNumeros + 1, ALTO_FILA - 2, colorFondo);
  int16_t yTexto = yCentro - 11;
  if (!sensorDisponible[i] && conteos[i] == 0) {
    tft.setTextColor(colorDeshabilitado, colorFondo);
    textoAlineadoDerecha("--", X_FIN_BANDEJAS, yTexto, 3);
    textoAlineadoDerecha("--", X_FIN_HUEVOS, yTexto, 3);
  } else {
    int32_t bandejas = huevos / HUEVOS_POR_BANDEJA;
    int32_t sueltos = huevos % HUEVOS_POR_BANDEJA;
    tft.setTextColor(bandejas > 0 ? colorTexto : colorDeshabilitado, colorFondo);
    textoAlineadoDerecha(formatearMiles(bandejas), X_FIN_BANDEJAS, yTexto, 3);
    tft.setTextColor(sueltos > 0 ? colorTexto : colorDeshabilitado, colorFondo);
    textoAlineadoDerecha(String(sueltos), X_FIN_HUEVOS, yTexto, 3);
  }

  if (i < NUM_SENSORES - 1) {
    tft.drawFastHLine(X_INSIGNIA, y + ALTO_FILA - 1, TFT_ANCHO - 2 * X_INSIGNIA, colorDivisor);
  }
}

// Redibuja solo lo que cambió para evitar parpadeo.
void actualizarPantalla() {
  int32_t maximo = maximoCategoria();
  bool cambioEscala = maximo != maximoDibujado;
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (cambioEscala || filaPendiente[i]) {
      dibujarFila(i, maximo);
      filaPendiente[i] = false;
    }
  }
  maximoDibujado = maximo;

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
  filaPendiente[indice] = true;
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
        filaPendiente[i] = true;
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

void iniciarSensores() {
  Wire.begin(PIN_SDA, PIN_SCL);

  for (int i = 0; i < NUM_SENSORES; i++) {
    pinMode(pinesXSHUT[i], OUTPUT);
    digitalWrite(pinesXSHUT[i], LOW);
  }
  delay(10);

  // A diferencia de main.cpp, un sensor que falla no detiene la prueba:
  // su fila muestra "--" y se puede simular por el monitor serie.
  for (int i = 0; i < NUM_SENSORES; i++) {
    digitalWrite(pinesXSHUT[i], HIGH);
    delay(10);
    if (sensores[i].begin(0x30 + i)) {
      sensores[i].startRangeContinuous();
      sensorDisponible[i] = true;
    } else {
      digitalWrite(pinesXSHUT[i], LOW);
      Serial.printf("Error sensor %d (%s)\n", i + 1, categorias[i]);
    }
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
    uint16_t lectura = sensores[i].readRange();

    if (sensores[i].timeoutOccurred()) {
      sensorActivo[i] = false;
      continue;
    }

    bool dentroDelRango = lectura >= DISTANCIA_MIN_MM && lectura <= DISTANCIA_MAX_MM;
    if (dentroDelRango && !sensorActivo[i]) {
      registrarConteo(i, 1);
      sensorActivo[i] = true;
    } else if (!dentroDelRango) {
      sensorActivo[i] = false;
    }
  }
}

void setup() {
  Serial.begin(115200);

  spiTft.begin(TFT_SCK, -1, TFT_MOSI, TFT_CS);
  tft.init(TFT_ALTO, TFT_ANCHO);
  tft.setSPISpeed(40000000);
  tft.setRotation(1);

  colorFondo = hexA565(0xFFFFFF);
  colorTexto = hexA565(0x3A3530);
  colorSecundario = hexA565(0x7A736E);
  colorDeshabilitado = hexA565(0xC9C3BD);
  colorPrimario = hexA565(0x5C4333);
  colorDivisor = hexA565(0xE8E2DB);
  colorFondoBarra = hexA565(0xF0ECE7);

  tft.fillScreen(colorFondo);
  tft.setTextWrap(false);
  dibujarEncabezado();
  actualizarPantalla();

  iniciarSensores();
  for (int i = 0; i < NUM_SENSORES; i++) {
    filaPendiente[i] = true;
  }
  actualizarPantalla();
  Serial.println("Prueba TFT lista");
}

void loop() {
  leerSensores();
  procesarComandoSerie();
  actualizarPantalla();
}
