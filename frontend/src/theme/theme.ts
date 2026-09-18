import { createTheme } from "@mui/material/styles"

const BRAND = "#E57373"
const BRAND_DARK = "#C62828"
const BRAND_LIGHT = "#FFEBEE"

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: BRAND,
      dark: BRAND_DARK,
      light: BRAND_LIGHT,
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F2F2F7",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1C1C1E",
      secondary: "#3A3A3C",
      disabled: "#8E8E93",
    },
    error: {
      main: "#D32F2F",
      light: "#FFCDD2",
    },
    success: {
      main: "#34C759",
    },
    divider: "#E5E5EA",
  },
  typography: {
    fontFamily: "'Inter', -apple-system, 'SF Pro Text', system-ui, sans-serif",
    h4: { fontWeight: 800, letterSpacing: "-0.5px" },
    h5: { fontWeight: 700, letterSpacing: "-0.3px" },
    h6: { fontWeight: 700 },
    body1: { fontSize: "1rem", lineHeight: 1.5 },
    body2: { fontSize: "0.9rem", lineHeight: 1.5, color: "#3A3A3C" },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: "0.2px" },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 56,
          borderRadius: 14,
          fontSize: "1.05rem",
          fontWeight: 700,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
          "&:active": { boxShadow: "none", transform: "scale(0.98)" },
        },
        contained: {
          background: BRAND,
          "&:hover": { background: BRAND_DARK },
        },
        outlined: {
          borderWidth: 2,
          "&:hover": { borderWidth: 2 },
        },
        text: {
          minHeight: 44,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          "& .MuiInputBase-root": {
            fontSize: "1.05rem",
            borderRadius: 12,
            minHeight: 56,
          },
          "& .MuiInputLabel-root": {
            fontSize: "1rem",
            fontWeight: 500,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1.5,
          },
          "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
            borderWidth: 2,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: "0.95rem",
          fontWeight: 600,
          alignItems: "center",
        },
        message: { padding: "4px 0" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)",
        },
      },
    },
  },
})
