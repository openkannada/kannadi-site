// Serves a built site for the browser tests: node scripts/serve.ts [dist] [port]
import { serve } from "./browser.ts";

const { port } = serve(process.argv[2] ?? "dist", Number(process.argv[3] ?? 4321));
console.log(`Serving on http://127.0.0.1:${port}/`);
