// The Worker in front of the site's static files on Cloudflare; the rules are in src/lib/edge.ts, and the
// interest form's endpoint in src/lib/interest.ts.
import { INTEREST } from "../src/content/interest.ts";
import { LIVE } from "../src/content/site.ts";
import { type Assets, handle } from "../src/lib/edge.ts";
import { INTEREST_PATH, type InterestEnv, handleInterest } from "../src/lib/interest.ts";

export default {
  fetch(request: Request, env: { ASSETS: Assets; PREVIEW?: string } & InterestEnv): Promise<Response> {
    if (new URL(request.url).pathname === INTEREST_PATH) return handleInterest(request, env, INTEREST.open, { host: LIVE.host });
    return handle(request, env.ASSETS, { host: LIVE.host, launched: LIVE.launched, preview: env.PREVIEW === "1" });
  },
};
