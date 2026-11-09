import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";
const browserOptions = { ...base.use };
delete browserOptions.channel;

export default defineConfig({
  ...base,
  use: browserOptions,
  projects: [
    {
      name: "iphone-chrome",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        channel: "chrome",
      },
    },
    {
      name: "iphone-webkit",
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        channel: undefined,
      },
    },
  ],
});
