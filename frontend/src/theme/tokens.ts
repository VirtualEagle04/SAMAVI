export const designTokens = {
  color: {
    primary: { main: "#5C4333", light: "#8C6E59", dark: "#3A2A1E", contrastText: "#FFFFFF" },
    secondary: { main: "#C87A57", light: "#E8A88A", dark: "#965335", contrastText: "#FFFFFF" },
    background: { default: "#FBF9F6", paper: "#FFFFFF" },
    text: { primary: "#3A3530", secondary: "#7A736E" },
    heading: "#622f02",
    divider: "#E6E1DA",
    warning: { main: "#D99B26", light: "#F7E5B5" },
    info: { main: "#A88C52", light: "#EDE3D1" },
    success: { main: "#6B8E62" },
    error: { main: "#C05C56" },
  },
  shape: { borderRadius: 12, buttonRadius: 10, cardRadius: 16, chipRadius: 8, inputRadius: 10 },
  typography: {
    heading: "'Bree Serif', Georgia, serif",
    interface: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
} as const
