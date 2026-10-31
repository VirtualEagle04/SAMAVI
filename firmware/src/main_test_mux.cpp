// Prueba del multiplexor I2C PCA9548A (módulo HW-617) con una o dos OLED SSD1306
// de 0.96" (128x64). Sin sensores, Wi-Fi ni MQTT.
//
// Sirve para dos pasos: primero con una OLED en el canal 0 y luego con la segunda
// en el canal 1. Una OLED que falte se reporta y la prueba sigue con las demás.
//
// Compilar y subir: pio run -e mux_test -t upload
// Monitor serie (115200): pio device monitor -e mux_test
// Comandos por el monitor serie:
//   e  escanea el bus principal y cada canal del multiplexor
//   r  repite toda la inicialización
//
// Qué revisa, en orden:
// 1. El bus principal en reposo (SDA y SCL en alto).
// 2. Un pulso en RESET del multiplexor (GPIO 27) y que responda en 0x70. Si no
//    responde ahí se busca en 0x71-0x77: otra dirección significa que A0-A2 no
//    están todos a GND.
// 3. Que el registro de control guarde cada canal que se escribe (se relee).
// 4. Escaneo de cada canal 0-7 por separado.
// 5. Una OLED por canal de canalesOled; cada una muestra su canal y un contador por
//    segundo. Tras dibujar se apagan todos los canales.

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define PIN_SCL 22
#define PIN_SDA 21
#define PIN_RESET_MUX 27
#define NUM_OLED 2
#define OLED_ANCHO 128
#define OLED_ALTO 64

// Con A0, A1 y A2 a GND (datasheet, tabla 8-1).
const uint8_t DIRECCION_MUX = 0x70;
const uint8_t CANALES_MUX = 8;
const uint8_t canalesOled[NUM_OLED] = {0, 1};
const uint8_t DIRECCIONES_OLED[] = {0x3C, 0x3D};
const unsigned long INTERVALO_REFRESCO_MS = 1000;

Adafruit_SSD1306 oled1(OLED_ANCHO, OLED_ALTO, &Wire, -1);
Adafruit_SSD1306 oled2(OLED_ANCHO, OLED_ALTO, &Wire, -1);
Adafruit_SSD1306* pantallas[NUM_OLED] = {&oled1, &oled2};

// 0 = no se encontró el multiplexor.
uint8_t direccionMux = 0;
bool pantallaLista[NUM_OLED] = {false};
uint8_t direccionOled[NUM_OLED] = {0};
uint32_t segundos = 0;
unsigned long ultimoRefresco = 0;

bool responde(uint8_t direccion) {
  Wire.beginTransmission(direccion);
  return Wire.endTransmission() == 0;
}

// Escribe el registro de control: el bit n conecta el canal n. El canal queda
// conectado con el STOP que envía endTransmission().
bool seleccionarCanales(uint8_t mascara) {
  if (direccionMux == 0) {
    return false;
  }
  Wire.beginTransmission(direccionMux);
  Wire.write(mascara);
  return Wire.endTransmission() == 0;
}

int leerCanales() {
  if (Wire.requestFrom(direccionMux, (uint8_t)1) != 1) {
    return -1;
  }
  return Wire.read();
}

void escanear(const char* titulo, uint8_t ignorar) {
  Serial.printf("%s:", titulo);
  uint8_t encontrados = 0;
  for (uint8_t direccion = 0x08; direccion < 0x78; direccion++) {
    if (direccion != ignorar && responde(direccion)) {
      Serial.printf(" 0x%02X", direccion);
      encontrados++;
    }
  }
  Serial.printf(encontrados == 0 ? " (nadie)\n" : " (%u)\n", encontrados);
}

void escanearTodo() {
  seleccionarCanales(0);
  escanear("Bus principal con los canales apagados", 0);
  if (direccionMux == 0) {
    return;
  }
  for (uint8_t canal = 0; canal < CANALES_MUX; canal++) {
    if (!seleccionarCanales(1 << canal)) {
      Serial.printf("Canal %u: el multiplexor no acepta la seleccion\n", canal);
      continue;
    }
    char titulo[48];
    snprintf(titulo, sizeof(titulo), "Canal %u (sin contar el mux 0x%02X)", canal, direccionMux);
    escanear(titulo, direccionMux);
  }
  seleccionarCanales(0);
}

