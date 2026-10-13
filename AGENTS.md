# SAMAVI

Monorepo del Sistema de Gestión Avícola El Samán: conteo de huevos por categoría de peso con un ESP32, y gestión de producción, inventario, pedidos y ventas. Este archivo es la única fuente de instrucciones para agentes de IA (`CLAUDE.md` solo lo importa).

Resumen verificado contra el código al escribirlo. Si algo no coincide con el código, manda el código: corrige este archivo o repórtalo.

## Cómo trabajar

- Identifica el área responsable y mantén el cambio dentro de ella. Evita refactors no relacionados.
- Lee el código y la configuración actuales antes de asumir contratos, valores o decisiones técnicas.
- No inventes valores de hardware, contratos MQTT, reglas de negocio, credenciales ni datos de producción. Lo desconocido se marca como pendiente.
- No leas, copies ni expongas `.env`, contraseñas, tokens ni claves privadas en cambios, logs o documentación.
- TypeScript explícito; evita `any` si el dato se puede modelar.
- Si un comando falla por una precondición del entorno, informa la causa y no la ocultes.
- Código de dominio, mensajes de error, documentación y commits están en español.
- Git: ramas, commits y PR siguen `CONTRIBUTING.md` (única fuente de ese flujo).

Fuentes de verdad, en orden: código y configuración actuales; decisiones técnicas explícitas y vigentes; `docs/` del área; README; fuentes externas de componentes; suposiciones (no las presentes como hechos). Si el código contradice la documentación, conserva el comportamiento vigente, documenta la discrepancia y no la "corrijas" sin confirmación.

## Estructura y arquitectura

Flujo: `VL53L0X -> ESP32 -> MQTT (Mosquitto) -> backend -> PostgreSQL <- API REST <- frontend`. El ESP32 no escribe en la base de datos y el frontend no duplica reglas de negocio del backend.

| Carpeta | Contenido |
|---|---|
| `backend/` | API REST + consumidor MQTT. Express 5, TypeScript ESM, Prisma 6, Vitest |
| `frontend/` | React 19, Vite, Material UI, Zustand, react-router-dom 7, oxlint |
| `firmware/` | PlatformIO, entorno `esp32dev`, Arduino, PubSubClient, Adafruit_VL53L0X |
| `infra/` | `docker-compose.yml` (PostgreSQL 16 y Mosquitto 2) y `mosquitto/mosquitto.conf` |
| `database/schema.sql` | Esquema SQL; Compose lo ejecuta al crear la base (`initdb.d`) |
| `docs/` | `overview`, `architecture`, `domain`, `hardware`, `requirements`, `protocols/mqtt` |

Entorno: el único `.env` está en la raíz (plantilla `.env.example`) y [backend/src/config/env.ts](backend/src/config/env.ts) lo carga desde ahí. Requeridas por el backend: `DATABASE_URL`, `JWT_SECRET` (mínimo 32 caracteres), `MQTT_URL`, `MQTT_TOPIC`, `MQTT_CLIENT_ID`; opcionales `PORT` (3001 por defecto) y `JWT_EXPIRES_IN`. El frontend usa `VITE_API_URL` opcional (vacío = mismo origen). Puertos locales: frontend 3000 con proxy `/api` -> `localhost:3001`; PostgreSQL en `127.0.0.1:${POSTGRES_PORT:-15432}`; Mosquitto en `${MOSQUITTO_PORT:-1883}`. El Mosquitto local es anónimo y sin TLS; `docs/protocols/mqtt.md` pide TLS en producción.

El despliegue (AWS Lightsail, nginx) está documentado en `docs/architecture.md` pero no existe en el código de `infra/`: trátalo como pendiente.

## Comandos y validación

Todos desde la raíz del repositorio.

| Acción | Comando |
|---|---|
| Instalar dependencias | `npm run install:all` |
| Levantar PostgreSQL y Mosquitto | `npm run infra:up` |
| Infra + backend (`tsx watch`) + frontend (Vite) | `npm run dev` |
| Detener infraestructura | `npm run dev:down` |
| Borrar volúmenes locales | `npm run infra:reset` (**destruye datos**; no lo ejecutes sin confirmar que son descartables) |
| Generar Prisma y compilar backend y frontend | `npm run build:all` |
| Pruebas del backend | `npm --prefix backend run test:once` |
| Una prueba del backend | `npm --prefix backend exec vitest run tests/unit/auth/auth.service.test.ts` |
| Generar cliente Prisma | `npm --prefix backend run prisma:generate` |
| Build del backend | `npm --prefix backend run build` |
| Lint del frontend | `npm --prefix frontend run lint` |
| Build del frontend (`tsc -b && vite build`) | `npm --prefix frontend run build` |
| Firmware | `pio run -e esp32dev` desde `firmware/` (confirma el entorno en `platformio.ini`) |

