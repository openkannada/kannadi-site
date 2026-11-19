// The editor's browser tests: npm run build, then npx playwright test. See e2e/README.md.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const desktop = (width: number) => ({ viewport: { width, height: 900 } });
/** Runs on every project: the layout checks. The rest runs on 1 desktop size per engine and on phones. */
const LAYOUT = /@layout/;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
  webServer: { command: `node scripts/serve.ts dist ${PORT}`, url: `http://127.0.0.1:${PORT}/editor/`, reuseExistingServer: !process.env.CI },
  projects: [
    { name: "chromium-1280", use: { ...devices["Desktop Chrome"], ...desktop(1280) } },
    { name: "firefox-1280", use: { ...devices["Desktop Firefox"], ...desktop(1280) } },
    { name: "webkit-1280", use: { ...devices["Desktop Safari"], ...desktop(1280) } },
    { name: "chromium-1440", grep: LAYOUT, use: { ...devices["Desktop Chrome"], ...desktop(1440) } },
    { name: "chromium-1920", grep: LAYOUT, use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
    { name: "chromium-1280-dark", grep: LAYOUT, use: { ...devices["Desktop Chrome"], ...desktop(1280), colorScheme: "dark" } },
    { name: "chromium-360", use: { ...devices["Galaxy S9+"], viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 } },
    { name: "webkit-390", use: { ...devices["iPhone 13"] } },
    { name: "webkit-390-dark", grep: LAYOUT, use: { ...devices["iPhone 13"], colorScheme: "dark" } },
  ],
});
