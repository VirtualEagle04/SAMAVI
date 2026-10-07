# SAMAVI

## Alcance

Estas instrucciones aplican a todo el repositorio. Antes de cambiar código, identifica el área responsable y lee el `AGENTS.md` más cercano si existe.

SAMAVI es un monorepo para la gestión avícola y el conteo de huevos. Sus áreas principales son:

- `backend/`: API REST y lógica de negocio con Node.js, Express, TypeScript y Prisma.
- `frontend/`: aplicación web con React, TypeScript, Vite, Material UI y Zustand.
- `firmware/`: firmware ESP32 con PlatformIO y sensores VL53L0X.
- `infra/`: PostgreSQL y Mosquitto mediante Docker Compose.
- `database/`: documentación o esquema SQL heredado. Verifica su autoridad antes de modificarlo.

Para contexto de dominio, arquitectura y hardware, consulta los documentos de `docs/`. Para procedimientos específicos de agentes, consulta `.agents/` solo cuando esta guía lo indique.

## Reglas de trabajo

- Mantén los cambios dentro del módulo responsable. Evita refactors no relacionados.
- Inspecciona el código y la configuración actuales antes de asumir una decisión técnica.
- No inventes valores de hardware, contratos MQTT, reglas de negocio, credenciales ni datos de producción. Marca lo desconocido como pendiente.
- No incluyas secretos, archivos `.env`, contraseñas, tokens o claves privadas en cambios, logs ni documentación.
- Usa TypeScript explícito y evita `any` cuando exista una forma razonable de modelar el dato.
- En el backend, la persistencia debe pasar por Prisma salvo una excepción justificada y documentada.
- Todo `JSON.parse` aplicado a payloads MQTT debe manejar errores con `try/catch` y validación del resultado.
- El firmware debe conservar el conteo local durante interrupciones de Wi-Fi o MQTT.
- Antes de cambiar el esquema de datos, revisa `backend/prisma/schema.prisma`, `database/schema.sql` y el código que consume esas entidades. No asumas cuál es la fuente oficial si hay contradicciones.

## Comandos verificados

Ejecuta los comandos desde la raíz del repositorio.

- Instalar dependencias: `npm run install:all`.
- Levantar PostgreSQL y Mosquitto: `npm run infra:up`.
- Levantar infraestructura, backend y frontend: `npm run dev`.
- Detener infraestructura: `npm run dev:down`.
- Reiniciar volúmenes de infraestructura: `npm run infra:reset`. Este comando elimina datos locales.
- Generar Prisma y compilar backend y frontend: `npm run build:all`.
- Ejecutar pruebas unitarias del backend: `npm --prefix backend run test:once`.
- Ejecutar lint del frontend: `npm --prefix frontend run lint`.
- Compilar firmware: usar PlatformIO desde `firmware/` y confirmar primero el entorno definido en `firmware/platformio.ini`.

Si un comando falla por una precondición del entorno, informa la causa y no ocultes el fallo. No ejecutes `infra:reset` sin confirmar que los datos locales descartables.

## Validación por área

- Cambios en `backend/`: ejecuta las pruebas unitarias relevantes y el build del backend. Si afectan Prisma, genera el cliente antes de compilar.
- Cambios en `frontend/`: ejecuta lint y build del frontend.
- Cambios en `firmware/`: compila el entorno de PlatformIO y revisa el hardware real antes de cambiar pines, direcciones I2C o secuencias XSHUT.
- Cambios en `infra/`, configuración MQTT o esquema de datos: valida los archivos afectados y, si el entorno está disponible, prueba el arranque correspondiente.
- Cambios compartidos o de configuración: ejecuta `npm run build:all` además de las comprobaciones específicas.

Añade o actualiza pruebas cuando cambie el comportamiento. Si no es posible ejecutar una validación, explica qué faltó.

## Fuentes de verdad

Resuelve contradicciones en este orden:

1. Código y configuración actuales.
2. Decisiones técnicas explícitas y vigentes.
3. Documentación específica del área en `docs/`.
4. README y documentación general.
5. Fuentes externas de componentes.
6. Suposiciones. No las presentes como hechos.

Si una implementación contradice la documentación, conserva el comportamiento vigente hasta confirmar el cambio y documenta la discrepancia.

## Colaboración Git

Usa Conventional Commits. Trabaja en ramas descriptivas y no hagas push directo a `main`. Los cambios de comportamiento deben incluir pruebas o una explicación de por qué no son viables.

## Documentación adicional

- Descripción general: `docs/overview.md`.
- Arquitectura: `docs/architecture.md`.
- Dominio: `docs/domain.md`.
- Hardware: `docs/hardware.md`.
- MQTT: `docs/protocols/mqtt.md`.
- Requisitos: `docs/requirements.md`.
- Flujo humano de contribución: `CONTRIBUTING.md`.
- Integración de hosts de agentes: `.agents/README.md`.
