// Loading/error/empty-state presentation checks; API failures are simulated.
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
await mkdir(new URL("../.tools/screenshots/", import.meta.url), { recursive: true });
const browser = await chromium.launch({ channel: process.env.BOLO_BROWSER ?? "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
async function capture(name) {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: fileURLToPath(new URL(`../.tools/screenshots/${name}-${width}.png`, import.meta.url)), fullPage: true, animations: "disabled", style: "nextjs-portal { display: none; }" });
  }
}
try {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route("**/api/lessons", async route => {
    await pending;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "The lesson service is temporarily unavailable." }) });
  });
  await page.goto("http://localhost:3000/learn", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Getting your lesson ready…" }).waitFor();
  await capture("lesson-loading");
  release();
  await page.locator(".exercise-panel [role=alert]").waitFor();
  await capture("lesson-error");
  await page.unroute("**/api/lessons");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: /Let’s practice/ }).waitFor();
  await page.route("**/api/lessons", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.reload();
  await page.locator(".exercise-panel [role=alert]").waitFor();
  assert.match(await page.locator(".exercise-panel [role=alert]").textContent(), /No lessons are available yet/);
  await capture("lesson-empty");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".learn-page").evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  console.log("PASS: loading, simulated API error, successful retry, empty content, reduced motion, desktop/mobile overflow checks.");
} finally { await browser.close(); }
