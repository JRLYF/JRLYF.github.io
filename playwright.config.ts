import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const edge = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/._*"],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:4322",
    viewport: { width: 1440, height: 1000 },
    launchOptions: existsSync(edge) ? { executablePath: edge } : {},
  },
  webServer: {
    command: "python3 -m http.server 4322 --bind 127.0.0.1 --directory dist",
    url: "http://127.0.0.1:4322/studio/",
    reuseExistingServer: false,
    timeout: 20_000,
  },
  reporter: "list",
});
