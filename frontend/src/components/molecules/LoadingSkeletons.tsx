import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import Skeleton from "@mui/material/Skeleton"
import { tableCardSx, tableToolbarSx } from "../tableStyles"

const range = (count: number) => Array.from({ length: count }, (_, index) => index)

export type KpiCardsSkeletonProps = {
  count: number
  /** Columnas en escritorio (`md`); en móvil siempre son dos. */
  columns?: number
}

/** Fila de tarjetas KPI: etiqueta, valor y leyenda. */
export function KpiCardsSkeleton({ count, columns = 3 }: KpiCardsSkeletonProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${columns}, minmax(0, 1fr))` },
        gap: 2,
      }}
    >
      {range(count).map((index) => (
        <Card key={index} sx={{ p: 2 }}>
          <Skeleton variant="text" width="55%" sx={{ fontSize: "0.75rem" }} />
          <Skeleton variant="text" width="70%" sx={{ fontSize: "1.75rem" }} />
          <Skeleton variant="text" width="85%" sx={{ fontSize: "0.75rem" }} />
        </Card>
      ))}
    </Box>
  )
}

export type TableSkeletonProps = {
  rows?: number
  columns?: number
  /** Muestra la barra con título y búsqueda de `TableToolbar`. */
  toolbar?: boolean
}

/**
 * Tabla en carga: en escritorio cabecera y filas; en móvil, tarjetas como las
 * listas de los módulos.
 */
export function TableSkeleton({ rows = 5, columns = 4, toolbar = true }: TableSkeletonProps) {
  return (
    <Card sx={tableCardSx} aria-busy="true">
      {toolbar && (
        <Box sx={tableToolbarSx}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="30%" sx={{ fontSize: "1.125rem", minWidth: 140 }} />
              <Skeleton variant="text" width="45%" sx={{ fontSize: "0.875rem", minWidth: 180 }} />
            </Box>
            <Skeleton variant="rounded" width={96} height={40} sx={{ display: { xs: "none", sm: "block" } }} />
          </Box>
          <Skeleton variant="rounded" height={40} />
        </Box>
      )}

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <Box sx={{ display: "flex", gap: 2, px: 2, py: 1.5, bgcolor: "background.default" }}>
          {range(columns).map((column) => (
            <Skeleton key={column} variant="text" sx={{ flex: 1, fontSize: "0.875rem" }} />
          ))}
        </Box>
        {range(rows).map((row) => (
          <Box key={row} sx={{ display: "flex", gap: 2, px: 2, py: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
            {range(columns).map((column) => (
              <Skeleton key={column} variant="text" sx={{ flex: 1, fontSize: "0.875rem" }} />
            ))}
          </Box>
        ))}
      </Box>

      <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
        {range(Math.min(rows, 4)).map((row) => (
          <Box key={row} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" sx={{ fontSize: "0.75rem" }} />
          </Box>
        ))}
      </Box>
    </Card>
  )
}

export type CardGridSkeletonProps = {
  count: number
  height?: number
}

/** Rejilla de tarjetas (p. ej. galpones): 1, 2 o 3 columnas según el ancho. */
export function CardGridSkeleton({ count, height = 180 }: CardGridSkeletonProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      {range(count).map((index) => (
        <Skeleton key={index} variant="rounded" height={height} />
      ))}
    </Box>
  )
}

export type PageSkeletonProps = {
  /** Tarjetas KPI bajo el encabezado; 0 para omitirlas. */
  kpis?: number
  kpiColumns?: number
  /** Pestañas de `ModuleTabs` sobre el contenido; 0 para omitirlas. */
  tabs?: number
  /** Forma del contenido principal. */
  content?: "table" | "cards"
  /** Muestra el título y la descripción de la página. */
  header?: boolean
}

/**
 * Esqueleto de página con la misma estructura que los módulos: encabezado,
 * KPIs, pestañas y tabla o tarjetas. Reserva el espacio para que no salte el
 * diseño al llegar los datos.
 */
export default function PageSkeleton({
  kpis = 0,
  kpiColumns,
  tabs = 0,
  content = "table",
  header = true,
}: PageSkeletonProps) {
  return (
    <Box
      role="status"
      aria-label="Cargando"
      sx={{ display: "flex", flexDirection: "column", gap: 3 }}
    >
      {header && (
        <Box>
          <Skeleton variant="text" width={260} sx={{ fontSize: { xs: "1.7rem", sm: "2rem" }, maxWidth: "70%" }} />
          <Skeleton variant="text" width={360} sx={{ maxWidth: "90%" }} />
        </Box>
      )}
      {kpis > 0 && <KpiCardsSkeleton count={kpis} columns={kpiColumns} />}
      {tabs > 0 && (
        <Box sx={{ display: "flex", gap: 1 }}>
          {range(tabs).map((tab) => (
            <Skeleton key={tab} variant="rounded" width={112} height={36} />
          ))}
        </Box>
      )}
      {content === "table" ? <TableSkeleton /> : <CardGridSkeleton count={6} />}
    </Box>
  )
}
