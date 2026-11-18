// The Open Kannada icon set: a 24 by 24 grid, drawn inside 2 to 22, 1.75 strokes with round caps and joins
// to match the logo's soft corners. `d` is the outline; `fill` is the area tinted in the filled state.

export interface IconDef {
  d: string;
  fill?: string;
  /** What the icon stands for, shown on the index page. */
  use: string;
}

export const ICONS = {
  open: {
    d: "M3 7.5a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    fill: "M3 7.5a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    use: "Open a file",
  },
  save: { d: "M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4.5 19.5h15", use: "Save, download" },
  convert: { d: "M4 8.5h13.5L14 5M20 15.5H6.5l3.5 3.5", use: "Convert" },
  tools: { d: "M4 7h9m4 0h3M4 17h3m4 0h9M15 4.5v5M9 14.5v5", use: "More tools" },
  sun: {
    d: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
    fill: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    use: "Light theme",
  },
  moon: { d: "M19.5 14A8 8 0 0 1 10 4.5a8 8 0 1 0 9.5 9.5z", fill: "M19.5 14A8 8 0 0 1 10 4.5a8 8 0 1 0 9.5 9.5z", use: "Dark theme" },
  auto: { d: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 4v16", fill: "M12 4a8 8 0 0 0 0 16z", use: "Theme follows the system" },
  keys: {
    d: "M4.5 6.5h15A1.5 1.5 0 0 1 21 8v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5zM7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M8 14h8",
    fill: "M4.5 6.5h15A1.5 1.5 0 0 1 21 8v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5z",
    use: "Keyboard, shortcuts, typing",
  },
  close: { d: "M6.5 6.5l11 11m0-11-11 11", use: "Close" },
  chevron: { d: "M7 10l5 5 5-5", use: "Open a menu" },
  menu: { d: "M4 7h16M4 12h16M4 17h16", use: "All pages" },
  copy: {
    d: "M8.5 8.5v-3A1.5 1.5 0 0 1 10 4h8.5A1.5 1.5 0 0 1 20 5.5V14a1.5 1.5 0 0 1-1.5 1.5h-3M5.5 8.5H14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 14 20H5.5A1.5 1.5 0 0 1 4 18.5V10a1.5 1.5 0 0 1 1.5-1.5z",
    fill: "M5.5 8.5H14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 14 20H5.5A1.5 1.5 0 0 1 4 18.5V10a1.5 1.5 0 0 1 1.5-1.5z",
    use: "Copy",
  },
  mic: {
    d: "M12 3a3 3 0 0 0-3 3v5.5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11.5a6 6 0 0 0 12 0M12 17.5V21",
    fill: "M12 3a3 3 0 0 0-3 3v5.5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z",
    use: "Type by voice",
  },
  sparkle: {
    d: "M12 5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z",
    fill: "M12 5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z",
    use: "Suggestion",
  },
  check: { d: "M5 12.5 9.5 17 19 7.5", use: "Done, correct" },
  alert: { d: "M12 4.5 20.5 19h-17zM12 10v4M12 16.75h.01", fill: "M12 4.5 20.5 19h-17z", use: "Needs a look" },
  info: { d: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 11v5M12 8.25h.01", fill: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", use: "Information" },
  external: { d: "M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10", use: "Opens another site" },
  link: { d: "M10 14a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 5.34l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1", use: "Link" },
  arrow: { d: "M5 12h14M13 6l6 6-6 6", use: "Go on, becomes" },
  legacy: {
    d: "M6.5 3.5h7L18 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5zM13.5 3.5V8H18M8.5 12h2M12.5 12h3M8.5 15.5h4M14.5 15.5h1",
    fill: "M6.5 3.5h7L18 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z",
    use: "An old Nudi or Baraha file",
  },
  type: { d: "M5 6.5V5h14v1.5M12 5v14M9.5 19h5", use: "Fonts" },
  spell: { d: "M4 6.5h10M4 11h7M4 15.5h5M14 16l2.5 2.5L21 13", use: "Spell check" },
  scan: { d: "M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16", use: "Read a scanned page" },
  language: { d: "M4 5h9M8.5 5v2M5.5 7c1 3 3.5 5 6.5 6M11.5 7c-1 3.5-3.5 6-6.5 7.5M13 20l4-9 4 9M14.5 16.5h5", use: "Language" },
  shield: {
    d: "M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4",
    fill: "M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
    use: "Private, on your device",
  },
  letters: {
    d: "M6.0 4.5h2.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5zM15.5 4.5h2.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5zM6.0 14h2.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5zM15.5 14h2.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5z",
    fill: "M6.0 4.5h2.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5z",
    use: "Alphabet and kagunita",
  },
  edit: {
    d: "M4.5 19.5h4L19 9l-4-4L4.5 15.5zM13 7l4 4M13 19.5h6.5",
    fill: "M4.5 19.5h4L19 9l-4-4L4.5 15.5z",
    use: "The editor",
  },
  chart: {
    d: "M5.5 5H9a1.5 1.5 0 0 1 0 3H5.5a1.5 1.5 0 0 1 0-3zM5.5 10.5h13a1.5 1.5 0 0 1 0 3h-13a1.5 1.5 0 0 1 0-3zM5.5 16h7a1.5 1.5 0 0 1 0 3h-7a1.5 1.5 0 0 1 0-3z",
    fill: "M5.5 10.5h13a1.5 1.5 0 0 1 0 3h-13a1.5 1.5 0 0 1 0-3z",
    use: "AI benchmark, tokens per text",
  },
  book: { d: "M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19", fill: "M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5z", use: "Dictionary, documents" },
  people: { d: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17.5 14a5.5 5.5 0 0 1 3 5", use: "People, community" },
  mail: {
    d: "M4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9A1.5 1.5 0 0 1 4.5 6zM3.5 7l8.5 6 8.5-6",
    fill: "M4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9A1.5 1.5 0 0 1 4.5 6z",
    use: "Write to us",
  },
  image: {
    d: "M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4zM4 16l4.5-4.5L13 16l2.5-2.5L20 18M15 9h.01",
    fill: "M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4z",
    use: "Screenshots, logos",
  },
  quote: {
    d: "M10 7c-2.6.6-4.5 2.8-4.5 5.8V17H10v-4.5H7.6c.2-1.6 1.1-2.8 2.4-3.4zM18.5 7c-2.6.6-4.5 2.8-4.5 5.8V17h4.5v-4.5h-2.4c.2-1.6 1.1-2.8 2.4-3.4z",
    fill: "M10 7c-2.6.6-4.5 2.8-4.5 5.8V17H10v-4.5H7.6c.2-1.6 1.1-2.8 2.4-3.4zM18.5 7c-2.6.6-4.5 2.8-4.5 5.8V17h4.5v-4.5h-2.4c.2-1.6 1.1-2.8 2.4-3.4z",
    use: "Descriptions to quote",
  },
  palette: {
    d: "M12 4a8 8 0 1 0 0 16c1.2 0 1.7-1 1.3-1.9-.5-1.1.3-2.3 1.5-2.3H17a3 3 0 0 0 3-3c0-4.9-3.6-8.8-8-8.8zM8 11.5h.01M10.5 8h.01M14.5 8h.01",
    fill: "M12 4a8 8 0 1 0 0 16c1.2 0 1.7-1 1.3-1.9-.5-1.1.3-2.3 1.5-2.3H17a3 3 0 0 0 3-3c0-4.9-3.6-8.8-8-8.8z",
    use: "Colors",
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
