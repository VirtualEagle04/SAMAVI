![](.github/samavi_header.png)

# SAMAVI: Sistema de Gestión Avícola El Samán

## 1. Descripción

SAMAVI es una plataforma para el conteo automático de huevos y la gestión y monitoreo de una granja avícola. El sistema busca reemplazar el registro manual en cuadernos y fotografías que actualmente usa la Granja El Samán (recolección, clasificación, conteo diario, pedidos, ventas, consolidación semanal y prorrateo de ganancias entre socios) por un flujo digital: un dispositivo ESP32 con sensores ópticos VL53L0X cuenta los huevos por peso directamente en la máquina clasificadora y envía los datos por MQTT a un backend que centraliza toda la información en una base de datos relacional, accesible por los distintos roles del negocio desde cualquier navegador.

El proyecto está dirigido a María Fernanda Durán Rozo, propietaria y beneficiaria de la Granja El Samán (La Plata, Huila), y a su equipo operativo y administrativo.

**Código Proyecto:** DT_2026-02-01 **Periodo Académico:** 2026-2

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

El frontend queda en `http://localhost:3000` y redirige `/api` al backend en `http://localhost:3001`. La base se crea con `database/schema.sql` al inicializar el volumen de PostgreSQ. No hay migraciones versionadas, así que un cambio de esquema exige recrear el volumen con `npm run infra:reset` (borra los datos locales).

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

El cronograma del proyecto se organiza en cuatro fases (ver Anexo 14: Estructura de Desglose del Trabajo, y Anexo 15: Diagrama de Gantt):
 
| Fase | Fecha | Alcance comprometido | Estado |
|---|---|---|---|
| Sprint 1 | Agosto 24 - Septiembre 6 | Completar el diseño técnico base de SAMAVI (diagramas de casos de uso, MER/MR, arquitectura, componentes, despliegue y esquema de autenticación), los mockups del dashboard, el informe de levantamiento de información en campo, y dejar listo el repositorio con la estructura monorepo, como base para iniciar la implementación en el siguiente sprint. | Completado |
| Sprint 2 | Septiembre 7 - Septiembre 27 | Construir la base de persistencia real del sistema (contenedor PostgreSQL, esquema relacional de las 18 tablas e integracion de Prisma en el backend), e implementar los modulos de Autenticacion/Roles y Registro de Produccion y Pedidos/Ventas con sus pruebas de seguridad y unitarias correspondientes. Cerrar el sprint actualizando los diagramas de secuencia de los flujos criticos con base en la implementacion real ya construida, en lugar de una suposicion de diseño hecha en Sprint 1. | Completado |
| Sprint 3 | Septiembre 28 - Octubre 18 | Completar el ciclo operativo del sistema implementando los módulos de Gestión de Galpones, e Inventario de Insumos con sus respectivas pantallas, cubrir con pruebas unitarias y de integración todos los módulos del backend. | Completado |
| Sprint 4 | Octubre 19 - Noviembre 8 | Completar el modulo de Prorrateo, finalizar integración con el hardware del ESP32 y empezar con el despliege en AWS Lightsail. | En proceso... |

## 10. Decisiones técnicas relevantes

- **Arquitectura de monolito modular** (no microservicios), acorde a un equipo pequeño y una concurrencia esperada de máximo 3 usuarios simultáneos.
- **Sensores ópticos VL53L0X + ESP32** para el conteo no invasivo de huevos por peso, evaluados con pruebas satisfactorias de conectividad y ya adquiridos antes de definir el resto de la arquitectura.
- **MQTT sobre TLS** como protocolo de comunicación entre el ESP32 y el backend (en producción el ESP32 se autentica con un usuario por dispositivo). El firmware reconecta Wi-Fi y MQTT en una tarea propia y guarda en memoria hasta 200 conteos mientras no hay conexión. El backend reenvía los conteos y el estado del dispositivo al frontend en tiempo real por SSE. Contrato en `docs/protocols/mqtt.md`.
- **Express.js + PostgreSQL + Prisma ORM + TypeScript** para el backend, elegidos por dominio del equipo, bajo costo de licenciamiento y adecuación a una API REST de baja concurrencia.
- **React + Vite + Material UI + TypeScript** para el frontend, priorizando reactividad y facilidad de uso para usuarios con poca experiencia tecnológica.
- **Despliegue en AWS Lightsail sobre Docker Compose** (nginx con el frontend, backend, Mosquitto con TLS y PostgreSQL), preferido frente al despliegue local en Raspberry Pi por mayor confiabilidad ante cortes eléctricos y una IP pública estática. GitHub Actions construye las imágenes, las publica en GHCR y despliega por SSH. Ver `docs/deployment.md`.
- **Autenticación basada en JWT** con roles dinámicos y autorización por permiso: en cada solicitud se valida firma y expiración, y se consultan en la base el estado del usuario, la versión de sesión y sus permisos actuales, de modo que cambiar la contraseña, el rol o desactivar a un usuario cierra sus sesiones. Política de contraseñas NIST SP 800-63B y límite de intentos de inicio de sesión. Ver `docs/domain.md`.
- **Auditoría** de toda escritura hecha por un usuario (valores antes y después, usuario e IP), registrada en la misma transacción que el cambio.

## 11. Limitaciones conocidas y trabajo futuro
 
- La fórmula matemática exacta del prorrateo de ganancias y gastos usada actualmente por Carlos Andrés todavía no está completamente documentada ni confirmada.
- El módulo de cierre semanal y prorrateo (`/consolidacion`) calcula ganancias, gastos y reparto por socio según porcentaje de inversión, pero el tratamiento de galpones con pérdida es un supuesto pendiente de confirmar. El cálculo se comparó con la hoja de prorrateo de la semana 7-13 ago 2026 y las diferencias están documentadas en `docs/domain.md`.
- El dashboard calcula su resumen semanal con los siete días que terminan en el último cierre diario, no con la semana productiva de viernes a jueves que usa el cierre semanal.
- Solo hay pruebas unitarias del backend (Vitest). No hay pruebas de integración, frontend ni firmware automatizadas.
- Queda pendiente definir con precisión qué determina la cantidad de bultos de alimento por pedido, la base del cálculo de transporte, cómo registrar los huevos regalados a los trabajadores, y por qué la hoja manual reparte más bandejas de B de las vendidas.
- Los conteos que el ESP32 guarda sin conexión viven en memoria: se pierden si el dispositivo se reinicia antes de reconectar.
- El límite de intentos de inicio de sesión vive en memoria del backend y se reinicia con él. El doble factor de autenticación, solicitado por el director de proyecto, sigue pendiente.
- Migración de registros históricos físicos (cuadernos y agenda de contabilidad) al sistema, con apoyo de inteligencia artificial, sigue en fase de diseño.

## 12. Créditos y referencias

- Uso de asistentes de IA: 
    - Apoyo en la digitalización de registros físicos.
    - Generación automatizada de una colección de Postman a partir del código para pruebas de endpoints REST.
    - CodeRabbit en el repositorio para comprobar calidad, mejoras y riesgos a la hora de realizar Pull Request.
    - Generación puntual de código y documentación.

## 13. Licencia

MIT — ver archivo [LICENSE](LICENSE).