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
| Node.js | 18.18+ (backend), 20.19+ (frontend/Vite) | Requerido por Prisma, Express y Vite |
| npm | Incluido con Node.js | Gestor de paquetes del monorepo |
| Docker Desktop | Última estable | Para levantar Mosquitto y PostgreSQL localmente |
| PlatformIO | Última estable | Compilación y carga del firmware al ESP32 |
| PostgreSQL | 16 (vía imagen `postgres:16-alpine`) | Docker Compose, BDR, puerto `5432` |
| Mosquitto | 2.x (vía imagen `eclipse-mosquitto:2`) | Docker Compose, Broker MQTT, puerto `1883` |

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
 
# 5. Configurar el firmware (solo si se va a cargar al ESP32)
copy firmware\include\config.h.example firmware\include\config.h
# completar WIFI_SSID, WIFI_PASSWORD y MQTT_SERVER en config.h
```

## 5. Cómo ejecutar el proyecto

```bash
# Levanta Mosquitto, PostgreSQL, backend y frontend en paralelo
npm run dev
 
# Para detener la infraestructura local
npm run dev:down

# Para borrar por completo los contenedores
npm run infra:reset
```

También se pueden ejecutar los componentes por separado:

```bash
npm run infra:up                 # Infraestructura: PostgreSQL y Mosquitto
npm --prefix backend run dev     # Backend con tsx watch
npm --prefix frontend run dev    # Frontend con Vite
```

## 6. Cómo ejecutar las pruebas

> No hay una suite de pruebas automatizadas formalizada en el repositorio **por ahora.** Actualmente se están generando de forma automática, a partir del código, una colección de Postman con los requests de todos los endpoints del backend para probarlos manualmente. Esta colección aún no ha sido compartida ni incorporada al repositorio.

- **Framework de pruebas:** Pendiente de definir (en construcción: colección de Postman).
- **Cobertura actual:** No aplica todavía.
- **Qué se está probando:** Por ahora, validación manual de los endpoints REST del módulo disponibles mediante Postman.

## 7. Estructura del repositorio

```text
SAMAVI/
├── backend/                   # API y lógica del servidor (Node.js, Express 5, TypeScript, Prisma)
│   ├── prisma/                # schema.prisma
│   └── src/
│       ├── config/            # Variables de entorno
│       ├── database/          # Cliente Prisma
│       ├── middleware/        # Auth y manejo de errores
│       ├── modules/           # auth, produccion, comercial
│       ├── mqtt/              # Handler de mensajes MQTT
│       └── shared/            # Errores compartidos
├── frontend/                  # Aplicación web (React 19, TypeScript, Vite, Material UI)
│   └── src/
│       ├── components/        # Átomos, moléculas, organismos, templates
│       ├── features/          # Flujos por rol (auth, admin, bodega, galpon, clasificacion)
│       ├── services/          # Cliente de autenticación
│       ├── stores/            # Estado global (Zustand)
│       └── theme/             # Tema de Material UI
├── firmware/                  # Proyecto PlatformIO para el ESP32
│   ├── include/               # config.h (excluido de git)
│   └── src/                   # main.cpp y variantes de prueba de sensores
├── infra/                     # Docker Compose y configuración de Mosquitto
│   └── mosquitto/
├── database/                  # schema.sql (esquema relacional inicial, 19 tablas)
├── .github/                   # Instrucciones de Copilot, informe de levantamiento, modelo de datos
├── .env.example
├── .gitignore
├── package.json               # Scripts raíz (infra, dev, build:all, install:all)
└── README.md
```

## 8. Flujo de trabajo con Git

- Rama `main`: siempre estable. **No se hace push directo.**
- Ramas de trabajo: `feat/<descripcion-corta>`, `fix/<descripcion-corta>`, `docs/<...>`.
- Todo cambio entra a `main` mediante **Pull Request** revisado por al menos otro integrante y con ayuda de CodeRabbit.
- Mensajes de commit en formato [Conventional Commits](https://www.conventionalcommits.org/es/), por ejemplo `feat: agrega registro de usuarios`, `fix: corrige cálculo de total`.
- Toda la lógica MQTT debe permanecer en el backend. La persistencia siempre pasa por Prisma. El ESP32 no escribe directamente en la base de datos.
- Se busca mantener los cambios dentro del módulo responsable, evitando refactors no relacionados.
- Gestión de tareas y seguimiento del avance mediante un tablero de Trello.

## 9. Estado del proyecto y avances

El cronograma del proyecto se organiza en cuatro fases (ver Anexo 14: Estructura de Desglose del Trabajo, y Anexo 15: Diagrama de Gantt):
 
| Fase | Fecha | Alcance comprometido | Estado |
|---|---|---|---|
| Sprint 1 | Agosto 24 - Septiembre 6 | Creación del repositorio oficial por parte del docente Andrés Rey | Completado |
| Sprint 2 | Septiembre 7 - Septiembre 27 | - | Pendiente |

## 10. Decisiones técnicas relevantes

- **Arquitectura de monolito modular** (no microservicios), acorde a un equipo pequeño y una concurrencia esperada de máximo 3 usuarios simultáneos.
- **Sensores ópticos VL53L0X + ESP32** para el conteo no invasivo de huevos por peso, evaluados con pruebas satisfactorias de conectividad y ya adquiridos antes de definir el resto de la arquitectura.
- **MQTT sobre TLS** como protocolo de comunicación entre el ESP32 y el backend, tolerante a intermitencias de red gracias a reconexión explícita de WiFi y MQTT en el firmware.
- **Express.js + PostgreSQL + Prisma ORM + TypeScript** para el backend, elegidos por dominio del equipo, bajo costo de licenciamiento y adecuación a una API REST de baja concurrencia.
- **React + Vite + Material UI + TypeScript** para el frontend, priorizando reactividad y facilidad de uso para usuarios con poca experiencia tecnológica.
- **Despliegue en AWS Lightsail sobre Docker Compose** (nginx, backend, Mosquitto, PostgreSQL), preferido frente al despliegue local en Raspberry Pi por mayor confiabilidad ante cortes eléctricos y una IP pública estática.
- **Autenticación basada en JWT** con control de acceso por roles (RBAC), validando firma, expiración y permisos en cada solicitud a un recurso protegido.

## 11. Limitaciones conocidas y trabajo futuro
 
- La fórmula matemática exacta del prorrateo de ganancias y gastos usada actualmente por Carlos Andrés todavía no está completamente documentada ni confirmada.
- El módulo de prorrateo semanal (cálculo automático de ganancias, gastos y saldo por socio según porcentaje de inversión) todavía no está implementado en el backend.
- El frontend cuenta con un dashboard de monitoreo en vivo conectado a la API de producción, pero aún no cubre los flujos completos de inventario, pedidos, ventas, cierre semanal y prorrateo para los distintos roles.
- No existe todavía una suite de pruebas automatizadas, solo una colección de Postman en construcción para pruebas manuales de endpoints.
- Queda pendiente definir con precisión qué determina la cantidad de bultos de alimento por pedido, la base del cálculo de transporte, y por qué las categorías Yumbo y B no reconcilian exactamente en el prorrateo.
- Mecanismos de doble factor de autenticación y protección contra ataques de fuerza bruta fueron solicitados por el director de proyecto y siguen pendientes de implementación.
- Migración de registros históricos físicos (cuadernos y agenda de contabilidad) al sistema, con apoyo de inteligencia artificial, sigue en fase de diseño.

## 12. Créditos y referencias

- Uso de asistentes de IA: 
    - Apoyo en la digitalización de registros físicos.
    - Generación automatizada de una colección de Postman a partir del código para pruebas de endpoints REST.
    - CodeRabbit en el repositorio para comprobar calidad, mejoras y riesgos a la hora de realizar Pull Request.
    
## 13. Licencia

MIT — ver archivo [LICENSE](LICENSE).