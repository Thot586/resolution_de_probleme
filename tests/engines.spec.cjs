// Smoke test across rendering engines (Chromium, Firefox, WebKit): every page opens without console error or failed
// request, the homemade controls are built, and the main interactions work. An engine that is not installed is skipped
// (install them with: npx playwright install firefox webkit); any other launch failure fails the test, and so does a run
// where no engine at all could be exercised. Run: npm run test:engines
// Environment: QA_OUTPUT=<folder> keeps one screenshot per engine, page and size (animations finished, so the images compare);
// QA_SCHEME=dark runs in dark mode; QA_ENGINES=webkit (or a comma list) runs only those engines; QA_NODE_MODULES=<folder>
// points to another node_modules.
// A machine busy with other jobs can stall an engine for a while: a size that crashes (timeout) is retried once with a
// fresh browser context; whatever the page itself reported during the first attempt (error, failed request, missing
// control) is kept and never retried away.
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const modules = process.env.QA_NODE_MODULES;
const { chromium, firefox, webkit } = require(modules ? path.join(modules, "playwright") : "playwright");

const root = path.resolve(__dirname, "..");
const output = process.env.QA_OUTPUT;
const scheme = process.env.QA_SCHEME === "dark" ? "dark" : "light";
const pages = ["accueil", "outil", "soutenir", "groupe", "proche", "violences", "violences-couple", "violences-authority", "comprendre", "securite", "bibliographie", "recap"];
const sizes = [["phone", 390, 844], ["desktop", 1280, 900]];
const within = (promise, milliseconds) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, milliseconds))]);
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

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
    // The page is one file: font, logo and icon are embedded, so nothing but the page itself may be requested.
    page.on("request", (request) => { if (request.url().split("#")[0] !== url) problems.push(`${label} external request: ${request.url().slice(0, 90)}`); });
    for (const hash of pages) {
      step = `open #${hash}`;
      await page.goto(`${url}#${hash}`);
      const view = hash.split("-")[0];
      await page.locator(`#${view}`).waitFor({ state: "visible", timeout: 20000 });
      const visibleViews = await page.evaluate(() => [...document.querySelectorAll(".view")].filter((node) => !node.hidden).length);
      if (visibleViews !== 1) problems.push(`${label} #${hash}: ${visibleViews} views visible`);
      step = `screenshot #${hash}`;
      if (output) await page.screenshot({ path: path.join(output, `${name}-${label}-${hash}.png`), fullPage: true, animations: "disabled", timeout: 90000 });
    }
    // The theme under test is applied, the safety page has no motion and the other pages fade in (the page fade is a bonus).
    step = "theme and motion";
    await page.goto(`${url}#accueil`);
    await page.locator("#accueil").waitFor({ state: "visible" });
    const home = await page.evaluate(() => ({ background: getComputedStyle(document.body).backgroundColor, animation: getComputedStyle(document.querySelector("#accueil")).animationName }));
    if (home.background !== (scheme === "dark" ? "rgb(14, 20, 36)" : "rgb(247, 249, 253)")) problems.push(`${label}: the ${scheme} theme is not applied (${home.background})`);
    if (home.animation !== "page-in") problems.push(`${label}: pages should fade in (${home.animation})`);
    await page.goto(`${url}#securite`);
    await page.locator("#securite").waitFor({ state: "visible" });
    const safety = await page.evaluate(() => getComputedStyle(document.querySelector("#securite")).animationName);
    if (safety !== "none") problems.push(`${label}: #securite must appear without any animation (${safety})`);
    // The homemade controls are built and usable.
    step = "violence chooser";
    await page.goto(`${url}#violences`);
    await page.locator("#violence-context").waitFor({ state: "visible" });
    if (!(await page.evaluate(() => document.querySelectorAll("choice-group[data-built]").length >= 1))) problems.push(`${label}: choice-group not built`);
    // Keyboard on the folded list: arrows walk through the choices without folding it, Enter confirms and folds.
    await page.locator("#violence-context input").first().focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await settle(page);
    const walked = await page.evaluate(() => ({
      open: document.querySelector("#violence-context details").open,
      onRadio: document.activeElement?.matches("#violence-context input[type=radio]"),
      value: document.querySelector("#violence-context").value,
    }));
    if (!walked.open || !walked.onRadio || !walked.value) problems.push(`${label}: arrows must walk through the folded list (${JSON.stringify(walked)})`);
    await page.keyboard.press("Enter");
    await settle(page);
    const confirmed = await page.evaluate(() => ({ open: document.querySelector("#violence-context details").open, onSummary: document.activeElement?.matches("#violence-context summary") }));
    if (confirmed.open || !confirmed.onSummary) problems.push(`${label}: Enter must fold the list and focus its summary (${JSON.stringify(confirmed)})`);
    // A pointer choice folds the list too.
    await page.locator("#violence-context summary").click();
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
    // Heading font: embedded (no request), and the engine can decode it. fonts.load() forces the load and resolves with the
    // faces that match; WebKit lets an unused face fall back to "unloaded", so the status alone proves nothing.
    step = "heading font";
    const font = await page.evaluate(() =>
      document.fonts.load('700 1em "Barlow Condensed"').then(
        (faces) => ({ count: faces.length, statuses: faces.map((face) => face.status).join(",") }),
        (error) => ({ count: 0, statuses: `error: ${error && error.message}` }),
      ),
    );
    if (!font.count || font.statuses.split(",").some((status) => status !== "loaded")) problems.push(`${label}: heading font did not load (${JSON.stringify(font)})`);
    // Dialog and details.
    step = "dialog and details";
    await page.goto(`${url}#comprendre`);
    await page.locator("#comprendre").waitFor({ state: "visible" });
    await page.locator("#comprendre [data-term]").first().evaluate((node) => node instanceof HTMLElement && node.click());
    await page.locator("#term-dialog").waitFor({ state: "visible", timeout: 10000 });
    // Playwright counts a transparent element as visible: the open dialog must really be opaque, and the page behind it locked.
    await page.waitForFunction(() => getComputedStyle(document.querySelector("#term-dialog")).opacity === "1", null, { timeout: 5000 }).catch(() => problems.push(`${label}: the open dialog stays transparent`));
    if ((await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) !== "hidden") problems.push(`${label}: the page behind an open dialog still scrolls`);
    await page.keyboard.press("Escape");
    await page.locator("#term-dialog").waitFor({ state: "hidden", timeout: 10000 });
    if ((await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) === "hidden") problems.push(`${label}: the page stays locked after the dialog closes`);
    // (A handle, not a locator: once the panel is open it no longer matches ":not([open])", and the locator would point elsewhere.)
    const closedPanels = page.locator("#comprendre details:not([open]) > summary:visible");
    const closed = (await closedPanels.count()) ? await closedPanels.first().elementHandle() : null;
    if (closed) {
      await closed.click();
      await page.waitForTimeout(400);
      if (!(await closed.evaluate((summary) => summary.parentElement.open))) problems.push(`${label}: a details panel did not open`);
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
    if (request.url !== "/") {
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
      browser = await engine.launch(name === "chromium" ? { args: ["--hide-scrollbars"] } : {});
    } catch (error) {
      if (!/Executable doesn't exist|not installed/i.test(String(error.message))) throw error; // a timeout or a crash at launch is a failure, not a skip
      summary[name] = "skipped (not installed)";
      continue;
    }
    const problems = [];
    for (const [label, width, height] of sizes) {
      let result = await exercise({ browser, name, label, width, height, url });
      if (result.crashed) {
        const reported = result.problems.slice(0, -1); // what the page reported before the crash is kept
        console.error(`${name} ${label}: ${result.problems[result.problems.length - 1]} (retrying once with a fresh context)`);
        result = await exercise({ browser, name, label, width, height, url });
        result.problems.unshift(...reported);
      }
      problems.push(...result.problems);
    }
    await within(browser.close().catch(() => {}), 15000);
    summary[name] = problems.length ? problems : "ok";
  }
  server.close();
  console.log(JSON.stringify({ scheme, engines: summary }, null, 2));
  assert(Object.values(summary).some((value) => value === "ok" || Array.isArray(value)), "No engine could be exercised: install one (npx playwright install chromium)");
  const failed = Object.values(summary).some((value) => Array.isArray(value));
  assert(!failed, "Cross-engine smoke test found problems");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
