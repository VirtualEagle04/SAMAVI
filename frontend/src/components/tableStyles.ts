import { designTokens } from "../theme/tokens";

export const tableCardSx = {
  overflow: "hidden",
  bgcolor: "background.paper",
};

export const tableToolbarSx = {
  p: 2,
  borderBottom: "1px solid",
  borderColor: "divider",
  display: "flex",
  flexDirection: "column",
  gap: 1.5,
};

export const tableHeaderRowSx = {
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  alignItems: { xs: "stretch", sm: "center" },
  justifyContent: "space-between",
  gap: 1.5,
};

export const tableActionsSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 1,
  width: { xs: "100%", sm: "auto" },
  justifyContent: { xs: "flex-start", sm: "flex-end" },
};

export const tableTitleSx = {
  fontWeight: 700,
  fontSize: "1.125rem",
  lineHeight: 1.35,
};

export const tableDescriptionSx = {
  color: "text.secondary",
  fontSize: "0.875rem",
  lineHeight: 1.4,
};

export const tableControlSx = {
  "& .MuiInputBase-root": {
    minHeight: designTokens.control.height,
    bgcolor: "background.paper",
  },
  // El tamaño va en el texto y no en la raíz: la muesca del label se calcula
  // con la fuente de la raíz y, si es menor, el label se sale del hueco.
  "& .MuiInputBase-input": {
    fontSize: "0.875rem",
    lineHeight: 1.4,
  },
};

export const tableSx = {
  minWidth: 700,
  "& .MuiTableCell-head": {
    py: 1.5,
    fontSize: "0.75rem",
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "0.04em",
    color: "text.secondary",
  },
  "& .MuiTableCell-body": {
    py: 1.5,
    fontSize: "0.875rem",
    lineHeight: 1.4,
  },
};

export const tableMobileCardSx = {
  p: 1.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
};

export const tableMobilePrimaryTextSx = {
  fontSize: "0.875rem",
  fontWeight: 700,
  lineHeight: 1.4,
};

export const tablePaginationSx = {
  borderTop: "1px solid",
  borderColor: "divider",
};

export const tablePaginationLabels = {
  labelRowsPerPage: "Filas por página:",
  labelDisplayedRows: ({
    from,
    to,
    count,
  }: {
    from: number;
    to: number;
    count: number;
  }) => `${from}-${to} de ${count}`,
};
