// The Worker in front of the site's static files on Cloudflare; the rules are in src/lib/edge.ts.
import { LIVE } from "../src/content/site.ts";
import { type Assets, handle } from "../src/lib/edge.ts";

export default {
  fetch(request: Request, env: { ASSETS: Assets }): Promise<Response> {
    return handle(request, env.ASSETS, { host: LIVE.host, launched: LIVE.launched });
  },
};
