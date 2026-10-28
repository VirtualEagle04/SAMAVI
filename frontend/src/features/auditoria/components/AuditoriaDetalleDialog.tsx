import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded"
import EventRoundedIcon from "@mui/icons-material/EventRounded"
import LanRoundedIcon from "@mui/icons-material/LanRounded"
import PersonRoundedIcon from "@mui/icons-material/PersonRounded"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Typography from "@mui/material/Typography"
import type { ReactNode } from "react"
import type { RegistroAuditoria } from "../types/auditoria.types"
import { ACCIONES, type CampoCambio, campoLabel, compararCampos, formatFechaHora, tablaLabel } from "./auditoria.labels"
import ValorAuditoria from "./ValorAuditoria"

interface Props {
  registro: RegistroAuditoria | null
  onClose: () => void
}

const DESCRIPCION: Record<RegistroAuditoria["accion"], string> = {
  INSERT: "Valores con los que se creó",
  UPDATE: "Valores antes y después del cambio",
  DELETE: "Valores que tenía al eliminarse",
}

function Metadato({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 1.5,
          display: "grid",
          placeItems: "center",
          bgcolor: "background.paper",
          color: "primary.main",
          border: "1px solid",
          borderColor: "divider",
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  )
}

function ValorCampo({ campo, accion }: { campo: CampoCambio; accion: RegistroAuditoria["accion"] }) {
  if (accion === "INSERT") return <ValorAuditoria value={campo.despues} />
  if (accion === "DELETE") return <ValorAuditoria value={campo.antes} />
  if (!campo.cambio) return <ValorAuditoria value={campo.despues} />
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <ValorAuditoria value={campo.antes} tachado />
      <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
      <ValorAuditoria value={campo.despues} />
    </Box>
  )
}

export default function AuditoriaDetalleDialog({ registro, onClose }: Props) {
  const campos = registro ? compararCampos(registro.antes, registro.despues) : []
  const accion = registro ? ACCIONES[registro.accion] : null
  // En una modificación, los campos que cambiaron van primero.
  const ordenados = registro?.accion === "UPDATE" ? [...campos].sort((a, b) => Number(b.cambio) - Number(a.cambio)) : campos

  return (
    <Dialog open={registro !== null} onClose={onClose} fullWidth maxWidth="sm">
      {registro && accion && (
        <>
          <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              {tablaLabel(registro.tabla)} #{registro.registro}
              <Chip size="small" color={accion.color} label={accion.label} />
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: { xs: 1.25, sm: 1.5 },
                p: 1.5,
                mt: 1,
                borderRadius: 2,
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Metadato icon={<PersonRoundedIcon />} label="Usuario" value={registro.usuario.nombre} />
              <Metadato icon={<EventRoundedIcon />} label="Fecha" value={formatFechaHora(registro.fechaHora)} />
              <Metadato icon={<LanRoundedIcon />} label="IP de origen" value={registro.ip ?? "—"} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700, mt: 2.5, mb: 0.5 }}>
              {DESCRIPCION[registro.accion].toUpperCase()}
            </Typography>
            <Box>
              {ordenados.map((campo) => {
                const cambio = registro.accion === "UPDATE" && campo.cambio
                return (
                  <Box
                    key={campo.campo}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" },
                      gap: { xs: 0.5, sm: 2 },
                      py: 1.25,
                      px: cambio ? 1.25 : 0,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      ...(cambio ? { bgcolor: "warning.light", borderRadius: 1.5, borderBottomColor: "transparent", my: 0.5 } : {}),
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {campoLabel(campo.campo)}
                    </Typography>
                    <ValorCampo campo={campo} accion={registro.accion} />
                  </Box>
                )
              })}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cerrar</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
