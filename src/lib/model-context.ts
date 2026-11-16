// WebMCP: finding the page's tool registry, and registering tools once the page is idle.

export interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<string> | string;
}

export interface ModelContext {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => unknown;
}

/**
 * The registry on document.modelContext, the current spec location, or on the
 * older navigator.modelContext. Chosen by whether registerTool is callable,
 * since transitional builds expose the object without a working method.
 */
export function resolveModelContext(doc: unknown, nav: unknown): ModelContext | null {
  for (const host of [doc, nav]) {
    const ctx = (host as { modelContext?: unknown } | null | undefined)?.modelContext;
    if (ctx && typeof (ctx as { registerTool?: unknown }).registerTool === "function") return ctx as ModelContext;
  }
  return null;
}

/** Registers the tools when the browser is idle. The returned controller unregisters them. */
export function registerWhenIdle(
  ctx: ModelContext,
  tools: ModelContextTool[],
  idle: (run: () => void) => void = whenIdle,
): AbortController {
  const controller = new AbortController();
  idle(() => {
    for (const tool of tools) {
      if (controller.signal.aborted) return;
      try {
        ctx.registerTool(tool, { signal: controller.signal });
      } catch (e) {
        // A tool the browser refuses must not stop the others or the page.
        console.warn(`WebMCP: ${tool.name} was not registered`, e);
      }
    }
  });
  return controller;
}

function whenIdle(run: () => void): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1);
}
