import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import samanLogo from "../../assets/saman_logo.png"

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        background: "#fff8ed",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: "100dvh",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            minHeight: { xs: 300, md: "100dvh" },
            p: { xs: 4, md: 8, lg: 12 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            background: "linear-gradient(145deg, #fff6e8 0%, #f9ddd3 52%, #f7cfc4 100%)",
          }}
        >
          <Box
            component="img"
            src={samanLogo}
            alt="Logo de El Samán"
            sx={{ width: "min(100%, 500px)", height: "auto", display: "block" }}
          />
          <Typography sx={{ mt: 2, color: "#8c542f", fontWeight: 600 }}>
            Sistema de Gestión Avícola <i>El Samán</i>
          </Typography>
        </Box>
        <Box
          sx={{
            p: { xs: 4, sm: 8, lg: 12, xl: 16 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#fffdf9",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
