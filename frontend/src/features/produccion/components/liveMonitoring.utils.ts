import { useEffect, useState } from "react";

export const EGGS_PER_TRAY = 30;

export const splitEggs = (eggs: number) => {
  const safe = Math.max(0, eggs);
  return {
    trays: Math.floor(safe / EGGS_PER_TRAY),
    eggs: safe % EGGS_PER_TRAY,
  };
};

export const formatRelativeTime = (value: string | Date | null | undefined, now: number) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;

  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 5) return "ahora";
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
};

// Reloj que se actualiza cada `intervalMs` para refrescar los "hace X s".
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
