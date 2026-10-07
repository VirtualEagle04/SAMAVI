# Hardware

## Dispositivo

El firmware usa un ESP32 DevKit V1 y seis sensores VL53L0X conectados por I2C. La dirección inicial de cada VL53L0X es `0x29`.

## Inicialización

Los sensores deben inicializarse secuencialmente mediante XSHUT cuando se requieran direcciones únicas. Antes de modificar pines, direcciones o secuencias, verifica `firmware/src/` y el hardware real. Las direcciones de ejemplo no son requisitos si el firmware actual usa otra asignación.

El cambio de dirección no es permanente. En cada arranque se deben poner los sensores en shutdown, activar e inicializar uno, asignarle su dirección y continuar con el siguiente.

El breakout del VL53L0X puede incluir regulación y adaptación de nivel. Sus señales relevantes son `SCL`, `SDA` y `SHDN` o `XSHUT`. El GPIO de interrupción no forma parte de la implementación básica documentada. Verifica siempre el modelo exacto antes de asumir voltajes o características del módulo.

## Detección

La detección de un huevo debe evitar múltiples incrementos para el mismo evento. La lógica debe considerar estados, umbrales y recuperación del sensor, no solo incrementar en cada lectura.

## Entorno

El dispositivo opera en una bodega con polvo, humedad, posibles fluctuaciones eléctricas e interrupciones de Wi-Fi. El conteo local no debe depender de una conexión permanente.

Los pines, displays, expansores y componentes marcados como pendientes deben confirmarse antes de documentarlos como definitivos.

La implementación contempla alimentación mediante adaptador DC de 12 V / 2 A y un board de expansión. Las pantallas OLED, el expansor MCP23017 y los botones físicos continúan pendientes hasta que el firmware y el hardware confirmen su uso.
