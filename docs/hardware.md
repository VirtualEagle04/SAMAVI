# Hardware

## Dispositivo

El firmware usa un ESP32 DevKit V1, seis sensores VL53L0X conectados por I2C y una pantalla TFT por SPI. La dirección inicial de cada VL53L0X es `0x29`.

## Pines

Valores vigentes en `firmware/src/main.cpp`. Antes de modificar pines, direcciones o secuencias, verifica el código y el hardware real.

| Elemento | Conexión |
|---|---|
| Bus I2C de los VL53L0X | `SDA` GPIO 21, `SCL` GPIO 22 |
| XSHUT de los sensores S1 a S6 | GPIO 15, 4, 18, 13, 14 y 33 |
| Categoría por sensor (S1 a S6) | `Y`, `Ex`, `AA`, `A`, `B`, `C` |
| Dirección asignada por sensor (S1 a S6) | `0x30` a `0x35` |

### Pantalla TFT

Panel ST7789 de 240x320 en horizontal, conectado por SPI. Se compró como pantalla de 1.9" de 170x320, pero el panel tiene 240 filas: inicializarlo a 170 deja franjas con ruido arriba y abajo.

| Pin TFT | ESP32 |
|---|---|
| GND | GND |
| VCC | 3V3 |
| SCL (SCK) | GPIO 32 |
| SDA (MOSI) | GPIO 23 |
| RES | GPIO 17 |
| DC | GPIO 16 |
| CS | GPIO 5 |
| BLK | 3V3 (luz de fondo fija) |

## Inicialización

Los sensores deben inicializarse secuencialmente mediante XSHUT cuando se requieran direcciones únicas.

El cambio de dirección no es permanente. En cada arranque se deben poner los sensores en shutdown, activar e inicializar uno, asignarle su dirección y continuar con el siguiente.

El firmware verifica cada paso y lo muestra en la pantalla de setup de la TFT:

1. El bus I2C está en reposo (SDA y SCL en alto).
2. Con todos los XSHUT en bajo, nadie responde en `0x29`.
3. Cada sensor aparece en `0x29` al subir su XSHUT, queda en su dirección y empieza a medir. Se hacen hasta 3 intentos por sensor; un sensor que falla queda como "sin sensor" y no detiene el arranque.
4. Wi-Fi (muestra la IP asignada) y conexión a Mosquitto.

El breakout del VL53L0X puede incluir regulación y adaptación de nivel. Sus señales relevantes son `SCL`, `SDA` y `SHDN` o `XSHUT`. El GPIO de interrupción no forma parte de la implementación básica documentada. Verifica siempre el modelo exacto antes de asumir voltajes o características del módulo.

## Detección

La detección de un huevo debe evitar múltiples incrementos para el mismo evento. La lógica debe considerar estados, umbrales y recuperación del sensor, no solo incrementar en cada lectura.

Lógica vigente:

- Los sensores miden en modo continuo y se leen con `readRangeResult()`. No uses `readRange()` en modo continuo: lanza una medición única encima de la continua y puede dejar sensores sin datos de forma intermitente.
- Cada lectura trae un estado de rango: 0 es una medición válida, 4 es "nada al frente" y 1 a 3 son mediciones poco fiables (por ejemplo, señal débil). Las lecturas de estado 1 a 3 se ignoran: producían conteos falsos por reflejos.
- Un huevo cuenta con una lectura de estado 0 dentro del rango `DISTANCIA_MIN_MM`–`DISTANCIA_MAX_MM`.
- Tras contar, el mismo sensor no vuelve a contar durante `DEBOUNCE_MS` y solo queda libre tras 3 lecturas seguidas (unos 150 ms) sin huevo: estado 4 o lectura válida fuera del rango.

El rango y el debounce viven en `firmware/include/config.h` (plantilla en `config.h.example`). Valores actuales: 60 a 170 mm, medidos en el montaje, y 300 ms de debounce, aún por validar con producción real.

## Programas de prueba

Cada programa de `firmware/src/main_test_*.cpp` tiene su entorno en `platformio.ini` (`pio run -e <entorno> -t upload`):

| Entorno | Programa | Uso |
|---|---|---|
| `esp32dev` | `main.cpp` | Firmware completo: conteo, TFT, Wi-Fi y MQTT |
| `tft_test` | `main_test_tft.cpp` | Pantalla de setup y conteo en la TFT, sin Wi-Fi ni MQTT; permite simular conteos por el monitor serie |
| `sensores_test` | `main_test_sensores.cpp` | Diagnóstico por monitor serie: direcciones, lecturas por segundo, errores, estados de rango y detecciones |

## Entorno

El dispositivo opera en una bodega con polvo, humedad, posibles fluctuaciones eléctricas e interrupciones de Wi-Fi. El conteo local no debe depender de una conexión permanente.

Los pines, displays, expansores y componentes marcados como pendientes deben confirmarse antes de documentarlos como definitivos.

La implementación contempla alimentación mediante adaptador DC de 12 V / 2 A y un board de expansión. Las pantallas OLED por categoría, el multiplexor I2C (se probó un PCA9548A que no respondió en el bus), el expansor MCP23017 y los botones físicos continúan pendientes hasta que el firmware y el hardware confirmen su uso.
