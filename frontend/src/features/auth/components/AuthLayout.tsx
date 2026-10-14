import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import samanLogo from "../../../assets/saman_logo.png";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <Box
      sx={{ minHeight: "100dvh", width: "100%", bgcolor: "background.default" }}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: "100dvh",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1fr) minmax(420px, 0.85fr)",
          },
        }}
      >
        <Box
          sx={{
            minHeight: { xs: 220, sm: 260, md: "100%" },
            px: { xs: 3, sm: 5, md: 8 },
            py: { xs: 4, md: 8 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            background:
              "linear-gradient(145deg, #FBF9F6 0%, #EDE3D1 68%, #E8A88A 120%)",
          }}
        >
          <Box
            component="img"
            src={samanLogo}
            alt="Logo de El Samán"
            sx={{ width: "min(100%, 400px)", height: "auto", display: "block" }}
          />
        </Box>
        <Box
          sx={{
            px: { xs: 3, sm: 6, md: 7, lg: 9 },
            py: { xs: 5, md: 7 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            bgcolor: "background.paper",
            borderColor: "divider",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 400, mx: "auto" }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
