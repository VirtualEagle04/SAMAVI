import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import EmptyState from "../../../components/molecules/EmptyState";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { tableCardSx, tableMobileCardSx, tableMobilePrimaryTextSx } from "../../../components/tableStyles";
import type { RepartoGalponSocio, RepartoSocio, ResultadoGalpon } from "../types/consolidacion.types";
import { formatCantidad, formatMoney } from "./consolidacion.utils";

type Props = {
  /** Galpones de la semana, cada uno con el reparto de sus socios. */
  galpones: ResultadoGalpon[];
  /** Totales por socio sumando todos sus galpones. */
  socios: RepartoSocio[];
};

const percentTextSx = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textAlign: "right" } as const;
const sectionLabelSx = { fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.4 } as const;
const listSx = { listStyle: "none", m: 0, p: 0 } as const;
const dividedItemSx = { borderTop: "1px solid", borderColor: "divider", "&:first-of-type": { borderTop: 0 } } as const;

function PercentBar({ porcentaje }: { porcentaje: number }) {
  return (
    <Box aria-hidden sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "divider", overflow: "hidden" }}>
      <Box sx={{ width: `${Math.min(porcentaje, 100)}%`, height: "100%", bgcolor: "primary.light", borderRadius: 3 }} />
    </Box>
  );
}

function ARepartir({ valor }: { valor: number }) {
  return (
    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        A repartir
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>{formatMoney(valor)}</Typography>
    </Box>
  );
}

const subtitulo = (galpon: ResultadoGalpon) =>
  galpon.repartible === 0
    ? "Nada para repartir esta semana"
    : `${galpon.socios.length} ${galpon.socios.length === 1 ? "socio" : "socios"}`;

/** Móvil: cada socio en dos líneas (nombre y valor; barra y porcentaje). */
function MobileSocio({ socio }: { socio: RepartoGalponSocio }) {
  return (
    <Box component="li" sx={{ py: 1, ...dividedItemSx }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
        <Typography sx={{ ...tableMobilePrimaryTextSx, fontWeight: 600, minWidth: 0 }} noWrap>
          {socio.nombre}
        </Typography>
        <Typography sx={{ ...tableMobilePrimaryTextSx, fontWeight: 800, whiteSpace: "nowrap" }}>
          {formatMoney(socio.valor)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
        <PercentBar porcentaje={socio.porcentaje} />
        <Typography variant="caption" color="text.secondary" sx={{ ...percentTextSx, minWidth: 40 }}>
          {formatCantidad(socio.porcentaje)} %
        </Typography>
      </Box>
    </Box>
  );
}

/** Escritorio: una fila por socio con nombre, barra y porcentaje, y valor. */
function DesktopSocio({ socio }: { socio: RepartoGalponSocio }) {
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 180px 140px",
        columnGap: 2,
        alignItems: "center",
        px: 2,
        py: 1.25,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
        {socio.nombre}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PercentBar porcentaje={socio.porcentaje} />
        <Typography variant="body2" color="text.secondary" sx={{ ...percentTextSx, minWidth: 48 }}>
          {formatCantidad(socio.porcentaje)} %
        </Typography>
      </Box>
      <Typography sx={{ ...percentTextSx, fontWeight: 800 }}>{formatMoney(socio.valor)}</Typography>
    </Box>
  );
}

/** Lo que recibe cada socio en cada galpón según su porcentaje de inversión. */
export default function SociosTable({ galpones, socios }: Props) {
  const conSocios = galpones.filter((galpon) => galpon.socios.length > 0);
  const sinSocios = galpones.filter((galpon) => galpon.socios.length === 0);
  const sinSociosTexto = `Sin socios registrados: ${sinSocios.map((galpon) => galpon.nombre).join(", ")}.`;

  return (
    <Card elevation={0} variant="outlined" sx={tableCardSx}>
      <TableToolbar
        title="Reparto por galpón"
        description="Lo que recibe cada socio en cada galpón según su porcentaje de inversión."
      />
      {conSocios.length === 0 ? (
        <EmptyState
          icon={<GroupsRoundedIcon />}
          title="Sin socios con inversión"
          description="Ningún galpón de la semana tiene socios registrados."
        />
      ) : (
        <>
          {/* Móvil: una tarjeta por galpón y otra con los totales. */}
          <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
            {conSocios.map((galpon) => (
              <Box key={galpon.id} component="section" aria-labelledby={`reparto-movil-${galpon.id}`} sx={tableMobileCardSx}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                    pb: 1,
                    mb: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography id={`reparto-movil-${galpon.id}`} sx={{ fontWeight: 800 }} noWrap>
                      {galpon.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {subtitulo(galpon)}
                    </Typography>
                  </Box>
                  <ARepartir valor={galpon.repartible} />
                </Box>
                <Box component="ul" sx={listSx}>
                  {galpon.socios.map((socio) => (
                    <MobileSocio key={socio.id} socio={socio} />
                  ))}
                </Box>
              </Box>
            ))}

            {sinSocios.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                {sinSociosTexto}
              </Typography>
            )}

            {socios.length > 0 && (
              <Box sx={tableMobileCardSx}>
                <Typography variant="caption" sx={sectionLabelSx}>
                  Total por socio
                </Typography>
                <Box component="ul" sx={{ ...listSx, mt: 0.5 }}>
                  {socios.map((socio) => (
                    <Box
                      component="li"
                      key={socio.id}
                      sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.75, ...dividedItemSx }}
                    >
                      <Typography sx={{ ...tableMobilePrimaryTextSx, fontWeight: 600, minWidth: 0 }} noWrap>
                        {socio.nombre}
                      </Typography>
                      <Typography sx={{ ...tableMobilePrimaryTextSx, fontWeight: 800, whiteSpace: "nowrap" }}>
                        {formatMoney(socio.total)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Escritorio: un bloque por galpón y los totales al final. */}
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            {conSocios.map((galpon) => (
              <Box
                key={galpon.id}
                component="section"
                aria-labelledby={`reparto-galpon-${galpon.id}`}
                sx={{ borderBottom: "1px solid", borderColor: "divider" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    bgcolor: "background.default",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography id={`reparto-galpon-${galpon.id}`} sx={{ fontWeight: 800 }} noWrap>
                      {galpon.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {subtitulo(galpon)}
                    </Typography>
                  </Box>
                  <ARepartir valor={galpon.repartible} />
                </Box>
                <Box component="ul" sx={listSx}>
                  {galpon.socios.map((socio) => (
                    <DesktopSocio key={socio.id} socio={socio} />
                  ))}
                </Box>
              </Box>
            ))}

            {sinSocios.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}
              >
                {sinSociosTexto}
              </Typography>
            )}

            {socios.length > 0 && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" sx={sectionLabelSx}>
                  Total por socio
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1.5, mt: 1 }}>
                  {socios.map((socio) => (
                    <Box key={socio.id} sx={{ minWidth: 0 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {socio.nombre}
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{formatMoney(socio.total)}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}
    </Card>
  );
}
