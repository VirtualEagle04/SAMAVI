# Instrucciones de Copilot: SAMAVI

## Contexto del proyecto

SAMAVI (Sistema de Gestión Avícola El Samán) es un proyecto académico que
automatiza el conteo de huevos y la gestión de producción de la granja El
Samán.

- Cliente: María Fernanda Durán, dueña.
- Carlos Andrés: prorrateo.
- Humberto: ventas y distribución.
- Galponero y ayudante: recolección y clasificación.
- Repositorio: `github.com/VirtualEagle04/SAMAVI`, rama `main`.

## Arquitectura actual

- Monolito modular. No proponer microservicios.
- ESP32 publica por MQTT a Mosquitto en desarrollo, normalmente por el puerto
  `1883`.
- El backend Node.js y Express escucha por defecto en el puerto `3001`.
- El backend expone `GET /health` y `POST /api/v1/auth/login`.
- PostgreSQL corre en Docker Compose y usa el puerto local configurable por
  `POSTGRES_PORT`, cuyo valor predeterminado es `15432`.
- El frontend usa React, TypeScript, Vite, Material UI, Zustand y React Router.
- Toda la lógica MQTT debe permanecer en el backend y la persistencia debe
  pasar por Prisma.
- El ESP32 no escribe directamente en la base de datos.

## Estructura actual

- Backend: `backend/src/index.ts` y módulos en `backend/src/modules/`.
- Autenticación: `backend/src/modules/auth/`.
- Prisma: `backend/prisma/schema.prisma`.
- SQL inicial: `database/schema.sql`.
- Frontend: `frontend/src/`.
- Firmware: `firmware/src/main.cpp`, con configuración local en
  `firmware/include/config.h`.

El backend implementa actualmente login con bcrypt y JWT, además de recibir y
registrar mensajes JSON del tópico MQTT configurado. Los mensajes MQTT todavía
no se persisten en Prisma. El frontend mantiene un login simulado y aún no está
conectado al endpoint de autenticación.

## Stack

- Backend: Node.js, Express 5, TypeScript, Prisma, PostgreSQL, MQTT,
  bcryptjs y jsonwebtoken.
- Frontend: React 19, TypeScript, Vite, Material UI, Zustand y React Router 7.
- Firmware: PlatformIO, C++, ESP32, PubSubClient y sensores VL53L0X.
- Infraestructura local: Docker Compose con Mosquitto y PostgreSQL.

Prisma modela actualmente `Rol` y `Usuario`. El esquema SQL contiene 19 tablas,
incluida `gasto`, y se ejecuta al inicializar el volumen de PostgreSQL.

## Autenticación

- Endpoint: `POST /api/v1/auth/login`.
- Entrada: `login` y `password`.
- Respuesta exitosa: token JWT y datos básicos del usuario.
- El token usa el header `Authorization: Bearer <token>` para endpoints
  protegidos.
- Las credenciales inválidas responden con `401`.
- Refresh tokens, recuperación de contraseña y registro de usuarios están
  pendientes.

## Reglas de código

- Siempre envolver `JSON.parse` de payloads MQTT en `try/catch`.
- Tipar payloads MQTT y respuestas API explícitamente. No usar `any` en
  TypeScript.
- Usar Prisma para persistencia. Evitar SQL crudo salvo una excepción
  justificada.
- Nombrar las migraciones de forma descriptiva.
- Usar tópicos MQTT en kebab-case y prefijados por granja o dispositivo cuando
  el contrato lo defina.
- Mantener los cambios dentro del módulo responsable y evitar refactors no
  relacionados.
- Usar commits Conventional Commits si se solicita crear un commit.
- No usar em-dashes ni punto y coma en la documentación del proyecto.

## Firmware

- No hardcodear credenciales en `main.cpp`. Usar `config.h`, excluido del
  repositorio.
- Mantener debounce en las lecturas de los sensores VL53L0X.
- Manejar la reconexión de WiFi y MQTT explícitamente.
- Pines XSHUT: D15, D4, D18, D13, D14 y D33.
- I2C: SDA D22, SCL D21.
- Direcciones I2C: `0x30` a `0x35`.

## Lógica de prorrateo

1. Distribuir las ventas por categoría entre el pool proporcional de galpones
   según su participación semanal.
2. Mantener el galpón 5 fuera de ese pool, con su propio balance.
3. Restar gastos al valor de ventas asignado por galpón.
4. Distribuir el saldo entre socios según `porcentaje_inversion`.

Esta lógica pertenece a la capa de servicio y no debe duplicarse en el esquema
SQL ni en el firmware.
