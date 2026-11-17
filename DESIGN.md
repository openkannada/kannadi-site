# Open Kannada design language

The design every Open Kannada surface shares: this site, kannadi's own editor page in openkannada/kannadi, the press kit, and whatever comes next. The tokens are in `design/tokens.json`, and `npm run tokens` writes `design/tokens.css` from it. The site's own rules are in `src/styles/global.css` and `src/styles/editor.css`.

The brand line is "Kannada should be as easy to use on a computer as English."

## Idea

The page is a sheet of paper you can write Kannada on at once. Every tool floats above it on 1 pane of Liquid Glass and gets out of the way. Behind the sheet, soft fields of turmeric, kumkuma and indigo give the glass something to bend and give the page its warmth.

- **Calm surface, live glass.** The sheet, the page and the reading sections are solid and still. Only what floats over the writing is glass, and only glass moves with the light.
- **Kannada first and large.** Kannada is set large, with the line height its stacked conjuncts need.
- **1 action color.** Indigo means "do this" or "this is chosen". Rose and amber mean only "look at this in your text".
- **Light and dark are 1 design.** Every color is 1 `light-dark()` pair, so the 2 themes cannot drift apart.

## Tokens

`design/tokens.json` is the source of truth, in groups: `color`, `shadow`, `radius`, `glass`, `motion` and `type`. Each token has a `$value` and a `$description`. A color's value is a `{ light, dark }` pair of `oklch()` colors, or a `{color.name}` reference. `design/tokens.css` turns them into custom properties on `:root`, with the same names, and pins a theme with `data-theme="light"` or `"dark"` on `<html>`. With no attribute the page follows the system.

`npm run tokens` refuses to write the CSS when any text color falls below 4.5:1 on a surface it is used on. A test fails if `tokens.css` is out of date.

### Color

| Token | Role |
|---|---|
| `--background` | The canvas: cool off-white, or deep ink |
| `--card` | The sheet: white, or raised ink |
| `--foreground`, `--muted-foreground` | Text and secondary text, 4.5:1 or more on every surface, glass included |
| `--primary`, `--primary-foreground` | Indigo `oklch(0.46 0.19 277)`, light indigo in dark mode: actions, the current choice, links, the caret, the logo tile |
| `--accent`, `--secondary`, `--muted`, `--border`, `--ring` | Hovered items, quiet fills, wells, hairlines, focus |
| `--field-turmeric`, `--field-kumkuma`, `--field-indigo` | Blurred fields fixed behind the page. Turmeric at the top right, indigo at the left, kumkuma at the bottom |
| `--mark-unknown`, `--mark-unknown-line` | Rose: a glyph with no Kannada letter |
| `--mark-malformed`, `--mark-malformed-line` | Amber: a sign that cannot form a syllable; dashed, a likely typo |
| `--glass`, `--glass-solid`, `--glass-rim`, `--glass-rim-low`, `--glass-specular`, `--glass-edge` | The pane, its solid fallback, its lit and unlit rims, its inner highlight and its outline |

Rose and amber appear only in and about the text being edited. No other element may use them.

### Type

- 1 family: Noto Sans Kannada for Kannada and Noto Sans for Latin (`--type-sans`), self-hosted as variable woff2 subsets under the SIL Open Font License. Noto Sans Kannada's own Latin glyphs keep 1 weight at every `wght`, so Latin text must come from Noto Sans, or headings and bold words render regular. Noto Serif Kannada (`--type-serif`) is the document's alternative face.
- Kannada in a document: `--type-doc` 1.375rem on phones, `--type-doc-wide` 1.5rem from 768px, line height `--type-doc-leading` 1.95. Kannada anywhere else: line height `--type-kn-leading` 1.9.
- Page headings: `--type-heading` 2rem, `--type-heading-wide` 2.75rem from 640px, weight 600, tracking `--type-heading-tracking`, balanced.
- Controls: `--type-ui` 0.9375rem, medium weight.

### Shape and depth

- Radius from `--radius` (1rem). The sheet is 1.75rem; menus and cards are `--radius` plus 6px; buttons, chips and segmented controls are full pills.
- 2 shadows: `--shadow-sheet`, a low, wide lift for the sheet, and `--shadow-float`, 3 stacked offsets under glass. Neither is a zero-offset halo.

