# Contribuir

## Cambios

Mantén cada cambio dentro del módulo responsable y evita refactors no relacionados. Actualiza pruebas y documentación cuando cambie el comportamiento público.

## Git

Usa Conventional Commits, por ejemplo `feat: agrega registro de usuarios` o `fix: corrige cálculo de total`. Usa ramas descriptivas como `feat/backend-produccion`, `feat/frontend-produccion` o `docs/agents`.

No hagas push directo a `main`. Integra los cambios mediante Pull Request y revisa el resultado de las validaciones antes de solicitar revisión.

## Validación mínima

Backend: `npm --prefix backend run test:once` y `npm --prefix backend run build`.

Frontend: `npm --prefix frontend run lint` y `npm --prefix frontend run build`.

Cambios compartidos: `npm run build:all`.

Firmware: compila el entorno correspondiente con PlatformIO desde `firmware/`.

Si una validación no puede ejecutarse, documenta la causa y el impacto.
