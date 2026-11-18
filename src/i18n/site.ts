import type { Lang } from "./core.ts";
import { SITE_EN, type SiteStrings } from "./site.en.ts";
import { SITE_KN } from "./site.kn.ts";

export const SITE_STRINGS: Record<Lang, SiteStrings> = { en: SITE_EN, kn: SITE_KN };
