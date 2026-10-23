// Diagnóstico de los seis VL53L0X: inicialización, direcciones I2C y lecturas.
// Sin Wi-Fi ni MQTT. Usa los mismos pines, direcciones y umbrales que main.cpp.
//
// Compilar y subir: pio run -e sensores_test -t upload
// Monitor serie (115200): pio device monitor -e sensores_test
// Comandos por el monitor serie:
//   r  repite toda la inicialización (como un arranque nuevo)
//   e  escanea el bus I2C
//
// Qué revisa:
// - Con todos los XSHUT en LOW nadie debe responder: si responde 0x29, el XSHUT
//   de algún sensor no lo está apagando (cable suelto o pin equivocado).
// - Al subir cada XSHUT debe aparecer 0x29 y, tras el cambio, solo 0x30 + i.
// - En marcha imprime por segundo y por sensor: lecturas, errores I2C, estados
//   de rango, distancias y detecciones. Un sensor sin datos por más de
//   1 s se reinicia solo y se cuenta en "reinicios".

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include "config.h"
#include <esp_system.h>

#define PIN_SCL 22
#define PIN_SDA 21
#define NUM_SENSORES 6

const uint8_t pinesXSHUT[NUM_SENSORES] = {15, 4, 18, 13, 14, 33};
const char* categorias[NUM_SENSORES] = {"Y", "Ex", "AA", "A", "B", "C"};
const uint8_t DIRECCION_DEFECTO = 0x29;
const uint8_t DIRECCION_BASE = 0x30;
// Rango de detección en config.h. Histéresis: para soltar un huevo hace falta ver
// el canal libre varias lecturas seguidas (a 50 ms por lectura).
const uint8_t LECTURAS_PARA_LIBERAR = 3;
const uint8_t INTENTOS_INICIO = 3;
const unsigned long SIN_DATOS_MAX_MS = 1000;
const unsigned long INTERVALO_REPORTE_MS = 1000;

struct EstadisticaSensor {
  uint16_t lecturas;
  uint16_t errores;
  uint16_t estados[5];
  uint16_t minimo;
  uint16_t maximo;
  uint16_t ultima;
};

Adafruit_VL53L0X sensores[NUM_SENSORES];
bool sensorListo[NUM_SENSORES] = {false};
bool sensorActivo[NUM_SENSORES] = {false};
uint8_t lecturasLibres[NUM_SENSORES] = {0};
unsigned long ultimoConteo[NUM_SENSORES] = {0};
uint32_t detecciones[NUM_SENSORES] = {0};
uint32_t reinicios[NUM_SENSORES] = {0};
unsigned long ultimoDato[NUM_SENSORES] = {0};
EstadisticaSensor estadisticas[NUM_SENSORES];
unsigned long ultimoReporte = 0;

const char* motivoReinicio() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON: return "encendido";
    case ESP_RST_SW: return "software";
    case ESP_RST_PANIC: return "excepcion";
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT: return "watchdog";
    case ESP_RST_BROWNOUT: return "BROWNOUT (caida de voltaje)";
    case ESP_RST_EXT: return "boton EN / pin externo";
    default: return "otro";
  }
}

bool responde(uint8_t direccion) {
  Wire.beginTransmission(direccion);
  return Wire.endTransmission() == 0;
}

void escanearBus() {
  Serial.print("Escaneo I2C:");
  uint8_t encontrados = 0;
  for (uint8_t direccion = 0x08; direccion < 0x78; direccion++) {
    if (responde(direccion)) {
      Serial.printf(" 0x%02X", direccion);
      encontrados++;
    }
  }
  Serial.printf(encontrados == 0 ? " (nadie)\n" : " (%u)\n", encontrados);
}

void reiniciarEstadisticas(uint8_t i) {
  estadisticas[i] = {};
  estadisticas[i].minimo = UINT16_MAX;
}

