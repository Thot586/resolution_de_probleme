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
    const desktopStep = page.locator(`#steps [data-step="${n}"]`);
    if (await desktopStep.isVisible()) {
      await desktopStep.click();
    } else {
      const picker = page.locator("#mobile-step-picker");
      if (!(await picker.evaluate((el) => el.open))) await picker.locator("summary").click();
      await page.locator(`#mobile-steps [data-step="${n}"]`).click();
    }
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
  await visible("#accueil");
  assert.equal(
    await page.locator("nav a[aria-current=page]").innerText(),
    "Accueil",
  );
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  assert.match(await page.locator("#accueil .path-flow").innerText(), /décris.*cherche.*choisis.*essaie.*fais le point/);
  assert.equal(await page.locator('#accueil a[href="#soutenir"]').count(), 1);
  assert.equal(await page.locator('#accueil a[href="#groupe"]').count(), 1);
  await page.screenshot({ path: path.join(output, "desktop-home.png"), fullPage: true });
  await page.locator("#accueil .welcome-explain summary").click();
  await visible("#accueil svg[aria-labelledby='method-title method-desc']");
  assert.match(await page.locator("#accueil svg").textContent(), /Faire le point/);
  await axe("method-diagram");
  await page.locator("#accueil .welcome-explain summary").click();
  assert.equal(await page.locator("#accueil [data-start-scale]").count(), 4);
  for (const [scale, expected] of [
    ["personal", /Quel est mon problème/],
    ["shared", /Qu’est-ce qui compte pour chacun/],
    ["organization", /Quel problème le système produit/],
    ["public", /Qui est touché et quelle décision manque/],
  ]) {
    await page.locator(`#accueil [data-start-scale="${scale}"]`).click();
    await visible("#outil");
    assert.equal(new URL(page.url()).hash, `#outil-${scale}`);
    assert((await page.locator("#selected-level").innerText()).includes(await page.locator(`#accueil [data-start-scale="${scale}"] strong`).innerText()));
    assert(!(await page.locator("#change-level [data-scale]").first().isVisible()));
    await step(1);
    assert.match(await page.locator("#step-title").innerText(), expected);
    await visit("accueil");
  }
  const direct = await context.newPage();
  await direct.goto(url + "#outil-public");
  assert(await direct.locator("#outil").isVisible());
  assert.match(await direct.locator("#selected-level").innerText(), /Collectif ou politique/);
  assert(!(await direct.locator("#change-level [data-scale]").first().isVisible()));
  await direct.close();
  // Direct entry needs an explicit level; a blank recap guides the user back.
  const starter = await context.newPage();
  await starter.goto(url + "#outil");
  assert(await starter.locator("#outil .scale-options").isVisible());
  assert(!(await starter.locator("#recap-shortcut").isVisible()));
  await starter.locator('[data-action="next"]').click();
  assert.equal(await starter.locator('#steps [aria-current="step"]').getAttribute("data-step"), "0");
  assert.match(await starter.locator("#toast").innerText(), /Choisissez d’abord le niveau/);
  await starter.evaluate(() => { location.hash = "recap"; });
  await starter.locator("#recap").waitFor({ state: "visible" });
  assert.match(await starter.locator("#recap-content").innerText(), /Ma fiche est encore vide/);
  assert(!(await starter.locator("#recap-actions").isVisible()));
  await starter.locator('#recap-content [data-step="0"]').click();
  assert(await starter.locator("#outil .scale-options").isVisible());
  await starter.close();
  await page.locator('#accueil a[href="#soutenir"]').first().click();
  await visible("#soutenir");
  assert(await page.locator("#soutenir .support-start").isVisible());
  assert(await page.locator("#need-lab").isVisible());
  assert(!(await page.locator("#soutenir .teaching-figure").isVisible()));
  await page.locator("#soutenir .support-illustration summary").click();
  await visible("#soutenir svg[aria-labelledby='journey-title journey-desc']");
  assert.match(await page.locator("#soutenir svg").textContent(), /Seulement avec son accord/);
  await page.screenshot({ path: path.join(output, "desktop-support.png"), fullPage: true });
  await page.locator("#soutenir .support-illustration summary").click();
  await page.locator("#support-relation").selectOption("learner");
  await page.locator("[data-need=advice]").click();
  assert.match(await page.locator("#need-guidance").innerText(), /accord/);
  assert.match(await page.locator("#need-guidance").innerText(), /encadrement/);
  await page.locator("#support-relation").selectOption("close");
  assert(await page.locator('#need-guidance a[href="#proche"]').isVisible());
  await page.locator('#soutenir a[href="#proche"]').first().click();
  await visible("#proche");
  await visit("groupe");
  await page.locator("#groupe .group-overview summary").click();
  await visible("#groupe svg[aria-labelledby='group-map-title group-map-desc']");
  assert.match(await page.locator("#groupe svg").textContent(), /Décider ensemble/);
  await page.locator("#groupe .group-overview summary").click();
  assert.match(await page.locator("#group-step-title").innerText(), /Qui participe/);
  await page.locator("#group-note").fill("Décision : améliorer les horaires d’accueil.");
  await page.locator("#group-next").click();
  await page.locator("#group-method").selectOption("survey");
  assert.match(await page.locator("#group-method-hint").innerText(), /combien ont répondu/);
  await page.locator("#group-stage-select").selectOption("2");
  assert(await page.locator("#group-guidance [data-term=survey]").isVisible());
  await page.locator("#group-stage-select").selectOption("3");
  assert.match(await page.locator("#group-step-title").innerText(), /reconnaissent/);
  await page.locator("#group-plan summary").click();
  assert.match(await page.locator("#group-plan-content").innerText(), /améliorer les horaires/);
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  const groupDownload = page.waitForEvent("download");
  await page.locator("#group-download").click();
  assert.equal((await groupDownload).suggestedFilename(), "plan-groupe-pas-a-pas.txt");
  await page.screenshot({ path: path.join(output, "desktop-group.png"), fullPage: true });
  await axe("group");
  await page.locator("#group-clear").click();
  await page.locator("#dialog-confirm").click();
  assert.match(await page.locator("#group-plan-content").innerText(), /pas encore noté/);
  await visit("outil");
  await visible("#step-title");
  await step(0);
  assert.match(await page.locator("#privacy-status").innerText(), /Rien n’est envoyé/);
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  for (const [scale, expected] of [
    ["shared", /Qu’est-ce qui compte pour chacun/],
    ["organization", /Quel problème le système produit/],
    ["public", /Qui est touché et quelle décision manque/],
  ]) {
    await page.locator("#change-level summary").click();
    await page.locator(`[data-scale=${scale}]`).click();
    assert.equal(new URL(page.url()).hash, `#outil-${scale}`);
    await step(1);
    assert.match(await page.locator("#step-title").innerText(), expected);
    await step(0);
  }
  await page.locator("#change-level summary").click();
  await page.locator("[data-scale=personal]").click();
  assert.equal(new URL(page.url()).hash, "#outil-personal");
  await step(1);
  assert(!(await page.locator(".optional-fields .details-body").first().isVisible()));
  await step(0);
  await page.screenshot({
    path: path.join(output, "desktop-start.png"),
    fullPage: true,
  });
  await axe("start");
  await page.locator("#context-select").selectOption("work");
  await page.locator("[data-safety=safe]").click();
  await next();
  assert.match(await page.locator(".question-progress").innerText(), /Question 1 sur 3/);
  assert(await page.locator(".example-visible").isVisible());
  assert.match(
    await page.locator(".example-visible").innerText(),
    /responsables/,
  );
  assert.equal(await page.locator("#field-goal").count(), 0);
  await page
    .locator("#field-situation")
    .fill("Deux dossiers à remettre le même jour.");
  await next();
  assert.match(await page.locator(".question-progress").innerText(), /Question 2 sur 3/);
  assert(await page.locator("#field-goal").isVisible());
  assert.equal(await page.locator("#field-obstacle").count(), 0);
  await page.locator("#field-goal").fill("Demander un ordre de priorité.");
  await next();
  assert.match(await page.locator(".question-progress").innerText(), /Question 3 sur 3/);
  assert(await page.locator("#field-obstacle").isVisible());
  await page.locator("#field-obstacle").fill("Le temps manque.");
  assert(!(await page.locator(".optional-fields .details-body").first().isVisible()));
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
  await page.locator("#context-select").selectOption("health");
  assert.match(await page.locator("#toast").innerText(), /Le texte déjà saisi ne change pas/);
  await step(1);
  assert.equal(
    await page.locator("#field-situation").inputValue(),
    "Deux dossiers à remettre le même jour.",
  );
  assert.match(
    await page.locator(".example-visible").innerText(),
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
  assert.match(await page.locator("#privacy-status").innerText(), /gardé dans ce navigateur/);
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
  const guides = page.locator("#comprendre .visual-guides details");
  await page
    .locator("summary")
    .filter({ hasText: "Préparer une action" })
    .click();
  const tip = page.locator("#comprendre [data-term=implementation]").first();
  await tip.focus();
  await visible("#tooltip");
  assert.match(await page.locator("#tooltip").innerText(), /plan précis/);
  await page.keyboard.press("Escape");
  assert(!(await page.locator("#tooltip").isVisible()));
  await page.keyboard.press("Tab");
  await tip.hover();
  await visible("#tooltip");
  await tip.click();
  await visible("#term-dialog");
  assert.match(await page.locator("#term-detail").innerText(), /si… alors/);
  assert.match(await page.locator("#term-example").innerText(), /demain matin/);
  assert.equal(await page.locator("#term-source").getAttribute("href"), "#ref-4");
  await page.screenshot({ path: path.join(output, "desktop-glossary.png") });
  await axe("glossary-drawer");
  await page.keyboard.press("Escape");
  assert(!(await page.locator("#term-dialog").isVisible()));
  assert(!(await page.locator("#tooltip").isVisible()));
  assert(await tip.evaluate((el) => el === document.activeElement));
  await page.keyboard.press("Enter");
  await visible("#term-dialog");
  await page.locator("#term-close").click();
  await page.locator("#comprendre summary").filter({ hasText: "Glossaire :" }).click();
  assert.equal(await page.locator("#glossary-list [data-term]").count(), 19);
  assert(await page.evaluate(() => Object.keys(glossary).every((key) => glossaryHelp[key]?.length === 3)));
  await page.locator("#glossary-list [data-term=indicator]").click();
  await visible("#term-dialog");
  assert.match(await page.locator("#term-title").innerText(), /Indicateur/);
  await page.locator("#term-source").click();
  assert(!(await page.locator("#term-dialog").isVisible()));
  await visible("#bibliographie");
  assert.equal(new URL(page.url()).hash, "#ref-22");
  await visit("comprendre");
  await axe("theory");
  assert.equal(await guides.count(), 2);
  await guides.nth(0).locator("summary").click();
  await guides.nth(1).locator("summary").click();
  await visible("#comprendre svg[aria-labelledby='organization-title organization-desc']");
  await visible("#comprendre svg[aria-labelledby='public-title public-desc']");
  await axe("scale-diagrams");
  await guides.nth(0).locator("summary").click();
  await guides.nth(1).locator("summary").click();
  await visit("bibliographie");
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('a[href^="#ref-"]')].map((a) => a.getAttribute("href")).filter((href) => !document.getElementById(href.slice(1)))), []);
  await axe("references");
  await page.locator('footer a[href="#comprendre"]').click();
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
  assert(!(await page.locator("#recap-shortcut").isVisible()));
  assert(await page.locator("#outil .scale-options").isVisible());
  await page.locator('[data-scale="personal"]').click();
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), "");
  await page.locator("#field-situation").fill("TEMP");
  await page.reload();
  await page.locator('[data-scale="personal"]').click();
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), "");
  // Responsive layouts, all pages, and all form steps.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const hash of [
      "accueil",
      "outil",
      "soutenir",
      "groupe",
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
  await visit("accueil");
  await page.screenshot({ path: path.join(output, "mobile-home.png"), fullPage: true });
  await page.locator("#accueil .welcome-explain summary").click();
  await overflow("open method diagram mobile");
  await page.locator("#accueil .teaching-figure").screenshot({ path: path.join(output, "method-mobile.png") });
  await visit("soutenir");
  await page.locator("#soutenir .support-illustration summary").click();
  await page.locator("#soutenir .teaching-figure").screenshot({ path: path.join(output, "support-figure-mobile.png") });
  await visit("groupe");
  await page.screenshot({ path: path.join(output, "mobile-group.png"), fullPage: true });
  await page.locator("#groupe [data-term=survey]").first().click();
  await visible("#term-dialog");
  await page.screenshot({ path: path.join(output, "mobile-glossary.png") });
  await page.locator("#term-close").click();
  await axe("mobile-group");
  await visit("comprendre");
  await guides.nth(0).locator("summary").click();
  await guides.nth(1).locator("summary").click();
  await overflow("open scale diagrams mobile");
  await guides.nth(0).locator(".teaching-figure").screenshot({ path: path.join(output, "organization-mobile.png") });
  await guides.nth(1).locator(".teaching-figure").screenshot({ path: path.join(output, "public-mobile.png") });
  await visit("outil");
  await step(0);
  assert(await page.locator("#mobile-step-picker").isVisible());
  assert(!(await page.locator("#steps").isVisible()));
  assert.match(await page.locator("#mobile-step-summary").innerText(), /Étape 1 sur 6/);
  await page.locator("#mobile-step-picker summary").click();
  assert(await page.locator('#mobile-steps [data-step="2"]').isVisible());
  await page.locator('#mobile-steps [data-step="2"]').click();
  assert.match(await page.locator("#mobile-step-summary").innerText(), /Étape 3 sur 6/);
  assert(!(await page.locator("#mobile-step-picker").evaluate((el) => el.open)));
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
  assert.equal(await page.locator(".menu-toggle").innerText(), "Fermer ×");
  await page.locator("nav a[data-page=soutenir]").click();
  await page.locator("#navigation").waitFor({ state: "hidden" });
  assert(!(await page.locator("#navigation").isVisible()));
  await visit("violences");
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
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const tp = await touch.newPage();
  await tp.goto(url);
  await tp.locator(".menu-toggle").tap();
  assert.equal(await tp.locator(".menu-toggle").getAttribute("aria-expanded"), "true");
  assert(await tp.locator("#navigation").isVisible());
  await tp.screenshot({ path: path.join(output, "mobile-menu-open.png") });
  await tp.locator(".menu-toggle").tap();
  assert(!(await tp.locator("#navigation").isVisible()));
  await tp.locator(".menu-toggle").tap();
  await tp.locator("nav a[data-page=soutenir]").tap();
  assert.equal(new URL(tp.url()).hash, "#soutenir");
  assert(!(await tp.locator("#navigation").isVisible()));
  await tp.goto(url + "#groupe");
  await tp.locator("#groupe [data-term=survey]").first().tap();
  assert(await tp.locator("#term-dialog").isVisible());
  await tp.locator("#term-close").tap();
  assert(!(await tp.locator("#term-dialog").isVisible()));
  await touch.close();
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
  await bp.evaluate(() => { location.hash = "outil"; });
  await bp.locator(".file-options summary").click();
  await bp.locator("#remember").click();
  assert(!(await bp.locator("#remember").isChecked()));
  await blocked.close();
  const offline = await browser.newContext();
  const op = await offline.newPage();
  await op.goto("file://" + path.join(root, "index.html"));
  assert(await op.locator("#accueil").isVisible());
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
