# Recursos para agentes

Esta carpeta contiene material complementario. No es la fuente universal de instrucciones del repositorio.

## Orden de carga

1. `AGENTS.md` en la raíz.
2. El `AGENTS.md` más cercano al archivo que se modifica.
3. `.github/copilot-instructions.md` y las instrucciones por ruta cuando el host sea GitHub Copilot.
4. El documento técnico específico de `docs/`.
5. Un procedimiento de `.agents/skills/` cuando la tarea lo requiera.

Los hosts que usen OpenRouter o Antigravity deben leer estos archivos y construir el contexto explícitamente. El modelo por sí solo no descubre archivos del repositorio.

## Contenido existente

La información vigente debe vivir en `AGENTS.md`, `CONTRIBUTING.md` o el documento específico de `docs/`.

## Integración externa

Un host de agentes debe:

- Detectar la raíz Git del repositorio.
- Cargar `AGENTS.md` y los `AGENTS.md` anidados entre la raíz y el directorio de trabajo.
- Cargar solo los documentos de `docs/` relacionados con la tarea.
- Excluir `.env`, secretos, credenciales y archivos generados.
- Tratar la documentación como guía y verificar en el código cualquier dato que pueda haber cambiado.
