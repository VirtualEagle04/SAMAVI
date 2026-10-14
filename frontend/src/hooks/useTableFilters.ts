import { useCallback, useMemo, useState } from "react";

/** Un valor vacío ("") significa "sin filtrar". Los interruptores usan "1". */
export type FilterValues<K extends string> = Record<K, string>;

export function useTableFilters<K extends string>(
  keys: readonly K[],
  initialRowsPerPage = 10,
) {
  const emptyValues = useMemo(
    () => Object.fromEntries(keys.map((key) => [key, ""])) as FilterValues<K>,
    [keys],
  );
  const [search, setSearchState] = useState("");
  const [values, setValues] = useState<FilterValues<K>>(emptyValues);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPageState] = useState(initialRowsPerPage);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(0);
  }, []);

  const setValue = useCallback((key: K, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setPage(0);
  }, []);

  const reset = useCallback(() => {
    setValues(emptyValues);
    setPage(0);
  }, [emptyValues]);

  const setRowsPerPage = useCallback((value: number) => {
    setRowsPerPageState(value);
    setPage(0);
  }, []);

  const activeCount = keys.filter((key) => values[key] !== "").length;

  /** Recorta la lista a la página actual, sin salirse del rango si la lista se encoge. */
  const paginate = useCallback(
    <T,>(items: T[]) => {
      const lastPage = Math.max(0, Math.ceil(items.length / rowsPerPage) - 1);
      const safePage = Math.min(page, lastPage);
      return {
        rows: items.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage),
        page: safePage,
      };
    },
    [page, rowsPerPage],
  );

  return {
    search,
    setSearch,
    values,
    setValue,
    reset,
    activeCount,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    paginate,
  };
}
