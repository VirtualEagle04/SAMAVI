import { useState, type MouseEvent } from "react"
import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import ButtonBase from "@mui/material/ButtonBase"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded"
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded"
import { useAuthStore } from "../stores/authStore"

const MENU_ID = "user-menu"
const TRIGGER_ID = "user-menu-trigger"

function initials(user: string | null): string {
  return user?.slice(0, 2).toUpperCase() ?? "SA"
}

const avatarSx = {
  bgcolor: "primary.light",
  color: "primary.dark",
  fontWeight: 800,
} as const

export type UserMenuProps = {
  onLogout: () => void
}

/** Avatar del header: abre un menú con el usuario, su rol y cerrar sesión. */
export default function UserMenu({ onLogout }: UserMenuProps) {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = anchorEl !== null

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)
  const handleLogout = () => {
    handleClose()
    onLogout()
  }

  return (
    <>
      <ButtonBase
        id={TRIGGER_ID}
        onClick={handleOpen}
        aria-label={`Menú de ${user ?? "usuario"}`}
        aria-controls={open ? MENU_ID : undefined}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : undefined}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 0.5,
          pr: { xs: 0.5, sm: 1 },
          borderRadius: 999,
          textAlign: "left",
          transition: "background-color 150ms",
          "&:hover, &.Mui-focusVisible": { backgroundColor: "rgba(200, 122, 87, 0.08)" },
        }}
      >
        <Avatar sx={{ ...avatarSx, width: 40, height: 40, fontSize: "0.95rem" }}>{initials(user)}</Avatar>
        <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: "0.95rem" }} noWrap>
            {user ?? "Usuario"}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }} noWrap>
            {role ?? "Invitado"}
          </Typography>
        </Box>
        <KeyboardArrowDownRoundedIcon
          fontSize="small"
          sx={{
            display: { xs: "none", sm: "block" },
            color: "text.secondary",
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </ButtonBase>

      <Menu
        id={MENU_ID}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: { mt: 1, minWidth: 240, border: "1px solid", borderColor: "divider" } },
          list: { "aria-labelledby": TRIGGER_ID },
        }}
      >
        <Box sx={{ px: 2, pt: 1, pb: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ ...avatarSx, width: 44, height: 44 }}>{initials(user)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Sesión iniciada como
            </Typography>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {user ?? "Usuario"}
            </Typography>
            <Chip
              size="small"
              label={role ?? "Invitado"}
              sx={{ mt: 0.5, bgcolor: "rgba(200, 122, 87, 0.14)", color: "primary.dark", fontWeight: 600 }}
            />
          </Box>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ mt: 0.5, py: 1.25 }}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cerrar sesión</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
