// Homepage-only browser checks. Run against a running Bolo frontend:
// node scripts/home-motion-smoke.mjs
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({ channel: process.env.BOLO_BROWSER ?? "chrome", headless: true });
const screenshots = new URL("../.tools/screenshots/", import.meta.url);
await mkdir(screenshots, { recursive: true });
const errors = [];
async function settle(page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => animation.animationName !== "home-caption-settle")
    .map(animation => animation.finished.catch(() => {}))));
}
async function revealPage(page) {
  for (const target of await page.locator("[data-reveal]").all()) {
    await target.evaluate(element => element.scrollIntoView({ behavior: "instant", block: "center" }));
    await page.waitForFunction(element => !element.classList.contains("reveal-pending"), await target.elementHandle());
  }
  await settle(page);
}
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390, isMobile: width === 390 });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.locator(".home-photo img").evaluate(image => image.decode());
    await settle(page);
    if (width === 1280) {
      const button = page.locator(".home-hero-copy .home-primary");
      await button.hover();
      await page.waitForFunction(element => new DOMMatrix(getComputedStyle(element).transform).m42 < -2, await button.elementHandle());
      await page.mouse.down();
      await page.waitForFunction(element => new DOMMatrix(getComputedStyle(element).transform).m11 < .995, await button.elementHandle());
      await page.mouse.move(5, 5);
      await page.mouse.up();
    }
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("[data-reveal]")) {
        const animate = element.animate.bind(element);
        element.animate = (...args) => {
          element.dataset.revealCount = String(Number(element.dataset.revealCount || 0) + 1);
          return animate(...args);
        };
      }
    });
    await revealPage(page);
    const counts = await page.locator("[data-reveal]").evaluateAll(elements => elements.map(element => Number(element.dataset.revealCount || 0)));
    assert(counts.some(count => count === 1), "Below-fold content should reveal on scroll");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await revealPage(page);
    assert.deepEqual(await page.locator("[data-reveal]").evaluateAll(elements => elements.map(element => Number(element.dataset.revealCount || 0))), counts, "Scroll reveals should run only once");
    const preview = page.locator(".lesson-preview");
    const height = await preview.evaluate(element => element.getBoundingClientRect().height);
    await preview.getByRole("button", { name: "ગુજરાતી", exact: true }).click();
    await settle(page);
    assert.equal(await preview.evaluate(element => element.getBoundingClientRect().height), height, "Script switching must not shift the card layout");
    await preview.getByText("કેમ છો?", { exact: true }).waitFor();
    await preview.getByRole("button", { name: "Romanized", exact: true }).click();
    await settle(page);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Motion must not create horizontal overflow");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: fileURLToPath(new URL(`motion-${width}.png`, screenshots)), fullPage: true, animations: "disabled", style: "nextjs-portal { display: none; }" });
    // Focus must reveal pending ancestors immediately, before scroll animation.
    await page.reload({ waitUntil: "networkidle" });
    await preview.getByRole("button", { name: "ગુજરાતી", exact: true }).focus();
    assert.equal(await preview.evaluate(element => getComputedStyle(element).opacity), "1");
    assert.equal(await preview.locator(".reveal-pending").count(), 0);
    await page.reload({ waitUntil: "networkidle" });
    // A changed preference must also reveal content that is still pending.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.querySelector(".reveal-pending"));
    assert.equal(await page.locator(".home-hero").evaluate(element => element.getAnimations({ subtree: true }).length), 0);
    await preview.getByRole("button", { name: "ગુજરાતી", exact: true }).focus();
    assert.equal(await preview.evaluate(element => getComputedStyle(element).opacity), "1");
    await context.close();
  }
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const page = await noScript.newPage();
  await page.goto("http://localhost:3000");
  assert.equal(await page.locator(".home-finale").evaluate(element => getComputedStyle(element).opacity), "1", "Content must remain visible without JavaScript");
  assert.equal(await page.getByRole("link", { name: /Start Learning/ }).first().getAttribute("href"), "/learn");
  await noScript.close();
  assert.deepEqual(errors, []);
  console.log("PASS: desktop/mobile motion, once-only reveals, stable script switching, reduced-motion changes, keyboard focus, no-JS content, no overflow or JavaScript errors.");
} finally { await browser.close(); }
