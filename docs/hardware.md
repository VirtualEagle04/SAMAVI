# Hardware

## Dispositivo

El firmware usa un ESP32 DevKit V1, seis sensores VL53L0X conectados por I2C, una pantalla TFT por SPI y seis OLED (una por categoría) detrás de un multiplexor I2C PCA9548A. La dirección inicial de cada VL53L0X es `0x29`.

## Pines

Valores vigentes en `firmware/src/main.cpp`. Antes de modificar pines, direcciones o secuencias, verifica el código y el hardware real.

| Elemento | Conexión |
|---|---|
| Bus I2C de los VL53L0X | `SDA` GPIO 21, `SCL` GPIO 22 |
| XSHUT de los sensores S1 a S6 | GPIO 15, 4, 18, 13, 14 y 33 |
| Categoría por sensor (S1 a S6) | `Y`, `Ex`, `AA`, `A`, `B`, `C` |
| Dirección asignada por sensor (S1 a S6) | `0x30` a `0x35` |

### Multiplexor I2C y OLED

Módulo HW-617 con un PCA9548A, en el mismo bus que los VL53L0X. Cada OLED SSD1306 de 0.96" (128x64, dirección `0x3C`) va en un canal del multiplexor porque todas comparten dirección.

| Elemento | Conexión |
|---|---|
| VIN / GND del multiplexor | 3V3 / GND (alimentarlo al revés lo calienta y retiene SDA en bajo) |
| SDA / SCL del multiplexor | GPIO 21 / GPIO 22 |
| RST del multiplexor | GPIO 27 (activo en bajo; el firmware le da un pulso al arrancar) |
| A0, A1, A2 | GND: dirección `0x70` |
| OLED de S1 a S6 (`Y` a `C`) | Canales 0 a 5 (`SDn` / `SCn`); VCC a 3V3 |

El SDA y el SCL de cada OLED van solo a su canal, nunca directo al ESP32.

### Pantalla TFT

Panel ST7789 de 240x320 en horizontal (rotación 3, girada 180° por cómo va montada), conectado por SPI. Se compró como pantalla de 1.9" de 170x320, pero el panel tiene 240 filas: inicializarlo a 170 deja franjas con ruido arriba y abajo.

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

Al encender, la TFT muestra 2,5 s el logo de El Samán sobre fondo blanco. El logo está en `firmware/include/logo.h` (RGB565, unos 92 KB de flash), generado desde `frontend/src/assets/saman_logo.png` con `python firmware/tools/generar_logo.py` (necesita Pillow); si cambia el logo, se vuelve a generar.

Después, el firmware verifica cada paso y lo muestra en la pantalla de setup de la TFT:

1. El bus I2C está en reposo (SDA y SCL en alto).
2. Con todos los XSHUT en bajo, nadie responde en `0x29`.
3. Cada sensor aparece en `0x29` al subir su XSHUT, queda en su dirección y empieza a medir. Se hacen hasta 3 intentos por sensor; un sensor que falla queda como "sin sensor" y no detiene el arranque.
4. El multiplexor responde en `0x70` y guarda el canal elegido, y cada OLED responde en su canal. Una OLED que falla queda apagada y no detiene el arranque.
5. Wi-Fi (muestra la IP asignada) y conexión a Mosquitto. Con TLS, antes espera hasta 10 s a la hora NTP; si no llega, el paso muestra "sin hora NTP para TLS" y la tarea de red sigue reintentando.

La conexión al broker se configura en `firmware/include/config.h`:

| Campo | Producción | Desarrollo (Mosquitto local) |
|---|---|---|
| `MQTT_SERVER` | Dominio del servidor (`DOMAIN`), no la IP | IP del equipo con el broker |
| `MQTT_PORT` | `8883` | `1883` |
| `MQTT_USAR_TLS` | `true` | `false` |
| `MQTT_PASSWORD` | La creada con `mqtt-usuario.sh <MAC>` | `""` (anónimo) |

El usuario MQTT es la MAC del ESP32 sin `:`. Detalles en `docs/protocols/mqtt.md` y `docs/deployment.md`.

El breakout del VL53L0X puede incluir regulación y adaptación de nivel. Sus señales relevantes son `SCL`, `SDA` y `SHDN` o `XSHUT`. El GPIO de interrupción no forma parte de la implementación básica documentada. Verifica siempre el modelo exacto antes de asumir voltajes o características del módulo.

## Detección

La detección de un huevo debe evitar múltiples incrementos para el mismo evento. La lógica debe considerar estados, umbrales y recuperación del sensor, no solo incrementar en cada lectura.

