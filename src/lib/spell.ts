// Spellings for the typing charts, computed by the library at build time.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { initSync, transliterate } from "../editor/wasm/kannadi_wasm.js";

let ready = false;

/** The Baraha and ISO 15919 spellings of a Kannada letter or word. */
export function spellings(kannada: string): { baraha: string; iso: string } {
  if (!ready) {
    initSync({ module: readFileSync(join(process.cwd(), "src/editor/wasm/kannadi_wasm_bg.wasm")) });
    ready = true;
  }
  return {
    baraha: transliterate(kannada, "kannada", "baraha"),
    iso: transliterate(kannada, "kannada", "iso15919"),
  };
}
