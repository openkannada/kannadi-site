# Design

The visual system of the kannadi site, recorded from the built pages on 16 November 2026. Tokens live in `src/styles/global.css`; the editor's own rules are in `src/styles/editor.css`.

## Idea

The page is a sheet of paper you can write Kannada on at once. Every tool floats above it on 1 pane of glass and gets out of the way. The converter page this replaces in the category is 2 text boxes, a button and ads; this site has 1 surface and 1 toolbar.

## Direction

The brief the design was built and reviewed against. It lives here only; the built pages carry no HTML comments, and `npm run seo-smoke` fails if one appears.

- **Thesis:** the page is a sheet of paper you can write Kannada on at once. Every tool floats above it on 1 pane of glass and gets out of the way.
- **World:** a cool paper sheet on a canvas lit by turmeric, kumkuma and indigo fields. Glass panes with a lit rim. Indigo for action; rose and amber only for problems in the text. Noto Sans Kannada throughout, with Kannada set large.
- **Story:** arrive from a search, read 1 sentence that answers it, type or drop a file into the sheet, fix what is marked, save.
- **First viewport:** brand and page links on the canvas, the heading and 1-sentence answer, then the sheet with its 1-line welcome. The glass toolbar floats at the sheet's top edge on desktop and at the thumb on phones. Save is the 1 solid button.

## Color

Restrained: neutrals, 1 action color, and 2 problem colors that appear only in the text.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--background` | The canvas | cool off-white | deep ink |
| `--card` | The sheet | white | raised ink |
| `--foreground`, `--muted-foreground` | Text, secondary text (4.5:1 or more) | ink, slate | near white, light slate |
| `--primary` | Actions, the current choice, links, the caret | indigo `oklch(0.46 0.19 277)` | light indigo |
| `--mark-unknown`, `--mark-unknown-line` | Glyphs with no Kannada letter | rose tint and wavy line | |
| `--mark-malformed`, `--mark-malformed-line` | Signs that cannot form a syllable | amber tint and wavy line | |
| `--field-turmeric`, `--field-kumkuma`, `--field-indigo` | Blurred color fields fixed behind the page, so the glass has something to bend | | |

Every token is 1 `light-dark()` pair in a single `:root` block, so the 2 themes cannot drift apart. `data-theme="light"` or `"dark"` on `<html>` pins a theme; with no attribute the page follows the system. Tailwind reads the tokens through `@theme inline` under shadcn's names (`bg-background`, `text-muted-foreground`, `bg-primary` and so on).

## Glass

`@utility glass`: a translucent pane (`--glass`), `backdrop-filter: blur(22px) saturate(1.9)`, a 1px edge, a lit top rim (`inset 0 1px 0 var(--glass-rim)`) and a soft float shadow. It falls back to the solid `--glass-solid` when `backdrop-filter` is missing or the user asks for reduced transparency.

Glass is used only for things that float over the writing: the toolbar, its menus, the fix card, the toast and the shortcuts dialog. The sheet, the page and the content sections are solid.

## Type

- 1 family for everything: Noto Sans Kannada, self-hosted as variable woff2 in Kannada, Latin and Latin Extended subsets. Noto Serif Kannada is the alternative for the document only (Tools menu, Typeface).
- The 2 Sans subsets used on every page are preloaded. `font-display: swap`.
- The document is set large: 1.375rem on phones and 1.5rem from 768px, with line-height 1.95 for stacked conjuncts. Kannada elsewhere uses line-height 1.9.
- Page headings: 2rem on phones and 2.75rem from 640px, weight 600, tracking -0.02em, balanced. UI text: 0.9375rem, medium weight for controls.

## Shape and depth

- Radius scale from `--radius: 1rem`. The sheet is 1.75rem, menus and cards 1.375rem, buttons and segmented controls are full pills.
- 2 shadows: `--shadow-sheet` (a low, wide lift for the sheet) and `--shadow-float` (3 stacked offsets for glass). Neither is a zero-offset halo.

## Components

- **Toolbar** (`.dock`, `.toolbar`): on desktop it is centered, sticky 12px from the top, and overlaps the sheet's top edge by 1.6rem. Below 768px it is fixed at the bottom, above the home bar and the on-screen keyboard (`--kb`, set from `visualViewport`). It contains, in order:
  - the typing mode as a segmented control (ಕ, English, Baraha, and ISO from 640px; ISO is in the Tools menu below that);
  - Open and Convert (from 640px; in the Tools menu below that);
  - the microphone, where voice typing works;
  - Tools;
  - the problem count chip;
  - Save, the only solid button.
- **Segmented control** (`.seg`): a recessed track. The chosen option is a white bead with indigo text.
- **Problem chip** (`.chip`): appears only when something is marked. Rose when any glyph is unknown, amber otherwise. Its label reads "N problems to check".
- **Menus** (`.menu`): native `popover` elements, anchored to their buttons with CSS anchor positioning. They fall back to a fixed spot under the toolbar, and below 768px they become bottom sheets above the dock. They open with a short lift out of blur (`@starting-style`).
- **Fix card** (`.fix`): opens beside the mark on desktop. On phones it is a bottom sheet, and the page scrolls so the mark stays visible above it.
- **Toast** (`.toast`): under the toolbar on desktop and above the dock on phones. It leaves after 5 seconds, or 10 when it carries an action. An always-present visually hidden live region reads every message.
- **Suggestion strip** (`.suggest`): glass pill above the word being typed in English letters on desktop; on phones a keyboard-style bar above the dock. The picked word is a white bead with indigo text, like the segmented control.
- **Microphone** (`.mic`): shown only where the browser has speech recognition. While it listens it turns rose and breathes slowly; reduced motion keeps it still.
- **Marks**: drawn with the CSS Custom Highlight API: a tinted background, a wavy underline 1.5px thick and offset 0.35em. `composing` marks the word being typed in Baraha or ISO with a dotted indigo underline.
- **Content sections**: numbered steps with accent discs, a letter chart of tiles (Kannada, the Baraha key, ISO), a 3-column word table, and an FAQ of `details` elements with a rotating chevron.

## Motion

One authored motion: menus, cards and toasts lift from 6px below with a 6px blur, over 0.18 to 0.22s, on `cubic-bezier(0.16, 1, 0.3, 1)`. The problem chip settles in from 60% scale. Everything else is a 150ms color change. `prefers-reduced-motion` cuts all transitions to near zero.

## Layout

- Content column: 54rem for the heading and the editor, 46rem for prose. Side gutters are 16px on phones and 24px from 640px.
- Below 768px the counts move from the sheet's foot to its top, because the dock covers the bottom edge.

## Copy

Answer first: every page opens with a 1-sentence definition, then the editor with a 1-sentence welcome, then the how-to and FAQ. Plain American English, digits for numbers, no em dashes, no hype, no disclaimers. `npm run voice-lint` checks the built text and the editor's messages.

## Constraints

- The CSP forbids inline `style` attributes, so all styling is in CSS. Positions computed at run time are set through CSSOM.
- Content pages ship only the theme script. The editor's WebAssembly loads after first paint, and the file readers load on first use.
