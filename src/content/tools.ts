// The tools the header, the menu and the home page put 1 click away, and the letter that marks each.
import { NAV } from "./pages.ts";

/** The primary tools, in the order the header lists them; the converters link to the Nudi converter. */
export const PRIMARY_TOOLS = ["editor", "nudi-to-unicode", "fonts", "spell-check", "dictionary", "ocr"] as const;

/** Each tool's mark: the first letter of its Kannada name, such as ಸಂ for ಸಂಪಾದಕ. */
export const TOOL_MARK: Record<string, string> = {
  editor: "ಸಂ",
  "nudi-to-unicode": "ಪ",
  fonts: "ಫಾ",
  "spell-check": "ಕಾ",
  dictionary: "ನಿ",
  ocr: "ಓ",
  "ai-benchmark": "ಮಾ",
};

/** The English slugs a primary tool stands for in the header, so a converter page lights up Converters. */
export function toolFor(slug: string): string | undefined {
  if ((NAV.converters as readonly string[]).includes(slug)) return "nudi-to-unicode";
  return (PRIMARY_TOOLS as readonly string[]).includes(slug) ? slug : undefined;
}
