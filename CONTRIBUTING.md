# Contribuir

Este documento es la única fuente del flujo Git, para personas y agentes. Los comandos de validación, la arquitectura y las reglas técnicas están en `AGENTS.md`.

## Git

- Trabaja en una rama descriptiva, por ejemplo `feat/backend-produccion`, `feat/frontend-produccion` o `docs/agents`. No hagas push directo a `main`.
- Usa Conventional Commits, por ejemplo `feat: agrega registro de usuarios` o `fix: corrige cálculo de total`.
- Integra mediante Pull Request y revisa el resultado de las validaciones antes de pedir revisión.

## Cambios

- Mantén cada cambio dentro del módulo responsable y evita refactors no relacionados.
- Un cambio de comportamiento incluye pruebas o una explicación de por qué no son viables, y actualiza la documentación afectada.
- Antes de abrir el PR ejecuta las validaciones de tu área (`AGENTS.md`, sección «Comandos y validación»). Si alguna no puede ejecutarse, documenta la causa y el impacto en el PR.
- Mantén archivos `.md` relevantes al cambio actualizados en caso de que información previa ya no sea coherente con los cambios.
