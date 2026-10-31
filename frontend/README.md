# Frontend SAMAVI

Aplicación web de SAMAVI construida con React 19, TypeScript, Vite, Material
UI, Zustand y React Router.

## Desarrollo

Desde la raíz del repositorio:

```bash
cd frontend && npm install && cd ..
npm --prefix frontend run dev
```

No uses `npm --prefix frontend install` desde la raíz: npm añade la raíz del
repositorio como dependencia `"samavi": "file:.."`.

Comandos disponibles:

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run preview
```

## Rutas actuales

| Ruta | Vista |
| --- | --- |
| `/login` | Inicio de sesión |
| `/admin` | Flujo inicial de administración |
| `/galpon` | Flujo inicial de galpón |
| `/ventas` | Flujo inicial de ventas y bodega |
| `/app` | Flujo inicial general |

La autenticación del frontend todavía usa usuarios simulados definidos en
`src/services/authService.ts`. La integración con `POST /api/v1/auth/login` del
backend está pendiente.
