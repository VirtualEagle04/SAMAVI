![](.github/samavi_header.png)

# SAMAVI

Sistema de Gestión Avícola El Samán: plataforma para el conteo automático de
huevos y la gestión y monitoreo de una granja avícola.

## Estructura del repositorio

| Carpeta | Descripción |
| --- | --- |
| `backend/` | API y lógica del servidor con Node.js, Express 5, TypeScript y Prisma. También contiene la integración MQTT del backend. |
| `frontend/` | Aplicación web con React, TypeScript, Vite y Material UI. |
| `infra/` | Configuración de infraestructura local mediante Docker Compose. |
| `infra/mosquitto/` | Configuración del broker MQTT Mosquitto. |
| `firmware/` | Proyecto PlatformIO del dispositivo y código que se ejecuta en el hardware. |
| `firmware/include/` | Archivos de cabecera y configuración del firmware, incluyendo `config.h`. |
| `firmware/src/` | Código fuente del firmware. PlatformIO compila actualmente `main.cpp`. |

## Requisitos

- Node.js y npm.
- Docker Desktop con Docker Compose.
- PlatformIO para compilar y cargar el firmware en el ESP32.

## Instalación

Desde la raíz del repositorio:

```bash
npm run install:all
```

Este comando instala las dependencias del proyecto raíz, `backend/` y
`frontend/` en una sola ejecución.

## Comandos importantes

### Instalación de dependencias

```bash
npm run install:all
```

### Desarrollo completo

```bash
npm run build:all
```

Este comando compila los archivos TypeScript a JavaScript, y genera el esquema de Prisma.

```bash
npm run dev
```

Este comando inicia Mosquitto, el backend, el frontend y los logs de la
infraestructura en paralelo.

Para detener la infraestructura local después de cerrar el desarrollo:

```bash
npm run dev:down
```

### Infraestructura local

```bash
npm run infra:up       # Inicia Mosquitto y PostgreSQL
npm run infra:down     # Detiene y elimina los contenedores
npm run infra:reset    # Borra los volúmenes y reinicializa PostgreSQL
npm run infra:logs     # Muestra los logs de la infraestructura
```

Antes de iniciar la infraestructura, copia `.env.example` como `.env` y
configura las credenciales locales de PostgreSQL y un `JWT_SECRET` de al menos
32 caracteres. El archivo `.env` está excluido del repositorio.

Mosquitto queda disponible en `127.0.0.1:1883` y PostgreSQL en
`127.0.0.1:15432`. Al crear el volumen por primera vez, PostgreSQL
ejecuta `database/schema.sql` y crea las 19 tablas del esquema SQL.

Para comprobar el estado:

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
```

Para listar las tablas desde PostgreSQL:

```bash
docker compose --env-file .env -f infra/docker-compose.yml exec postgres psql -U samavi -d samavi -c "\\dt"
```

`docker compose down` conserva los datos del volumen. Para reinicializar la
base de datos desde cero usa:

```bash
npm run infra:reset
```

Este comando elimina permanentemente el volumen local y vuelve a ejecutar
`database/schema.sql`.

### Backend

```bash
npm --prefix backend run dev
```

El backend se ejecuta con `tsx watch` y reinicia el proceso cuando cambia el
código. Su puerto predeterminado es `3001`. Expone `GET /health` y el inicio de
sesión en `POST /api/v1/auth/login`.

Para generar el cliente Prisma y compilar el backend:

```bash
npm --prefix backend run prisma:generate
npm --prefix backend run build
```

#### Módulo de pedidos y ventas

El backend expone el módulo comercial bajo `/api/v1/comercial`. Todas sus
rutas requieren `Authorization: Bearer <token>`.

- `GET|POST /mayoristas` y `GET|PATCH|DELETE /mayoristas/:id`
- `GET /mayoristas/:mayoristaId/precios`
- `PUT /mayoristas/:mayoristaId/precios`
- `GET|POST /pedidos` y `GET|PATCH /pedidos/:id`
- `POST /pedidos/:id/estado`
- `POST|GET /pedidos/:pedidoId/ventas`

Un pedido se crea en estado `pendiente` y puede pasar a `cargado`, o cancelarse
antes de la entrega. Registrar una venta requiere un pedido cargado, recibe las
cantidades vendidas y su distribución por galpón,
valida el inventario más reciente y lo descuenta dentro de una transacción.
La venta cambia el pedido a `entregado`.
Los precios se consultan al registrar la venta y quedan guardados en sus
detalles como `precio_aplicado`.

Los permisos comerciales son `INGRESAR_PEDIDO`, `REGISTRAR_VENTA` y
`EDITAR_PRECIOS`.

### Frontend

```bash
npm --prefix frontend run dev       # Servidor de desarrollo Vite
npm --prefix frontend run build     # Verificación de tipos y build de producción
npm --prefix frontend run lint      # Reglas Oxlint
npm --prefix frontend run preview   # Sirve el build generado
```

El login del frontend todavía usa usuarios simulados en
`frontend/src/services/authService.ts`; la conexión con el endpoint del
backend está pendiente.

### Firmware

Ejecuta estos comandos desde `firmware/`:

```bash
pio run                  # Compila el firmware
pio run -t upload        # Compila y carga el firmware al ESP32
pio device monitor       # Abre el monitor serial a 115200 baudios
pio test                 # Ejecuta las pruebas
```

Configura las credenciales y parámetros locales en `include/config.h` antes de
cargar el firmware. No incluyas credenciales reales en el repositorio.

## Flujo recomendado

1. Copiar `.env.example` como `.env` y completar los valores locales.
2. Instalar las dependencias con `npm run install:all`.
3. Compilar a JavaScript con `npm run build:all`.
4. Iniciar el entorno con `npm run dev`.
5. Conectar y cargar el firmware en el ESP32 desde PlatformIO.

## Estado actual

- El backend recibe y registra mensajes JSON del tópico MQTT configurado, pero
	todavía no persiste esos eventos en Prisma.
- Prisma modela usuarios, producción, inventario y las entidades del módulo de
	pedidos y ventas. El esquema SQL contiene el modelo relacional completo y sus
	datos iniciales.
- El frontend tiene rutas y pantalla de login, pero aún no cuenta con un
	dashboard conectado a la API.
