/**
 * Screenshot helper for visual QA. Usage:
 *   pnpm exec tsx e2e/shoot.ts <path> [out.png] [--dark] [--wide]
 * Signs in as the test user, opens <path>, waits for motion to settle, saves a full-page PNG.
 */
import { chromium, devices } from "@playwright/test";
import { signIn } from "./auth";

const [path = "/", out = "/tmp/shot.png", ...flags] = process.argv.slice(2);
const base = process.env.E2E_BASE ?? "http://localhost:3311";

async function main() {
const browser = await chromium.launch();
const context = await browser.newContext({
  ...(flags.includes("--wide") ? { viewport: { width: 1280, height: 860 } } : devices["iPhone 15"]),
  colorScheme: flags.includes("--dark") ? "dark" : "light",
  baseURL: base,
});
const page = await context.newPage();
if (!flags.includes("--signed-out")) await signIn(page, path);
else await page.goto(path);
await page.waitForTimeout(2500);
await page.screenshot({ path: out, fullPage: !flags.includes("--viewport") });
await browser.close();
console.log(out);
}

void main();
