import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import type { CategoriaComercial, Mayorista, PrecioMayorista } from "../types/comercial.types"
import { formatPesos, formatWeightRange, precioConfigurado } from "./comercial.format"

type Props = {
  cliente: Mayorista | null
  categorias: CategoriaComercial[]
  precios: PrecioMayorista[]
  /** Categoría cuyo campo recibe el foco al abrir (p. ej. la fila que se tocó). */
  focusCategoria?: string | null
  onClose: () => void
  /** Guarda los precios cambiados; devuelve cuando todos quedaron guardados. */
  onSave: (cambios: { categoriaPeso: string; valorUnitario: number }[]) => Promise<void>
}

const digitsOf = (value: string) => value.replace(/\D/g, "")
const toInput = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)

export default function PreciosDialog({ cliente, categorias, precios, focusCategoria, onClose, onSave }: Props) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"))
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const actuales = useMemo(() => {
    const map = new Map<string, number>()
    for (const precio of precios) {
      const valor = precioConfigurado(precio)
      if (valor !== null) map.set(precio.codigoCategoriaPeso, valor)
    }
    return map
  }, [precios])

  // El formulario se reinicia solo al abrirse para un cliente. Si los precios se
  // refrescan con el diálogo abierto (guardado parcial), se conserva lo escrito y el error.
  const openedFor = useRef<number | null>(null)
  useEffect(() => {
    const id = cliente?.id ?? null
    if (id === openedFor.current) return
    openedFor.current = id
    if (id === null) return
    setValues(Object.fromEntries([...actuales].map(([codigo, valor]) => [codigo, toInput(valor)])))
    setError("")
  }, [cliente?.id, actuales])

  const cambios = categorias.flatMap((categoria) => {
    const digits = digitsOf(values[categoria.codigo] ?? "")
    const nuevo = digits ? Number(digits) : null
    if (nuevo === null || nuevo <= 0 || nuevo === actuales.get(categoria.codigo)) return []
    return [{ categoriaPeso: categoria.codigo, valorUnitario: nuevo }]
  })
  // El backend no borra precios: uno ya configurado no puede quedar vacío ni en cero.
  const invalidos = new Set(
    categorias
      .filter((categoria) => actuales.has(categoria.codigo) && Number(digitsOf(values[categoria.codigo] ?? "") || 0) <= 0)
      .map((categoria) => categoria.codigo),
  )
  const configurados = categorias.filter((categoria) => actuales.has(categoria.codigo)).length

  const close = () => {
    if (!saving) onClose()
  }

  const updateValue = (codigo: string, raw: string) => {
    const digits = digitsOf(raw)
    setValues((current) => ({ ...current, [codigo]: digits ? toInput(Number(digits)) : "" }))
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (invalidos.size > 0) {
      setError("Un precio ya configurado no se puede borrar. Escribe un valor mayor a cero.")
      return
    }
    if (cambios.length === 0) {
      setError("No hay cambios para guardar.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(cambios)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los precios.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={Boolean(cliente)}
      onClose={close}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      slotProps={{
        paper: { component: "form", onSubmit: save, sx: fullScreen ? { borderRadius: 0 } : undefined },
        transition: {
          onEntered: () => {
            const codigo = focusCategoria ?? categorias[0]?.codigo
            if (codigo) inputRefs.current[codigo]?.select()
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 1, pr: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" variant="h6" sx={{ display: "block" }}>
            Precios por bandeja
          </Typography>
          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block" }} noWrap>
            {cliente?.nombre} · {configurados} de {categorias.length} categorías con precio
          </Typography>
        </Box>
        <IconButton aria-label="Cerrar" onClick={close} disabled={saving} edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Escribe el precio que paga este cliente por cada bandeja. Si una categoría no tiene precio, deja el campo
          vacío.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {categorias.map((categoria) => {
            const actual = actuales.get(categoria.codigo)
            const digits = digitsOf(values[categoria.codigo] ?? "")
            const cambiado = digits !== "" && Number(digits) !== actual && Number(digits) > 0
            const invalido = invalidos.has(categoria.codigo)
            return (
              <Box
                key={categoria.codigo}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 220px" },
                  gap: { xs: 1, sm: 2 },
                  alignItems: "center",
                  py: 1.5,
                  borderTop: "1px solid",
                  borderColor: "divider",
                  "&:first-of-type": { borderTop: 0 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                  <CategoryBadge codigo={categoria.codigo} nombre={categoria.nombre} />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {formatWeightRange(categoria)}
                  </Typography>
                  {cambiado && <Chip size="small" color="secondary" variant="outlined" label="Modificado" sx={{ ml: "auto" }} />}
                </Box>
                <TextField
                  size="small"
                  label="Precio por bandeja"
                  placeholder="Sin precio"
                  value={values[categoria.codigo] ?? ""}
                  onChange={(e) => updateValue(categoria.codigo, e.target.value)}
                  error={invalido}
                  helperText={
                    invalido
                      ? "No se puede dejar vacío"
                      : cambiado && actual !== undefined
                        ? `Antes: ${formatPesos(actual)}`
                        : undefined
                  }
                  inputRef={(element: HTMLInputElement | null) => {
                    inputRefs.current[categoria.codigo] = element
                  }}
                  slotProps={{
                    htmlInput: { inputMode: "numeric", "aria-label": `Precio por bandeja de ${categoria.nombre}` },
                    input: {
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      endAdornment: <InputAdornment position="end">COP</InputAdornment>,
                    },
                  }}
                  sx={{ "& .MuiInputBase-input": { fontWeight: 700, fontSize: "1rem" } }}
                />
              </Box>
            )
          })}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, gap: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
          {cambios.length === 0 ? "Sin cambios" : `${cambios.length} ${cambios.length === 1 ? "precio por guardar" : "precios por guardar"}`}
        </Typography>
        <Button onClick={close} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" disabled={saving || cambios.length === 0}>
          {saving ? "Guardando…" : "Guardar precios"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
