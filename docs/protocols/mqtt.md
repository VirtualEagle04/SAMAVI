# Protocolo MQTT

## Flujo

`VL53L0X -> ESP32 -> conteo local -> MQTT -> Mosquitto -> backend -> PostgreSQL`

El transporte productivo debe usar TLS.

## Tópicos

| Tópico | Publica | Retenido | Payload |
|---|---|---|---|
| `samavi/conteo` (`MQTT_TOPIC`) | ESP32 | No | `{"galponId":1,"categoriaPeso":"A","cantidad":1,"timestamp":"..."}` |
| `samavi/dispositivos/<id>/estado` | ESP32 (`online`) y broker (LWT `offline`) | Sí, QoS 1 | `{"estado":"online","galponId":1,"ip":"192.168.1.50"}` |

## Estado de los dispositivos

- `<id>` es la MAC del ESP32 sin `:` (p. ej. `8C94DF6BEA44`); su `clientId` en el broker es `samavi-esp32-<id>`, así que aparece igual en los logs de Mosquitto.
- Al conectar, el ESP32 declara como LWT su estado `offline` y publica `online`, ambos retenidos. Si deja de enviar paquetes, el broker cierra la sesión tras 1,5 × keep-alive (7,5 s) y publica el `offline`.
- El backend se suscribe a `samavi/dispositivos/+/estado`. Al suscribirse recibe el último estado retenido de cada dispositivo conocido, sin importar quién arrancó primero, y lo expone en `GET /api/v1/produccion/dispositivo-estado` como `{ brokerConnected, connected, dispositivos: [{ id, galponId, ip, conectado, desde }] }`. `desde` es cuándo el backend vio el cambio; vale `null` si solo lo conoce por el mensaje retenido.
- Cada cambio de estado se reenvía al instante al frontend por el stream SSE `GET /api/v1/produccion/eventos` como evento `dispositivo`, con el mismo cuerpo que el endpoint. El stream también lo envía al conectarse; la consulta del frontend cada 10 s queda solo como respaldo.
- Para olvidar un dispositivo retirado, publica un mensaje vacío retenido en su tópico: `mosquitto_pub -t samavi/dispositivos/<id>/estado -r -n`.

## Reglas de implementación

- El backend debe validar el tópico y la forma del payload antes de persistir.
- Todo `JSON.parse` debe estar dentro de `try/catch`.
- Los payloads deben tener tipos explícitos y validación de esquema.
- Un mensaje inválido no debe derribar el proceso MQTT.
- Las desconexiones deben manejarse sin perder el conteo local del ESP32.
- Los cambios del contrato MQTT deben actualizar firmware, backend, pruebas y esta documentación.

## Estado actual del firmware

- Publica cada huevo en `samavi/conteo` con `galponId` (constante `GALPON_ID`, hoy 1), `categoriaPeso`, `cantidad` 1 y `timestamp` en hora de Bogotá (`-05:00`) obtenida por NTP. Si se cuenta antes de sincronizar la hora, el `timestamp` sale con fecha de 1970.
- Usa keep-alive de 5 s, así que una caída del broker se detecta en 10 s como máximo. Reintenta Wi-Fi cada 10 s y MQTT cada 5 s en una tarea propia (núcleo 0): un intento fallido tarda unos 3 s, pero no frena la lectura de los sensores.
- Publica su estado en `samavi/dispositivos/<MAC>/estado` como se describe arriba, con su `GALPON_ID` y su IP.
- Los huevos contados sin conexión esperan en una cola en memoria (hasta 200) y se publican en orden al reconectar, con el `timestamp` de cuando se contaron. Pendiente: la cola se pierde si el ESP32 se reinicia o se apaga, y si se llena los conteos nuevos se descartan (se avisa por el monitor serie).

El formato exacto del payload debe tomarse del código vigente y de las pruebas. No inventar campos ni asumir que una fotografía, un conteo o una bandeja representan la misma unidad de negocio.
