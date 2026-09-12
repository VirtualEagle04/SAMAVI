# Copilot Instructions: SAMAVI

## Contexto del proyecto
SAMAVI (Sistema de Gestión Avícola El Samán) es un proyecto de grado académico (equipo de 3 personas) que automatiza el conteo de huevos y la gestión de producción de una granja avícola, El Samán.
- Cliente: María Fernanda Durán (dueña). 
- Carlos Andrés (hijo, hace el prorrateo)
- Humberto (ventas y distribución)
- Galponero y ayudante (recolección y clasificación).

Gestión: Scrum en Trello (board `SAMAVI`, id `6a8cff9f099cc80690e0e07d`).
Repo: github.com/VirtualEagle04/SAMAVI (rama main).

## Arquitectura
- **Monolito modular**, NO microservicios. Separación por Docker Compose, no por servicios independientes.
- Arquitectura confirmada: ESP32 → MQTT:8883 → Mosquitto → Backend Node/Express (:3001) → HTTP/JSON → Frontend (Vite+React, servido con nginx en prod) → HTTPS:443 → Usuarios. Backend → Prisma → PostgreSQL (:5432). Todo en Docker Compose sobre AWS Lightsail, con volúmenes `mosquitto_data` y `postgres_data`, snapshots cada 12 horas.
- El ESP32 solo envía datos por MQTT. Toda escritura a base de datos ocurre en el backend. El ESP32 está deliberadamente excluido del modelo de datos.
- Módulos de dominio dentro de `backend/src/modules/` (ej: `eggs`, `sensors`, `farm`, `auth`). Patrón por módulo: `*.controller.js` → `*.service.js` → `*.routes.js`.
- Toda lógica MQTT vive aislada en `backend/src/mqtt/`, nunca mezclada con controllers/services de dominio.

## Stack a Usar
- **Backend:** Node.js + Express 5 + Prisma ORM + TypeScript. `backend/index.js` actualmente solo loguea mensajes MQTT entrantes en el tópico `saman/conteo`.
- **DB:** PostgreSQL vía Prisma ORM (no sugerir cambiarlo). Aún no hay servicio PostgreSQL en `infra/` (Docker Compose solo corre Mosquitto por ahora).
- **IoT:** MQTT sobre Mosquitto (Docker, puerto 1883, acceso anónimo en dev).
- **Hardware:** ESP32 DevKit + sensores VL53L0X (time-of-flight) únicamente.
- **Frontend:** React 18 + TypeScript + Vite + MUI (Material UI). Actualmente en etapa de scaffold, sin dashboard construido aún.
- **Firmware:** PlatformIO + C++. `firmware/samavi-firmware/main.cpp`.

## Modelo de datos
- 18 tablas del esquema relacional.
- Estructura en lenguaje natural del modelo de datos: `.github/modelo-datos.md`.

## Autenticación
Esquema JWT (stateless, token en header `Authorization: Bearer`). Payload: `id`, `rol`, expiración.

Flujo: 
   1. Ingresar usuario y password
   2. POST /auth/login
   3. Buscar usuario por usuario
   4. Devuelve usuario con password_hash y rol
   5. Verificación de password con bcrypt
   6. Generación de JWT
   7. Resuesta 200 con JWT
   8. Guardar JWT en memoria del cliente
   9. Usuario solicita recursos con JWT en header
   10. Middleware verifica JWT
   11. Middleware verifica rol
   12. Consultar datos solicitados
   13. Devolver datos al cliente

Casos de falla definidos:
- 401 credenciales inválidas
- 401 token inválido/expirado
- 403 rol insuficiente.

Pendiente: refresh tokens, expiración exacta, recuperación de contraseña, registro de usuarios.

## Lógica de negocio clave: Prorrateo
1. **Distribución de ventas:** por cada peso (Y, Ext, AA, A, B, C, P), la cantidad vendida a cada precio se distribuye entre el pool de galpones(1, 3, 4, etc.) proporcional a la participación de cada galpón en la producción semanal de ese peso.
   `Asig_G1 = ROUND(cantidad_vendida * participacion_G1)`, `Asig_G3 = ROUND(cantidad_vendida * participacion_G3)`, `Asig_G4 = cantidad_vendida - Asig_G1 - Asig_G3` (residual).
2. **Gastos:** fijos e iguales por galpón activo.
3. **Saldo por galpón** = ventas asignadas menos gastos.
4. **Distribución a socios** = saldo x porcentaje de inversión por socio en ese galpón específico.

## Reglas del Código
- Parseo de payloads MQTT: SIEMPRE `try/catch` alrededor de `JSON.parse`; los mensajes del ESP32 pueden llegar corruptos o incompletos.
- Nombres de tópicos MQTT en `kebab-case`, prefijados por granja/dispositivo, ej: `samavi/{deviceId}/eggs/count`.
- Toda persistencia de datos entrantes por MQTT debe pasar por Prisma, no escribir SQL crudo salvo excepción justificada en comentario.
- Migraciones de Prisma: nombrarlas descriptivamente (`add_egg_count_table`, no `update1`).
- Commits en formato Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, etc.), cortos y concretos, con summary y descripción. ej. `feat: added postgresql in docker compose` y `Added PostgreSQL service to Docker Compose for local development and testing.`. En el summary mencionar el cambio principal, nada de cambios pequeños. En la descripción sí mencionar todos los cambios, concretamente.
- No usar `any` en TypeScript. Tipar payloads MQTT y respuestas API explícitamente.

## Firmware (ESP32)
- Debounce obligatorio en lecturas del sensor VL53L0X.
- Reconexión de WiFi y del broker MQTT manejada explícitamente (reintentos con backoff), nunca asumir conexión persistente.
- No hardcodear credenciales WiFi/MQTT en `main.cpp`, usar `config.h` excluido del repo o variables de compilación.
- Resiliencia offline recomendada: LittleFS (no SPIFFS) para cola en flash durante desconexión de WiFi/broker, formato `.jsonl`, republicación con QoS 1 al reconectar, e idempotencia del lado del backend.
- Pines XSHUT asignados: D15/D4/D18/D13/D14/D33. I2C: SDA=D22/SCL=D21. Direcciones I2C: 0x30-0x35.

## Qué evitar
- No proponer arquitectura de microservicios ni separar sensores en servicios independientes.
- No sugerir MySQL, Mongo u otro motor de DB.
- No usar REST/HTTP para comunicación ESP32 <-> backend, es exclusivamente MQTT.
- No añadir dependencias pesadas sin justificar (prioridad: iteración rápida sobre escalabilidad prematura).
- No inventar componentes o flujos no definidos: marcarlos como pendientes en vez de diseñarlos especulativamente.
- No usar em-dashes.
- No usar punto y coma.
