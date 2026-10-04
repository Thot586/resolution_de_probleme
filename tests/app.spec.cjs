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
// <choice-group> helpers : the chooser is a group of real radio buttons (folded after a choice on the violence page).
const choiceValue = (target, selector) => target.locator(selector).evaluate((element) => element.value);
const choiceValues = (target, selector) => target.locator(`${selector} input`).evaluateAll((nodes) => nodes.map((node) => node.value));
const choose = async (target, selector, value) => {
  const group = target.locator(selector);
  const fold = group.locator(":scope > details.choice-fold");
  if ((await fold.count()) && !(await fold.evaluate((details) => details.open))) await fold.locator("summary").click();
  await group.locator(`input[value="${value}"]`).check();
};
(async () => {
  await fs.mkdir(output, { recursive: true });
  const html = await fs.readFile(path.join(root, "index.html"));
  const logo = await fs.readFile(path.join(root, "assets", "trimobe-logo.jpeg"));
  const displayFont = await fs.readFile(path.join(root, "assets", "fonts", "BarlowCondensed-Bold.ttf"));
  server = createServer((req, res) => {
    if (req.url === "/assets/trimobe-logo.jpeg") {
      res.setHeader("Content-Type", "image/jpeg");
      res.end(logo);
      return;
    }
    if (req.url === "/assets/fonts/BarlowCondensed-Bold.ttf") {
      res.setHeader("Content-Type", "font/ttf");
      res.end(displayFont);
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
    colorScheme: process.env.QA_SCHEME === "dark" ? "dark" : "light",
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
  assert.equal(await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some((font) => font.family === "Barlow Condensed" && font.status === "loaded"); }), true);
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), 'assets/trimobe-logo.jpeg');
  assert.equal(await page.locator('.footer-logo').getAttribute('href'), 'https://trimobe.org/');
  assert.equal(await page.locator('.footer-logo img').evaluate((img) => img.complete && img.naturalWidth > 0), true);
  assert.match(await page.locator('.footer-credit').innerText(), /Dr FENOHASINA T\.J\. Felicien.*Psychiatre.*Analyste de donnée.*Développeur d'application web/);
  const visible = async (s) => {
    await page.locator(s).waitFor({ state: "visible", timeout: 5000 });
    assert(await page.locator(s).isVisible(), `${s} must be visible`);
  };
  const goStep = async (targetPage, n) => {
    const picker = targetPage.locator("#mobile-step-picker");
    if (!(await picker.evaluate((el) => el.open))) await picker.locator("summary").click();
    await targetPage.locator(`#steps [data-step="${n}"]`).click();
  };
  const step = async (n) => goStep(page, n);
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
  const axe = async (label, targetPage = page) => {
    const results = await new AxeBuilder({ page: targetPage })
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
  const savedFigureIsPng = async (targetPage, button, label) => {
    assert.equal(await button.count(), 1, `${label}: one save button`);
    const [download] = await Promise.all([targetPage.waitForEvent("download"), button.click()]);
    assert.match(download.suggestedFilename(), /^[a-z0-9-]+.png$/, `${label}: file name`);
    const file = path.join(output, "saved-" + download.suggestedFilename());
    await download.saveAs(file);
    const bytes = await fs.readFile(file);
    assert.equal(bytes.subarray(1, 4).toString(), "PNG", `${label}: PNG signature`);
    const size = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    assert(size.width >= 700 && size.height > size.width, `${label}: readable size ${size.width}x${size.height}`);
    return size;
  };
  const openFlowDiagram = async (targetPage, selector, svgBranches, textBranches) => {
    const details = targetPage.locator(selector);
    assert.equal(await details.count(), 1, `${selector}: one diagram`);
    assert.equal(await details.evaluate((node) => node.open), false, `${selector}: closed by default`);
    const svg = details.locator("figure svg[role=img]");
    assert.equal(await svg.isVisible(), false, `${selector}: hidden until requested`);
    await details.locator(":scope > summary").click();
    assert(await svg.isVisible(), `${selector}: SVG visible after opening`);
    const labelledBy = (await svg.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    assert.equal(labelledBy.length, 2, `${selector}: title and description linked to SVG`);
    for (const id of labelledBy)
      assert.equal(await svg.locator(`[id="${id}"]`).count(), 1, `${selector}: missing ${id}`);
    assert((await svg.locator("title").textContent()).trim().length > 15, `${selector}: meaningful title`);
    assert((await svg.locator("desc").textContent()).trim().length > 30, `${selector}: meaningful description`);
    assert((await details.locator("figure figcaption").innerText()).trim().length > 25, `${selector}: meaningful caption`);
    const fold = details.locator(".diagram-text-fold");
    assert.equal(await fold.count(), 1, `${selector}: one folded text version`);
    assert.equal(await fold.evaluate((node) => node.open), false, `${selector}: text version folded by default`);
    assert.match(await fold.locator("summary").innerText(), /Lire en texte/);
    await fold.locator("summary").click();
    const equivalent = details.locator(".diagram-text");
    assert(await equivalent.isVisible(), `${selector}: visible textual equivalent once opened`);
    await savedFigureIsPng(targetPage, details.locator("[data-save-figure]"), `${selector}: saved image`);
    const graphic = await svg.textContent();
    const prose = await equivalent.innerText();
    for (const branch of svgBranches)
      assert.match(graphic, branch, `${selector}: missing graphical branch ${branch}`);
    for (const branch of textBranches)
      assert.match(prose, branch, `${selector}: missing textual branch ${branch}`);
    return details;
  };
  const checkInternalDiagramScroll = async (targetPage, selector) => {
    const sizes = await targetPage.locator(`${selector} .scrollable-diagram`).evaluate((node) => {
      const before = node.scrollLeft;
      node.scrollLeft = node.scrollWidth;
      const after = node.scrollLeft;
      node.scrollLeft = before;
      return { client: node.clientWidth, content: node.scrollWidth, after };
    });
    assert(sizes.content > sizes.client, `${selector}: diagram should scroll inside its figure`);
    assert(sizes.after > 0, `${selector}: diagram must actually scroll horizontally`);
    const textFits = await targetPage.locator(`${selector} .diagram-text`).evaluate((node) => {
      const box = node.getBoundingClientRect();
      return box.left >= -1 && box.right <= innerWidth + 1;
    });
    assert(textFits, `${selector}: textual equivalent must fit the viewport`);
  };
  await visible("#accueil");
  assert.equal(
    await page.locator("nav a[aria-current=page]").innerText(),
    "Accueil",
  );
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  const homeStepNames = ["Commencer", "Clarifier", "Imaginer", "Choisir", "Agir", "Faire le point"];
  const brief = page.locator("#accueil .welcome-explain");
  assert.equal(await brief.evaluate((node) => node.open), false, "The six-step summary is closed by default");
  assert.equal(await page.locator("#accueil .method-list").count(), 0, "The six steps are drawn once, not repeated as a list");
  assert.equal(await page.locator("#accueil .method-example").count(), 0, "No per-step examples on the home page");
  assert.equal(await page.locator('#accueil a[href="#comprendre"]').count(), 0, "The method sources are not promoted on the home page");
  assert.equal(await page.locator("#accueil .scale-entry h2").innerText(), "Pour commencer");
  assert.match(await page.locator("#accueil .scale-note").innerText(), /mes réponses forment ma fiche/);
  assert(await page.locator("#accueil .scale-note").evaluate((node) => node.getBoundingClientRect().top >= document.querySelector("#accueil .scale-grid").getBoundingClientRect().bottom), "The fiche is announced below the level cards, never above them");
  assert.match(await page.locator("#accueil .scale-intro").innerText(), /questions et les exemples seront adaptés/);
  assert.equal(await page.locator('#accueil a[href="#soutenir"]').count(), 1);
  assert.equal(await page.locator('#accueil a[href="#groupe"]').count(), 1);
  assert.equal(await page.locator("#accueil .help-others").evaluate((node) => node.open), false, "Support entries are folded by default");
  assert(await page.locator("#accueil .early-help").evaluate((node) => node.nextElementSibling.matches(".scale-entry")), "Safety links precede the exercise choices");
  assert.equal(await page.locator('#accueil .help-others a[href="#proche"]').count(), 1);
  assert(await page.locator("#accueil .scale-card").last().evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight), "All four level cards are visible without scrolling");
  await page.screenshot({ path: path.join(output, "desktop-home.png"), fullPage: true });
  await brief.locator("summary").click();
  const figureText = await brief.locator("svg").textContent();
  assert.match(figureText.replace(/\s+/g, " "), new RegExp(homeStepNames.join(".*")));
  assert.match(figureText, /Je peux revenir en arrière/);
  assert.match(figureText.replace(/\s+/g, " "), /Quels sont les faits.*voudrais changer/);
  await savedFigureIsPng(page, brief.locator("[data-save-figure]"), "six steps image");
  await brief.screenshot({ path: path.join(output, "desktop-method-expanded.png") });
  assert.equal(new URL(page.url()).hash, "");
  await axe("open-method-step");
  await brief.locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await brief.evaluate((node) => node.open), false);
  await brief.locator("summary").click();
  await visible("#accueil svg[aria-labelledby='method-title method-desc']");
  assert.match(await page.locator("#accueil svg").textContent(), /Faire le point/);
  await axe("method-diagram");
  await brief.locator("summary").click();
  await visit("comprendre");
  await page.locator("#comprendre details").filter({ hasText: "D’où viennent les six étapes ?" }).locator("summary").click();
  const ipt = page.locator("#comprendre [data-term=ipt]").first();
  await ipt.click();
  await visible("#term-dialog");
  assert.match(await page.locator("#term-detail").innerText(), /Brenner et ses collaborateurs/);
  assert.equal(await page.locator("#term-source").getAttribute("href"), "#ref-1");
  await page.locator("#term-close").click();
  await visit("bibliographie");
  assert.match(await page.locator("#ref-1").innerText(), /Brenner[\s\S]*Pomini[\s\S]*Briand/);
  assert.doesNotMatch(await page.locator("#bibliographie").innerText(), /Module 6 : Résolution de problèmes/);
  await page.locator("#bibliographie details summary").first().click();
  assert.match(await page.locator("#bibliographie details .details-body").first().innerText(), /Citer les auteurs[\s\S]*ne donne pas[\s\S]*reproduire/);
  await visit("accueil");
  await page.locator('#accueil .early-help a[href="#violences"]').click();
  await visible("#violences");
  await visit("accueil");
  await page.locator('#accueil .early-help a[href="#securite"]').click();
  await visible("#securite");
  await visit("accueil");
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
    assert.equal(await page.locator("#change-level summary").innerText().then((t) => /Changer de niveau/.test(t)), false, "The level pill carries no extra text");
    assert.equal(await page.locator("#change-level").evaluate((node) => node.tagName + node.querySelector("summary").id), "DETAILSselected-level", "The chosen level is the clickable control");
    assert(!(await page.locator("#change-level [data-scale]").first().isVisible()));
    await step(1);
    assert.match(await page.locator("#step-title").innerText(), expected);
    const contextCheck = page.locator("#step-container .context-check");
    assert.equal(await contextCheck.count(), 1, `${scale}: one optional context prompt`);
    assert.equal(await contextCheck.evaluate((node) => node.open), false, `${scale}: prompt is closed by default`);
    assert.match(await contextCheck.locator("summary").innerText(), /facultatif/);
    await contextCheck.locator("summary").click();
    assert(await contextCheck.locator(".details-body").isVisible(), `${scale}: prompt opens`);
    assert.equal(await page.locator("#step-container textarea").count(), 1, `${scale}: no additional answer field`);
    assert.equal(await page.locator("#steps li").count(), 6, `${scale}: no additional stage`);
    await step(2);
    assert.match(await page.locator("#step-container .step-lead").innerText(), /liste|liste de propositions|plusieurs changements|plusieurs démarches/i, `${scale}: the task is to make a list`);
    assert.match(await page.locator("#step-container .hint").innerText(), /fiables[\s\S]*(spécialiste|tiers compétent)/, `${scale}: optional ways to expand the list`);
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
  assert.equal(await starter.locator("#recap-shortcut").count(), 0, "The old shortcut link is replaced by the fiche line");
  assert.match(await starter.locator("#fiche-line").innerText(), /Mes réponses s’ajoutent à ma fiche, que je retrouve à la fin/);
  assert.equal(await starter.locator("#fiche-line a").count(), 0, "No link to an empty fiche");
  assert.match(await starter.locator("#progress-label").innerText(), /Étape 1 sur 6 · Commencer/);
  await starter.locator('[data-action="next"]').click();
  assert.equal(await starter.locator('#steps [aria-current="step"]').getAttribute("data-step"), "0");
  assert.match(await starter.locator("#toast").innerText(), /Choisissez d’abord le niveau/);
  await starter.evaluate(() => { location.hash = "recap"; });
  await starter.locator("#recap").waitFor({ state: "visible" });
  assert.match(await starter.locator("#recap-content").innerText(), /Ma fiche est encore vide/);
  assert(!(await starter.locator("#recap-actions").isVisible()));
  assert(!(await starter.locator("#recap-banner").isVisible()), "No success message for an empty fiche");
  assert(!(await starter.locator("#recap-later").isVisible()));
  await starter.locator('#recap-content [data-step="0"]').click();
  assert(await starter.locator("#outil .scale-options").isVisible());
  await starter.close();
  // Each level offers only its relevant contexts, with distinct facts to look
  // for, worked examples, and a source-linked method for that situation.
  const contextCases = [
    {
      scale: "personal",
      options: ["daily", "study", "work", "health", "boundaries", "other"],
      cases: [
        ["work", /tâches se concurrencent/, /Deux responsables/, /Quelles demandes/, /Séparer faits et marge de manœuvre/, /Lister les tâches/, /Préparer la liste/],
        ["health", /accéder au soin/, /manqué deux rendez-vous/, /Quel rendez-vous/, /Préparer mes questions pour le soin/],
      ],
    },
    {
      scale: "shared",
      options: ["couple", "family", "sibling", "colleague", "mentoring", "peers", "neighbors", "other"],
      cases: [
        ["sibling", /compte tenu de son âge/, /Ma sœur et moi vivons ensemble/, /Quel fait précis pose problème/, /Âge, sécurité et accord libre/, /Lister les tâches/, /Demander à ma sœur/],
        ["colleague", /gêne notre travail commun/, /Un collègue et moi transmettons/, /fait vérifiable gêne notre coopération/, /Faits, coopération et organisation/, /Comparer les deux consignes/, /Demander à mon collègue/],
        ["mentoring", /exprimer un refus sans risque/, /médecin expérimenté/, /Qu'a dit ou fait/, /Écouter avant de conseiller/, /Demander au jeune collègue/, /s'il souhaite un échange/],
        ["peers", /usage, besoin ou accord concret/, /Un ami et moi partageons un logement/, /Que s'est-il passé concrètement/, /Écouter puis proposer/, /Demander à mon ami/, /Demander à mon ami/],
        ["neighbors", /ressource partageons-nous/, /Deux associations/, /Quel usage partagé/, /Essai d'accord réversible/],
      ],
    },
    {
      scale: "organization",
      options: ["coordination", "service", "conditions", "change", "other"],
      cases: [
        ["coordination", /travail se bloque/, /Trois demandes urgentes/, /Où, quand et pour qui/, /Petit test et mesure d'équilibrage/, /Dessiner le circuit/, /test de priorisation/],
        ["service", /utiliser le service/, /rendez-vous ne se prennent qu'en ligne/, /À quelle étape du service/, /Observer les besoins réels/],
      ],
    },
    {
      scale: "public",
      options: ["mobility", "rights", "environment", "decision", "other"],
      cases: [
        ["rights", /personnes renoncent/, /Une démarche locale se fait seulement en ligne/, /Quelle démarche bloque/, /Parcours réel des usagers/, /Demander aux usagers volontaires/, /Identifier le service responsable/],
        ["mobility", /utiliser quel espace ou transport/, /L'arrêt de bus du quartier/, /Quel lieu précis/, /Demande publique vérifiable/],
      ],
    },
  ];
  const contextPage = await context.newPage();
  contextPage.on("pageerror", (e) => errors.push(e.message));
  for (const group of contextCases) {
    await contextPage.goto(url + `#outil-${group.scale}`);
    assert.deepEqual(
      await choiceValues(contextPage, "#context-select"),
      group.options,
      `${group.scale}: choices must be scoped to this level`,
    );
    for (const [key, focus, situation, hint, method, idea, action] of group.cases) {
      await choose(contextPage, "#context-select", key);
      assert.match(await contextPage.locator("#context-focus").innerText(), focus);
      if (key === group.cases[0][0])
        await contextPage.screenshot({
          path: path.join(output, `context-${group.scale}-${key}.png`),
          fullPage: true,
        });
      await goStep(contextPage, 1);
      assert.match(await contextPage.locator(".field-hint").innerText(), hint);
      assert.match(await contextPage.locator(".example-visible").innerText(), situation);
      assert.match(
        await contextPage.locator("summary").filter({ hasText: "Outil utile ici :" }).innerText(),
        method,
      );
      assert.match(
        await contextPage.locator("summary").filter({ hasText: "Outil utile ici :" }).locator("xpath=..").locator('a[href^="#ref-"]').getAttribute("href"),
        /^#ref-\d+$/,
      );
      if (idea) {
        await goStep(contextPage, 2);
        assert.match(await contextPage.locator(".example-visible").innerText(), idea);
        await goStep(contextPage, 4);
        assert.match(await contextPage.locator(".example-visible").innerText(), action);
      }
      await goStep(contextPage, 0);
    }
  }
  await contextPage.close();

  // The optional action flowchart adds a decision about safety and consent.
  // Its decision-maker changes with the chosen level.
  const flowPage = await context.newPage();
  flowPage.on("pageerror", (e) => errors.push(e.message));
  const actors = {
    personal: "Moi ou une autre personne",
    shared: "L’autre personne",
    organization: "Responsable du test",
    public: "Personnes représentées",
  };
  for (const [scale, actor] of Object.entries(actors)) {
    await flowPage.goto(url + `#outil-${scale}`);
    await goStep(flowPage, 2);
    await flowPage.locator("#idea-1").fill("Un petit pas à examiner.");
    await goStep(flowPage, 3);
    await flowPage.locator('[data-choose="1"]').click();
    await goStep(flowPage, 4);
    const diagram = await openFlowDiagram(
      flowPage,
      "#action-decision-diagram",
      [/Ce pas est-il sûr/, /Non ou doute/, /Je fais une pause/, /Ai-je l’accord/, /Oui ou pas requis/, /J’essaie petit/],
      [/doute/, /pause/, /accord/, /petit pas/, /signe de progrès/],
    );
    assert.equal((await diagram.locator("[data-decision-actor]").textContent()).trim(), actor);
    if (scale === "personal") {
      await flowPage.locator("#toast").waitFor({ state: "hidden", timeout: 7000 });
      await diagram.locator(".teaching-figure").screenshot({ path: path.join(output, "action-flow-personal-desktop.png") });
      await axe("action-flow-personal", flowPage);
    }
  }
  await flowPage.setViewportSize({ width: 390, height: 844 });
  await flowPage.locator("#toast").waitFor({ state: "hidden", timeout: 7000 });
  assert(
    await flowPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    "Horizontal overflow: open action flowchart mobile",
  );
  await flowPage.locator("#action-decision-diagram .teaching-figure").screenshot({ path: path.join(output, "action-flow-public-mobile.png") });
  await axe("action-flow-public-mobile", flowPage);
  await flowPage.setViewportSize({ width: 320, height: 844 });
  assert(
    await flowPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    "Horizontal overflow: open action flowchart at 320px",
  );
  await flowPage.locator("#action-decision-diagram .teaching-figure").screenshot({ path: path.join(output, "action-flow-public-320.png") });
  await checkInternalDiagramScroll(flowPage, "#action-decision-diagram");
  await flowPage.close();

  // A v1 file with an ambiguous old domain keeps its answers and asks for a
  // context review. Its chosen option must follow the saved option, not its ID.
  const legacy = {
    version: 1,
    step: 0,
    clarifyPart: 0,
    scale: "public",
    scaleChosen: true,
    context: "work",
    safety: "safe",
    fields: {
      situation: "Texte ancien à conserver.",
      action: "Action ancienne à conserver.",
    },
    options: [
      { id: 7, text: "Première piste ancienne.", plus: "", minus: "" },
      { id: 9, text: "Deuxième piste choisie.", plus: "", minus: "" },
    ],
    chosen: 9,
  };
  const importPage = await context.newPage();
  importPage.on("pageerror", (e) => errors.push(e.message));
  await importPage.goto(url + "#outil-public");
  await importPage.locator("#import-file").setInputFiles({
    name: "ancien-brouillon.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await importPage.locator("#dialog-confirm").click();
  assert.equal(await choiceValue(importPage, "#context-select"), "other");
  assert.match(await importPage.locator("#context-review").innerText(), /relis ce que j’ai écrit/);
  await goStep(importPage, 1);
  assert.equal(await importPage.locator("#field-situation").inputValue(), legacy.fields.situation);
  await goStep(importPage, 3);
  assert.equal(await importPage.locator('[data-choose="2"][aria-pressed="true"]').count(), 1);
  await goStep(importPage, 4);
  assert.equal(await importPage.locator("#field-action").inputValue(), legacy.fields.action);
  await importPage.locator(".file-options summary").click();
  const migratedDownload = importPage.waitForEvent("download");
  await importPage.locator("[data-action=export]").click();
  const migratedFile = await migratedDownload;
  const migrated = JSON.parse(await fs.readFile(await migratedFile.path(), "utf8"));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.context, "other");
  assert.equal(migrated.reviewContext, true);
  assert.equal(migrated.fields.situation, legacy.fields.situation);
  assert.equal(migrated.chosen, 2);
  await importPage.close();

  // Existing browser storage is upgraded in place and the new context remains
  // stable across reloads after a deliberate change.
  const migrationContext = await browser.newContext({ acceptDownloads: true });
  const storedPage = await migrationContext.newPage();
  storedPage.on("pageerror", (e) => errors.push(e.message));
  await storedPage.goto(url);
  await storedPage.evaluate((draft) => {
    localStorage.setItem("pas-a-pas.brouillon.v1", JSON.stringify(draft));
  }, { ...legacy, scale: "shared", context: "work" });
  await storedPage.reload();
  await storedPage.evaluate(() => { location.hash = "outil"; });
  assert.equal(await choiceValue(storedPage, "#context-select"), "other");
  assert.match(await storedPage.locator("#context-review").innerText(), /contexte/);
  assert.deepEqual(await storedPage.evaluate(() => Object.keys(localStorage)), ["pas-a-pas.brouillon.v2"]);
  await goStep(storedPage, 1);
  assert.equal(await storedPage.locator("#field-situation").inputValue(), legacy.fields.situation);
  await goStep(storedPage, 0);
  await choose(storedPage, "#context-select", "neighbors");
  await storedPage.reload();
  assert.equal(await choiceValue(storedPage, "#context-select"), "neighbors");
  assert.equal(await storedPage.locator('#steps [data-step="1"]').count(), 1);
  await migrationContext.close();
  // The former v2 colleague context covered both peers and supervisors.
  // Keep its answers, request a review, then avoid that warning for revision 3.
  const v2Context = await browser.newContext();
  const v2Page = await v2Context.newPage();
  v2Page.on("pageerror", (e) => errors.push(e.message));
  await v2Page.goto(url);
  const previousColleague = {
    ...legacy,
    version: 2,
    scale: "shared",
    context: "colleague",
    fields: { ...legacy.fields, situation: "Ancienne situation entre collègues à conserver." },
  };
  await v2Page.evaluate((draft) => {
    localStorage.setItem("pas-a-pas.brouillon.v2", JSON.stringify(draft));
  }, previousColleague);
  await v2Page.reload();
  await v2Page.evaluate(() => { location.hash = "outil"; });
  assert.equal(await choiceValue(v2Page, "#context-select"), "colleague");
  assert.match(await v2Page.locator("#context-review").innerText(), /contexte/);
  await goStep(v2Page, 1);
  assert.equal(await v2Page.locator("#field-situation").inputValue(), previousColleague.fields.situation);
  await v2Page.evaluate((draft) => {
    localStorage.setItem("pas-a-pas.brouillon.v2", JSON.stringify(draft));
  }, { ...previousColleague, catalogRevision: 3 });
  await v2Page.reload();
  assert.equal(await choiceValue(v2Page, "#context-select"), "colleague");
  assert.equal(await v2Page.locator("#context-review").count(), 0, "Current catalog needs no migration warning");
  await goStep(v2Page, 1);
  assert.equal(await v2Page.locator("#field-situation").inputValue(), previousColleague.fields.situation);
  await v2Context.close();
  const keepPage = await context.newPage();
  await keepPage.goto(url + "#outil-personal");
  await keepPage.evaluate(() => { state.fields.situation = "Un test."; state.fields.action = "Faire un petit pas."; });
  await keepPage.evaluate(() => { location.hash = "recap"; });
  await keepPage.locator("#recap").waitFor({ state: "visible" });
  assert.equal((await keepPage.locator("#recap-banner h2").innerText()).trim(), "Ma fiche est prête");
  assert.equal(await keepPage.evaluate(() => document.activeElement?.id === "recap-banner"), false, "Opening the fiche from the menu does not move the focus to the message");
  assert.equal(await keepPage.evaluate(() => localStorage.length), 0);
  await keepPage.locator("#recap-keep").click();
  await keepPage.locator("#confirm-dialog").waitFor({ state: "visible" });
  await keepPage.locator("#dialog-confirm").click();
  assert.equal(await keepPage.evaluate(() => localStorage.length), 1);
  assert(!(await keepPage.locator("#recap-keep").isVisible()), "Nothing left to keep");
  assert.match(await keepPage.locator("#recap-keep-text").innerText(), /gardée dans ce navigateur/);
  assert.match(await keepPage.locator("#privacy-status").textContent(), /gardé dans ce navigateur/);
  await keepPage.evaluate(() => { state.fields.trial = "yes"; state.fields.result = "Ça a marché."; renderRecap(); });
  assert.equal((await keepPage.locator("#recap-banner h2").innerText()).trim(), "Mon bilan est noté dans ma fiche");
  assert.match(await keepPage.locator("#recap-review").innerText(), /Revoir mon bilan/);
  await keepPage.evaluate(() => localStorage.clear());
  await keepPage.close();
  // A person who says they are unsure or in danger is not invited to store or download anything.
  const riskPage = await context.newPage();
  await riskPage.goto(url + "#outil-personal");
  await riskPage.locator('[data-action="next"]').click();
  await riskPage.locator('[data-safety="danger"]').click();
  assert(!(await riskPage.locator("#keep-link").isVisible()), "No invitation to keep answers after a danger answer");
  assert.equal((await riskPage.locator("#fiche-line").isVisible()), false, "The exercise is not promoted under a danger message");
  assert.equal(await riskPage.locator("#privacy-status").textContent().then((text) => /Rien n’est envoyé/.test(text)), true);
  await riskPage.evaluate(() => { state.step = 1; state.clarifyPart = 2; state.fields.situation = "Un test."; state.fields.action = "Faire un pas."; renderStep(); });
  await riskPage.locator("#step-container details").filter({ hasText: "Je peux faire une pause" }).locator("summary").click();
  assert.match(await riskPage.locator("#step-container [data-keep-note=pause]").innerText(), /partagé ou surveillé, mieux vaut ne rien garder ici/);
  assert.equal(await riskPage.locator('#step-container [data-action="keep-local"], #step-container [data-action="export-draft"]').count(), 0, "No keep or download buttons for a person at risk");
  await riskPage.evaluate(() => { location.hash = "recap"; });
  await riskPage.locator("#recap").waitFor({ state: "visible" });
  assert.match(await riskPage.locator("#recap-keep-text").innerText(), /partagé ou surveillé, mieux vaut ne rien garder ici/);
  assert(!(await riskPage.locator("#recap-keep").isVisible()));
  assert(!(await riskPage.locator("#recap-export").isVisible()));
  assert.equal(await riskPage.evaluate(() => localStorage.length), 0);
  await riskPage.close();
  // Erasing in one tab is not undone by another tab that kept the draft.
  const tabA = await context.newPage();
  const tabB = await context.newPage();
  await tabA.goto(url + "#outil-personal");
  await tabB.goto(url + "#outil-personal");
  await tabA.evaluate(() => { state.fields.situation = "Réponse de l’onglet A."; });
  await tabA.locator(".file-options summary").click();
  await tabA.locator("#remember").check();
  assert.equal(await tabA.evaluate(() => localStorage.length), 1);
  await tabB.evaluate(() => localStorage.removeItem("pas-a-pas.brouillon.v2"));
  await tabA.waitForFunction(() => remember === false, null, { timeout: 5000 });
  assert.match(await tabA.locator("#privacy-status").textContent(), /Mes réponses restent dans ma fiche/);
  assert.match(await tabA.locator("#toast").innerText(), /effacé dans un autre onglet/);
  assert.equal(await tabA.evaluate(() => { state.fields.situation = "Encore une réponse."; return persist(); }), false);
  assert.equal(await tabA.evaluate(() => localStorage.length), 0, "The other tab does not bring the erased draft back");
  await tabA.close();
  await tabB.close();
  // One reading of "filled" for the list, the bar, the fiche line and the fiche.
  const consistencyPage = await context.newPage();
  await consistencyPage.goto(url + "#outil-personal");
  const consistency = await consistencyPage.evaluate(() => {
    state.fields.trial = "yes";
    const alone = { sections: ficheSections(), done5: stepDone(5), writing: hasWriting() };
    state.fields.situation = "Un test.";
    const withText = { sections: ficheSections(), done5: stepDone(5) };
    state.fields.situation = "";
    state.fields.trial = "notyet";
    state.fields.reviewDate = "20261-01-01";
    const badDate = { sections: ficheSections() };
    return { alone, withText, badDate };
  });
  assert.deepEqual(consistency.alone, { sections: [], done5: false, writing: false }, "A status alone does not fill the fiche");
  assert.deepEqual(consistency.withText.sections, ["ma situation", "mon bilan"]);
  assert.equal(consistency.withText.done5, true);
  assert.deepEqual(consistency.badDate.sections, [], "A date the fiche cannot show does not count");
  await consistencyPage.close();
  // Assistive technology: the warning belongs to the checkbox and to the confirmation dialog.
  assert.equal(await page.locator("#remember").getAttribute("aria-describedby"), "remember-hint");
  assert.match(await page.locator("#remember-hint").textContent(), /sans chiffrement/);
  assert.equal(await page.locator("#confirm-dialog").getAttribute("aria-describedby"), "dialog-description");
  // The level is shown as chosen only once it was chosen.
  const freshLevel = await context.newPage();
  await freshLevel.goto(url + "#outil");
  assert.equal(await freshLevel.locator('.scale-option[aria-pressed="true"]').count(), 0, "No level looks chosen before the choice");
  await freshLevel.close();
  await page.locator("#accueil .help-others summary").click();
  await page.locator('#accueil a[href="#soutenir"]').first().click();
  await visible("#soutenir");
  assert(await page.locator("#soutenir .support-safety").isVisible());
  assert.equal(await page.locator("#soutenir [data-need][aria-pressed=true]").count(), 0);
  assert.match(await page.locator("#need-guidance").innerText(), /je n’insiste pas/i);
  assert(await page.locator("#soutenir .support-start").isVisible());
  assert(await page.locator("#need-lab").isVisible());
  await page.locator("#soutenir .support-foundations summary").click();
  assert.match(await page.locator("#soutenir .support-foundations").innerText(), /quelle langue ou façon d’échanger/);
  await page.locator("#soutenir .support-foundations summary").click();
  assert(!(await page.locator("#soutenir .teaching-figure").isVisible()));
  await page.locator("#soutenir .support-illustration summary").click();
  await visible("#soutenir svg[aria-labelledby='journey-title journey-desc']");
  assert.match(await page.locator("#soutenir svg").textContent(), /Seulement avec son accord/);
  await page.screenshot({ path: path.join(output, "desktop-support.png"), fullPage: true });
  await page.locator("#soutenir .support-illustration summary").click();
  await choose(page, "#support-relation", "learner");
  await page.locator("[data-need=advice]").click();
  assert.match(await page.locator("#need-guidance").innerText(), /accord/);
  assert.match(await page.locator("#need-guidance").innerText(), /encadrement/);
  await choose(page, "#support-relation", "close");
  assert(await page.locator('#need-guidance a[href="#proche"]').isVisible());
  await page.locator('#soutenir a[href="#proche"]').first().click();
  await visible("#proche");
  await visit("groupe");
  await page.locator("#groupe .group-overview summary").click();
  await visible("#groupe svg[aria-labelledby='group-map-title group-map-desc']");
  assert.match(await page.locator("#groupe .group-overview svg").textContent(), /Décider ensemble/);
  await page.locator("#groupe .group-overview summary").click();
  assert.match(await page.locator("#group-step-title").innerText(), /Qui participe/);
  await page.locator("#group-note").fill("Décision : améliorer les horaires d’accueil.");
  await page.locator("#group-next").click();
  assert.match(await page.locator("#group-guidance").innerText(), /langue.*horaire.*format/);
  await choose(page, "#group-method", "survey");
  assert.match(await page.locator("#group-method-hint").innerText(), /combien ont répondu/);
  const groupFlow = await openFlowDiagram(
    page,
    "#group-method-diagram",
    [/décision réelle/, /Clarifier qui décide/, /informations/, /Examiner les infos/, /parole est-elle libre/, /Discussion volontaire/, /Entretiens volontaires/, /Sondage en complément/, /Pas de sondage requis/],
    [/décision réelle/, /informations/, /discussion volontaire/, /entretiens individuels volontaires/, /sondage court/, /représentatifs/],
  );
  assert.match(await groupFlow.locator("figcaption").innerText(), /représailles/);
  await groupFlow.locator(".teaching-figure").screenshot({ path: path.join(output, "group-method-flow-desktop.png") });
  await axe("group-method-flow");
  const groupBar = await page.locator("#group-progress").boundingBox();
  assert(groupBar && groupBar.height >= 3 && groupBar.width >= 100, "The group guide still draws its progress bar");
  assert((await page.locator("#group-progress span").boundingBox()).width > 0, "...with a filled part");
  await choose(page, "#group-stage-select", "2");
  assert(await page.locator("#group-guidance [data-term=survey]").isVisible());
  await choose(page, "#group-stage-select", "3");
  assert.match(await page.locator("#group-step-title").innerText(), /reconnaissent/);
  assert.match(await page.locator("#group-guidance").innerText(), /langue et un format compréhensibles/);
  await choose(page, "#group-stage-select", "4");
  assert.match(await page.locator("#group-note-prompt").innerText(), /pistes possibles.*choix motivé/);
  await choose(page, "#group-stage-select", "5");
  assert.match(await page.locator("#group-note-prompt").innerText(), /effet gênant/);
  await choose(page, "#group-stage-select", "3");
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
  assert.equal(await page.locator("[data-safety]").count(), 0, "The safety question has its own screen");
  assert.equal(await page.locator('[data-action="back"]').isVisible(), false, "No back button on the first screen");
  await choose(page, "#context-select", "work");
  await next();
  assert.equal(await page.locator("#context-select").count(), 0, "The situation choice is not repeated on the safety screen");
  assert.equal(await page.locator("[data-safety]").count(), 3);
  assert.equal(await page.locator("#step-title").innerText(), "Ma sécurité");
  await axe("start-safety");
  await page.locator('[data-action="back"]').click();
  assert.equal(await choiceValue(page, "#context-select"), "work", "Going back keeps the chosen situation");
  await next();
  await page.locator("[data-safety=safe]").click();
  await next();
  assert.match(await page.locator(".question-progress").innerText(), /Question 1 sur 3/);
  assert.match(await page.locator("#question-title").innerText(), /Ce qui se passe/);
  assert.equal(await page.locator(".question-segments .is-current").count(), 1);
  assert.equal(await page.locator(".question-segments .is-past").count(), 0);
  // One main thing per screen: the question and its answer share one highlighted panel; options and tools come after it.
  const hierarchy = await page.evaluate(() => {
    const panel = document.querySelector(".question-panel");
    const title = document.querySelector("#question-title");
    const stepTitle = document.querySelector("#step-title");
    const textarea = document.querySelector("#field-situation");
    const optional = document.querySelector(".context-check");
    return {
      inPanel: panel.contains(title) && panel.contains(textarea),
      optionalAfterPanel: !panel.contains(optional) && Boolean(panel.compareDocumentPosition(optional) & Node.DOCUMENT_POSITION_FOLLOWING),
      questionBeforeAnswer: Boolean(title.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING),
      questionLargerThanStepTitle: parseFloat(getComputedStyle(title).fontSize) > parseFloat(getComputedStyle(stepTitle).fontSize) * 1.5,
      answerVisibleInFirstScreen: textarea.getBoundingClientRect().bottom <= innerHeight,
    };
  });
  assert.deepEqual(hierarchy, { inPanel: true, optionalAfterPanel: true, questionBeforeAnswer: true, questionLargerThanStepTitle: true, answerVisibleInFirstScreen: true });
  // Orientation: a readable counter, fully visible after the step change, describing the title; the bar is decorative.
  const orientation = await page.evaluate(() => {
    const counter = document.querySelector("#progress-label");
    const box = counter.getBoundingClientRect();
    const header = document.querySelector("header").getBoundingClientRect();
    return {
      text: counter.textContent.replace(/\s+/g, " ").trim(),
      visible: box.top >= header.bottom && box.bottom <= innerHeight,
      describesTitle: document.querySelector("#step-title").getAttribute("aria-describedby") === "progress-label",
      barDecorative: document.querySelector(".step-bar").getAttribute("aria-hidden") === "true",
      segments: document.querySelectorAll(".step-bar span").length,
      current: document.querySelectorAll(".step-bar .is-current").length,
      laterSegment: document.querySelector(".step-bar span:last-child").classList.contains("is-later"),
    };
  });
  assert.deepEqual(orientation, { text: "Étape 2 sur 6 · Clarifier", visible: true, describesTitle: true, barDecorative: true, segments: 6, current: 1, laterSegment: true });
  assert(await page.locator(".example-visible").isVisible());
  assert.match(
    await page.locator(".example-visible").innerText(),
    /responsables/,
  );
  assert.equal(await page.locator("#field-goal").count(), 0);
  await page
    .locator("#field-situation")
    .fill("Deux dossiers à remettre le même jour.");
  await page.waitForFunction(() => /Noté dans ma fiche/.test(document.querySelector("#saved-situation")?.textContent || ""), null, { timeout: 3000 });
  assert.match(await page.locator("#saved-situation").innerText(), /Noté dans ma fiche · sur cette page/, "The label says where the answer is");
  assert.equal(await page.locator("#fiche-link").isVisible(), true, "The fiche link appears with the first answer");
  assert.equal(await page.locator("#fiche-link").getAttribute("href"), "#recap");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "field-situation", "The assurance never takes the focus");
  assert.match(await page.locator("#field-situation").getAttribute("aria-describedby"), /saved-situation/);
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  assert.doesNotMatch(await page.locator("#outil").innerText(), /enregistr|sauvegard/i, "Nothing claims a saved draft while nothing is stored");
  await page.locator("#field-situation").fill("");
  assert.equal((await page.locator("#saved-situation").textContent()).trim(), "", "The assurance disappears with the answer");
  await page.locator("#field-situation").fill("Deux dossiers à remettre le même jour.");
  await next();
  assert.match(await page.locator(".question-progress").innerText(), /Question 2 sur 3/);
  assert.match(await page.locator("#question-title").innerText(), /Ce que je voudrais changer/);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "question-title");
  assert.equal(await page.locator(".question-segments .is-past").count(), 1);
  assert.equal(await page.locator(".question-orientation").evaluate((el) => getComputedStyle(el).animationName), "none");
  assert(await page.locator("#question-title").evaluate((el) => el.getBoundingClientRect().top >= document.querySelector("header").getBoundingClientRect().bottom - 2));
  await page.locator("#step-container").screenshot({ path: path.join(output, "desktop-question-2.png") });
  assert(await page.locator("#field-goal").isVisible());
  assert.equal(await page.locator("#field-obstacle").count(), 0);
  await page.locator("#field-goal").fill("Demander un ordre de priorité.");
  await next();
  assert.match(await page.locator(".question-progress").innerText(), /Question 3 sur 3/);
  assert.match(await page.locator("#question-title").innerText(), /Ce qui bloque/);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "question-title");
  assert.equal(await page.locator(".question-segments .is-past").count(), 2);
  await page.locator("#step-container").screenshot({ path: path.join(output, "desktop-question-3.png") });
  assert(await page.locator("#field-obstacle").isVisible());
  await page.locator("#field-obstacle").fill("Le temps manque.");
  const pauseBlock = page.locator("#step-container details").filter({ hasText: "Je peux faire une pause" });
  await pauseBlock.locator("summary").click();
  assert.match(await pauseBlock.innerText(), /sinon mes réponses disparaissent quand je ferme ou recharge la page/);
  assert.equal(await pauseBlock.locator('[data-action="keep-local"]').count(), 1);
  assert.equal(await pauseBlock.locator('[data-action="export-draft"]').count(), 1);
  assert.equal(await page.locator("[data-action=export]").count(), 1, "The second download entry has its own action name");
  await page.waitForFunction(() => /Noté dans ma fiche/.test(document.querySelector("#saved-obstacle")?.textContent || ""), null, { timeout: 3000 });
  await page.locator(".file-options summary").click();
  await page.locator("#remember").check();
  assert.match(await pauseBlock.innerText(), /mon brouillon est gardé dans ce navigateur/, "Keeping the draft updates the pause text in place");
  assert.equal(await pauseBlock.locator('[data-action="keep-local"]').count(), 0);
  assert.match(await page.locator("#saved-obstacle").innerText(), /gardé dans ce navigateur/, "The labels follow the keep state");
  await page.locator("#remember").uncheck();
  assert.match(await pauseBlock.innerText(), /sinon mes réponses disparaissent quand je ferme ou recharge la page/, "Forgetting the draft updates it back");
  assert.equal(await pauseBlock.locator('[data-action="keep-local"]').count(), 1);
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.locator(".file-options summary").click();
  await pauseBlock.locator("summary").click();
  assert(!(await page.locator(".optional-fields .details-body").first().isVisible()));
  await next();
  await next(); // empty alternatives stay on the same step
  assert.equal(
    await page.locator("#steps [aria-current=step]").getAttribute("data-step"),
    "2",
  );
  assert.equal(await page.locator("#steps .is-done").count(), 2, "Commencer and Clarifier are filled, nothing is marked in advance");
  assert.deepEqual(await page.locator("#steps .is-done").evaluateAll((nodes) => nodes.map((node) => node.dataset.step)), ["0", "1"]);
  assert.equal(await page.locator(".step-bar .is-done").count(), 2);
  assert.match(await page.locator("#fiche-line").innerText(), /Dans ma fiche : ma situation\. Voir ma fiche/);
  await page.locator("#idea-1").fill("Demander un arbitrage écrit.");
  await page.locator("#idea-2").fill("Proposer un nouveau délai.");
  assert.match(await page.locator("#fiche-line").innerText(), /Dans ma fiche : ma situation, mes options\. Voir ma fiche/);
  await next();
  assert(!(await page.locator("#plus-1").isVisible()));
  await page.locator(".option-card summary").first().click();
  await page.locator("#plus-1").fill("Rendre la charge visible.");
  await page.locator("#minus-1").fill("La réponse peut prendre du temps.");
  await page.locator('[data-choose="1"]').click();
  await axe("compare");
  await next();
  assert.match(await page.locator("#fiche-line").innerText(), /Ensuite : ma fiche, à relire, modifier, imprimer\. Je ferai le point après l’essai/);
  assert.match(await page.locator("[data-action=next]").innerText(), /Voir ma fiche/);
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
  assert.equal(await page.locator("#recap-content .recap-section").count(), await page.evaluate(() => ficheSections().length), "The fiche line lists exactly the sections the fiche shows");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "recap-banner", "Arriving from the exercise focuses the message");
  assert.equal((await page.locator("#recap-banner h2").innerText()).trim(), "Ma fiche est prête");
  assert.match(await page.locator("#recap-banner").innerText(), /relire, la modifier, l’imprimer ou la télécharger/);
  assert(await page.locator("#recap-later").isVisible());
  assert.match(await page.locator("#recap-later-text").innerText(), /Date prévue : 09\/10\/2026 \(sans rappel automatique\)/);
  assert.match(await page.locator("#recap-keep-text").innerText(), /disparaît quand je ferme ou recharge la page/);
  assert.equal(await page.locator("[data-action=export]").count(), 1, "The fiche uses its own download action name");
  await page.locator("#recap-keep").click();
  await visible("#confirm-dialog");
  assert.match(await page.locator("#dialog-description").innerText(), /sans chiffrement/);
  await page.locator("#dialog-cancel").click();
  assert.equal(await page.evaluate(() => localStorage.length), 0, "Cancelling keeps nothing");
  await axe("recap-ready");
  const txtPromise = page.waitForEvent("download");
  await page.locator("[data-action=text]").click();
  const txt = await txtPromise;
  assert.match(await page.locator("#toast").innerText(), /Récapitulatif téléchargé/);
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
  await choose(page, "#context-select", "health");
  assert.match(await page.locator("#context-review").innerText(), /mes réponses sont restées/i);
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
  assert.match(await page.locator("#privacy-status").innerText(), /Mes réponses restent dans ma fiche jusqu’à la fermeture ou au rechargement de cette page\. Rien n’est envoyé\./);
  assert.equal(await page.locator(".privacy-line").getAttribute("role"), "status");
  assert(await page.locator("#keep-link").isVisible());
  assert.equal(await page.locator(".file-options").evaluate((node) => node.open), false, "Draft options stay closed until asked");
  await page.locator("#keep-link").click();
  assert.equal(await page.locator(".file-options").evaluate((node) => node.open), true, "The link opens the draft options");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "remember");
  assert.equal(await page.evaluate(() => localStorage.length), 0, "Opening the options stores nothing");
  await page.locator("#remember").check();
  assert.equal(await page.evaluate(() => localStorage.length), 1);
  assert.match(await page.locator("#privacy-status").innerText(), /gardé dans ce navigateur/);
  assert(!(await page.locator("#keep-link").isVisible()), "The link goes away once the draft is kept");
  const exportPromise = page.waitForEvent("download");
  await page.locator("[data-action=export]").click();
  const draft = await exportPromise;
  const savedPath = path.join(output, "draft.json");
  await draft.saveAs(savedPath);
  const parsed = JSON.parse(await fs.readFile(savedPath, "utf8"));
  assert.equal(parsed.version, 2);
  assert.equal(parsed.context, "health");
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
  // Supporting sections and relationship-specific violence guides are interactive.
  await visit("proche");
  for (const mode of ["listen", "solve", "practical"]) {
    await page.locator(`[data-support-mode=${mode}]`).click();
    assert((await page.locator("#support-content").innerText()).length > 100);
  }
  assert.equal(await choiceValue(page, "#support-context"), "");
  assert.equal(await page.locator("#support-context-content").innerText(), "");
  await page.locator("#support-adapt > summary").click();
  for (const val of [
    "mental",
    "couple",
    "work",
    "grief",
    "material",
    "young",
  ]) {
    await choose(page, "#support-context", val);
    assert(
      (await page.locator("#support-context-content").innerText()).length > 100,
    );
  }
  await axe("support");
  await visit("violences");
  const violenceContexts = [
    "couple", "sibling", "peers", "family", "colleague",
    "work", "education", "care", "vulnerable", "other",
  ];
  assert.equal(await choiceValue(page, "#violence-context"), "", "Generic entry asks for a relation");
  assert.equal(await page.locator("#meter [data-meter]").count(), 0, "Generic entry has no preselected guide");
  assert.match(await page.locator("#violences").innerText(), /choisir|choisissez|relation/i);
  assert.deepEqual(
    (await choiceValues(page, "#violence-context")).sort(),
    [...violenceContexts, "authority"].sort(),
    "Every authored guide, graded or not, is reachable from the relationship chooser",
  );
  assert.equal(await page.locator("#violence-credit").isVisible(), false, "Credits appear with a selected relation");
  await axe("meter-no-relation");
  const guideContent = new Set();
  const priorWork = {
    couple: [], sibling: [], peers: [53], family: [], colleague: [51, 57],
    work: [51, 55], education: [52, 58], care: [54], vulnerable: [], other: [],
  };
  for (const val of violenceContexts) {
    await choose(page, "#violence-context", val);
    assert.equal(new URL(page.url()).hash, `#violences-${val}`, `${val}: relationship choice updates the URL`);
    assert(await page.locator("#violence-credit").isVisible(), `${val}: prior creators are credited beside the guide`);
    assert.deepEqual(await page.locator('#violence-credit a[href^="#ref-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))), ["#ref-7", ...priorWork[val].map((n) => `#ref-${n}`)], `${val}: the relevant earlier variants are credited`);
    assert.equal(await page.locator("#meter [data-meter]").count(), 6, `${val}: six illustrative choices`);
    assert.equal(await page.locator('#meter [aria-pressed="true"]').count(), 0, `${val}: no behavior inferred from the relationship`);
    assert.match(await page.locator("#meter-detail").innerText(), /Quel comportement me questionne/);
    guideContent.add(await page.locator("#meter").innerText());
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-meter="${i}"]`).click();
      assert.equal(
        await page.locator("[data-meter][aria-pressed=true]").count(),
        1,
      );
      assert((await page.locator("#meter-detail").innerText()).length > 100);
      assert(
        await page.locator('#meter-detail a[href^="#ref-"]').count() > 0,
        `${val}: the guide cites a source`,
      );
    }
  }
  assert.equal(guideContent.size, violenceContexts.length, "Each relationship has distinct examples");
  await choose(page, "#violence-context", "sibling");
  await page.locator('[data-meter="2"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator('[data-meter="2"]').getAttribute("aria-pressed"), "true", "Guide choices work from the keyboard");
  await choose(page, "#violence-context", "colleague");
  assert.equal(await page.locator('#meter [aria-pressed="true"]').count(), 0, "Changing relationship clears the example");
  assert.match(await page.locator("#meter-detail").innerText(), /Quel comportement me questionne/);
  await axe("meter-colleague");
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: path.join(output, "desktop-meter.png"),
    fullPage: true,
  });
  const guidePage = await context.newPage();
  guidePage.on("pageerror", (e) => errors.push(e.message));
  guidePage.on("request", (r) => {
    if (!r.url().startsWith(url) && !r.url().startsWith("blob:")) external.push(r.url());
  });
  for (const val of violenceContexts) {
    await guidePage.goto(url + `#violences-${val}`);
    assert(await guidePage.locator("#violences").isVisible(), `${val}: direct link opens the guide`);
    assert.equal(await choiceValue(guidePage, "#violence-context"), val, `${val}: direct link preselects the relation`);
    assert.equal(await guidePage.locator("#meter [data-meter]").count(), 6, `${val}: direct link shows six choices`);
    assert.equal(await guidePage.locator('#meter [aria-pressed="true"]').count(), 0, `${val}: direct link does not select a behavior`);
  }
  await guidePage.goto(url + "#violences");
  assert.equal(await choiceValue(guidePage, "#violence-context"), "", "Generic deep link returns to the chooser");
  assert.equal(await guidePage.locator("#meter [data-meter]").count(), 0);
  await guidePage.close();
  const relationPage = await context.newPage();
  relationPage.on("pageerror", (e) => errors.push(e.message));
  relationPage.on("request", (r) => {
    if (!r.url().startsWith(url) && !r.url().startsWith("blob:")) external.push(r.url());
  });
  await relationPage.goto(url + "#outil-shared");
  for (const relation of ["colleague", "sibling", "peers", "couple", "family", "other"]) {
    await relationPage.evaluate(() => { location.hash = "outil-shared"; });
    await relationPage.locator("#outil").waitFor({ state: "visible" });
    await choose(relationPage, "#context-select", relation);
    await goStep(relationPage, 1);
    const sentence = `Situation conservée : ${relation}`;
    await relationPage.locator("#field-situation").fill(sentence);
    await goStep(relationPage, 0);
    const destination = `#violences-${relation}`;
    const link = relationPage.locator(`#outil a[href="${destination}"]`).first();
    assert(await link.isVisible(), `${relation}: the context offers its matching violence guide`);
    await link.click();
    await relationPage.locator("#violences").waitFor({ state: "visible" });
    assert.equal(new URL(relationPage.url()).hash, destination);
    assert.equal(await choiceValue(relationPage, "#violence-context"), relation);
    await relationPage.evaluate(() => { location.hash = "outil"; });
    await relationPage.locator("#outil").waitFor({ state: "visible" });
    assert.equal(await choiceValue(relationPage, "#context-select"), relation);
    await goStep(relationPage, 1);
    assert.equal(await relationPage.locator("#field-situation").inputValue(), sentence, `${relation}: returning preserves the draft`);
  }
  await relationPage.close();
  // The safety answer follows the level: help and guides match the situation, not one interpersonal text for everyone.
  const openLevelPage = async (hash) => {
    const levelPage = await context.newPage();
    levelPage.on("pageerror", (e) => errors.push(e.message));
    levelPage.on("request", (r) => {
      if (!r.url().startsWith(url) && !r.url().startsWith("blob:")) external.push(r.url());
    });
    await levelPage.goto(url + hash);
    return levelPage;
  };
  const levelCases = {
    personal: { hint: null, doubt: /La peur, les menaces ou le contrôle méritent de l’aide\./, guides: true },
    shared: { hint: null, doubt: /La peur, les menaces ou le contrôle méritent de l’aide\./, guides: true },
    organization: { hint: /autres personnes de l’équipe/, doubt: /les pressions ou les représailles méritent de l’aide, pour moi comme pour mon équipe/, guides: true, route: "#violences", danger: /Je n’impose ni confrontation ni médiation/ },
    public: { hint: /personnes qui agissent avec moi/, doubt: /les menaces ou les représailles méritent de l’aide, pour moi comme pour le groupe/, guides: true, route: "#violences-authority", danger: /Ma sécurité et celle des autres passent avant l’exercice/, dangerGuide: /Repérer des pressions ou des représailles/ },
  };
  for (const [scale, expected] of Object.entries(levelCases)) {
    const levelPage = await openLevelPage(`#outil-${scale}`);
    await levelPage.locator('[data-action="next"]').click();
    await levelPage.locator("#step-container fieldset").waitFor({ state: "visible" });
    assert.equal(await levelPage.locator("#safety-hint").count(), expected.hint ? 1 : 0, `${scale}: the line under the question appears only for Équipe and Collectif`);
    if (expected.hint) {
      assert.match(await levelPage.locator("#safety-hint").innerText(), expected.hint);
      assert.equal(await levelPage.locator("#step-container fieldset").getAttribute("aria-describedby"), "safety-hint", `${scale}: the line is read with the question`);
    } else {
      assert.equal(await levelPage.locator("#step-container fieldset").getAttribute("aria-describedby"), null);
    }
    assert.equal(await levelPage.locator("[data-safety]").count(), 3, `${scale}: still three answers`);
    await levelPage.locator('[data-safety="unsure"]').click();
    const doubt = levelPage.locator("#step-container .notice.amber");
    assert.match(await doubt.innerText(), expected.doubt, `${scale}: doubt text`);
    assert.equal(await doubt.locator('a[href="#securite"]').count(), 1, `${scale}: doubt offers help`);
    assert.equal(await doubt.locator('a:not([href="#securite"])').count(), expected.guides ? 1 : 0, `${scale}: the guides link appears only when a matching guide exists`);
    if (expected.route) assert.equal(await doubt.locator('a:not([href="#securite"])').getAttribute("href"), expected.route, `${scale}: the guides link leads to the guide written for this level`);
    await levelPage.locator('[data-safety="danger"]').click();
    const danger = levelPage.locator("#step-container .notice.red");
    assert.equal(await danger.locator('a.btn.danger[href="#securite"]').count(), 1, `${scale}: danger offers help first`);
    assert.equal(await danger.locator("a.btn:not(.danger)").count(), expected.guides ? 1 : 0, `${scale}: danger guides link`);
    if (expected.danger) assert.match(await danger.innerText(), expected.danger);
    if (expected.dangerGuide) assert.match(await danger.locator("a.btn:not(.danger)").innerText(), expected.dangerGuide, `${scale}: the guide button names what the guide is about`);
    if (expected.route) assert.equal(await danger.locator("a.btn:not(.danger)").getAttribute("href"), expected.route, `${scale}: the danger notice leads to the same guide`);
    assert.equal(await danger.locator('button.btn[data-action="quick-exit"]').count(), 1, `${scale}: a quick exit sits on the red notice`);
    assert.match(await danger.locator(".notice-note").innerText(), /Remplace la page par Wikipédia\. N’efface ni l’historique ni un brouillon gardé\./);
    // Never click the quick exit here: it leaves for an external site and the suite asserts zero external requests.
    assert.equal(await levelPage.evaluate(() => atRisk()), true, `${scale}: a danger answer still counts as at risk`);
    await levelPage.close();
  }
  const publicPage = await openLevelPage("#outil-public");
  await publicPage.locator('[data-action="next"]').click();
  assert.equal(await publicPage.getByRole("link", { name: "Voir les repères de sécurité" }).getAttribute("href"), "#securite", "Collectif: the quiet reminder leads to help, the guide is offered after an answer");
  await publicPage.close();
  const conditionsPage = await openLevelPage("#outil-organization");
  await choose(conditionsPage, "#context-select", "conditions");
  await conditionsPage.locator('#step-container .context-caution a[href="#violences"]').waitFor({ state: "visible" });
  assert.match(await conditionsPage.locator("#step-container .context-caution a[href=\"#violences\"]").innerText(), /Choisir des repères de violence/, "Conditions de travail et sécurité links to the violence guides");
  await conditionsPage.close();
  // The non-graded guide for Collectif: lists only, no meter, no colours, every source cited, folded limits.
  const authorityPage = await openLevelPage("#violences-authority");
  await authorityPage.locator("#violence-list").waitFor({ state: "visible" });
  assert.equal(await choiceValue(authorityPage, "#violence-context"), "authority", "direct link preselects the guide");
  assert.equal(await authorityPage.locator("#violence-meter-layout").isVisible(), false, "no graded meter for the non-graded guide");
  assert.equal(await authorityPage.locator("[data-meter]").count(), 0);
  assert.equal(await authorityPage.locator("#violence-empty").isVisible(), false);
  const authorityText = await authorityPage.locator("#violence-list").innerText();
  assert.match(authorityText, /Quand je défends des droits humains ou que je signale un manquement/);
  assert.match(authorityText, /Cette liste n’est pas classée/);
  assert.match(authorityText, /Premiers pas/);
  assert.match(authorityText, /Pratiques décrites par des organisations/, "the first steps are attributed to organisations");
  assert.match(authorityText, /Si c’est sûr pour moi, je note les faits/, "noting facts is conditioned on safety");
  assert.match(authorityText, /partagé ou surveillé, mieux vaut ne rien y garder/, "the shared or monitored device warning is visible");
  assert.doesNotMatch(authorityText, /Urgence possible|hostile|sans attendre/, "no grading vocabulary, no judging word, no time pressure");
  assert.equal(await authorityPage.locator("#violence-context .choice-summary-value").innerText(), "Autorité, entreprise ou groupe puissant");
  assert.equal((await authorityPage.locator("#violence-context .choice-legend").allTextContents()).includes("Droits et signalement"), true);
  assert.equal(await authorityPage.locator("#violence-list .violence-facts details").count(), 5, "five kinds of pressure, each folded");
  assert.equal(await authorityPage.locator("#violence-list .violence-facts details[open]").count(), 0);
  assert.equal(await authorityPage.locator("#violence-notice-list").isVisible(), true, "the page notice written for this guide is shown");
  assert.equal(await authorityPage.locator("#violence-notice-graded").isVisible(), false, "the notice about violence between two people is hidden");
  assert.equal(await authorityPage.locator("#violence-threshold-red").isVisible(), false, "no talk of a red box without a red box");
  assert.equal(await authorityPage.locator('#violence-list button[data-action="quick-exit"]').count(), 1, "a quick exit sits in the guide");
  assert.equal(await authorityPage.locator('#violence-quit button[data-action="quick-exit"]').isVisible(), true, "the quick exit is also at the top of the page, no scrolling needed");
  assert.deepEqual(await authorityPage.locator('#violence-list .source-note a[href^="#ref-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))), ["#ref-59", "#ref-60", "#ref-61", "#ref-62", "#ref-63", "#ref-64"], "every source of the guide is cited");
  assert.deepEqual(await authorityPage.locator('#violence-credit a[href^="#ref-"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))), ["#ref-65"], "the earlier political violentomètres are credited");
  assert.match(await authorityPage.locator("#violence-credit").innerText(), /n’est pas un violentomètre/);
  assert.equal(await authorityPage.evaluate(() => [59, 60, 61, 62, 63, 64, 65].every((n) => document.querySelector(`#references li#ref-${n} a[href^="http"]`))), true, "every cited reference exists in the bibliography with a link");
  assert.equal(await authorityPage.locator('#violence-list a[href="#securite"]').count(), 1, "the emergency route is one tap away");
  assert.equal(await authorityPage.locator("#violence-list .violence-volets details").count(), 4, "advice, police and media, rights, limits: all folded");
  assert.equal(await authorityPage.locator("#violence-list details[open]").count(), 0);
  await axe("violence-list-authority", authorityPage);
  for (const width of [320, 390, 1100]) {
    await authorityPage.setViewportSize({ width, height: 844 });
    assert(await authorityPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px: the non-graded guide does not overflow`);
  }
  for (const summary of await authorityPage.locator("#violence-list details > summary").all()) await summary.click();
  assert.equal(await authorityPage.locator("#violence-list details[open]").count(), 9, "every folded part opens");
  assert.match(await authorityPage.locator("#violence-list").innerText(), /à n’utiliser que si l’on pense que c’est sûr, et à éviter si l’on estime que cela peut envenimer la situation/, "publicity is presented with its condition, attributed to organisations");
  assert.match(await authorityPage.locator("#violence-list").innerText(), /ne sert pas à :[\s\S]*confirmer ou exclure que je sois visé ou surveillé/, "the guide neither confirms nor denies being targeted");
  await axe("violence-list-authority-open", authorityPage);
  for (const width of [320, 390]) {
    await authorityPage.setViewportSize({ width, height: 844 });
    assert(await authorityPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px: the opened non-graded guide does not overflow`);
  }
  await authorityPage.setViewportSize({ width: 1100, height: 844 });
  await choose(authorityPage, "#violence-context", "couple");
  assert.equal(await authorityPage.locator("#violence-list").isVisible(), false, "choosing a graded guide hides the list");
  assert.equal(await authorityPage.locator("#violence-notice-graded").isVisible(), true, "the graded guides keep their notice");
  assert.equal(await authorityPage.locator("#violence-notice-list").isVisible(), false);
  assert.equal(await authorityPage.locator("#violence-threshold-red").isVisible(), true);
  assert.equal(await authorityPage.locator("#violence-quit").isVisible(), false, "the graded guides keep the page as it was");
  assert.equal(await authorityPage.locator("#meter [data-meter]").count(), 6);
  await choose(authorityPage, "#violence-context", "authority");
  assert.equal(await authorityPage.locator("#violence-list").isVisible(), true);
  assert.equal(await authorityPage.locator("#meter [data-meter]").count(), 0, "choosing the list guide clears the meter");
  await authorityPage.goto(url + "#securite");
  assert.equal(await authorityPage.locator('#securite a[href="#violences-authority"]').count(), 1, "the safety page points to the guide");
  await authorityPage.close();
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
  assert.equal(await page.locator("#glossary-list [data-term]").count(), 26);
  assert(await page.evaluate(() => Object.keys(glossary).every((key) => glossaryHelp[key]?.length === 3)));
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-term]")].map((element) => element.dataset.term).filter((key) => !Object.hasOwn(glossary, key))), [], "Every clickable term has a glossary entry");
  for (const key of ["violentometer", "evidence", "sharedDecision", "balancingIndicator"])
    assert.equal(await page.locator(`#glossary-list [data-term=${key}]`).count(), 1);
  await page.locator("#glossary-list [data-term=culturalFormulation]").click();
  await visible("#term-dialog");
  assert.match(await page.locator("#term-title").innerText(), /Formulation culturelle/);
  assert.equal(await page.locator("#term-source").getAttribute("href"), "#ref-41");
  await page.keyboard.press("Escape");
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
  assert.match(await page.locator("#bibliographie .page-heading").innerText(), /documents utilisés pour concevoir l’outil/);
  assert.doesNotMatch(await page.locator("#bibliographie").innerText(), /La progression s’appuie/);
  assert.match(await page.locator("#ref-1").innerText(), /Brenner[\s\S]*Pomini[\s\S]*Briand/);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('a[href^="#ref-"]')].map((a) => a.getAttribute("href")).filter((href) => !document.getElementById(href.slice(1)))), []);
  await axe("references");
  await page.locator('footer a[href="#comprendre"]').click();
  await page
    .locator("summary")
    .filter({ hasText: "Thérapie de résolution" })
    .click();
  await page.locator('#comprendre a[href="#ref-2"]:visible').click();
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
  assert.equal(await page.locator("#fiche-line a").count(), 0, "No link to an empty fiche after a reset");
  assert(await page.locator("#outil .scale-options").isVisible());
  await page.locator('[data-scale="personal"]').click();
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), "");
  await page.locator("#field-situation").fill("TEMP");
  await page.reload();
  await page.locator('[data-scale="personal"]').click();
  await step(1);
  assert.equal(await page.locator("#field-situation").inputValue(), "");
  // The step counter is never hidden under the sticky header after a screen change (phones, large text).
  const counterPage = await context.newPage();
  for (const [width, height, zoom] of [[320, 568, "100%"], [320, 640, "200%"], [390, 844, "100%"]]) {
    await counterPage.setViewportSize({ width, height });
    await counterPage.goto(url + "#outil-personal");
    await counterPage.addStyleTag({ content: `html { font-size: ${zoom}; }` });
    const clickNext = async () => { await counterPage.locator('[data-action="next"]').click(); };
    const clickBack = async () => { await counterPage.locator('[data-action="back"]').click(); };
    const counterVisible = async (label) => {
      await counterPage.waitForTimeout(300);
      const gap = await counterPage.evaluate(() => document.querySelector("#progress-label").getBoundingClientRect().top - document.querySelector("header").getBoundingClientRect().bottom);
      assert(gap >= 0, `${label} at ${width}px/${zoom}: counter hidden under the header (gap ${gap})`);
    };
    await clickNext();
    await counterPage.locator('[data-safety="safe"]').click();
    await clickNext();
    await counterVisible("Q1");
    await clickNext();
    await counterVisible("Q2");
    await clickNext();
    await counterVisible("Q3");
    await clickBack();
    await counterVisible("back to Q2");
    await clickBack();
    await counterVisible("back to Q1");
  }
  await counterPage.close();
  // The footer buttons wrap instead of overflowing with large text on a small phone.
  const wrapPage = await context.newPage();
  await wrapPage.setViewportSize({ width: 320, height: 640 });
  await wrapPage.goto(url + "#outil-personal");
  await wrapPage.addStyleTag({ content: "html { font-size: 200%; }" });
  for (let i = 0; i < 3; i++) {
    await wrapPage.locator('[data-action="next"]').click();
    assert(await wrapPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Footer buttons overflow with large text on screen ${i}`);
  }
  await wrapPage.close();
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
  const earlyHelpLayout = await page.locator("#accueil .early-help").evaluate((node) => ({
    position: getComputedStyle(node).position,
    top: node.getBoundingClientRect().top,
    bottom: node.getBoundingClientRect().bottom,
    heroBottom: node.previousElementSibling.getBoundingClientRect().bottom,
    choicesTop: node.nextElementSibling.getBoundingClientRect().top,
  }));
  assert.equal(earlyHelpLayout.position, "static", "The home safety links stay in the page flow on mobile");
  assert(earlyHelpLayout.top >= earlyHelpLayout.heroBottom - 1 && earlyHelpLayout.bottom <= earlyHelpLayout.choicesTop + 1, "Safety links sit between the introduction and the exercise");
  await page.screenshot({ path: path.join(output, "mobile-home.png"), fullPage: true });
  assert(await page.locator("#accueil .scale-card").first().evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight), "The first level card is visible without scrolling on a phone");
  await page.locator("#accueil .welcome-explain summary").click();
  await overflow("open six steps on mobile");
  await axe("open-method-step-mobile");
  await page.locator("#accueil .help-others summary").click();
  await overflow("open support entries on mobile");
  await page.locator("#accueil .help-others summary").click();
  await page.locator("#accueil .teaching-figure").screenshot({ path: path.join(output, "method-mobile.png") });
  await visit("soutenir");
  await page.locator("#soutenir .support-illustration summary").click();
  await page.locator("#soutenir .teaching-figure").screenshot({ path: path.join(output, "support-figure-mobile.png") });
  await visit("groupe");
  await page.screenshot({ path: path.join(output, "mobile-group.png"), fullPage: true });
  await choose(page, "#group-stage-select", "1");
  if (!(await page.locator("#group-method-diagram").evaluate((node) => node.open)))
    await page.locator("#group-method-diagram > summary").click();
  assert(await page.locator("#group-method-diagram svg").isVisible());
  await overflow("open group method flowchart mobile");
  await page.locator("#group-method-diagram .teaching-figure").screenshot({ path: path.join(output, "group-method-flow-mobile.png") });
  await axe("group-method-flow-mobile");
  await page.setViewportSize({ width: 320, height: 844 });
  await overflow("open group method flowchart at 320px");
  await page.locator("#group-method-diagram .teaching-figure").screenshot({ path: path.join(output, "group-method-flow-320.png") });
  await checkInternalDiagramScroll(page, "#group-method-diagram");
  await page.setViewportSize({ width: 390, height: 844 });
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
  assert.match(await page.locator("#mobile-step-summary").innerText(), /Aller à une étape/);
  assert.match(await page.locator("#progress-label").innerText(), /Étape 1 sur 6/);
  await page.locator("#mobile-step-picker summary").click();
  assert(await page.locator('#steps [data-step="2"]').isVisible());
  await page.locator('#steps [data-step="2"]').click();
  assert.match(await page.locator("#progress-label").innerText(), /Étape 3 sur 6/);
  assert.match(await page.title(), /Étape 3 sur 6 · Imaginer/, "The step is in the page title");
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
  await step(1);
  const mobileContextCheck = page.locator("#step-container .context-check");
  assert.equal(await mobileContextCheck.evaluate((node) => node.open), false);
  await mobileContextCheck.locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await mobileContextCheck.evaluate((node) => node.open), true, "Optional context prompt works with the keyboard");
  await overflow("open context prompt mobile 390");
  await page.screenshot({ path: path.join(output, "mobile-context-390.png"), fullPage: true });
  await axe("context-prompt-mobile");
  await page.setViewportSize({ width: 320, height: 844 });
  await overflow("open context prompt mobile 320");
  await page.setViewportSize({ width: 390, height: 844 });
  await step(0);
  await page.locator(".menu-toggle").click();
  await visible("#navigation");
  assert.equal(await page.locator(".menu-toggle").innerText(), "Fermer ×");
  await page.locator("nav a[data-page=soutenir]").click();
  await page.locator("#navigation").waitFor({ state: "hidden" });
  assert(!(await page.locator("#navigation").isVisible()));
  await visit("violences");
  assert.equal(await choiceValue(page, "#violence-context"), "");
  assert(await page.locator('#violences .violence-urgent a[href="#securite"]').isVisible());
  await page.screenshot({
    path: path.join(output, "mobile-meter-chooser-390.png"),
    fullPage: true,
  });
  await choose(page, "#violence-context", "couple");
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
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const relation of violenceContexts) {
      await page.evaluate((key) => { location.hash = `violences-${key}`; }, relation);
      await page.waitForFunction(
        (key) => document.querySelector("#violence-context")?.value === key,
        relation,
      );
      assert.equal(await page.locator("#meter [data-meter]").count(), 6);
      await overflow(`${width}px violence guide ${relation}`);
      if ((width === 320 && ["sibling", "colleague"].includes(relation)) || (width === 390 && relation === "sibling")) {
        await page.screenshot({
          path: path.join(output, `mobile-meter-${relation}-${width}.png`),
          fullPage: true,
        });
        await axe(`mobile-meter-${relation}-${width}`);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
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
  await tp.locator("#term-dialog").waitFor({ state: "hidden" }); // with animations on, the dialog fades out before it is hidden
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
