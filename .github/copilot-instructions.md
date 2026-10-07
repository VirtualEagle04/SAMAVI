# Instrucciones para GitHub Copilot

SAMAVI es un monorepo para gestión avícola y conteo automático de huevos.

## Mapa rápido

- `backend/`: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT/RBAC y MQTT.
- `frontend/`: React, TypeScript, Vite, Material UI y Zustand.
- `firmware/`: ESP32, PlatformIO y sensores VL53L0X.
- `infra/`: Docker Compose, PostgreSQL y Mosquitto.
- `docs/`: arquitectura, dominio, hardware, MQTT y requisitos.

## Trabajo diario

- Mantén los cambios en el módulo responsable y evita refactors no relacionados.
- Lee el código y la configuración actuales antes de asumir contratos o valores.
- No incluyas secretos, `.env`, tokens, contraseñas ni claves privadas.
- Usa TypeScript explícito y evita `any` cuando sea posible.
- La persistencia del backend debe pasar por Prisma salvo una excepción justificada.
- Todo `JSON.parse` de payloads MQTT debe usar `try/catch` y validación.
- El firmware debe conservar el conteo local si se interrumpe Wi-Fi o MQTT.
- Antes de cambiar datos, compara `backend/prisma/schema.prisma`, `database/schema.sql` y sus consumidores.

## Comandos

Desde la raíz: `npm run install:all`, `npm run infra:up`, `npm run dev`, `npm run dev:down`, `npm run build:all`.

Backend: `npm --prefix backend run test:once` y `npm --prefix backend run build`.

Frontend: `npm --prefix frontend run lint` y `npm --prefix frontend run build`.

Firmware: usa PlatformIO desde `firmware/` y confirma el entorno de `firmware/platformio.ini`.

## Validación

Ejecuta las pruebas y comprobaciones del área modificada. Para cambios compartidos, ejecuta `npm run build:all`. Si una comprobación no puede ejecutarse, informa la precondición que falta.

La guía completa y la precedencia de fuentes están en `AGENTS.md`.
