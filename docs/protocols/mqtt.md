# Protocolo MQTT

## Flujo

`VL53L0X -> ESP32 -> conteo local -> MQTT -> Mosquitto -> backend -> PostgreSQL`

## Transporte y autenticación

| Entorno | Broker | Puerto | TLS | Autenticación |
|---|---|---|---|---|
| Desarrollo | `infra/mosquitto/mosquitto.conf` | 1883 | No | Anónima |
| Producción, ESP32 | `infra/prod/mosquitto/mosquitto.conf` | 8883 (publicado) | Sí, certificado de Let's Encrypt de `DOMAIN` | Usuario y contraseña |
| Producción, backend | El mismo broker, red interna de Docker | 1883 (no publicado) | No | Usuario y contraseña |

- En producción no hay acceso anónimo. Los usuarios se gestionan con `infra/prod/scripts/mqtt-usuario.sh` (`docs/deployment.md`).
- El backend usa el usuario `samavi-backend`. Lo recibe en `MQTT_USERNAME` y `MQTT_PASSWORD`; si ambas están vacías, se conecta anónimo.
- Cada ESP32 usa como usuario su MAC sin `:`, la misma que va en su tópico de estado.
- Permisos (`infra/prod/mosquitto/acl`):

| Usuario | Puede |
|---|---|
| `samavi-backend` | Leer `samavi/conteo` y `samavi/dispositivos/+/estado` |
| ESP32 (`<MAC>`) | Publicar en `samavi/conteo` y en `samavi/dispositivos/<su MAC>/estado` (incluido su LWT). No puede leer nada |

- Si un ESP32 publica en un tópico no permitido, el broker descarta el mensaje en silencio.
- El ESP32 valida el certificado del broker con las raíces de Let's Encrypt de `firmware/include/ca_mqtt.h` y con el nombre de `MQTT_SERVER`. Por eso necesita la hora real (NTP) antes de conectar.

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
  - En producción, el único usuario que puede escribir en ese tópico es el del propio dispositivo: añade `-u <id> -P <su contraseña>` y bórralo después con `mqtt-usuario.sh --borrar <id>`.

## Reglas de implementación

- El backend debe validar el tópico y la forma del payload antes de persistir.
- Todo `JSON.parse` debe estar dentro de `try/catch`.
- Los payloads deben tener tipos explícitos y validación de esquema.
- Un mensaje inválido no debe derribar el proceso MQTT.
- Las desconexiones deben manejarse sin perder el conteo local del ESP32.
- Los cambios del contrato MQTT deben actualizar firmware, backend, pruebas y esta documentación.

## Estado actual del firmware

- Publica cada huevo en `samavi/conteo` con `galponId` (constante `GALPON_ID`, hoy 1), `categoriaPeso`, `cantidad` 1 y `timestamp` en hora de Bogotá (`-05:00`) obtenida por NTP. Si se cuenta antes de sincronizar la hora, el `timestamp` sale con fecha de 1970.
- Usa keep-alive de 5 s, así que una caída del broker se detecta en 10 s como máximo. Reintenta Wi-Fi cada 10 s y MQTT cada 5 s en una tarea propia (núcleo 0): un intento fallido tarda unos 3 s (con TLS, el handshake puede llegar a 10 s), pero no frena la lectura de los sensores.
- Con `MQTT_USAR_TLS` (`config.h`) usa `WiFiClientSecure` y no intenta conectar hasta tener la hora NTP. Al arrancar la espera hasta 10 s. Se autentica con su MAC y `MQTT_PASSWORD`; con `MQTT_PASSWORD` vacía se conecta anónimo, contra el Mosquitto local. Si falla, el monitor serie muestra el `rc` de PubSubClient (5 = credenciales rechazadas) y, si no se abrió la conexión (`rc=-2`), el error TLS.
- Publica su estado en `samavi/dispositivos/<MAC>/estado` como se describe arriba, con su `GALPON_ID` y su IP.
- Los huevos contados sin conexión esperan en una cola en memoria (hasta 200) y se publican en orden al reconectar, con el `timestamp` de cuando se contaron. Pendiente: la cola se pierde si el ESP32 se reinicia o se apaga, y si se llena los conteos nuevos se descartan (se avisa por el monitor serie).

El formato exacto del payload debe tomarse del código vigente y de las pruebas. No inventar campos ni asumir que una fotografía, un conteo o una bandeja representan la misma unidad de negocio.
