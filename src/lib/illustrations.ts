import type { IllustrationName } from "../components/Illustration.astro";
import type { Page } from "../content/pages.ts";

/** The hero illustration that tells what a page's tool does, or null for pages with none. */
export function illustrationFor(page: Page): IllustrationName | null {
  if (page.kind === "reference") return "letters";
  if (page.kind !== "tool") return null;
  return page.slug.includes("typing") ? "typing" : "convert";
}
