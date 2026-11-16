// The theme choice: auto follows the system; light or dark pins one.
export type Theme = "auto" | "light" | "dark";

const KEY = "kannadi.theme";
const ORDER: Theme[] = ["auto", "light", "dark"];
const LABELS: Record<Theme, string> = { auto: "Theme: same as system", light: "Theme: light", dark: "Theme: dark" };

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function applyTheme(theme: Theme, button?: HTMLElement | null): void {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  if (button) {
    button.dataset.theme = theme;
    button.setAttribute("aria-label", `${LABELS[theme]}. Change theme`);
    button.title = LABELS[theme];
  }
  try {
    if (theme === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Private windows may refuse storage; the theme still applies to this page.
  }
}

export function nextTheme(theme: Theme): Theme {
  return ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
}