## Liquid Glass

Glass is for what floats over the writing: toolbars, their menus, fix cards, toasts, suggestion strips and dialogs. Never for the sheet, the page or content sections.

A pane (`@utility glass` on the site):

- **Body:** `--glass` over a backdrop blurred by `--glass-blur` (22px) and saturated by `--glass-saturate` (1.9), with a 1px `--glass-edge` outline and `--shadow-float`.
- **Light:** the light comes from above and follows a mouse or pen across the page, updated at most once a frame. `--light-x` runs from -0.8 at the left to 0.8 at the right; `--light-y` runs from -1 (straight above) to -0.2, so the top rim stays lit. The rim facing the light is `--glass-rim`, the rim opposite is the fainter `--glass-rim-low`, and `--glass-specular` is a soft glow within about 7px of the lit rim. The 2 properties are registered with `@property`; where that is missing, the light stays above. On touch screens and under reduced motion the light stays still, from above.
- **No refraction yet:** an SVG displacement in `backdrop-filter` was built and measured. After a 22px blur it changed no pixel by more than 17 of 255, even at 30px of displacement; before the blur it let sharp text show through the pane. Visible lensing needs a lighter blur at the edges, which is a design change of its own.
- **Morph:** with a mouse or pen, a control under the pointer becomes a small bead of glass. Pressed, it gives to 94% in 90ms and springs back on `--ease-spring` over `--duration-morph`. The pane it sits on gives to 98.5% with it.
- **Fallbacks:** with reduced transparency, or where `backdrop-filter` is missing, a pane is the solid `--glass-solid`, with no refraction. Reduced motion stills the light and cuts every transition to near zero, so a press changes size at once, with no spring.
- **Contrast:** `npm run tokens` measures every text color on the surfaces it is drawn on, in both themes, and writes nothing below 4.5:1. Glass is measured over the canvas, the sheet, each color field at full strength and turmeric over indigo, saturated as the pane does, and so are the segmented track and the problem tints on glass. The specular glow is left out, since it stays inside the pane's padding.

## Motion

- `--duration-quick` (150ms) on `--ease-standard`: hover colors.
- `--duration-lift` (220ms) on `--ease-settle`: menus, cards and toasts lift 6px into place out of a 6px blur, downward from the toolbar on desktop and upward from the dock on phones. The problem chip settles in from 60% scale.
- `--duration-morph` (450ms) on `--ease-spring`: glass springing back after a press.
- Nothing loops, except the microphone's slow breath while it listens, and that stops under reduced motion.

## Icons

- 1 set, drawn for Open Kannada in `src/icons/icons.ts` and rendered by `Icon.astro`: a 24 by 24 grid, everything inside 2 to 22, 1.75 strokes with round caps and joins, to match the logo's soft corners.
- 2 states. Outline is the default. Filled adds a soft tint (18% of the current color) inside the shape, for headings and the chosen state.
- Icons take `currentColor`, so they follow the text and the theme. They are decoration (`aria-hidden`); the words beside them carry the meaning.
- `npm run icons` writes `design/icons.html`, the index of every icon in both states, in light and dark. A test fails when it is out of date, or when an icon leaves the grid.
- No brand logos of other companies, and no icon from a general library where 1 of ours fits.

## Illustration

- Drawn from Kannada itself: letterforms and ottaksharas, on the turmeric, kumkuma and indigo fields, on a sheet like the editor's. Avoid stock "India" pictures. Old print and palm-leaf textures belong to the OCR and dictionary pages, when those exist.
- Each tool has 1 hero illustration in `Illustration.astro`, as inline SVG colored only by tokens, so it themes in light and dark:
  - `convert`: old Nudi glyphs settle into ಕನ್ನಡ;
  - `typing`: "namaskara" becomes ನಮಸ್ಕಾರ;
  - `letters`: the vowel-sign forms of ಕ arrive 1 by 1;
  - `font`: ನ್ and ನ close in and become the conjunct ನ್ನ;
  - `spell`: a likely typo, ಬಾಷೆ, is marked and becomes ಭಾಷೆ;
  - `scan`: a beam passes over a printed page, and the text reads out.
