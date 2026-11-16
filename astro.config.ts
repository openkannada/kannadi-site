import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import { siteUrl } from "./src/content/site.ts";
import { agentFiles } from "./src/integrations/agent-files.ts";

const site = siteUrl();

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
      ],
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] },
      styleDirective: { resources: ["'self'"] },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
