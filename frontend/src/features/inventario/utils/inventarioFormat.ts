export const formatCopInput = (value: number | string) => {
  const digits = String(value).split(".")[0].replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, -3)},${digits.slice(-3)}`;
  return `${digits.slice(0, -6)}'${digits.slice(-6, -3)},${digits.slice(-3)}`;
};

export const money = (value: number | string) =>
  `$ ${formatCopInput(value)} COP`;

export const amount = (value: number | string) =>
  Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 });

// Las fechas sin hora llegan como medianoche UTC: se formatean en UTC para no
// mostrar el día anterior en la zona horaria local.
export const date = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));

/** Fecha de hoy (AAAA-MM-DD) en zona Bogotá, para valores por defecto de formularios. */
export const todayBogota = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(),
  );

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const phonePattern = /^[0-9()\s-]{7,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidPhone = (value: string) =>
  value === "" || phonePattern.test(value);

export const isValidEmail = (value: string) =>
  value === "" || emailPattern.test(value);

export const receiptMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const movementOptions = [
  { value: "CONSUMO_GALPON", label: "Consumo en galpón", effect: "salida" },
  { value: "AJUSTE_POS", label: "Ajuste positivo", effect: "entrada" },
  { value: "AJUSTE_NEG", label: "Ajuste negativo", effect: "salida" },
  { value: "DEVOLUCION", label: "Devolución", effect: "entrada" },
  { value: "MERMA", label: "Merma o pérdida", effect: "salida" },
] as const;
