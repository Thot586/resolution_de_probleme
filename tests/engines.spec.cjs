// Smoke test across rendering engines (Chromium, Firefox, WebKit): every page opens without console error or failed
// request, the homemade controls are built, and the main interactions work. Engines that are not installed are skipped
// (install them with: npx playwright install firefox webkit). Run: npm run test:engines
// Environment: QA_OUTPUT=<folder> keeps one screenshot per engine, page and size; QA_SCHEME=dark runs in dark mode;
// QA_ENGINES=webkit (or a comma list) runs only those engines.
// A machine busy with other jobs can stall an engine for a while: a size that crashes (timeout) is retried once with a
// fresh browser context; anything the page itself reports (error, failed request, missing control) is never retried.
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const { chromium, firefox, webkit } = require("playwright");

const root = path.resolve(__dirname, "..");
const output = process.env.QA_OUTPUT;
const scheme = process.env.QA_SCHEME === "dark" ? "dark" : "light";
const pages = ["accueil", "outil", "soutenir", "groupe", "proche", "violences", "violences-couple", "violences-authority", "comprendre", "securite", "bibliographie", "recap"];
const sizes = [["phone", 390, 844], ["desktop", 1280, 900]];
const within = (promise, milliseconds) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, milliseconds))]);

// One pass over every page and interaction for one engine at one size. Returns the problems found and whether it crashed.
async function exercise({ browser, name, label, width, height, url }) {
  const problems = [];
  let crashed = false;
  let step = "start";
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: "no-preference" });
  try {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000); // a cold engine on a busy machine can be slow; a real hang still ends the test
    page.on("pageerror", (error) => problems.push(`${label} pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") problems.push(`${label} console: ${message.text()}`); });
    page.on("requestfailed", (request) => problems.push(`${label} request failed: ${request.url().slice(0, 90)}`));
    page.on("request", (request) => { if (!request.url().startsWith(url)) problems.push(`${label} external request: ${request.url().slice(0, 90)}`); });
    for (const hash of pages) {
      step = `open #${hash}`;
      await page.goto(`${url}#${hash}`);
      const view = hash.split("-")[0];
      await page.locator(`#${view}`).waitFor({ state: "visible", timeout: 20000 });
      const visibleViews = await page.evaluate(() => [...document.querySelectorAll(".view")].filter((node) => !node.hidden).length);
      if (visibleViews !== 1) problems.push(`${label} #${hash}: ${visibleViews} views visible`);
      step = `screenshot #${hash}`;
      if (output) await page.screenshot({ path: path.join(output, `${name}-${label}-${hash}.png`), fullPage: true, timeout: 90000 });
    }
    // The homemade controls are built and usable.
    step = "violence chooser";
    await page.goto(`${url}#violences`);
    await page.locator("#violence-context").waitFor({ state: "visible" });
    if (!(await page.evaluate(() => document.querySelectorAll("choice-group[data-built]").length >= 1))) problems.push(`${label}: choice-group not built`);
    await page.locator('#violence-context input[value="couple"]').check();
    await page.locator("#meter [data-meter]").first().waitFor({ state: "visible", timeout: 10000 });
    if ((await page.evaluate(() => document.querySelector("#violence-context").value)) !== "couple") problems.push(`${label}: choice value not kept`);
    if (await page.locator("#violence-context details").evaluate((node) => node.open)) problems.push(`${label}: chooser did not fold after the choice`);
    // Keyboard: a radio group answers to the arrow keys.
    step = "keyboard in the tool";
    await page.goto(`${url}#outil-shared`);
    await page.locator("#context-select").waitFor({ state: "visible" });
    await page.locator("#context-select input").first().focus();
    const before = await page.evaluate(() => document.querySelector("#context-select").value);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.querySelector("#context-select").value);
    if (before === after) problems.push(`${label}: arrow key did not move the choice`);
    // Heading font: embedded, no request, ready.
    step = "heading font";
    // (Decoding is asynchronous: on a busy machine it may take a few seconds, but it must end "loaded".)
    const fontReady = await page
      .waitForFunction(() => [...document.fonts].some((face) => face.family.includes("Barlow") && face.status === "loaded"), null, { timeout: 15000 })
      .then(() => true, () => false);
    if (!fontReady) {
      const faces = await page.evaluate(() => [...document.fonts].map((face) => `${face.family}:${face.status}`).join(", ") || "none");
      problems.push(`${label}: heading font not ready (${faces})`);
    }
    // Dialog and details.
    step = "dialog and details";
    await page.goto(`${url}#comprendre`);
    await page.locator("#comprendre").waitFor({ state: "visible" });
    await page.locator("#comprendre [data-term]").first().evaluate((node) => node instanceof HTMLElement && node.click());
    await page.locator("#term-dialog").waitFor({ state: "visible", timeout: 10000 });
    await page.keyboard.press("Escape");
    await page.locator("#term-dialog").waitFor({ state: "hidden", timeout: 10000 });
    const closed = page.locator("#comprendre details:not([open]) > summary:visible").first();
    if (await closed.count()) {
      await closed.click();
      await page.waitForTimeout(400);
    }
  } catch (error) {
    crashed = true;
    problems.push(`${label} crashed at "${step}": ${String(error.message).split("\n")[0]}`);
  }
  await within(context.close().catch(() => {}), 15000);
  return { problems, crashed };
}

(async () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const server = http.createServer((request, response) => {
    if (request.url.startsWith("/assets/")) {
      const file = path.join(root, decodeURIComponent(request.url.split("?")[0]));
      if (file.startsWith(path.join(root, "assets")) && fs.existsSync(file)) {
        response.end(fs.readFileSync(file));
        return;
      }
      response.statusCode = 404;
      response.end();
      return;
    }
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  if (output) fs.mkdirSync(output, { recursive: true });

  const summary = {};
  const wanted = (process.env.QA_ENGINES || "chromium,firefox,webkit").split(",");
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    if (!wanted.includes(name)) continue;
    let browser;
    try {
      browser = await engine.launch();
    } catch (error) {
      summary[name] = "skipped (not installed)";
      continue;
    }
    const problems = [];
    for (const [label, width, height] of sizes) {
      let result = await exercise({ browser, name, label, width, height, url });
      if (result.crashed) {
        console.error(`${name} ${label}: ${result.problems[result.problems.length - 1]} (retrying once with a fresh context)`);
        result = await exercise({ browser, name, label, width, height, url });
      }
      problems.push(...result.problems);
    }
    await within(browser.close().catch(() => {}), 15000);
    summary[name] = problems.length ? problems : "ok";
  }
  server.close();
  console.log(JSON.stringify({ scheme, engines: summary }, null, 2));
  const failed = Object.values(summary).some((value) => Array.isArray(value));
  assert(!failed, "Cross-engine smoke test found problems");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
