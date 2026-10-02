// End-to-end checks for the standalone page. Run: node tests/app.spec.cjs
const { createServer } = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const modules = process.env.QA_NODE_MODULES;
const { chromium } = require(
  modules ? path.join(modules, "playwright") : "playwright",
);
const AxeBuilder = require(
  modules ? path.join(modules, "@axe-core/playwright") : "@axe-core/playwright",
).default;
const root = path.resolve(__dirname, "..");
const output = process.env.QA_OUTPUT || "/tmp/pas-a-pas-checks";
let server, browser;
const errors = [];
(async () => {
  await fs.mkdir(output, { recursive: true });
  const html = await fs.readFile(path.join(root, "index.html"));
  server = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const external = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(url) && !r.url().startsWith("blob:"))
      external.push(r.url());
  });
  await page.goto(url);
  const visible = async (s) => {
    await page.locator(s).waitFor({ state: "visible", timeout: 5000 });
    assert(await page.locator(s).isVisible(), `${s} must be visible`);
  };
  const step = async (n) => {
    await page.locator(`#steps [data-step="${n}"]`).click();
  };
  const next = async () => page.locator("[data-action=next]").click();
  const visit = async (hash) => {
    await page.evaluate((h) => {
      location.hash = h;
    }, hash);
    await visible("#" + hash);
  };
  const overflow = async (label) =>
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Horizontal overflow: ${label}`,
    );
  const axeIssues = [];
  const axe = async (label) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    for (const v of results.violations)
      axeIssues.push({
        page: label,
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      });
    await fs.writeFile(
      path.join(output, "accessibility.json"),
      JSON.stringify(axeIssues, null, 2),
    );
  };
  await visible("#step-title");
  assert.equal(
    await page.locator("nav a[aria-current=page]").innerText(),
    "Mon problème",
  );
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.screenshot({
    path: path.join(output, "desktop-start.png"),
    fullPage: true,
  });
  await axe("start");
  await page.locator("[data-context=work]").click();
  await page.locator("[data-safety=safe]").click();
  await next();
  assert(!(await page.locator(".example").first().isVisible()));
  const firstExample = page.locator(".example-help summary").first();
  await firstExample.focus();
  await page.keyboard.press("Enter");
  assert(await page.locator(".example").first().isVisible());
  assert.match(
    await page.locator(".example").first().innerText(),
    /responsables/,
  );
  await page
    .locator("#field-situation")
    .fill("Deux dossiers à remettre le même jour.");
  await page.locator("#field-goal").fill("Demander un ordre de priorité.");
  await page.locator("#field-obstacle").fill("Le temps manque.");
  await next();
  await next(); // empty alternatives stay on the same step
  assert.equal(
    await page.locator("#steps [aria-current=step]").getAttribute("data-step"),
    "2",
  );
  await page.locator("#idea-1").fill("Demander un arbitrage écrit.");
  await page.locator("#idea-2").fill("Proposer un nouveau délai.");
  await next();
  assert(!(await page.locator("#plus-1").isVisible()));
  await page.locator(".option-card summary").first().click();
  await page.locator("#plus-1").fill("Rendre la charge visible.");
  await page.locator("#minus-1").fill("La réponse peut prendre du temps.");
  await page.locator('[data-choose="1"]').click();
  await axe("compare");
  await next();
  await page
    .locator("#field-action")
    .fill("Préparer la liste des tâches demain.");
  await page.locator("#field-when").fill("Demain à 9 h, au bureau.");
  assert(!(await page.locator("#field-support").isVisible()));
  await page.locator("#step-container .optional-fields > summary").click();
  await page.locator("#field-support").fill("Ma collègue.");
  await page
    .locator("#field-backup")
    .fill("Si mon responsable est absent, alors envoyer un message.");
  await page
    .locator("#field-measure")
    .fill("Un rendez-vous de priorisation est fixé.");
  await page.locator("#field-reviewDate").fill("2026-10-09");
  await next();
  await visible("#recap");
  assert.match(
    await page.locator("#recap-content").innerText(),
    /Préparer la liste des tâches demain/,
  );
  const txtPromise = page.waitForEvent("download");
  await page.locator("[data-action=text]").click();
  const txt = await txtPromise;
  const text = await fs.readFile(await txt.path(), "utf8");
  assert.match(text, /MON PROCHAIN PAS/);
  assert.match(text, /Ma collègue/);
  assert(!text.includes("undefined"));
  await page.locator('#recap [data-step="5"]').last().click();
  await visible("#outil");
  await page.locator("[data-trial=partly]").click();
  await page
    .locator("#field-result")
    .fill("J’ai listé les tâches, mais pas envoyé le message.");
  await page.locator("#field-learning").fill("Il me manque une information.");
  await page.locator("#field-next").fill("Demander cette information.");
  await next();
  assert.match(
    await page.locator("#recap-content").innerText(),
    /Il me manque une information/,
  );
  await page.pdf({
    path: path.join(output, "plan.pdf"),
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
  });
  // Context changes preserve original responses; examples change only.
  await visit("outil");
  await step(0);
  await page.locator("[data-context=health]").click();
  await step(1);
  assert.equal(
    await page.locator("#field-situation").inputValue(),
    "Deux dossiers à remettre le même jour.",
  );
  await page.locator(".example-help summary").first().click();
  assert.match(
    await page.locator(".example").first().innerText(),
    /rendez-vous/,
  );
  await step(4);
  await visible("#field-support");
  assert.equal(
    await page.locator("#field-support").inputValue(),
    "Ma collègue.",
  );
  await page.locator("#step-container .optional-fields > summary").click();
  await visit("recap");
  assert.match(await page.locator("#recap-content").innerText(), /Ma collègue/);
  await visit("outil");
  await step(1);
  // Formatted attacks must stay text in summaries and option headings.
  const attack =
    '<img src=x onerror="window.PWNED=true"><script>alert(1)</script>';
  await page.locator("#field-situation").fill(attack);
  await step(2);
  await page.locator("#idea-2").fill(attack);
  await next();
  assert.equal(await page.locator(".option-card img").count(), 0);
  await visit("recap");
  assert.equal(await page.locator("#recap-content img").count(), 0);
  assert.equal(await page.evaluate(() => window.PWNED), undefined);
  // Saving is explicit; export/import round trip and malformed-file rejection.
  await visit("outil");
  await page.locator(".file-options summary").click();
  await page.locator("#remember").check();
  assert.equal(await page.evaluate(() => localStorage.length), 1);
  const exportPromise = page.waitForEvent("download");
  await page.locator("[data-action=export]").click();
  const draft = await exportPromise;
  const savedPath = path.join(output, "draft.json");
  await draft.saveAs(savedPath);
  const parsed = JSON.parse(await fs.readFile(savedPath, "utf8"));
  assert.equal(parsed.fields.situation, attack);
  await page.reload();
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), attack);
  await page.locator(".file-options summary").click();
  await page.locator("#remember").uncheck();
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.locator("#import-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":100}'),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("non reconnu"),
  );
  assert.match(await page.locator("#toast").innerText(), /non reconnu/);
  await page.locator("#import-file").setInputFiles(savedPath);
  await visible("#confirm-dialog");
  await page.locator("#dialog-cancel").click();
  assert(!(await page.locator("#confirm-dialog").isVisible()));
  await page.locator("#import-file").setInputFiles(savedPath);
  await page.locator("#dialog-confirm").click();
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), attack);
  // Removing a selected option clears its choice and requires a new selection.
  await step(2);
  await page.locator('[data-remove="1"]').click();
  await page.locator("#dialog-confirm").click();
  await next();
  assert.equal(
    await page.locator("[data-choose][aria-pressed=true]").count(),
    0,
  );
  await next();
  assert.equal(
    await page.locator("#steps [aria-current=step]").getAttribute("data-step"),
    "3",
  );
  // All supporting sections and all 30 meter items are interactive.
  await visit("proche");
  for (const mode of ["listen", "solve", "practical"]) {
    await page.locator(`[data-support-mode=${mode}]`).click();
    assert((await page.locator("#support-content").innerText()).length > 100);
  }
  assert.equal(await page.locator("#support-context").inputValue(), "");
  assert.equal(await page.locator("#support-context-content").innerText(), "");
  await page.locator("#support-adapt summary").click();
  for (const val of [
    "mental",
    "couple",
    "work",
    "grief",
    "material",
    "young",
  ]) {
    await page.selectOption("#support-context", val);
    assert(
      (await page.locator("#support-context-content").innerText()).length > 100,
    );
  }
  await axe("support");
  await visit("violences");
  for (const val of ["couple", "work", "care", "education", "family"]) {
    await page.selectOption("#violence-context", val);
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-meter="${i}"]`).click();
      assert.equal(
        await page.locator("[data-meter][aria-pressed=true]").count(),
        1,
      );
      assert((await page.locator("#meter-detail").innerText()).length > 100);
    }
  }
  await axe("meter");
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: path.join(output, "desktop-meter.png"),
    fullPage: true,
  });
  await visit("comprendre");
  await page
    .locator("summary")
    .filter({ hasText: "Préparer une action" })
    .click();
  const tip = page.locator("#comprendre [data-term=implementation]");
  await tip.focus();
  await visible("#tooltip");
  await page.keyboard.press("Escape");
  assert(!(await page.locator("#tooltip").isVisible()));
  await tip.hover();
  await visible("#tooltip");
  await page.keyboard.press("Escape");
  await axe("theory");
  await visit("bibliographie");
  await axe("references");
  await page.locator("nav a[data-page=comprendre]").click();
  await page
    .locator("summary")
    .filter({ hasText: "Thérapie de résolution" })
    .click();
  await page.locator('#comprendre a[href="#ref-2"]').click();
  await visible("#bibliographie");
  assert.equal(await page.evaluate(() => document.activeElement.id), "ref-2");
  await visit("securite");
  await axe("safety");
  // Reset needs confirmation, then clears both session state and saved state.
  await page.locator("#securite [data-action=reset]").click();
  await page.locator("#dialog-cancel").click();
  await page.locator("#securite [data-action=reset]").click();
  await page.locator("#dialog-confirm").click();
  await visit("outil");
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), "");
  await page.locator("#field-situation").fill("TEMP");
  await page.reload();
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), "");
  // Responsive layouts, all pages, and all form steps.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const hash of [
      "outil",
      "proche",
      "violences",
      "comprendre",
      "bibliographie",
      "securite",
      "recap",
    ]) {
      await visit(hash);
      await overflow(width + " " + hash);
    }
    await visit("outil");
    for (let i = 0; i < 6; i++) {
      await step(i);
      await overflow(width + " step " + i);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await step(0);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: path.join(output, "mobile-start.png"),
    fullPage: true,
  });
  await page.locator(".menu-toggle").click();
  await visible("#navigation");
  await page.locator("nav a[data-page=violences]").click();
  await page.locator("#navigation").waitFor({ state: "hidden" });
  assert(!(await page.locator("#navigation").isVisible()));
  await page.selectOption("#violence-context", "couple");
  await page.locator('[data-meter="3"]').click();
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: path.join(output, "mobile-meter.png"),
    fullPage: true,
  });
  await axe("mobile-meter");
  await visit("outil");
  await step(1);
  await page.locator("#field-situation").fill("X".repeat(6000));
  await visit("recap");
  await overflow("long text mobile");
  await axe("mobile-summary");
  // Storage failure remains usable, and source content has a no-JS fallback.
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  const bp = await blocked.newPage();
  await bp.goto(url);
  await bp.locator(".file-options summary").click();
  await bp.locator("#remember").click();
  assert(!(await bp.locator("#remember").isChecked()));
  await blocked.close();
  const offline = await browser.newContext();
  const op = await offline.newPage();
  await op.goto("file://" + path.join(root, "index.html"));
  assert(await op.locator("#step-title").isVisible());
  await offline.close();
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const np = await nojs.newPage();
  await np.goto(url);
  assert(await np.locator("#bibliographie").isVisible());
  assert(await np.locator("#securite").isVisible());
  await nojs.close();
  assert.deepEqual(errors, [], "No browser errors");
  assert.deepEqual(external, [], "No external network requests from page");
  await fs.writeFile(
    path.join(output, "accessibility.json"),
    JSON.stringify(axeIssues, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        functional: "passed",
        viewportWidths: [320, 390, 768, 1024, 1440],
        browserErrors: errors,
        externalRequests: external,
        accessibilityViolations: axeIssues,
        output,
      },
      null,
      2,
    ),
  );
  assert.equal(
    axeIssues.length,
    0,
    "Automated accessibility violations need review",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    await new Promise((resolve) =>
      server ? server.close(resolve) : resolve(),
    );
  });