Qué ejecutar según el área que cambies:

- `backend/`: pruebas relevantes y build; si tocas Prisma, genera el cliente antes de compilar.
- `frontend/`: lint y build. No hay pruebas automáticas de frontend.
- `firmware/`: compila con PlatformIO. No hay pruebas automáticas de firmware.
- `infra/`, MQTT o esquema de datos: valida los archivos afectados y, si hay entorno, prueba el arranque.
- Cambios compartidos o de configuración: `npm run build:all` además de lo específico.

Añade o actualiza pruebas cuando cambie el comportamiento. Si no puedes validar algo, di qué faltó.

## Backend

- [backend/src/index.ts](backend/src/index.ts) monta `/health` y `/api/v1/{auth,produccion,comercial,inventario,galpones}`, el middleware de errores y el cliente MQTT.
- Cada módulo `backend/src/modules/<nombre>/` sigue `*.routes.ts -> *.controller.ts -> *.service.ts`, con `*.schemas.ts` para validación manual de entradas (sin librería de esquemas) que lanza `AppError(status, mensaje)` ([app-error.ts](backend/src/shared/errors/app-error.ts)). Replica ese patrón en módulos nuevos.
- Autenticación JWT con `authenticate`. La autorización mezcla dos mecanismos según el módulo ([auth.middleware.ts](backend/src/middleware/auth.middleware.ts)): `requireRole(...)` en `produccion` (Administrador, Galponero) y `requirePermission("...")` en `comercial` (p. ej. `INGRESAR_PEDIDO`, `EDITAR_PRECIOS`, `REGISTRAR_VENTA`), `galpones` (`GESTIONAR_GALPONES`) e `inventario` (`GESTIONAR_INVENTARIO`). Revisa las rutas del módulo antes de asumir cuál aplica.
- La persistencia pasa por Prisma ([database/prisma.ts](backend/src/database/prisma.ts)) salvo excepción justificada y documentada.
- Las fechas de negocio usan zona Bogotá: [fecha-bogota.ts](backend/src/shared/utils/fecha-bogota.ts).
- Pruebas unitarias en `backend/tests/unit/<módulo>/` (servicios y schemas). No hay pruebas de integración.

## MQTT

- Tópicos suscritos en `index.ts`: el de `MQTT_TOPIC`, `$SYS/broker/clients/connected`, `samavi/esp32/#`, `samavi/status` y `samavi/heartbeat`. [production-mqtt.handler.ts](backend/src/mqtt/production-mqtt.handler.ts) los enruta: clientes `$SYS`, estado/LWT (`online`/`offline`), heartbeat y, por defecto, conteos. El estado del dispositivo vive en [device-status.ts](backend/src/mqtt/device-status.ts) y se expone en `GET /api/v1/produccion/dispositivo-estado`.
- Conteo: el firmware publica en `samavi/conteo` `{"galponId":1,"categoriaPeso":"A","cantidad":1,"timestamp":"..."}`. El backend lo valida con `parseProductionCountInput` ([produccion.schemas.ts](backend/src/modules/produccion/produccion.schemas.ts)): `galponId` entero positivo, `categoriaPeso` texto, `cantidad` 1 o -1, `timestamp` fecha.
- Todo `JSON.parse` de un payload MQTT va en `try/catch` y se valida el resultado; un mensaje inválido no debe tumbar el proceso.
- Un cambio de contrato exige actualizar firmware, backend, pruebas y `docs/protocols/mqtt.md`. No asumas que una foto, un conteo y una bandeja son la misma unidad de negocio.
- Estado actual del firmware: publica `galponId` fijo en 1 y solo `samavi/conteo`; `mqttClient.connect` no define LWT y no publica estado ni heartbeat, aunque el backend los escucha.

## Datos

