export const productionTableCardSx = {
  overflow: "hidden",
  bgcolor: "background.paper",
}

export const productionTableToolbarSx = {
  p: 2,
  borderBottom: "1px solid",
  borderColor: "divider",
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  alignItems: { xs: "stretch", sm: "center" },
  justifyContent: "space-between",
  gap: 1.5,
}

export const productionTableActionsSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 1,
  width: { xs: "100%", sm: "auto" },
  justifyContent: { xs: "flex-start", sm: "flex-end" },
}

export const productionTableTitleSx = {
  fontWeight: 700,
  fontSize: "1.125rem",
  lineHeight: 1.35,
}

export const productionTableDescriptionSx = {
  color: "text.secondary",
  fontSize: "0.875rem",
  lineHeight: 1.4,
}

export const productionTableFiltersSx = {
  "& .MuiInputBase-root": {
    minHeight: 40,
    fontSize: "0.875rem",
    lineHeight: 1.4,
  },
  "& .MuiSelect-select": {
    fontSize: "0.875rem",
    lineHeight: 1.4,
  },
}

export const productionTableSx = {
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
}

export const productionTableMobileCardSx = {
  p: 1.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
}

export const productionTableMobilePrimaryTextSx = {
  fontSize: "0.875rem",
  fontWeight: 700,
  lineHeight: 1.4,
}

export const productionTablePaginationSx = {
  borderTop: "1px solid",
  borderColor: "divider",
}
