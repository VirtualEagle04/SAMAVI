import Box from "@mui/material/Box"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import type { JsonValue } from "../types/auditoria.types"
import { campoLabel, formatValor } from "./auditoria.labels"

interface Props {
  value: JsonValue | undefined
  /** Valor reemplazado en una modificación: se muestra atenuado y tachado. */
  tachado?: boolean
}

type Objeto = { [key: string]: JsonValue }

const isObjeto = (value: JsonValue): value is Objeto =>
  value !== null && typeof value === "object" && !Array.isArray(value)

/** Una fila de una lista de objetos; si tiene categoría, la muestra con su chip. */
function FilaObjeto({ item }: { item: Objeto }) {
  const { categoriaPeso, ...resto } = item
  const detalle = Object.entries(resto)
    .map(([key, value]) => `${campoLabel(key)} ${formatValor(value)}`)
    .join(" · ")
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      {typeof categoriaPeso === "string" && <CategoryBadge codigo={categoriaPeso} />}
      <Typography variant="body2">{detalle}</Typography>
    </Box>
  )
}

export default function ValorAuditoria({ value, tachado = false }: Props) {
  const sx = tachado ? { color: "text.secondary", textDecoration: "line-through", opacity: 0.8 } : {}

  if (Array.isArray(value) && value.length > 0 && value.every(isObjeto)) {
    return (
      <Stack spacing={0.75} sx={sx}>
        {value.map((item, index) => (
          <FilaObjeto key={index} item={item} />
        ))}
      </Stack>
    )
  }

  if (value !== undefined && isObjeto(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) return <Typography variant="body2" sx={sx}>—</Typography>
    return (
      <Stack spacing={0.25} sx={sx}>
        {entries.map(([key, item]) => (
          <Typography key={key} variant="body2">
            <Box component="span" sx={{ color: "text.secondary" }}>
              {campoLabel(key)}:
            </Box>{" "}
            {formatValor(item)}
          </Typography>
        ))}
      </Stack>
    )
  }

  return (
    <Typography variant="body2" sx={{ fontWeight: tachado ? 400 : 600, overflowWrap: "anywhere", ...sx }}>
      {formatValor(value)}
    </Typography>
  )
}
