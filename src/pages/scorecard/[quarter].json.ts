// The scorecard's results as JSON beside the page, built only while the page itself is built.
import type { APIRoute, GetStaticPaths } from "astro";

import { PAGES } from "../../content/pages.ts";
import { SCORECARD } from "../../content/scorecard.ts";

export const getStaticPaths = (() =>
  PAGES.some((p) => p.kind === "scorecard") ? [{ params: { quarter: SCORECARD.quarter } }] : []) satisfies GetStaticPaths;

export const GET: APIRoute = () => new Response(`${JSON.stringify(SCORECARD, null, 2)}\n`, { headers: { "content-type": "application/json; charset=utf-8" } });
