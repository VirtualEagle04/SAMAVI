# Arquitectura

SAMAVI es un monolito modular con una aplicación web, una API y un dispositivo de captura.

La infraestructura local (`infra/docker-compose.yml`) incluye PostgreSQL y Mosquitto, que es anónimo y sin TLS.

Producción usa Docker Compose sobre AWS Lightsail (`infra/prod/`) con cuatro servicios:
- nginx sirve el frontend estático y hace de proxy de `/api` con TLS;
- el backend;
- Mosquitto con TLS en el 8883 y usuarios con ACL;
- PostgreSQL, sin puertos publicados.

Las imágenes se construyen en GitHub Actions (`deploy.yml`) y se publican en GHCR; el servidor solo las descarga. Guía completa en `docs/deployment.md`.

## Componentes

- El firmware del ESP32 detecta huevos mediante sensores VL53L0X, mantiene el conteo local y publica eventos o conteos por MQTT.
- Mosquitto recibe los mensajes MQTT.
- El backend Node.js y Express expone la API REST, procesa MQTT, aplica autenticación JWT/RBAC y persiste mediante Prisma.
- PostgreSQL almacena la información del sistema.
- El frontend React consume la API y presenta la operación por rol.
- Cada conteo guardado (por MQTT o manual) se notifica a los clientes conectados a `GET /api/v1/produccion/eventos` (Server-Sent Events, evento `conteo`); el módulo de producción recarga sus datos al recibirlo y conserva un polling de 10 s como respaldo. El bus de eventos vive en memoria, así que solo avisa a los clientes de la misma instancia del backend. Un proxy delante del backend (p. ej. nginx) no debe almacenar en búfer esa ruta; el backend envía `X-Accel-Buffering: no`.

## Límites

El ESP32 no escribe directamente en PostgreSQL. La lógica MQTT que persiste datos pertenece al backend. El frontend no debe duplicar reglas de negocio que correspondan al backend.

## Estructura actual

- Backend: `backend/src/config`, `database`, `middleware`, `modules`, `mqtt` y `shared`.
- Frontend: `frontend/src/components`, `features`, `services`, `stores` y `theme`.
- Firmware: `firmware/src` y `firmware/include`.
- Infraestructura: `infra/docker-compose.yml` y `infra/mosquitto/` para desarrollo. `infra/prod/` para producción: compose, nginx, Mosquitto, certbot, scripts y unidades de systemd.
- Imágenes: `backend/Dockerfile` y `frontend/Dockerfile`.
- CI/CD: `.github/workflows/` (`backend-tests.yml`, `ci.yml` y `deploy.yml`).

La estructura real del código tiene prioridad sobre diagramas o estructuras futuras documentadas.

## Datos

Antes de modificar entidades o relaciones, compara `backend/prisma/schema.prisma`, `database/schema.sql`, los servicios y las pruebas. `database/schema.sql` y `backend/prisma/schema.prisma` siempre deben tener coherencia. Nunca puede existir una entidad en el Prisma que no exista primero en el SQL.

La arquitectura requiere revisar también los consumidores del modelo en backend y frontend. Un cambio de datos no está completo hasta actualizar el esquema SQL, Prisma, el código consumidor y las pruebas correspondientes.
