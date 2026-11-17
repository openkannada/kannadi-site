// Writes design/icons.html, the index of every Open Kannada icon in its outline and filled states,
// on light and dark: npm run icons
import { writeFileSync } from "node:fs";

import { ICONS } from "../src/icons/icons.ts";

export function iconsPage(): string {
  const svg = (d: string, fill?: string) =>
    `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${fill ? `<path d="${fill}" fill="currentColor" fill-opacity="0.18" stroke="none"/>` : ""}<path d="${d}" vector-effect="non-scaling-stroke"/></svg>`;
  const cells = Object.entries(ICONS)
    .map(([name, i]) => {
      const fill = "fill" in i ? i.fill : undefined;
      return `<figure><div class="pair">${svg(i.d)}${fill ? svg(i.d, fill) : ""}</div><figcaption><code>${name}</code><span>${i.use}</span></figcaption></figure>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Open Kannada icons</title>
<link rel="stylesheet" href="tokens.css">
<style>
body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: var(--background); color: var(--foreground); }
header { padding: 32px 24px 8px; } h1 { margin: 0; font-size: 28px; } p { color: var(--muted-foreground); margin: 4px 0 0; }
.themes { display: grid; grid-template-columns: 1fr 1fr; } .themes > section { padding: 24px; background: var(--background); color: var(--foreground); }
.themes > section:last-child { color-scheme: dark; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
figure { margin: 0; padding: 14px; border: 1px solid var(--border); border-radius: 16px; background: var(--card); }
.pair { display: flex; gap: 12px; color: var(--primary); } figcaption { display: grid; margin-top: 8px; font-size: 13px; } figcaption span { color: var(--muted-foreground); }
@media (max-width: 720px) { .themes { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header><h1>Open Kannada icons</h1><p>24 by 24, 1.75 strokes, round caps and joins. Each icon in its outline state, then its filled state where it has one. Generated from src/icons/icons.ts by npm run icons.</p></header>
<div class="themes">
<section><h2>Light</h2><div class="grid">
${cells}
</div></section>
<section><h2>Dark</h2><div class="grid">
${cells}
</div></section>
</div>
</body>
</html>
`;
}

if (import.meta.main) {
  writeFileSync("design/icons.html", iconsPage());
  console.log(`Wrote design/icons.html with ${Object.keys(ICONS).length} icons.`);
}
