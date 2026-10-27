import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import EmptyState from "../../../components/molecules/EmptyState";
import TableToolbar from "../../../components/molecules/TableToolbar";
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tableSx,
} from "../../../components/tableStyles";
import type { RepartoGalponSocio, RepartoSocio } from "../types/consolidacion.types";
import { formatCantidad, formatMoney } from "./consolidacion.utils";

type Props = { socios: RepartoSocio[] };

const galponLabel = (galpon: RepartoGalponSocio) =>
  `${galpon.nombre} · ${formatCantidad(galpon.porcentaje)} % · ${formatMoney(galpon.valor)}`;

/** Lo que recibe cada socio según su porcentaje de inversión en cada galpón. */
export default function SociosTable({ socios }: Props) {
  return (
    <Card elevation={0} variant="outlined" sx={tableCardSx}>
      <TableToolbar title="Reparto por socio" description="Lo que corresponde a cada socio según su porcentaje en cada galpón." />
      {socios.length === 0 ? (
        <EmptyState
          icon={<GroupsRoundedIcon />}
          title="Sin socios con inversión"
          description="Ningún galpón de la semana tiene socios registrados."
        />
      ) : (
        <>
          <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
            {socios.map((socio) => (
              <Box key={socio.id} sx={tableMobileCardSx}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                  <Typography sx={tableMobilePrimaryTextSx}>{socio.nombre}</Typography>
                  <Typography sx={{ ...tableMobilePrimaryTextSx, fontWeight: 800 }}>{formatMoney(socio.total)}</Typography>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                  {socio.galpones.map((galpon) => (
                    <Chip key={galpon.id} size="small" variant="outlined" label={galponLabel(galpon)} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table sx={{ ...tableSx, minWidth: 0 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Socio</TableCell>
                  <TableCell>Galpones</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {socios.map((socio) => (
                  <TableRow key={socio.id}>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{socio.nombre}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {socio.galpones.map((galpon) => (
                          <Chip key={galpon.id} size="small" variant="outlined" label={galponLabel(galpon)} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>{formatMoney(socio.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Card>
  );
}
