import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

function SamaviLogo() {
  return (
    <Box sx={{ textAlign: "center", mb: 4 }}>
      {/* Egg icon */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          background: "linear-gradient(145deg, #FFCDD2 0%, #E57373 100%)",
          mx: "auto",
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(229,115,115,0.35)",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <ellipse cx="20" cy="22" rx="11" ry="13" fill="rgba(255,255,255,0.9)" />
          <ellipse cx="20" cy="20" rx="7" ry="8.5" fill="rgba(255,255,255,0.6)" />
        </svg>
      </Box>

      <Typography
        variant="h4"
        sx={{ color: "#1C1C1E", letterSpacing: "-1px", mb: 0.5 }}
      >
        SAMAVI
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "#8E8E93", fontWeight: 500, letterSpacing: "0.5px" }}
      >
        Granja Avícola El Samán
      </Typography>
    </Box>
  )
}

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #FFEBEE 0%, #F2F2F7 45%, #F2F2F7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          bgcolor: "background.paper",
          borderRadius: 4,
          p: { xs: 3, sm: 4.5 },
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
        }}
      >
        <SamaviLogo />
        {children}
      </Box>
    </Box>
  )
}
