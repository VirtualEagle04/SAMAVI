# SAMAVI - Instrucciones para agentes

## 1. Reglas Generales
- No usar em-dashes.
- No usar emojis.
- No usar bullet points para separar texto.
- No usar puntos y comas.

## 2. Código

- Siempre envolver `JSON.parse` de payloads MQTT en `try/catch`.
- Tipar payloads MQTT y respuestas API explícitamente. No usar `any` en TypeScript.
- Usar Prisma para persistencia. Evitar SQL crudo salvo una excepción justificada.
- No agregar sentencias SQL en archivos de migración. Introducir cambios directamente en `/database/schema.sql`.
- Organizar las sentencias SQL de forma jerárquica, de manera que no salten errores porque algo no está declarado antes de la dependencia.
- Mantener los cambios dentro del módulo responsable y evitar refactors no relacionados.

## 3. Git

- Usar nomenclatura Conventional Commits:
    - e.g. `<type>[optional scope]: <description>`.
- De ser necesario, introducir más detalles en una lista posterior:
    - e.g.
    ```text
    refactor: polish commercial and production views
    
    - Rediseñar la página comercial con búsqueda, filtros de estado y un diseño actualizado
    - Reordenar las pestañas de producción y simplificar la vista de cierres diarios
    - Mover los componentes de autenticación a la función de autenticación
    - Actualizar las etiquetas e íconos de navegación, y reformatear el esquema SQL
    ```
- De ser necesario, las ramas deben seguir la nomenclatura `<tipo>/<backend o frontend>-<modulo>-[integration si es frontend]`.
    - e.g. `feat/frontend-produccion-integration`, `docs/README`, `tests/unit-produccion`, `feat/backend-produccion`.
