import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import EmptyState from "../../../components/molecules/EmptyState";
import EntitySelect from "../../../components/molecules/EntitySelect";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { tableCardSx } from "../../../components/tableStyles";
import type { ResultadoGalpon } from "../types/consolidacion.types";
import GalponSheet from "./GalponSheet";

/**
 * Hojas de prorrateo de la semana, una por galpón. En escritorio se ven todas
 * (dos por fila); en pantallas angostas, una a la vez con un selector.
 */
export default function GalponSheets({ galpones }: { galpones: ResultadoGalpon[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = galpones.find((galpon) => galpon.id === selectedId) ?? galpones[0];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Card elevation={0} variant="outlined" sx={tableCardSx}>
        <TableToolbar
          title="Hoja del cuaderno"
          description="Lo que vendió y gastó cada galpón, su saldo y el reparto entre socios. Si una venta no dice de qué galpón salió, sus bandejas se reparten según lo que tenía cada galpón."
          actions={galpones.length > 1 ? (
            <Box sx={{ display: { xs: "block", md: "none" }, width: "100%" }}>
              <EntitySelect
                value={selected?.id ?? null}
                placeholder="Selecciona un galpón"
                ariaLabel="Galpón de la hoja"
                options={galpones.map((galpon) => ({ value: galpon.id, label: galpon.nombre }))}
                onChange={setSelectedId}
              />
            </Box>
          ) : undefined}
        />
        {galpones.length === 0 && (
          <EmptyState
            icon={<HomeWorkRoundedIcon />}
            title="Sin galpones en la semana"
            description="No hay galpones activos ni movimientos registrados para esta semana."
          />
        )}
      </Card>

      {galpones.length > 0 && (
        <>
          <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            {galpones.map((galpon) => <GalponSheet key={galpon.id} galpon={galpon} />)}
          </Box>
          {selected && (
            <Box sx={{ display: { xs: "block", md: "none" } }}>
              <GalponSheet galpon={selected} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