bool iniciarMux() {
  // RESET es activo en bajo: un pulso deja todos los canales apagados.
  pinMode(PIN_RESET_MUX, OUTPUT);
  digitalWrite(PIN_RESET_MUX, LOW);
  delayMicroseconds(10);
  digitalWrite(PIN_RESET_MUX, HIGH);
  delay(1);

  direccionMux = 0;
  for (uint8_t direccion = 0x70; direccion <= 0x77; direccion++) {
    if (responde(direccion)) {
      direccionMux = direccion;
      break;
    }
  }
  if (direccionMux == 0) {
    Serial.println("Multiplexor: nadie responde en 0x70-0x77. Revisa VIN a 3V3, GND, SDA/SCL, "
                   "RST a GPIO 27 y las soldaduras de los pines del modulo");
    return false;
  }
  if (direccionMux != DIRECCION_MUX) {
    Serial.printf("AVISO: el multiplexor responde en 0x%02X y no en 0x70: A0, A1 y A2 deben ir a GND\n",
                  direccionMux);
  } else {
    Serial.println("Multiplexor responde en 0x70");
  }

  bool registroCorrecto = true;
  for (uint8_t canal = 0; canal < CANALES_MUX; canal++) {
    uint8_t mascara = 1 << canal;
    if (!seleccionarCanales(mascara)) {
      Serial.printf("  Canal %u: el multiplexor no confirma la escritura\n", canal);
      registroCorrecto = false;
      continue;
    }
    int leido = leerCanales();
    if (leido != mascara) {
      Serial.printf("  Canal %u: se escribio 0x%02X y se leyo %d\n", canal, mascara, leido);
      registroCorrecto = false;
    }
  }
  seleccionarCanales(0);
  Serial.printf("Registro de control: %s\n", registroCorrecto ? "OK" : "FALLO");
  return registroCorrecto;
}

void iniciarPantalla(uint8_t k) {
  uint8_t canal = canalesOled[k];
  pantallaLista[k] = false;
  direccionOled[k] = 0;
  if (!seleccionarCanales(1 << canal)) {
    Serial.printf("OLED %u: no se pudo seleccionar el canal %u\n", k + 1, canal);
    return;
  }

  for (uint8_t direccion : DIRECCIONES_OLED) {
    if (responde(direccion)) {
      direccionOled[k] = direccion;
      break;
    }
  }
  if (direccionOled[k] == 0) {
    Serial.printf("OLED %u (canal %u): nadie responde en 0x3C ni 0x3D. Revisa SD%u, SC%u, VCC y GND\n",
                  k + 1, canal, canal, canal);
  } else if (!pantallas[k]->begin(SSD1306_SWITCHCAPVCC, direccionOled[k], true, false)) {
    // periphBegin = false: el bus ya está iniciado en SDA 21 / SCL 22.
    Serial.printf("OLED %u: sin memoria para el buffer de la pantalla\n", k + 1);
  } else {
    pantallaLista[k] = true;
    Serial.printf("OLED %u OK en el canal %u, direccion 0x%02X\n", k + 1, canal, direccionOled[k]);
  }
  seleccionarCanales(0);
}

void dibujarPantalla(uint8_t k) {
  Adafruit_SSD1306& p = *pantallas[k];
  p.clearDisplay();
  p.drawRect(0, 0, OLED_ANCHO, OLED_ALTO, SSD1306_WHITE);
  p.setTextColor(SSD1306_WHITE);

  p.setTextSize(2);
  p.setCursor(6, 4);
  p.printf("OLED %u", k + 1);

  p.setTextSize(1);
  p.setCursor(6, 24);
  p.printf("Mux 0x%02X canal %u", direccionMux, canalesOled[k]);
  p.setCursor(6, 34);
  p.printf("Direccion 0x%02X", direccionOled[k]);

  p.setTextSize(2);
  p.setCursor(6, 46);
  p.printf("%lu s", (unsigned long)segundos);

  if (seleccionarCanales(1 << canalesOled[k])) {
    p.display();
  } else {
    Serial.printf("OLED %u: no se pudo seleccionar el canal %u para dibujar\n", k + 1, canalesOled[k]);
  }
  seleccionarCanales(0);
}

