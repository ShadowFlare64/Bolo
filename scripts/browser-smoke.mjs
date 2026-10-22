// Real browser + real API + real PostgreSQL. Requires npm run dev in another terminal.
import { chromium } from "playwright-core";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const lesson = JSON.parse(await readFile(new URL("../backend/content/intro-lesson.json", import.meta.url), "utf8"));
const browser = await chromium.launch({ channel: process.env.BOLO_BROWSER ?? "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const answerRequests = [];
page.on("request", request => { if (/\/exercises\/[^/]+\/answers$/.test(request.url())) answerRequests.push(request.url()); });
const screenshotDir = new URL("../.tools/screenshots/", import.meta.url);
await mkdir(screenshotDir, { recursive: true });

async function noOverflow() {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Page overflows horizontally");
}
async function capture(name) {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await noOverflow();
    await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, screenshotDir)), fullPage: true, animations: "disabled", style: "nextjs-portal { display: none; }" });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
async function rapidClick(locator) {
  await locator.evaluate(button => { button.click(); button.click(); button.click(); });
}
async function stableScriptSwitch() {
  const panel = page.locator(".exercise-panel");
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const before = await panel.evaluate(element => element.offsetHeight);
    await page.getByRole("button", { name: "ગુજરાતી", exact: true }).click();
    assert.equal(await panel.evaluate(element => element.offsetHeight), before, "Script switching must preserve panel height");
    await noOverflow();
    await page.getByRole("button", { name: "Romanized", exact: true }).click();
  }
}
async function answerExercise(exercise, correct, script = "romanized") {
  if (exercise.type === "multiple-choice") {
    const option = exercise.options.find(option => correct ? option.id === exercise.correctOptionId : option.id !== exercise.correctOptionId);
    await page.getByRole("radio", { name: option.text[script], exact: true }).check();
  } else {
    const ids = correct ? exercise.acceptedOrders[0] : [...exercise.acceptedOrders[0]].reverse();
    for (const id of ids) {
      const token = exercise.tokens.find(token => token.id === id);
      await page.getByRole("button", { name: token.text[script], exact: true }).click();
    }
  }
  const before = answerRequests.length;
  await rapidClick(page.getByRole("button", { name: /Check answer/ }));
  await page.getByText(correct ? "✓ That’s right!" : "Keep going — here’s the phrase.", { exact: true }).waitFor();
  assert.equal(answerRequests.length, before + 1, "Rapid checks must submit an answer only once");
}
try {
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  assert.equal(await page.locator("main > section").count(), 3, "Homepage should have three purposeful sections");
  await page.locator(".home-photo img").evaluate(image => image.decode());
  assert(await page.locator(".home-photo img").evaluate(image => image.naturalWidth > 0), "Hero photograph must load");
  await noOverflow();
  await page.screenshot({ path: fileURLToPath(new URL("landing-desktop.png", screenshotDir)), fullPage: true });
  const preview = page.getByRole("region", { name: "Example of the Bolo lesson interface" });
  if (await preview.count()) {
    await preview.getByRole("button", { name: "ગુજરાતી", exact: true }).click();
    await preview.getByText("કેમ છો?", { exact: true }).waitFor();
    await preview.getByRole("button", { name: "Romanized", exact: true }).click();
  }
  for (const width of [320, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await noOverflow(); }
  await page.getByRole("link", { name: /Start Learning/ }).first().click();
  await page.getByRole("heading", { name: lesson.title }).waitFor();
  await page.getByRole("button", { name: /Let’s practice/ }).waitFor();
  await stableScriptSwitch();
  await capture("lesson-introduction");
  await page.getByRole("button", { name: /Let’s practice/ }).click();
  for (let index = 0; index < lesson.exercises.length; index++) {
    await page.getByRole("heading", { name: lesson.exercises[index].prompt, exact: true }).waitFor();
    if (index === 0 || index === 2) await stableScriptSwitch();
    if (index === 0) await page.getByRole("button", { name: "ગુજરાતી", exact: true }).click();
    if (index === 1) await page.getByRole("button", { name: "Romanized", exact: true }).click();
    if (index === 0) {
      await page.getByRole("radio").first().focus();
      await page.keyboard.press("Space");
      assert(await page.getByRole("radio").first().isChecked(), "Keyboard selection should work");
    }
    await answerExercise(lesson.exercises[index], ![0, 2].includes(index), index === 0 ? "gujarati" : "romanized");
    if (index === 0) await capture("feedback-incorrect");
    if (index === 1) await capture("feedback-correct");
    if (index === 2) await capture("sentence-feedback");
    await rapidClick(page.getByRole("button", { name: index === 4 ? /Finish lesson/ : /Continue/ }));
  }
  await page.getByText("Original score: 3 of 5 correct.", { exact: true }).waitFor();
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await capture("lesson-completed");
  await page.screenshot({ path: fileURLToPath(new URL("completion-desktop.png", screenshotDir)), fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Review Mistakes", exact: true }).click();
  await page.getByText("Mistake review · Original score: 3/5", { exact: true }).waitFor();
  await capture("review-question");
  for (const [index, exercise] of [lesson.exercises[0], lesson.exercises[2]].entries()) {
    await answerExercise(exercise, true);
    await page.getByRole("button", { name: index === 1 ? /Finish review/ : /Continue/ }).click();
  }
  await page.getByRole("heading", { name: "Review complete.", exact: true }).waitFor();
  await capture("review-completed");
  await page.getByText("Original score: 3 of 5 correct.", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Restart full lesson/ }).click();
  await page.getByRole("heading", { name: lesson.title }).waitFor();
  await page.reload();
  await page.getByText("Saved progress: completed 1 time · Best score 3/5", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.getByRole("button", { name: /Let’s practice/ }).click();
  await page.getByRole("radio").first().waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".learn-page").evaluate(element => element.getAnimations({ subtree: true }).length), 0, "Reduced motion should disable lesson animations");
  await stableScriptSwitch();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: fileURLToPath(new URL("lesson-mobile.png", screenshotDir)), fullPage: true });
  await page.getByRole("link", { name: /Exit lesson/ }).click();
  await page.getByRole("link", { name: /Start Learning/ }).first().waitFor();
  await noOverflow();
  await page.screenshot({ path: fileURLToPath(new URL("landing-mobile.png", screenshotDir)), fullPage: true });
  const menu = page.locator(".mobile-nav");
  if (await menu.count()) {
    await menu.locator("summary").click();
    await menu.getByRole("link", { name: "Your first lesson" }).click();
    assert.equal(await menu.getAttribute("open"), null, "Mobile menu should close after navigation");
    await menu.locator("summary").click();
    await page.keyboard.press("Escape");
    assert.equal(await menu.getAttribute("open"), null, "Escape should close mobile navigation");
  }
  // A stale/malformed ID must not trap the learner on an unrecoverable error.
  await page.evaluate(() => localStorage.setItem("bolo.learnerId", "missing-browser-profile"));
  await page.goto("http://localhost:3000/learn");
  await page.getByRole("button", { name: "Start new anonymous profile" }).click();
  await page.getByRole("heading", { name: lesson.title }).waitFor();
  assert.notEqual(await page.evaluate(() => localStorage.getItem("bolo.learnerId")), "missing-browser-profile");
  assert.deepEqual(errors, [], "Browser JavaScript errors occurred");
  console.log("PASS: live lesson/review flow, both scripts/types, rapid clicks, keyboard selection, stable script layouts at four widths, reduced motion, scoring, persistent progress, no overflow or JavaScript errors.");
} finally { await browser.close(); }
