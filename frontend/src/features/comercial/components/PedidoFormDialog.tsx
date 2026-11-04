import { useEffect, useMemo, useState, type FormEvent } from "react"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded"
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded"
import Alert from "@mui/material/Alert"
import Autocomplete from "@mui/material/Autocomplete"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import type { CategoriaComercial, Mayorista, Pedido, PrecioMayorista } from "../types/comercial.types"
import { formatPesos, precioConfigurado } from "./comercial.format"

type Payload = { mayoristaId: number; detalles: { categoriaPeso: string; cantidadSolicitada: number }[] }
type Props = {
  open: boolean
  mayoristas: Mayorista[]
  categorias: CategoriaComercial[]
  pedido?: Pedido | null
  precios: PrecioMayorista[]
  onClienteChange: (id: number) => void
  onClose: () => void
  onSave: (data: Payload, pedidoId?: number) => Promise<void>
  onCreateMayorista?: (nombre: string) => Promise<Mayorista>
}

const sectionTitleSx = { fontWeight: 700, fontSize: "0.8rem", letterSpacing: 0.4, color: "text.secondary", textTransform: "uppercase", mb: 1 } as const
const stepButtonSx = { border: "1px solid", borderColor: "divider", width: { xs: 40, sm: 34 }, height: { xs: 40, sm: 34 } } as const