Lógica vigente:

- Los sensores miden en modo continuo y se leen con `readRangeResult()`. No uses `readRange()` en modo continuo: lanza una medición única encima de la continua y puede dejar sensores sin datos de forma intermitente.
- La lógica está en `firmware/include/deteccion.h` y la comparten `main.cpp`, `sensores_test`, `tft_test` e `integracion_test`, así que todos cuentan igual.
- Cada sensor mide cada 40 ms (`PERIODO_MEDICION_MS`), unas 25 lecturas por segundo; el bus I2C va a 400 kHz. Con 33 ms el sensor se salta ciclos y baja a unas 16 lecturas por segundo.
- Cada lectura trae un estado de rango: 0 es una medición válida, 4 es "nada al frente" y 1 a 3 son mediciones poco fiables (por ejemplo, señal débil). Las lecturas de estado 1 a 3 no confirman ni liberan: producían conteos falsos por reflejos.
- Una lectura está "dentro" si es válida y está entre `DISTANCIA_MIN_MM` y `DISTANCIA_MAX_MM`, y "fuera" si es estado 4 o una lectura válida a más de `HISTERESIS_MM` (10 mm) de esa zona. Entre la zona y la histéresis no cambia nada: así una superficie cerca del borde no hace contar una y otra vez.
- Un huevo cuenta con 2 lecturas "dentro" (`LECTURAS_PARA_ENTRAR`) y el sensor queda libre tras 3 lecturas "fuera" seguidas (`LECTURAS_PARA_SALIR`, unos 120 ms). No hay tiempo de debounce: la confirmación de salida evita contar dos veces el mismo huevo.
- Un sensor sin lecturas nuevas durante 1 s se reinicia solo; si no vuelve, queda como "sin sensor".
- Al arrancar, con el canal vacío, cada sensor se observa 0,5 s: si ve algo dentro de la zona o de la histéresis, la pantalla de arranque lo marca en rojo ("ve algo a N mm en reposo"). Ese sensor contaría una vez y quedaría con "huevo al frente". Es un problema del montaje (guía, pared o cono del sensor), no del firmware.

El rango vive en `firmware/include/config.h` (plantilla en `config.h.example`, con 60 a 170 mm). El montaje actual usa 110 a 140 mm; está por validar con producción real. La histéresis, las lecturas de confirmación y el periodo están en `deteccion.h`.

`sensores_test` imprime cada detección (`>>`) y cada liberación (`<<`) con la distancia, y por segundo las lecturas, errores, estados y distancias de cada sensor: sirve para ajustar el rango y la confirmación con huevos reales.

## Programas de prueba

Cada programa de `firmware/src/main_test_*.cpp` tiene su entorno en `platformio.ini` (`pio run -e <entorno> -t upload`):

| Entorno | Programa | Uso |
|---|---|---|
| `esp32dev` | `main.cpp` | Firmware completo: conteo, TFT, OLED por categoría, Wi-Fi y MQTT |
| `tft_test` | `main_test_tft.cpp` | Pantalla de setup y conteo en la TFT, sin Wi-Fi ni MQTT; permite simular conteos por el monitor serie |
| `sensores_test` | `main_test_sensores.cpp` | Diagnóstico por monitor serie: direcciones, lecturas por segundo, errores, estados de rango y detecciones |
| `oled_test` | `main_test_oled.cpp` | Dos OLED SSD1306 sin multiplexor: OLED 1 en SDA 21 / SCL 22 y OLED 2 en un segundo bus (SDA 25 / SCL 26) |
| `mux_test` | `main_test_mux.cpp` | Multiplexor PCA9548A (RST en GPIO 27, dirección 0x70) con OLED en los canales 0 y 1: dirección, registro de control y escaneo por canal |
| `integracion_test` | `main_test_integracion.cpp` | Seis VL53L0X y TFT más el multiplexor con dos OLED (conteo de Y y Ex), sin Wi-Fi ni MQTT |

## Entorno

El dispositivo opera en una bodega con polvo, humedad, posibles fluctuaciones eléctricas e interrupciones de Wi-Fi. El conteo local no debe depender de una conexión permanente.

Los pines, displays, expansores y componentes marcados como pendientes deben confirmarse antes de documentarlos como definitivos.

La implementación contempla alimentación mediante adaptador DC de 12 V / 2 A y un board de expansión. El expansor MCP23017 y los botones físicos continúan pendientes hasta que el firmware y el hardware confirmen su uso.
