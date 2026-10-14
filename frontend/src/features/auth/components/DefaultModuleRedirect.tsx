import { Navigate } from "react-router-dom"
import LockRoundedIcon from "@mui/icons-material/LockRounded"
import EmptyState from "../../../components/molecules/EmptyState"
import { useAccessibleModules } from "../../../modules"

/** Ruta índice del shell: lleva al primer módulo accesible del usuario. */
export default function DefaultModuleRedirect() {
  const [firstModule] = useAccessibleModules()
  if (!firstModule) {
    return (
      <EmptyState
        icon={<LockRoundedIcon />}
        title="No tienes módulos asignados"
        description="Pide a un administrador que te asigne los permisos necesarios."
      />
    )
  }
  return <Navigate to={firstModule.path} replace />
}