export default function PedidoFormDialog({ open, mayoristas, categorias, pedido, precios, onClienteChange, onClose, onSave, onCreateMayorista }: Props) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"))
  const [cliente, setCliente] = useState<Mayorista | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState("")
  const [error, setError] = useState("")

  const priceMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const precio of precios) {
      const valor = precioConfigurado(precio)
      if (valor !== null) map.set(precio.codigoCategoriaPeso, valor)
    }
    return map
  }, [precios])
  const lines = useMemo(() => categorias.filter((category) => (cantidades[category.codigo] ?? 0) > 0), [categorias, cantidades])
  const totalTrays = lines.reduce((sum, line) => sum + cantidades[line.codigo], 0)
  const missingPrices = lines.filter((line) => !priceMap.has(line.codigo))
  const estimated = lines.reduce((sum, line) => sum + cantidades[line.codigo] * (priceMap.get(line.codigo) ?? 0), 0)

  useEffect(() => {
    if (!open) return
    setCliente(pedido ? mayoristas.find((item) => item.id === pedido.idMayorista) ?? null : null)
    if (pedido) onClienteChange(pedido.idMayorista)
    setCantidades(Object.fromEntries(pedido?.detalles.map((line) => [line.codigoCategoriaPeso, line.cantidadSolicitada]) ?? []))
    setError("")
    setCreating(false)
  }, [open, pedido, mayoristas])

  const reset = () => {
    setCliente(null)
    setCantidades({})
    setError("")
    setCreateName("")
    setCreating(false)
  }
  const close = () => {
    if (saving) return
    reset()
    onClose()
  }
  const setCount = (codigo: string, value: number) =>
    setCantidades((state) => ({ ...state, [codigo]: Math.max(0, Math.floor(value) || 0) }))

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (creating) return
    if (!cliente || lines.length === 0) {
      setError(!cliente ? "Elige el cliente del pedido." : "Agrega al menos una bandeja.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave({ mayoristaId: cliente.id, detalles: lines.map((line) => ({ categoriaPeso: line.codigo, cantidadSolicitada: cantidades[line.codigo] })) }, pedido?.id)
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el pedido.")
    } finally {
      setSaving(false)
    }
  }

  const createClient = async () => {
    const nombre = createName.trim()
    if (!onCreateMayorista || !nombre) return
    setSaving(true)
    setError("")
    try {
      const created = await onCreateMayorista(nombre)
      setCliente(created)
      onClienteChange(created.id)
      setCreating(false)
      setCreateName("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el cliente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      slotProps={{ paper: { sx: fullScreen ? { borderRadius: 0 } : undefined } }}
    >
      {/* `noValidate`: los mensajes de error son los del formulario, no los del navegador. */}
      <Box component="form" noValidate onSubmit={save} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 1, pr: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" variant="h6" sx={{ display: "block" }}>
            {pedido ? `Editar pedido #${pedido.id}` : "Nuevo pedido"}
          </Typography>
          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block" }}>
            Elige el cliente y cuántas bandejas pidió de cada categoría.
          </Typography>
        </Box>
        <IconButton aria-label="Cerrar" onClick={close} disabled={saving} edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        {/* 1. Cliente */}
        <Typography sx={sectionTitleSx}>Cliente</Typography>
        {creating ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 3 }}>
            <TextField
              autoFocus
              required
              label="Nombre del nuevo cliente"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void createClient()
                }
              }}
            />
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button onClick={() => { setCreating(false); setCreateName("") }} disabled={saving} sx={{ flex: { xs: 1, sm: "none" } }}>
                Cancelar
              </Button>
              <Button variant="contained" disabled={saving || !createName.trim()} onClick={() => void createClient()} sx={{ flex: { xs: 1, sm: "none" } }}>
                Agregar
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 3, alignItems: { sm: "center" } }}>
            <Autocomplete
              fullWidth
              options={mayoristas}
              value={cliente}
              onChange={(_, value) => {
                setCliente(value)
                if (value) onClienteChange(value.id)
              }}
              getOptionLabel={(item) => item.nombre}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText="No hay clientes con ese nombre"
              renderInput={(params) => <TextField {...params} required label="Cliente mayorista" placeholder="Busca por nombre" />}
            />
            {onCreateMayorista && !pedido && (
              <Button startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => setCreating(true)} sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}>
                Nuevo cliente
              </Button>
            )}
          </Stack>
        )}

        {/* 2. Bandejas */}
        <Typography sx={sectionTitleSx}>Bandejas por categoría</Typography>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          {categorias.map((category, index) => {
            const count = cantidades[category.codigo] ?? 0
            const unitPrice = priceMap.get(category.codigo)
            const active = count > 0
            return (
              <Box
                key={category.codigo}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "minmax(0, 1fr) auto", sm: "minmax(0, 1fr) auto 120px" },
                  columnGap: 1.5,
                  rowGap: 0.5,
                  alignItems: "center",
                  px: { xs: 1.5, sm: 2 },
                  py: 1.25,
                  borderTop: index === 0 ? 0 : "1px solid",
                  borderColor: "divider",
                  bgcolor: active ? "rgba(200, 122, 87, 0.06)" : "transparent",
                  transition: "background-color 150ms",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <CategoryBadge codigo={category.codigo} nombre={category.nombre} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }} noWrap>
                    {unitPrice === undefined ? "Sin precio" : `${formatPesos(unitPrice)} / bandeja`}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <IconButton aria-label={`Quitar una bandeja de ${category.nombre}`} size="small" disabled={count === 0} onClick={() => setCount(category.codigo, count - 1)} sx={stepButtonSx}>
                    <RemoveRoundedIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    value={count || ""}
                    placeholder="0"
                    onChange={(e) => setCount(category.codigo, Number(e.target.value.replace(/\D/g, "")))}
                    onFocus={(e) => e.target.select()}
                    slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": `Bandejas de ${category.nombre}` } }}
                    sx={{ width: 64, "& .MuiInputBase-input": { textAlign: "center", fontWeight: 700, fontSize: "1rem", py: 0.9 } }}
                  />
                  <IconButton aria-label={`Agregar una bandeja de ${category.nombre}`} size="small" onClick={() => setCount(category.codigo, count + 1)} sx={stepButtonSx}>
                    <AddRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {/* En móvil el subtotal baja a una segunda línea y solo aparece si hay bandejas. */}
                <Typography
                  variant="body2"
                  sx={{
                    gridColumn: { xs: "1 / -1", sm: "auto" },
                    display: { xs: active ? "block" : "none", sm: "block" },
                    textAlign: "right",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: !active || unitPrice === undefined ? "text.disabled" : "text.primary",
                  }}
                >
                  {!active ? "—" : unitPrice === undefined ? "Sin precio" : formatPesos(count * unitPrice)}
                </Typography>
              </Box>
            )
          })}
        </Box>

        {cliente && missingPrices.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Falta el precio de {missingPrices.map((line) => line.nombre).join(", ")} para este cliente. Configúralo en la pestaña Precios para calcular el total estimado.
          </Alert>
        )}
        {error && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, gap: 1, flexWrap: "wrap" }}>
        {/* Resumen siempre visible: en móvil el formulario es de pantalla completa. */}
        <Box sx={{ mr: "auto", minWidth: 0, flexBasis: { xs: "100%", sm: "auto" }, display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Bandejas</Typography>
            <Typography sx={{ fontWeight: 800 }}>{totalTrays.toLocaleString("en-US")}</Typography>
          </Box>
          <Box sx={{ textAlign: { xs: "right", sm: "left" } }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Total estimado</Typography>
            <Typography sx={{ fontWeight: 800 }}>
              {missingPrices.length ? "Faltan precios" : formatPesos(estimated)}
            </Typography>
          </Box>
        </Box>
        <Button onClick={close} disabled={saving} sx={{ flex: { xs: 1, sm: "none" } }}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={saving || creating} sx={{ flex: { xs: 1, sm: "none" } }}>
          {saving ? "Guardando…" : pedido ? "Guardar cambios" : "Guardar pedido"}
        </Button>
      </DialogActions>
      </Box>
    </Dialog>
  )
}
