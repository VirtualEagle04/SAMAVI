# Arquitectura

SAMAVI es un monolito modular con una aplicación web, una API y un dispositivo de captura.

El despliegue documentado utiliza Docker Compose sobre AWS Lightsail. La infraestructura local incluye PostgreSQL y Mosquitto. El frontend puede servirse mediante nginx en el despliegue definido, pero esa configuración debe tratarse como pendiente mientras no exista en el código de infraestructura.

## Componentes

- El firmware del ESP32 detecta huevos mediante sensores VL53L0X, mantiene el conteo local y publica eventos o conteos por MQTT.
- Mosquitto recibe los mensajes MQTT.
- El backend Node.js y Express expone la API REST, procesa MQTT, aplica autenticación JWT/RBAC y persiste mediante Prisma.
- PostgreSQL almacena la información del sistema.
- El frontend React consume la API y presenta la operación por rol.

## Límites

El ESP32 no escribe directamente en PostgreSQL. La lógica MQTT que persiste datos pertenece al backend. El frontend no debe duplicar reglas de negocio que correspondan al backend.

## Estructura actual

- Backend: `backend/src/config`, `database`, `middleware`, `modules`, `mqtt` y `shared`.
- Frontend: `frontend/src/components`, `features`, `services`, `stores` y `theme`.
- Firmware: `firmware/src` y `firmware/include`.
- Infraestructura: `infra/docker-compose.yml` y configuración de Mosquitto.

La estructura real del código tiene prioridad sobre diagramas o estructuras futuras documentadas.

## Datos

Antes de modificar entidades o relaciones, compara `backend/prisma/schema.prisma`, `database/schema.sql`, los servicios y las pruebas. `database/schema.sql` y `backend/prisma/schema.prisma` siempre deben tener coherencia. Nunca puede existir una entidad en el Prisma que no exista primero en el SQL.

La arquitectura requiere revisar también los consumidores del modelo en backend y frontend. Un cambio de datos no está completo hasta actualizar el esquema SQL, Prisma, el código consumidor y las pruebas correspondientes.
