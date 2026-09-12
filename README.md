# SAMAVI

Sistema de Gestión Avícola El Samán: plataforma para el conteo automático de
huevos y la gestión y monitoreo de una granja avícola.

## Estructura del repositorio

| Carpeta | Descripción |
| --- | --- |
| `backend/` | API y lógica del servidor con Node.js, Express y TypeScript. También contiene la integración MQTT del backend. |
| `frontend/` | Aplicación web con React, TypeScript, Vite y Material UI. |
| `infra/` | Configuración de infraestructura local mediante Docker Compose. |
| `infra/mosquitto/` | Configuración del broker MQTT Mosquitto. |
| `firmware/` | Proyecto PlatformIO del dispositivo y código que se ejecuta en el hardware. |
| `firmware/include/` | Archivos de cabecera y configuración del firmware, incluyendo `config.h`. |
| `firmware/src/` | Código fuente principal del firmware (`main.cpp`). |

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
npm run dev
```

Este comando inicia Mosquitto, el backend, el frontend y los logs de la
infraestructura en paralelo.

Para detener la infraestructura local después de cerrar el desarrollo:

```bash
npm run dev:down
```

### Infraestructura MQTT

```bash
npm run infra:up       # Inicia Mosquitto en el puerto 1883
npm run infra:down     # Detiene y elimina los contenedores
npm run infra:logs     # Muestra los logs de la infraestructura
```

El Compose actual administra Mosquitto en `127.0.0.1:1883`. La base de datos
PostgreSQL todavía no forma parte de esta configuración local.

### Backend

```bash
npm --prefix backend run dev
```

El backend se ejecuta con `tsx watch` y reinicia el proceso cuando cambia el
código. Su puerto predeterminado es `3001`.

### Frontend

```bash
npm --prefix frontend run dev       # Servidor de desarrollo Vite
npm --prefix frontend run build     # Verificación de tipos y build de producción
npm --prefix frontend run lint      # Reglas Oxlint
npm --prefix frontend run preview   # Sirve el build generado
```

También se puede construir backend y frontend desde la raíz con:

```bash
npm run build:all
```

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

1. Instalar las dependencias con los comandos de la sección de instalación.
2. Iniciar el entorno con `npm run dev`.
3. Conectar y cargar el firmware en el ESP32 desde PlatformIO.
4. Consultar los logs con `npm run infra:logs` cuando se necesite revisar MQTT.