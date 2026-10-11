import { createTheme } from "@mui/material/styles"
import { designTokens } from "./tokens"

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: designTokens.color.primary,
    secondary: designTokens.color.secondary,
    background: designTokens.color.background,
    text: designTokens.color.text,
    divider: designTokens.color.divider,
    warning: designTokens.color.warning,
    info: designTokens.color.info,
    success: designTokens.color.success,
    error: designTokens.color.error,
  },
  spacing: 8,
  shape: { borderRadius: designTokens.shape.borderRadius },
  typography: {
    fontFamily: designTokens.typography.interface,
    subtitle1: { fontSize: "1.125rem", lineHeight: 1.5 },
    body1: { fontSize: "1rem", lineHeight: 1.5 },
    body2: { fontSize: "0.875rem", lineHeight: 1.4 },
    button: { fontSize: "0.875rem", fontWeight: 500, textTransform: "none" },
    caption: { fontSize: "0.75rem", lineHeight: 1.3 },
    h1: { fontFamily: designTokens.typography.heading, fontSize: "3rem", fontWeight: 700, lineHeight: 1.15 },
    h2: { fontFamily: designTokens.typography.heading, fontSize: "2.375rem", fontWeight: 700, lineHeight: 1.2 },
    h3: { fontFamily: designTokens.typography.heading, fontSize: "1.875rem", fontWeight: 600, lineHeight: 1.25 },
    h4: { fontFamily: designTokens.typography.heading, fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3 },
    h5: { fontFamily: designTokens.typography.heading, fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.3 },
    h6: { fontFamily: designTokens.typography.heading, fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.35 },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        h1: { color: `${designTokens.color.heading} !important` },
        h2: { color: `${designTokens.color.heading} !important` },
        h3: { color: `${designTokens.color.heading} !important` },
        h4: { color: `${designTokens.color.heading} !important` },
        h5: { color: `${designTokens.color.heading} !important` },
        h6: { color: `${designTokens.color.heading} !important` },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { color: `${designTokens.color.heading} !important` } },
    },
    MuiTableHead: {
      styleOverrides: { root: { backgroundColor: designTokens.color.background.default } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { color: designTokens.color.text.secondary, fontWeight: 700, borderColor: designTokens.color.divider },
        root: { borderColor: designTokens.color.divider },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: designTokens.shape.cardRadius } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, padding: "10px 20px", borderRadius: designTokens.shape.buttonRadius } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: designTokens.shape.cardRadius, border: `1px solid ${designTokens.color.divider}`, boxShadow: "none" } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { boxShadow: "none" }, rounded: { borderRadius: designTokens.shape.cardRadius }, outlined: { borderColor: designTokens.color.divider } },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", fullWidth: true },
      styleOverrides: { root: { "& .MuiOutlinedInput-root": { borderRadius: designTokens.shape.inputRadius, "& fieldset": { borderColor: designTokens.color.divider }, "&:hover fieldset": { borderColor: designTokens.color.secondary.main } } } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: designTokens.shape.inputRadius, "& .MuiOutlinedInput-notchedOutline": { borderColor: designTokens.color.divider }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: designTokens.color.secondary.main } } },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: designTokens.shape.chipRadius } } },
  },
})

export default theme