void iniciarTodo() {
  Serial.println("\n== Inicializacion ==");
  for (int k = 0; k < NUM_OLED; k++) {
    pantallaLista[k] = false;
  }
  if (!iniciarMux() && direccionMux == 0) {
    escanearTodo();
    Serial.println("Sin multiplexor no se pueden probar las OLED\n");
    return;
  }
  escanearTodo();

  uint8_t listas = 0;
  for (int k = 0; k < NUM_OLED; k++) {
    iniciarPantalla(k);
    if (pantallaLista[k]) {
      dibujarPantalla(k);
      listas++;
    }
  }
  Serial.printf("OLED listas: %u/%u\n\n", listas, NUM_OLED);
}

void procesarComando() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 'r' || c == 'R') {
      iniciarTodo();
    } else if (c == 'e' || c == 'E') {
      escanearTodo();
    }
  }
}

// Con SDA en bajo antes de iniciar el bus, busca quién la retiene: primero con el
// multiplexor en reset (canales desconectados) y luego con 9 pulsos en SCL, que
// liberan a un dispositivo que quedó a mitad de un byte.
void diagnosticarSdaEnBajo() {
  Serial.println("Diagnostico: SDA en bajo");

  pinMode(PIN_RESET_MUX, OUTPUT);
  digitalWrite(PIN_RESET_MUX, LOW);
  delay(1);
  bool liberadaConReset = digitalRead(PIN_SDA) == HIGH;
  digitalWrite(PIN_RESET_MUX, HIGH);
  delay(1);
  if (liberadaConReset) {
    Serial.println("  Con RST del mux en bajo SDA sube: la retenia el mux o una OLED de un canal abierto");
    return;
  }
  Serial.println("  Con RST del mux en bajo SDA sigue en bajo");

  for (uint8_t pulso = 0; pulso < 9 && digitalRead(PIN_SDA) == LOW; pulso++) {
    pinMode(PIN_SCL, OUTPUT);
    digitalWrite(PIN_SCL, LOW);
    delayMicroseconds(5);
    pinMode(PIN_SCL, INPUT);
    delayMicroseconds(5);
  }
  if (digitalRead(PIN_SDA) == HIGH) {
    Serial.println("  Con 9 pulsos en SCL SDA sube: un dispositivo habia quedado a mitad de un byte");
    return;
  }
  Serial.println("  Con 9 pulsos en SCL SDA sigue en bajo: SDA en corto con GND, un modulo con pull-up "
                 "sin alimentacion o el mux danado. Desconecta uno a uno los cables de SDA y repite");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nPrueba del multiplexor PCA9548A con OLED");
  pinMode(PIN_SDA, INPUT);
  pinMode(PIN_SCL, INPUT);
  Serial.printf("SDA=%d SCL=%d antes de Wire.begin (deben ser 1; 0 = sin pull-up o bus trabado)\n",
                digitalRead(PIN_SDA), digitalRead(PIN_SCL));
  if (digitalRead(PIN_SDA) == LOW) {
    diagnosticarSdaEnBajo();
    Serial.printf("SDA=%d SCL=%d tras el diagnostico\n", digitalRead(PIN_SDA), digitalRead(PIN_SCL));
  }
  Wire.begin(PIN_SDA, PIN_SCL);
  iniciarTodo();
}

void loop() {
  procesarComando();
  if (millis() - ultimoRefresco >= INTERVALO_REFRESCO_MS) {
    ultimoRefresco = millis();
    segundos++;
    for (int k = 0; k < NUM_OLED; k++) {
      if (pantallaLista[k]) {
        dibujarPantalla(k);
      }
    }
  }
}
