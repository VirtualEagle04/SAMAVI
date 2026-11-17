![](.github/samavi_header.png)

# SAMAVI: Sistema de Gestión Avícola El Samán

## 1. Descripción

SAMAVI es una plataforma para el conteo automático de huevos y la gestión y monitoreo de una granja avícola. El sistema busca reemplazar el registro manual en cuadernos y fotografías que actualmente usa la Granja El Samán (recolección, clasificación, conteo diario, pedidos, ventas, consolidación semanal y prorrateo de ganancias entre socios) por un flujo digital: un dispositivo ESP32 instalado en la máquina clasificadora cuenta los huevos de cada categoría de peso y envía los datos por MQTT a un backend que centraliza toda la información en una base de datos relacional, accesible por los distintos roles del negocio desde cualquier navegador.

Hoy una misma cifra de producción pasa por al menos cuatro registros manuales (cuaderno del galponero, agenda de la propietaria, Excel de Carlos Andrés y de vuelta a la agenda), y la fotografía enviada por WhatsApp es el único mecanismo de integración entre la operación y la administración. Con SAMAVI, el galponero pasa de registrar el conteo a verificarlo en el display de cada categoría, la bodega se actualiza sin intervención y el prorrateo semanal que hoy se hace en Excel se calcula en el sistema.

El sistema incluye los módulos de dashboard (información rápida y KPIs), cierre semanal (consolidación y prorrateo), producción (conteos y cierres diarios), comercial (ventas, clientes y pedidos), galpones (gallinas, galpones activos y alimentación diaria), inventario (insumos, compras, movimientos y proveedores), auditoría (acciones por usuario y fecha) y usuarios (usuarios, roles y permisos), con acceso diferenciado por rol. La generación de reportes y la migración de los registros históricos siguen pendientes.

El proyecto está dirigido a María Fernanda Durán Rozo, propietaria y beneficiaria de la Granja El Samán (Vereda Matanzas, Paicol, Huila), y a su equipo operativo y administrativo. La beneficiaria aceptó el proyecto para los periodos 2026-2 y 2027-1.

**Código Proyecto:** DT_2026-02-01 **Periodo Académico:** 2026-2 **Modalidad:** Desarrollo Tecnológico **Director:** John Fredy Chacón Sánchez

## 2. Integrantes

