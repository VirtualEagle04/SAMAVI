export interface FilterOption {
  value: string;
  label: string;
}

interface BaseFilterField {
  key: string;
  label: string;
}

export interface SelectFilterField extends BaseFilterField {
  type: "select";
  /** Texto de la opción que no filtra (valor vacío). */
  allLabel: string;
  options: FilterOption[];
}

export interface DateFilterField extends BaseFilterField {
  type: "date";
}

export interface SwitchFilterField extends BaseFilterField {
  type: "switch";
  /** Texto del chip cuando el interruptor está activo. */
  activeLabel: string;
}

export type FilterField = SelectFilterField | DateFilterField | SwitchFilterField;

/** Texto corto del valor activo de un filtro, usado en los chips. */
export function describeFilterValue(field: FilterField, value: string): string {
  if (field.type === "switch") return field.activeLabel;
  if (field.type === "select") {
    const label = field.options.find((option) => option.value === value)?.label ?? value;
    return `${field.label}: ${label}`;
  }
  const [year, month, day] = value.split("-");
  return `${field.label}: ${day}/${month}/${year}`;
}
