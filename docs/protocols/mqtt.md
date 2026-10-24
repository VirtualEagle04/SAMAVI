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

## Estado actual del firmware

- Publica cada huevo en `samavi/conteo` con `galponId` (constante `GALPON_ID`, hoy 1), `categoriaPeso`, `cantidad` 1 y `timestamp` en hora de Bogotá (`-05:00`) obtenida por NTP. Si se cuenta antes de sincronizar la hora, el `timestamp` sale con fecha de 1970.
- Usa keep-alive de 5 s, así que una caída del broker se detecta en 10 s como máximo. Reintenta Wi-Fi cada 10 s y MQTT cada 5 s en segundo plano, sin dejar de contar.
- No define LWT ni publica estado ni heartbeat, aunque el backend los escucha.
- Pendiente: los huevos contados sin conexión se muestran en la pantalla del dispositivo, pero no se reenvían al broker al reconectar, así que el backend no los recibe. Esto no cumple aún la regla de no perder el conteo local.

El formato exacto del payload debe tomarse del código vigente y de las pruebas. No inventar campos ni asumir que una fotografía, un conteo o una bandeja representan la misma unidad de negocio.
