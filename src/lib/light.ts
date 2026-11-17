// Where the light on glass comes from: it follows a mouse or pen across the page, always from above.

/**
 * The light's direction for a pointer at (x, y) in a viewport of width by height: --light-x from -0.8
 * (left) to 0.8 (right), and --light-y from -1 (straight above) to -0.2, so the top rim stays lit.
 */
export function lightAt(x: number, y: number, width: number, height: number): [number, number] {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const lx = (clamp(x / width) * 2 - 1) * 0.8;
  const ly = -1 + 0.8 * clamp(y / height);
  return [Math.round(lx * 100) / 100, Math.round(ly * 100) / 100];
}

/** Moves the light with a fine pointer, at most once a frame, unless the visitor asks for reduced motion. */
export function followLight(w: Window & typeof globalThis): void {
  const root = w.document.documentElement;
  if (!w.matchMedia("(pointer: fine)").matches || w.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let frame = 0;
  let last: PointerEvent | null = null;
  w.addEventListener(
    "pointermove",
    (e) => {
      last = e;
      if (frame) return;
      frame = w.requestAnimationFrame(() => {
        frame = 0;
        if (!last) return;
        const [lx, ly] = lightAt(last.clientX, last.clientY, w.innerWidth, w.innerHeight);
        root.style.setProperty("--light-x", String(lx));
        root.style.setProperty("--light-y", String(ly));
      });
    },
    { passive: true },
  );
}
