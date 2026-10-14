import Box from "@mui/material/Box";
import { CATEGORY_COLORS } from "../../../components/atoms/CategoryBadge";

export interface PieSlice {
  codigo: string;
  nombre: string;
  eggs: number;
}

interface CategoryPieProps {
  slices: PieSlice[];
  size?: number;
}

const FALLBACK_COLOR = "#9A8E80";
const FALLBACK_CHIP = { bg: "#F0ECE7", text: "#51483F", border: FALLBACK_COLOR };
const CENTER = 50;
const RADIUS = 48;

const pointAt = (fraction: number, radius = RADIUS) => {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
};

const LABEL_RADIUS = RADIUS + 8;
const LABEL_HEIGHT = 10;
const CHIP_HEIGHT = 8;
const CHIP_VALUES_GAP = 3;
const chipWidth = (codigo: string) => codigo.length * 3.6 + 5;
const VALUES_PADDING = 2.5;
const valuesWidth = (eggs: number, percent: number) =>
  (String(eggs).length * 3.4 + 3) + 2.5 + (String(percent).length + 1) * 3.4 + VALUES_PADDING * 2;
const MAX_RELAX_PASSES = 400;
const RELAX_STEP = 0.004;

interface LabelBox {
  fraction: number; // posición angular de la etiqueta (0-1, desde arriba, horario)
  width: number;
  hx: number;
  hy: number;
  left: number;
  top: number;
}

const placeLabel = (fraction: number, width: number): LabelBox => {
  const [x, y] = pointAt(fraction, LABEL_RADIUS);
  const hx = (x - CENTER) / LABEL_RADIUS;
  const hy = (y - CENTER) / LABEL_RADIUS;
  const left = hx > 0.25 ? x : hx < -0.25 ? x - width : x - width / 2;
  const top = y - LABEL_HEIGHT / 2 + (hy * LABEL_HEIGHT) / 2;
  return { fraction, width, hx, hy, left, top };
};

const overlaps = (p: LabelBox, q: LabelBox) =>
  p.left < q.left + q.width + 1 &&
  q.left < p.left + p.width + 1 &&
  p.top < q.top + LABEL_HEIGHT &&
  q.top < p.top + LABEL_HEIGHT;

// Reparte las etiquetas alrededor de toda la circunferencia: parte del ángulo
// real de cada porción y separa solo las que se pisan.
const relaxLabels = (mids: number[], widths: number[]): LabelBox[] => {
  const fractions = [...mids];
  let boxes = fractions.map((f, i) => placeLabel(f, widths[i]));
  for (let pass = 0; pass < MAX_RELAX_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      const j = (i + 1) % boxes.length;
      if (i === j || !overlaps(boxes[i], boxes[j])) continue;
      fractions[i] -= RELAX_STEP;
      fractions[j] += RELAX_STEP;
      boxes = fractions.map((f, k) => placeLabel(f, widths[k]));
      moved = true;
    }
    if (!moved) break;
  }
  return boxes;
};

const colorOf = (codigo: string) => CATEGORY_COLORS[codigo]?.border ?? FALLBACK_COLOR;

export default function CategoryPie({ slices, size = 270 }: CategoryPieProps) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.eggs), 0);
  // Orden fijo (el de las categorías), empezando arriba y en sentido horario.
  const visible = slices.filter((s) => s.eggs > 0);

  const base = visible.map((s, i) => {
    const start = visible.slice(0, i).reduce((sum, prev) => sum + prev.eggs, 0) / total;
    const end = start + s.eggs / total;
    const [x1, y1] = pointAt(start);
    const [x2, y2] = pointAt(end);
    const percent = Math.round((s.eggs / total) * 100);
    return {
      ...s,
      percent,
      mid: (start + end) / 2,
      path: `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${end - start > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`,
      width: chipWidth(s.codigo) + CHIP_VALUES_GAP + valuesWidth(s.eggs, percent),
    };
  });

  const boxes = relaxLabels(
    base.map((a) => a.mid),
    base.map((a) => a.width),
  );
  const arcs = base.map((a, i) => ({ ...a, box: boxes[i] }));

  const ariaLabel =
    total > 0
      ? `Huevos por categoría: ${arcs.map((a) => `${a.nombre} ${a.eggs} (${a.percent}%)`).join(", ")}`
      : "Sin huevos registrados hoy";

  return (
    <Box sx={{ width: "100%", maxWidth: size * 1.7, flexShrink: 0 }}>
      <svg viewBox="-48 -22 196 144" width="100%" role="img" aria-label={ariaLabel} style={{ display: "block", overflow: "visible" }}>
        {total === 0 ? (
          <>
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="currentColor" fillOpacity={0.08} />
            <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="middle" fontSize="4.5" fill="#7A736E">
              Sin huevos hoy
            </text>
          </>
        ) : arcs.length === 1 ? (
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={colorOf(arcs[0].codigo)} />
        ) : (
          arcs.map((a) => (
            <path key={a.codigo} d={a.path} fill={colorOf(a.codigo)} stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
          ))
        )}

        {total > 0 &&
          arcs.map((a) => {
            const { box } = a;
            const chip = CATEGORY_COLORS[a.codigo] ?? FALLBACK_CHIP;
            const chipW = chipWidth(a.codigo);
            // Los valores van hacia afuera del gráfico: a la derecha del chip en el
            // lado derecho y a la izquierda del chip en el lado izquierdo.
            const valuesOnRight = box.hx >= 0;
            const valuesW = valuesWidth(a.eggs, a.percent);
            const chipX = valuesOnRight ? box.left : box.left + box.width - chipW;
            const valuesX = valuesOnRight ? chipX + chipW + CHIP_VALUES_GAP : box.left;
            const [rimX, rimY] = pointAt(a.mid, RADIUS);
            const [lineX, lineY] = pointAt(box.fraction, RADIUS + 4);
            return (
              <g key={`l-${a.codigo}`} pointerEvents="none">
                <line x1={rimX} y1={rimY} x2={lineX} y2={lineY} stroke={colorOf(a.codigo)} strokeWidth="0.6" />
                <rect
                  x={chipX}
                  y={box.top}
                  width={chipW}
                  height={CHIP_HEIGHT}
                  rx="2"
                  fill={chip.bg}
                  stroke={chip.border}
                  strokeWidth="0.6"
                />
                <text x={chipX + chipW / 2} y={box.top + 6.1} textAnchor="middle" fontSize="5.4" fontWeight="800" fill={chip.text}>
                  {a.codigo}
                </text>
                <rect
                  x={valuesX}
                  y={box.top}
                  width={valuesW}
                  height={CHIP_HEIGHT}
                  rx="2"
                  fill="#FFFFFF"
                  stroke={chip.border}
                  strokeWidth="0.6"
                />
                <text x={valuesX + VALUES_PADDING} y={box.top + 6.1} textAnchor="start" fill="#3A3530">
                  <tspan fontSize="5.6" fontWeight="800">{a.eggs.toLocaleString("es-CO")}</tspan>
                  <tspan fontSize="5.4" fontWeight="600">h</tspan>
                  <tspan dx="2.5" fontSize="5.4" fontWeight="600" fill="#7A736E">{a.percent}%</tspan>
                </text>
              </g>
            );
          })}
      </svg>
    </Box>
  );
}
