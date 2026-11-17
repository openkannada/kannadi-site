// Reads design/tokens.json and writes the CSS custom properties every Open Kannada surface uses,
// and measures contrast on the colors so text over glass stays readable.

export type Theme = "light" | "dark";
interface Token {
  $type: string;
  $value: string | { light: string; dark: string };
  $description: string;
}
export type Tokens = { $description: string } & Record<string, Record<string, Token> | string>;

/** Each token group with its tokens, in file order. */
function groups(tokens: Tokens): [string, Record<string, Token>][] {
  return Object.entries(tokens).filter((e): e is [string, Record<string, Token>] => typeof e[1] === "object");
}

/** A color token's value in 1 theme, following {color.name} references. */
export function colorValue(tokens: Tokens, name: string, theme: Theme): string {
  const token = (tokens["color"] as Record<string, Token>)[name];
  if (!token) throw new Error(`no color ${name}`);
  const v = token.$value;
  if (typeof v === "string") {
    const ref = v.match(/^\{color\.([\w-]+)\}$/)?.[1];
    if (!ref) throw new Error(`color ${name} is neither a pair nor a reference`);
    return colorValue(tokens, ref, theme);
  }
  return v[theme];
}

/** The tokens as CSS: 1 :root block where each color is a light-dark() pair, and the theme pins. */
export function toCss(tokens: Tokens): string {
  const lines: string[] = [];
  for (const [group, entries] of groups(tokens)) {
    lines.push("", `  /* ${group} */`);
    for (const [name, t] of Object.entries(entries)) {
      const v = t.$value;
      const css =
        typeof v === "object"
          ? `light-dark(${v.light}, ${v.dark})`
          : (v.match(/^\{color\.([\w-]+)\}$/) ? `var(--${v.slice(7, -1)})` : v);
      lines.push(`  --${name}: ${css};`);
    }
  }
  return [
    "/*",
    " * Open Kannada design tokens, generated from design/tokens.json by npm run tokens.",
    " * Edit the JSON, not this file. Each color is 1 light-dark() pair; data-theme on <html> pins a theme.",
    " */",
    ":root {",
    "  color-scheme: light dark;",
    ...lines,
    "}",
    ':root[data-theme="light"] {',
    "  color-scheme: light;",
    "}",
    ':root[data-theme="dark"] {',
    "  color-scheme: dark;",
    "}",
    "",
  ].join("\n");
}

/** sRGB channels from 0 to 1 and alpha, from an oklch() color. */
export function oklchToRgba(css: string): [number, number, number, number] {
  const m = css.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (!m) throw new Error(`not an oklch() color: ${css}`);
  const [L, C, H] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const gamma = (x: number) => {
    const c = Math.min(1, Math.max(0, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  return [gamma(lin[0]!), gamma(lin[1]!), gamma(lin[2]!), m[4] === undefined ? 1 : Number(m[4])];
}

type Rgb = [number, number, number];

/** A translucent color painted over an opaque one, as browsers blend in sRGB. */
export function over(top: [number, number, number, number], under: Rgb): Rgb {
  const a = top[3];
  return [0, 1, 2].map((i) => top[i]! * a + under[i]! * (1 - a)) as Rgb;
}

/** The CSS saturate() filter, which a glass pane applies to what is behind it. */
export function saturate([r, g, b]: Rgb, s: number): Rgb {
  const m = [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
  ];
  return m.map((row) => Math.min(1, Math.max(0, row[0]! * r + row[1]! * g + row[2]! * b))) as Rgb;
}

/** WCAG 2 contrast ratio of 2 opaque colors. */
export function contrast(a: Rgb, b: Rgb): number {
  const lum = (c: Rgb) => {
    const [r, g, bl] = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * The surfaces text can sit on, in 1 theme: the solid ones, and glass over each place the page can show
 * through it (the plain canvas and each color field at full strength, saturated as the pane does), with
 * the specular highlight on top as the worst case.
 */
export function surfaces(tokens: Tokens, theme: Theme): Record<string, Rgb> {
  const rgba = (name: string) => oklchToRgba(colorValue(tokens, name, theme));
  const opaque = (name: string): Rgb => rgba(name).slice(0, 3) as Rgb;
  const background = opaque("background");
  const sat = Number((tokens["glass"] as Record<string, Token>)["glass-saturate"]?.$value);
  const out: Record<string, Rgb> = { background, card: opaque("card"), popover: opaque("popover"), "glass-solid": opaque("glass-solid") };
  const backdrops: Record<string, Rgb> = { canvas: background };
  for (const field of ["field-turmeric", "field-kumkuma", "field-indigo"]) backdrops[field] = over(rgba(field), background);
  for (const [where, backdrop] of Object.entries(backdrops)) {
    out[`glass over ${where}`] = over(rgba("glass-specular"), over(rgba("glass"), saturate(backdrop, sat)));
  }
  return out;
}

/** Text colors and the surfaces each must read on at 4.5:1 or more. */
export const TEXT_ON: Record<string, string[]> = {
  foreground: ["background", "card", "popover", "glass-solid", "glass"],
  "muted-foreground": ["background", "card", "popover", "glass-solid", "glass"],
  primary: ["background", "card", "glass-solid", "glass"],
  "accent-foreground": ["glass-solid"],
};

/** Every text and surface pair below 4.5:1, with its ratio. */
export function contrastProblems(tokens: Tokens): string[] {
  const problems: string[] = [];
  for (const theme of ["light", "dark"] as const) {
    const all = surfaces(tokens, theme);
    for (const [text, on] of Object.entries(TEXT_ON)) {
      const color = oklchToRgba(colorValue(tokens, text, theme)).slice(0, 3) as Rgb;
      for (const [name, surface] of Object.entries(all)) {
        if (!on.some((o) => name === o || name.startsWith(`${o} over`))) continue;
        const ratio = contrast(color, surface);
        if (ratio < 4.5) problems.push(`${theme}: ${text} on ${name} is ${ratio.toFixed(2)}:1`);
      }
    }
    const onPrimary = contrast(oklchToRgba(colorValue(tokens, "primary-foreground", theme)).slice(0, 3) as Rgb, oklchToRgba(colorValue(tokens, "primary", theme)).slice(0, 3) as Rgb);
    if (onPrimary < 4.5) problems.push(`${theme}: primary-foreground on primary is ${onPrimary.toFixed(2)}:1`);
  }
  return problems;
}
