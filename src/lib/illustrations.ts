import type { IllustrationName } from "../components/Illustration.astro";
import type { Page } from "../content/pages.ts";

export interface IllustrationProps {
  name: IllustrationName;
  from?: string;
  to?: string;
}

/** The hero illustration that tells what a page's tool does, or null for pages with none. A converter shows its own sample. */
export function illustrationFor(page: Page): IllustrationProps | null {
  if (page.kind === "reference") return { name: "letters" };
  if (page.kind !== "tool") return null;
  if (page.slug.includes("typing")) return { name: "typing" };
  return { name: "convert", from: page.og.from, to: page.og.to };
}