- Tool pages show theirs beside the heading from 1024px, so the editor stays in the first viewport on phones and tablets. Reference pages show theirs from 768px. The About page shows the 4 kinds of work as cards.

## Motion in illustrations

- 1 meaningful animation per illustration, short and calm: it settles within 4 seconds, on `--ease-settle` and `--ease-standard`. It runs once, when the illustration is first a third on screen (`inview.ts` adds `.is-in`).
- The final frame is the resting state: it is what shows before the script runs, without JavaScript, and under reduced motion.
- CSS animation only, with no animation library, video or Rive; nothing animates the heading or anything that could be the LCP element.

## Pixel-perfect and responsive

- Every page holds at 360, 390, 768, 1024, 1440 and 1920 pixels wide, in light and dark: no horizontal scroll, no layout shift above 0.05, and no Kannada clipped by its box. `npm run layout-check` measures all 3 in Chrome on every built page, in CI. `--shots DIR` saves a screenshot of each for review.
- Kannada keeps its larger size and its line height everywhere, so ottaksharas never touch the line above or below.
- The Lighthouse CI budgets (LCP 2.5 s, CLS 0.1, TBT 200 ms, and 95 or more in every category) hold with the illustrations: they are inline SVG of a few kilobytes, with no images to fetch.

## Logo

- **Open Kannada** is Open ka: Noto Sans Kannada's ಕ at weight 640 on a rounded `--primary` tile, with a wedge cut from the right of its bowl. It marks the organization: site headers, favicons, app icons, Open Graph cards and avatars.
- **kannadi** is the mirror: ಕ and its lighter reflection meeting at a line of glass. It marks only the places that name kannadi the tool or library.
- Use the files as they are. Color them only with the light and dark pairs; add no outline, shadow, gradient or effect, and never stretch or rotate them. On a page, inline the mark from `src/assets/brand/` through `Logo.astro`, so `--primary` and `--primary-foreground` color it.
- Keep clear space of a quarter of the mark's width on every side. The smallest size is 16px for Open ka and 28px for the mirror.
- The wordmarks set the name in Noto Sans at weight 620 to the right of the mark; kannadi's adds ಕನ್ನಡಿ in `--muted-foreground`.
- The SVG sources and PNGs at every size, including `scripts/og-mark.svg` for the Open Graph cards, are generated from the font outlines outside this repository. Replace the files here from that set rather than editing the paths.

## Voice

- Answer first: a page opens with 1 sentence that answers the question it was found for.
- Plain American English, short sentences, digits for numbers.
- No em dashes, no hype words, no disclaimers, no rhetorical questions, no "X, not Y".
- Say what is true and what is not done; never claim a feature before it ships.
- Kannada words appear in Kannada script, with `lang="kn"`.
- `npm run voice-lint` checks the built text and the editor's messages.

## Using it on another surface

1. Copy `design/tokens.css` and load it before the surface's own CSS. Keep the token names; map any older names onto them.
2. Self-host Noto Sans Kannada; load nothing from another host.
3. Make only floating tools glass, with the rim, the specular glow and the solid fallback. Refraction and the moving light are optional, and the fallbacks are required.
4. Use the logo files from the press kit, and follow the voice rules for every word on the page.
5. When the tokens change here, copy the new `tokens.css` across in the same week.

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
- **Marks**: drawn with the CSS Custom Highlight API. Unknown glyphs and malformed syllables get a tinted background and a wavy underline 1.5px thick, offset 0.35em. A likely typo gets only a dashed amber underline of the same weight, in the text, the list and the fix card. `composing` marks the word being typed in Baraha or ISO with a dotted indigo underline.
- **Content sections**: numbered steps with accent discs, a letter chart of tiles (Kannada, the Baraha key, ISO), a 3-column word table, and an FAQ of `details` elements with a rotating chevron.


## Layout

- Content column: 54rem for the heading and the editor, 46rem for prose. Side gutters are 16px on phones and 24px from 640px.
- Below 768px the counts move from the sheet's foot to its top, because the dock covers the bottom edge.

## Constraints

- The CSP forbids inline `style` attributes, so all styling is in CSS. Positions computed at run time, and the light direction, are set through CSSOM.
- Content pages ship only the theme and light script. The editor's WebAssembly loads after first paint, and the file readers load on first use.
