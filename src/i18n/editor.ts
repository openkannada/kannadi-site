import type { Lang } from "./core.ts";
import { EDITOR_EN, type EditorStrings } from "./editor.en.ts";
import { EDITOR_KN } from "./editor.kn.ts";

export const EDITOR_STRINGS: Record<Lang, EditorStrings> = { en: EDITOR_EN, kn: EDITOR_KN };
