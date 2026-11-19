import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import { INTEREST } from "./src/content/interest.ts";
import { siteUrl } from "./src/content/site.ts";
import { agentFiles } from "./src/integrations/agent-files.ts";

const site = siteUrl();
// Turnstile's script and frame are allowed only once the interest form is open.
const TURNSTILE = INTEREST.open ? "https://challenges.cloudflare.com" : null;

export default defineConfig({
  ...(site ? { site: site.href, base: site.pathname } : {}),
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [agentFiles()],
  markdown: { syntaxHighlight: false },
  security: {
    csp: {
      directives: [
        "default-src 'none'",
        "connect-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "manifest-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        ...(TURNSTILE ? [`frame-src ${TURNSTILE}` as const] : []),
      ],
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'", ...(TURNSTILE ? [TURNSTILE] : [])] },
      styleDirective: { resources: ["'self'"] },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
