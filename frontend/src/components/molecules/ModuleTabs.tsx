import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabScrollButton from "@mui/material/TabScrollButton";
import Tabs from "@mui/material/Tabs";

const SCROLL_ANIMATION_MS = 300;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export type ModuleTab = { label: string; icon: ReactElement };

export type ModuleTabsProps = {
  value: number;
  onChange: (value: number) => void;
  tabs: ModuleTab[];
};

/**
 * Pestañas de módulo con scroll horizontal propio (no el de MUI, que anima
 * hacia el borde). Al cambiar de pestaña, la activa se centra con una
 * animación de scroll hecha en JS (el scroll suave nativo se desactiva cuando
 * el sistema pide reducir movimiento). Las flechas aparecen solo si hay más
 * pestañas hacia ese lado.
 */
export default function ModuleTabs({ value, onChange, tabs }: ModuleTabsProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const animationRef = useRef(0);
  const [overflowing, setOverflowing] = useState(false);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const updateArrows = useCallback(() => {
    const outer = outerRef.current;
    const scroller = scrollerRef.current;
    const content = scroller?.firstElementChild as HTMLElement | null;
    if (!outer || !scroller || !content) return;
    // Se compara contra el ancho total (sin flechas) para que reservar el
    // espacio de las flechas no cambie el resultado.
    setOverflowing(content.offsetWidth > outer.clientWidth + 1);
    setCanScroll({
      left: scroller.scrollLeft > 1,
      right: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1,
    });
  }, []);

  const animateScrollTo = useCallback((target: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    cancelAnimationFrame(animationRef.current);
    const max = scroller.scrollWidth - scroller.clientWidth;
    const from = scroller.scrollLeft;
    const distance = Math.max(0, Math.min(target, max)) - from;
    if (Math.abs(distance) < 1) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / SCROLL_ANIMATION_MS);
      scroller.scrollLeft = from + distance * easeInOutCubic(progress);
      if (progress < 1) animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(animationRef.current), []);

  useEffect(() => {
    const outer = outerRef.current;
    const scroller = scrollerRef.current;
    if (!outer || !scroller) return;
    updateArrows();
    const observer = new ResizeObserver(updateArrows);
    observer.observe(outer);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => observer.disconnect();
  }, [updateArrows, tabs.length]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const scroller = scrollerRef.current;
    const tab = scroller?.querySelectorAll<HTMLElement>('[role="tab"]')[value];
    if (!scroller || !tab) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    animateScrollTo(
      scroller.scrollLeft +
        tabRect.left +
        tabRect.width / 2 -
        (scrollerRect.left + scrollerRect.width / 2),
    );
  }, [value, animateScrollTo]);

  const scrollByPage = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (scroller)
      animateScrollTo(
        scroller.scrollLeft + direction * scroller.clientWidth * 0.7,
      );
  };

  return (
    <Box
      ref={outerRef}
      sx={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid",
        borderColor: "divider",
        mb: 2,
      }}
    >
      {overflowing && (
        <TabScrollButton
          direction="left"
          orientation="horizontal"
          disabled={!canScroll.left}
          onClick={() => scrollByPage(-1)}
        />
      )}
      <Box
        ref={scrollerRef}
        onScroll={updateArrows}
        sx={{
          flex: 1,
          minWidth: 0,
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Tabs
          value={value}
          onChange={(_event, next: number) => onChange(next)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minWidth: "max-content",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.95rem",
              minHeight: 48,
              px: 2,
              borderRadius: 2,
              whiteSpace: "nowrap",
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.label}
              icon={tab.icon}
              iconPosition="start"
              label={tab.label}
            />
          ))}
        </Tabs>
      </Box>
      {overflowing && (
        <TabScrollButton
          direction="right"
          orientation="horizontal"
          disabled={!canScroll.right}
          onClick={() => scrollByPage(1)}
        />
      )}
    </Box>
  );
}
