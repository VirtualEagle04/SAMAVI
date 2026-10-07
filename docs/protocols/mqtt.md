# Protocolo MQTT

## Flujo

`VL53L0X -> ESP32 -> conteo local -> MQTT -> Mosquitto -> backend -> PostgreSQL`

El tópico documentado para conteos es `samavi/conteo`. El transporte productivo debe usar TLS.

## Reglas de implementación

- El backend debe validar el tópico y la forma del payload antes de persistir.
- Todo `JSON.parse` debe estar dentro de `try/catch`.
- Los payloads deben tener tipos explícitos y validación de esquema.
- Un mensaje inválido no debe derribar el proceso MQTT.
- Las desconexiones deben manejarse sin perder el conteo local del ESP32.
- Los cambios del contrato MQTT deben actualizar firmware, backend, pruebas y esta documentación.

El formato exacto del payload debe tomarse del código vigente y de las pruebas. No inventar campos ni asumir que una fotografía, un conteo o una bandeja representan la misma unidad de negocio.