// Inicializar un sensor bloquea cientos de ms; el plazo "sin datos" de todos
// se cuenta desde ese momento para no reiniciar sensores que no se han leído.
void reiniciarPlazos() {
  for (int i = 0; i < NUM_SENSORES; i++) {
    ultimoDato[i] = millis();
  }
}

bool iniciarSensor(uint8_t i) {
  uint8_t direccion = DIRECCION_BASE + i;
  sensorListo[i] = false;
  sensorActivo[i] = false;

  for (uint8_t intento = 1; intento <= INTENTOS_INICIO; intento++) {
    digitalWrite(pinesXSHUT[i], LOW);
    delay(10);
    digitalWrite(pinesXSHUT[i], HIGH);
    delay(10);

    if (!responde(DIRECCION_DEFECTO)) {
      Serial.printf("  S%d (%s) intento %u: no aparece en 0x29 al subir XSHUT (GPIO %u)\n",
                    i + 1, categorias[i], intento, pinesXSHUT[i]);
      continue;
    }
    if (!sensores[i].begin(direccion)) {
      Serial.printf("  S%d (%s) intento %u: begin() fallo, Status=%d\n",
                    i + 1, categorias[i], intento, sensores[i].Status);
      continue;
    }
    if (responde(DIRECCION_DEFECTO)) {
      Serial.printf("  S%d (%s) intento %u: 0x29 sigue respondiendo tras el cambio "
                    "(otro sensor con XSHUT en alto)\n", i + 1, categorias[i], intento);
    }
    if (!responde(direccion)) {
      Serial.printf("  S%d (%s) intento %u: no responde en 0x%02X\n",
                    i + 1, categorias[i], intento, direccion);
      continue;
    }
    if (!sensores[i].startRangeContinuous()) {
      Serial.printf("  S%d (%s) intento %u: startRangeContinuous() fallo, Status=%d\n",
                    i + 1, categorias[i], intento, sensores[i].Status);
      continue;
    }

    sensorListo[i] = true;
    Serial.printf("  S%d (%s) OK en 0x%02X (intento %u)\n", i + 1, categorias[i], direccion, intento);
    return true;
  }

  // Se deja en reset para que no ocupe 0x29 durante el resto de la secuencia.
  digitalWrite(pinesXSHUT[i], LOW);
  Serial.printf("  S%d (%s) FALLO tras %u intentos\n", i + 1, categorias[i], INTENTOS_INICIO);
  return false;
}

void iniciarTodos() {
  Serial.println("\n== Inicializacion ==");
  for (int i = 0; i < NUM_SENSORES; i++) {
    pinMode(pinesXSHUT[i], OUTPUT);
    digitalWrite(pinesXSHUT[i], LOW);
    reiniciarEstadisticas(i);
    detecciones[i] = 0;
    reinicios[i] = 0;
  }
  delay(10);

  Serial.print("Todos los XSHUT en LOW. ");
  escanearBus();
  if (responde(DIRECCION_DEFECTO)) {
    Serial.println("  AVISO: 0x29 responde con todos los sensores apagados; "
                   "algun XSHUT no esta conectado o no apaga su sensor");
  }

  uint8_t listos = 0;
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (iniciarSensor(i)) {
      listos++;
    }
  }

  Serial.printf("Sensores listos: %u/%u. ", listos, NUM_SENSORES);
  escanearBus();
  Serial.println("Esperado: 0x30 a 0x35 y nada en 0x29\n");
  reiniciarPlazos();
  ultimoReporte = millis();
}