| Nombre completo | Usuario GitHub | Correo institucional | Rol en el equipo |
|---|---|---|---|
| Jaime Andrés Alonso Troncoso | [@jaalonso36](https://github.com/jaalonso36)  | jaalonso@unbosque.edu.co | QA |
| Federico Vargas Rozo | [@VirtualEagle04](https://github.com/VirtualEagle04) | fvargasr@unbosque.edu.co | Backend |
| Julián Esteban García Castellanos | [@JulianGarcia8](https://github.com/JulianGarcia8) | jesgarcia@unbosque.edu.co | Frontend |

## 3. Tecnologías y requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | 24 (`.nvmrc`) | La misma versión que usan CI y las imágenes de producción |
| npm | Incluido con Node.js | Gestor de paquetes del monorepo |
| Docker Desktop | Última estable | Para levantar Mosquitto y PostgreSQL localmente |
| PlatformIO | Última estable | Compilación y carga del firmware al ESP32 |
| PostgreSQL | 16 (vía imagen `postgres:16-alpine`) | Docker Compose, expuesto en `127.0.0.1:15432` (`POSTGRES_PORT`) |
| Mosquitto | 2.x (vía imagen `eclipse-mosquitto:2`) | Docker Compose, broker MQTT local anónimo y sin TLS, puerto `1883` (`MOSQUITTO_PORT`) |

## 4. Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/VirtualEagle04/SAMAVI.git
cd SAMAVI
 
# 2. Copiar y completar las variables de entorno
cp .env.example .env
# editar .env con las credenciales locales de PostgreSQL y un JWT_SECRET de al menos 32 caracteres
 
# 3. Instalar dependencias (raíz, backend y frontend)
npm run install:all

# 4. Compilar TypeScript y Prisma
npm run build:all
 
# 5. Copiar y completar las variables de entorno del firmware (solo si se va a cargar al ESP32)
cp firmware/include/config.h.example firmware/include/config.h
```

## 5. Cómo ejecutar el proyecto

```bash
# Levanta Mosquitto, PostgreSQL, backend y frontend en paralelo
npm run dev
 
# Para detener la infraestructura local
npm run dev:down

# Para borrar los contenedores y los volúmenes (destruye los datos locales)
npm run infra:reset
```

También se pueden ejecutar los componentes por separado:

```bash
npm run infra:up                 # Infraestructura: PostgreSQL y Mosquitto
npm --prefix backend run dev     # Backend con tsx watch
npm --prefix frontend run dev    # Frontend con Vite
```

El frontend queda en `http://localhost:3000` y redirige `/api` al backend en `http://localhost:3001`. La base se crea con `database/schema.sql` al inicializar el volumen de PostgreSQL. No hay migraciones versionadas, así que un cambio de esquema exige recrear el volumen con `npm run infra:reset` (borra los datos locales).

El firmware se compila desde `firmware/` con `pio run -e esp32dev`. El despliegue en producción (AWS Lightsail) está en [docs/deployment.md](docs/deployment.md).

## 6. Cómo ejecutar las pruebas

```bash
# Ejecutar toda la suite de pruebas del backend
npm --prefix backend run test:once

# Ejecutar un subconjunto o un archivo
npm --prefix backend run test:once -- tests/unit/auth/auth.schemas.test.ts

# Reporte de cobertura
npm --prefix backend run test:report
```

- **Framework de pruebas:** Vitest para pruebas unitarias del backend.
- **Cobertura actual** (backend, 4 nov 2026, 26 archivos y 402 pruebas):

  | Métrica | Todo `src/` | Solo archivos cargados por las pruebas |
  |---|---|---|
  | Líneas | 61,6 % (1125/1826) | 75,7 % (1125/1487) |
  | Sentencias | 60,8 % (1214/1998) | 73,4 % (1214/1654) |
  | Ramas | 65,7 % (854/1300) | 69,5 % (854/1228) |
  | Funciones | 59,8 % (336/562) | 72,9 % (336/461) |

- **Estado:** Hay pruebas unitarias de servicios y validaciones en todos los módulos del backend (auth, usuarios, producción, comercial, inventario, galpones, dashboard, consolidación y auditoría), además de middleware, MQTT y utilidades compartidas. CI las ejecuta en cada Pull Request junto con la compilación de backend, frontend, firmware e imágenes Docker (`.github/workflows/ci.yml`). No hay pruebas de integración, frontend ni firmware automatizadas.

## 7. Estructura del repositorio

```text
SAMAVI/
├── docs/                      # Documentación técnica del proyecto
│   ├── architecture.md
│   ├── deployment.md          # Despliegue en AWS Lightsail
│   ├── domain.md
│   ├── hardware.md
│   ├── overview.md
│   ├── protocols/
│   │   └── mqtt.md
│   └── requirements.md
├── backend/                   # API REST y lógica de servidor (Express, TypeScript, Prisma)
│   ├── prisma/                # Esquema de base de datos para Prisma
│   ├── src/
│   │   ├── config/            # Configuración y variables de entorno
│   │   ├── database/          # Cliente Prisma
│   │   ├── middleware/        # Autenticación, permisos y manejo de errores
│   │   ├── modules/           # auth, usuarios, produccion, comercial, inventario,
│   │   │                      # galpones, dashboard, consolidacion y auditoria
│   │   ├── mqtt/              # Recepción de conteos y estado del dispositivo
│   │   └── shared/            # Auditoría, errores, seguridad y utilidades (fechas Bogotá)
│   ├── tests/unit/            # Pruebas unitarias por módulo
│   └── Dockerfile             # Imagen de producción
├── database/                  # Esquema SQL (schema.sql)
├── firmware/                  # Firmware ESP32 para PlatformIO
│   ├── include/               # Configuración de ejemplo, detección y certificados raíz
│   ├── src/                   # Firmware principal y programas de prueba
│   └── tools/                 # Utilidades (generación del logo)
├── frontend/                  # Aplicación web React, TypeScript y Material UI
│   ├── src/
│   │   ├── assets/            # Imágenes e iconos
│   │   ├── components/        # Componentes compartidos (atoms, molecules, organisms)
│   │   ├── features/          # Un módulo por área: pages, components, services, types
│   │   ├── hooks/             # Hooks compartidos (filtros de tablas)
│   │   ├── theme/             # Tema de Material UI y tokens de diseño
│   │   └── utils/             # Utilidades compartidas
│   └── Dockerfile             # Imagen de producción (nginx)
├── infra/                     # Docker Compose y Mosquitto de desarrollo
│   └── prod/                  # Producción: compose, nginx, Mosquitto TLS, certbot, scripts y systemd
├── postman/                   # Colección y entornos de Postman para la API
├── .github/workflows/         # CI (ci.yml) y despliegue (deploy.yml)
├── AGENTS.md                  # Instrucciones únicas para agentes de IA
├── CLAUDE.md                  # Importa AGENTS.md para Claude Code
├── CONTRIBUTING.md            # Guía de contribución y flujo Git
├── .env.example               # Plantilla de variables de entorno
├── package.json               # Scripts del monorepo
└── README.md
```

## 8. Flujo de trabajo con Git

El flujo completo está en [CONTRIBUTING.md](CONTRIBUTING.md). En resumen:

- Rama `main`: siempre estable. **No se hace push directo.**
- Ramas de trabajo: `feat/<descripcion-corta>`, `fix/<descripcion-corta>`, `docs/<...>`, `ci/<...>`.
- Todo cambio entra a `main` mediante **Pull Request** revisado por al menos otro integrante, con el flujo CI verificado, y con ayuda de CodeRabbit.
- Mensajes de commit en formato [Conventional Commits](https://www.conventionalcommits.org/es/).
- Toda la lógica MQTT debe permanecer en el backend. La persistencia siempre pasa por Prisma.
- Se busca mantener los cambios dentro del módulo responsable, evitando refactors no relacionados.
- Gestión de tareas y seguimiento del avance mediante un tablero de [Trello](https://trello.com/b/664r0iop/samavi).

## 9. Estado del proyecto y avances

El proyecto se organiza en cuatro fases (Análisis y Propuesta, Diseño del Sistema, Desarrollo Iterativo en Scrum y Cierre del Proyecto); la fase de desarrollo se divide en siete sprints de tres semanas (ver Anexo 14: Estructura de Desglose del Trabajo, y Anexo 15: Diagrama de Gantt). Las fases de Análisis y Diseño están completas. En Proyecto de Grado 1 (2026-2) se completaron los cuatro primeros sprints; los tres restantes, las pruebas piloto en campo, la capacitación y la entrega definitiva corresponden a Proyecto de Grado 2 (2027-1).

| Fase | Fecha | Alcance comprometido | Estado |
|---|---|---|---|
| Sprint 1 | 24 ago - 6 sep 2026 | Completar el diseño técnico base y el levantamiento de información: informe de levantamiento, BPMN AS-IS y TO-BE, casos de uso, MER, MR, arquitectura, componentes, despliegue, esquema de autenticación y mockups. | Completado |
| Sprint 2 | 7 sep - 27 sep 2026 | Construir la persistencia real e implementar los módulos núcleo: repositorio monorepo, PostgreSQL en Docker Compose, esquema relacional, Prisma, autenticación y roles, registro de producción, pedidos y ventas, pruebas unitarias y de seguridad, y diagramas de secuencia de los flujos críticos. | Completado |
| Sprint 3 | 28 sep - 18 oct 2026 | Completar el ciclo operativo y la cobertura de pruebas: gestión de galpones, inventario de insumos, vista tabular de producción con el formato de los registros físicos, mejoras de frontend y pruebas unitarias con Vitest. | Completado |
| Sprint 4 | 19 oct - 8 nov 2026 | Consolidación semanal (prorrateo), módulo de auditoría, despliegue automático en AWS Lightsail con GitHub Actions y ajustes de la interfaz. Integración en vivo del ESP32 con el backend por Wi-Fi y MQTT, con conteo en tiempo real. | Completado |
| Sprint 5 | Receso e inicio de 2027-1 | Migración masiva de los cuadernos históricos (con apoyo de inteligencia artificial) y reemplazo de los sensores VL53L0X por sensores infrarrojos de barrera. | Pendiente |
| Sprints 6 y 7 | 2027-1 | Instalación del hardware en la máquina clasificadora, pruebas piloto en campo, pruebas de rendimiento, seguridad y aceptación, capacitación del personal, documentación final y entrega del sistema. | Pendiente |

## 10. Decisiones técnicas relevantes

- **Arquitectura de monolito modular** (no microservicios), acorde a un equipo de tres desarrolladores, sin personal técnico en la granja y con una concurrencia esperada de máximo 3 usuarios simultáneos. Solo el firmware y el broker MQTT van aparte, porque la captura ocurre en un dispositivo físico distinto al servidor.
- **Sensores infrarrojos de barrera + ESP32** para el conteo no invasivo de huevos por categoría de peso: un par emisor-receptor por categoría, cada uno en su propio pin digital, de modo que la falla de un sensor no afecta a los demás. Reemplazan a los sensores de distancia VL53L0X del prototipo, que en la maqueta pedida por el director dieron lecturas inestables, conteos falsos y una actualización lenta para el ritmo de la clasificadora (Anexos 44 y 45). El firmware actual (`firmware/src/main.cpp`) todavía usa los VL53L0X; el cambio está planeado para el Sprint 5. El bus I2C, con un multiplexor PCA9548A, queda solo para los displays OLED de cada categoría.
- **MQTT sobre TLS** como protocolo de comunicación entre el ESP32 y el backend, por estar pensado para entornos con recursos y ancho de banda limitados, como la conexión satelital de la granja. En producción el ESP32 se autentica con un usuario por dispositivo. El firmware reconecta Wi-Fi y MQTT en una tarea propia y guarda en memoria hasta 200 conteos mientras no hay conexión, que publica con su hora original al reconectar. El backend reenvía los conteos y el estado del dispositivo al frontend en tiempo real por SSE, que basta porque los datos solo van del sensor a la pantalla. Contrato en `docs/protocols/mqtt.md`.
- **Express.js + PostgreSQL + Prisma ORM + TypeScript** para el backend, elegidos por dominio del equipo, bajo costo de licenciamiento y adecuación a una API REST de baja concurrencia.
- **React + Vite + Material UI + TypeScript** para el frontend, priorizando reactividad y facilidad de uso para usuarios con poca experiencia tecnológica.
- **Despliegue en AWS Lightsail sobre Docker Compose** (nginx con el frontend, backend, Mosquitto con TLS y PostgreSQL), en el plan de 2 GB con Amazon Linux acordado con el director. Se prefirió frente al despliegue local en Raspberry Pi por mayor confiabilidad ante cortes eléctricos y una IP pública estática, y frente a EC2 por su precio mensual fijo para una carga pequeña y estable. GitHub Actions construye las imágenes, las publica en GHCR y despliega por SSH. Los respaldos son un snapshot diario de Lightsail y una copia diaria de la base de datos, ambos conservados siete días. Ver `docs/deployment.md`.
- **Autenticación basada en JWT** con roles dinámicos y autorización por permiso: en cada solicitud se valida firma y expiración, y se consultan en la base el estado del usuario, la versión de sesión y sus permisos actuales, de modo que cambiar la contraseña, el rol o desactivar a un usuario cierra sus sesiones. Política de contraseñas NIST SP 800-63B y límite de intentos de inicio de sesión. Ver `docs/domain.md`.
- **Auditoría** de toda escritura hecha por un usuario (valores antes y después, usuario e IP), registrada en la misma transacción que el cambio, y de cada inicio de sesión exitoso.

## 11. Limitaciones conocidas y trabajo futuro
 
- Los sensores infrarrojos están comprados y pendientes de llegar; el firmware sigue usando los VL53L0X. El módulo de captura se ha validado en banco de pruebas y en una demostración controlada, pero no dentro de la máquina clasificadora, así que su precisión real frente al conteo manual aún no se conoce. Además, la propietaria reportó que la clasificadora actual está desajustada y pidió investigar máquinas disponibles en el mercado.
- La línea base de tiempos del proceso manual (unos 3 minutos 30 segundos por balde clasificado y hasta 4 minutos para el conteo y registro diario) proviene de una única visita de tres días; debe repetirse en la visita de instalación.
- La fórmula matemática exacta del prorrateo de ganancias y gastos usada actualmente por Carlos Andrés todavía no está completamente documentada ni confirmada.
- El módulo de cierre semanal y prorrateo (`/consolidacion`) calcula ganancias, gastos y reparto por socio según porcentaje de inversión, pero el tratamiento de galpones con pérdida es un supuesto pendiente de confirmar. El cálculo se comparó con la hoja de prorrateo de la semana 7-13 ago 2026 y las diferencias están documentadas en `docs/domain.md`.
- El dashboard calcula su resumen semanal con los siete días que terminan en el último cierre diario, no con la semana productiva de viernes a jueves que usa el cierre semanal.
- Solo hay pruebas unitarias del backend (Vitest). No hay pruebas de integración, frontend ni firmware automatizadas.
- Queda pendiente definir con precisión qué determina la cantidad de bultos de alimento por pedido, la base del cálculo de transporte, cómo registrar los huevos regalados a los trabajadores, y por qué la hoja manual reparte más bandejas de B de las vendidas.
- Los conteos que el ESP32 guarda sin conexión viven en memoria: se pierden si el dispositivo se reinicia antes de reconectar. Guardarlos en memoria flash, para cubrir los cortes de energía de la bodega, queda pendiente.
- Los respaldos (snapshots y copias de la base) dependen de la misma instancia de Lightsail: falta llevar una copia a otro lugar.
- El límite de intentos de inicio de sesión vive en memoria del backend y se reinicia con él. El doble factor de autenticación, solicitado por el director de proyecto, sigue pendiente.
- La migración de los registros históricos físicos (cuadernos y agenda de contabilidad) sigue pendiente para el Sprint 5: el PDF de los cuadernos se dividirá en cerca de diez partes y se compararán varias herramientas de inteligencia artificial para elegir la que extraiga los datos con mayor precisión.
- Siguen pendientes la generación de reportes y la aplicación móvil híbrida (`.apk`) planeada.

## 12. Créditos y referencias

- Uso de asistentes de IA: 
    - Apoyo en la digitalización de registros físicos.
    - Generación automatizada de una colección de Postman a partir del código para pruebas de endpoints REST.
    - CodeRabbit en el repositorio para comprobar calidad, mejoras y riesgos a la hora de realizar Pull Request.
    - Generación puntual de código y documentación.

## 13. Licencia

MIT — ver archivo [LICENSE](LICENSE).