- [backend/prisma/schema.prisma](backend/prisma/schema.prisma) (25 modelos) y [database/schema.sql](database/schema.sql) deben ser coherentes: ninguna entidad puede existir en Prisma sin existir antes en el SQL.
- Discrepancia actual: el SQL tiene tablas que Prisma no modela (`socio`, `inversion_socio`, `gasto`). Respétala hasta confirmar el cambio.
- No hay migraciones versionadas: la base se crea con `schema.sql` al inicializar el volumen de Postgres. Un cambio de esquema no se aplica a un volumen existente sin recrearlo (ver `infra:reset` arriba).
- Un cambio de datos está completo cuando se actualizan SQL, Prisma, código consumidor (backend y frontend) y pruebas. No asumas cuál es la fuente oficial si ambos se contradicen: pregunta.
- Dominio (categorías de peso, reglas de negocio): `docs/domain.md`; no inventes reglas financieras.

## Frontend

- Organización por feature: `frontend/src/features/<auth|produccion|comercial|inventario|galpones>/{pages,components,services,stores,types}`. Compartidos en `src/components/{atoms,molecules,organisms}`.
- Cada servicio hace `fetch` a `${VITE_API_URL ?? ""}/api/v1/...`. La sesión está en Zustand ([authStore.ts](frontend/src/features/auth/stores/authStore.ts)) y se persiste en `localStorage` (`samavi_token`, `samavi_user`, `samavi_role`, `samavi_permissions`).
- Tema MUI y tokens de diseño en `src/theme/` ([tokens.ts](frontend/src/theme/tokens.ts), [theme.ts](frontend/src/theme/theme.ts)). Usa los tokens en lugar de valores sueltos.
- Filtros de tablas: usa [TableToolbar](frontend/src/components/molecules/TableToolbar.tsx) (título, descripción, búsqueda, botón "Filtros" y acciones) y [useTableFilters](frontend/src/hooks/useTableFilters.ts) (búsqueda, valores, página, `reset`; un valor vacío significa "sin filtrar"). Los filtros se declaran como `FilterField` (`select`, `date` o `switch`, ver [filterTypes.ts](frontend/src/components/molecules/filterTypes.ts)): `FilterPanel` los muestra en un popover (escritorio) o panel inferior (móvil) y `ActiveFilterChips` los resume bajo la barra. No pongas selects ni botones de filtro sueltos en el toolbar. Un selector que cambia de entidad (cliente, insumo) no es un filtro: usa [EntitySelect](frontend/src/components/molecules/EntitySelect.tsx). Los estilos de tabla y las etiquetas de paginación están en [tableStyles.ts](frontend/src/components/tableStyles.ts); no crees copias por módulo. El tamaño de letra de un campo va en `.MuiInputBase-input`, no en la raíz, o el label se sale de la muesca.
- Tablas y listas sin datos: usa [EmptyState](frontend/src/components/molecules/EmptyState.tsx) (icono, título, descripción) en lugar del cuerpo de la tabla. Se muestra tanto en móvil como en escritorio, sin cabeceras ni paginación; el toolbar con título y filtros se conserva. No dibujes filas o textos vacíos a mano. Distingue "no hay datos" de "los filtros no encuentran nada" en el título y la descripción.
- Rutas en [AppRouter.tsx](frontend/src/AppRouter.tsx): `/login`, `/dashboard`, `/galpones/*`; el resto redirige a `/dashboard`.

## Firmware

- Solo [firmware/src/main.cpp](firmware/src/main.cpp) se compila (`build_src_filter = -<*> +<main.cpp>`). Los demás `main_*.cpp` son variantes de prueba.
- Valores actuales de `main.cpp`: seis sensores VL53L0X por I2C (`SDA` 21, `SCL` 22), pines XSHUT `{15, 4, 18, 13, 14, 33}` y categorías `{"Y","Ex","AA","A","B","C"}` por sensor. `docs/hardware.md` dice que pantallas OLED, MCP23017 y botones siguen pendientes.
- No cambies pines, direcciones I2C ni secuencias XSHUT sin verificar el hardware real.
- Debe conservar el conteo local durante caídas de Wi-Fi o MQTT, y evitar incrementos múltiples por un mismo huevo (`docs/hardware.md`).
- Copia `firmware/include/config.h.example` a `firmware/include/config.h` (ignorado por git) con tus credenciales; nunca lo subas.

## Hosts de agentes

Codex, Copilot, Cursor, Antigravity y similares leen este archivo por convención. Los hosts que no descubren archivos (por ejemplo OpenRouter) deben cargar este archivo y los `docs/` relacionados con la tarea de forma explícita, excluyendo `.env` y secretos. No crees otros archivos de instrucciones por agente: edita este.