void leerSensores() {
  for (int i = 0; i < NUM_SENSORES; i++) {
    if (!sensorListo[i]) {
      continue;
    }

    if (millis() - ultimoDato[i] > SIN_DATOS_MAX_MS) {
      Serial.printf("S%d (%s) sin datos por %lu ms, reiniciando\n",
                    i + 1, categorias[i], SIN_DATOS_MAX_MS);
      reinicios[i]++;
      iniciarSensor(i);
      reiniciarPlazos();
      continue;
    }

    if (!sensores[i].isRangeComplete()) {
      continue;
    }
    uint16_t lectura = sensores[i].readRangeResult();
    uint8_t estado = sensores[i].readRangeStatus();
    EstadisticaSensor& e = estadisticas[i];

    if (sensores[i].Status != VL53L0X_ERROR_NONE) {
      e.errores++;
      continue;
    }

    ultimoDato[i] = millis();
    e.lecturas++;
    e.ultima = lectura;
    if (estado < 5) {
      e.estados[estado]++;
    }
    if (estado == 0) {
      e.minimo = min(e.minimo, lectura);
      e.maximo = max(e.maximo, lectura);
    }

    // Estado 0 = medición válida; 4 = nada al frente. Los estados 1-3 (p. ej. señal
    // débil) dan distancias poco fiables y no cambian el estado del sensor.
    bool enRango = lectura >= DISTANCIA_MIN_MM && lectura <= DISTANCIA_MAX_MM;
    bool huevoAlFrente = estado == 0 && enRango;
    bool canalLibre = estado == 4 || (estado == 0 && !enRango);
    bool enDebounce = millis() - ultimoConteo[i] < DEBOUNCE_MS;
    if (huevoAlFrente) {
      lecturasLibres[i] = 0;
      if (!sensorActivo[i] && !enDebounce) {
        ultimoConteo[i] = millis();
        detecciones[i]++;
        Serial.printf(">> Deteccion S%d (%s): %u mm\n", i + 1, categorias[i], lectura);
        sensorActivo[i] = true;
      }
    } else if (canalLibre && sensorActivo[i] && !enDebounce && ++lecturasLibres[i] >= LECTURAS_PARA_LIBERAR) {
      sensorActivo[i] = false;
      lecturasLibres[i] = 0;
    }
  }
}

void imprimirReporte() {
  Serial.println("Sensor | lect/s | err | ultima mm | min-max (estado 0) | estados 0/1/2/3/4 | det | reinicios");
  for (int i = 0; i < NUM_SENSORES; i++) {
    const EstadisticaSensor& e = estadisticas[i];
    if (!sensorListo[i]) {
      Serial.printf("S%d %-2s  | SIN INICIALIZAR                                                     | %3lu | %lu\n",
                    i + 1, categorias[i], (unsigned long)detecciones[i], (unsigned long)reinicios[i]);
      continue;
    }
    char rango[16] = "    -";
    if (e.minimo != UINT16_MAX) {
      snprintf(rango, sizeof(rango), "%4u-%-4u", e.minimo, e.maximo);
    }
    Serial.printf("S%d %-2s  | %6u | %3u | %9u | %18s | %3u/%u/%u/%u/%-3u | %3lu | %lu%s\n",
                  i + 1, categorias[i], e.lecturas, e.errores, e.ultima, rango,
                  e.estados[0], e.estados[1], e.estados[2], e.estados[3], e.estados[4],
                  (unsigned long)detecciones[i], (unsigned long)reinicios[i],
                  sensorActivo[i] ? "  (objeto al frente)" : "");
    reiniciarEstadisticas(i);
  }
  Serial.println();
}

void procesarComando() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 'r' || c == 'R') {
      iniciarTodos();
    } else if (c == 'e' || c == 'E') {
      escanearBus();
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.printf("\nDiagnostico VL53L0X. Motivo del reinicio: %s\n", motivoReinicio());
  pinMode(PIN_SDA, INPUT);
  pinMode(PIN_SCL, INPUT);
  Serial.printf("SDA=%d SCL=%d antes de Wire.begin (deben ser 1; 0 = bus trabado)\n",
                digitalRead(PIN_SDA), digitalRead(PIN_SCL));
  Wire.begin(PIN_SDA, PIN_SCL);
  iniciarTodos();
}

void loop() {
  procesarComando();
  leerSensores();
  if (millis() - ultimoReporte >= INTERVALO_REPORTE_MS) {
    ultimoReporte = millis();
    imprimirReporte();
  }
}
