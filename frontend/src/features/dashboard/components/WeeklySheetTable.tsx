import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import EntitySelect from "../../../components/molecules/EntitySelect";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { tableCardSx, tableSx } from "../../../components/tableStyles";
import { designTokens } from "../../../theme/tokens";
import type {
  CantidadesPorCategoria,
  ResumenSemanal,
  ResumenSemanalGalpon,
} from "../types/dashboard.types";
import { formatCantidad, formatFullDate, formatWeekDay } from "./weeklySummary.utils";

// Separa un galpón del anterior. El primero no lo necesita: lo separa la
// columna de días.
const galponDividerSx = {
  borderLeft: "2px solid",
  borderLeftColor: "divider",
};

const dividerFor = (galponIndex: number, columnIndex = 0) =>
  galponIndex > 0 && columnIndex === 0 ? galponDividerSx : {};

// Chips de categoría compactos para que las columnas sigan cabiendo.
const categoryHeaderSx = {
  "& .MuiChip-root": { height: 20 },
  "& .MuiChip-label": { px: "4px" },
};

const bodegaTint = alpha(designTokens.color.error.main, 0.06);

// La columna de días queda fija al desplazar la tabla en horizontal, así que
// cada celda necesita un fondo opaco igual al de su fila. El separador es una
// sombra y no un borde porque, con bordes colapsados, el borde no se mueve con
// la celda fija.
const stickyDayCellSx = {
  position: "sticky",
  left: 0,
  zIndex: 1,
  whiteSpace: "nowrap",
  bgcolor: "background.paper",
  boxShadow: `inset -2px 0 0 ${designTokens.color.divider}`,
};

const stickyHeadCellSx = {
  ...stickyDayCellSx,
  zIndex: 2,
  bgcolor: "background.default",
};

const stickyBodegaCellSx = {
  ...stickyDayCellSx,
  backgroundImage: `linear-gradient(${bodegaTint}, ${bodegaTint})`,
};

const stickyTotalCellSx = {
  ...stickyDayCellSx,
  bgcolor: "background.default",
};

function GalponCells({
  categorias,
  cantidades,
  galponIndex,
}: {
  categorias: string[];
  cantidades: CantidadesPorCategoria;
  galponIndex: number;
}) {
  return categorias.map((codigo, index) => (
    <TableCell key={codigo} align="center" sx={dividerFor(galponIndex, index)}>
      {formatCantidad(cantidades[codigo])}
    </TableCell>
  ));
}

/**
 * Tabla de la planilla para los galpones indicados: una fila por día, la
 * bodega de la semana anterior (en rojo) y el total.
 */
function SheetTable({
  data,
  galpones,
}: {
  data: ResumenSemanal;
  galpones: ResumenSemanalGalpon[];
}) {
  const hasBodega = galpones.some(
    (galpon) => Object.keys(galpon.bodegaInicial).length > 0,
  );

  return (
    <TableContainer>
      <Table
        size="small"
        sx={{ ...tableSx, minWidth: 0, "& .MuiTableCell-root": { px: { xs: 0.5, md: 0.75 } } }}
      >
        <TableHead>
          {/* Con un solo galpón (vista móvil) su nombre ya está en el selector. */}
          {galpones.length > 1 && (
            <TableRow>
              <TableCell rowSpan={2} sx={stickyHeadCellSx}>
                DÍA
              </TableCell>
              {galpones.map((galpon, galponIndex) => (
                <TableCell
                  key={galpon.id}
                  colSpan={galpon.categorias.length}
                  align="center"
                  sx={{ ...dividerFor(galponIndex), color: "text.primary", whiteSpace: "nowrap" }}
                >
                  {galpon.nombre.toUpperCase()}
                </TableCell>
              ))}
            </TableRow>
          )}
          <TableRow>
            {galpones.length === 1 && <TableCell sx={stickyHeadCellSx}>DÍA</TableCell>}
            {galpones.flatMap((galpon, galponIndex) =>
              galpon.categorias.map((codigo, index) => (
                <TableCell
                  key={`${galpon.id}-${codigo}`}
                  align="center"
                  sx={{ ...categoryHeaderSx, ...dividerFor(galponIndex, index) }}
                >
                  <CategoryBadge codigo={codigo} />
                </TableCell>
              )),
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.fechas.map((fecha, dayIndex) => (
            <TableRow key={fecha} hover>
              <TableCell sx={stickyDayCellSx}>
                <Tooltip title={formatFullDate(fecha)} placement="right">
                  <span>{formatWeekDay(fecha)}</span>
                </Tooltip>
              </TableCell>
              {galpones.map((galpon, galponIndex) => (
                <GalponCells
                  key={galpon.id}
                  galponIndex={galponIndex}
                  categorias={galpon.categorias}
                  cantidades={galpon.dias[dayIndex]?.cantidades ?? {}}
                />
              ))}
            </TableRow>
          ))}
          {hasBodega && (
            <TableRow
              sx={{
                bgcolor: bodegaTint,
                "& td": {
                  color: "error.main",
                  fontWeight: 700,
                  borderTop: "2px solid",
                  borderTopColor: alpha(designTokens.color.error.main, 0.5),
                },
              }}
            >
              <TableCell sx={stickyBodegaCellSx}>
                <Tooltip
                  title={
                    data.fechaCorteBodega
                      ? `Remanente de la semana anterior (corte del ${formatFullDate(data.fechaCorteBodega)})`
                      : "Remanente de la semana anterior"
                  }
                  placement="right"
                >
                  <span>Bodega</span>
                </Tooltip>
              </TableCell>
              {galpones.map((galpon, galponIndex) => (
                <GalponCells
                  key={galpon.id}
                  galponIndex={galponIndex}
                  categorias={galpon.categorias}
                  cantidades={galpon.bodegaInicial}
                />
              ))}
            </TableRow>
          )}
          <TableRow
            sx={{
              bgcolor: "background.default",
              "& td": {
                fontWeight: 800,
                borderTop: "2px solid",
                borderTopColor: "divider",
                borderBottom: 0,
              },
            }}
          >
            <TableCell sx={stickyTotalCellSx}>Total</TableCell>
            {galpones.map((galpon, galponIndex) => (
              <GalponCells
                key={galpon.id}
                galponIndex={galponIndex}
                categorias={galpon.categorias}
                cantidades={galpon.total}
              />
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Planilla semanal como la del cuaderno. En escritorio muestra todos los
 * galpones lado a lado; en pantallas angostas, uno a la vez para que la tabla
 * quepa sin desplazamiento horizontal.
 */
export default function WeeklySheetTable({ data }: { data: ResumenSemanal }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected =
    data.galpones.find((galpon) => galpon.id === selectedId) ?? data.galpones[0];

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Planilla de la semana"
        description="Bandejas por día, galpón y categoría."
        actions={
          <Box sx={{ display: { xs: "block", md: "none" }, width: "100%" }}>
            <EntitySelect
              value={selected?.id ?? null}
              placeholder="Selecciona un galpón"
              ariaLabel="Galpón de la planilla"
              options={data.galpones.map((galpon) => ({
                value: galpon.id,
                label: galpon.nombre,
              }))}
              onChange={setSelectedId}
            />
          </Box>
        }
      />
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <SheetTable data={data} galpones={data.galpones} />
      </Box>
      {selected && (
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          <SheetTable data={data} galpones={[selected]} />
        </Box>
      )}
    </Card>
  );
}
