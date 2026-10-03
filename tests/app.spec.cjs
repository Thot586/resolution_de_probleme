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
  const openFlowDiagram = async (targetPage, selector, svgBranches, textBranches) => {
    const details = targetPage.locator(selector);
    assert.equal(await details.count(), 1, `${selector}: one diagram`);
    assert.equal(await details.evaluate((node) => node.open), false, `${selector}: closed by default`);
    const svg = details.locator("figure svg[role=img]");
    assert.equal(await svg.isVisible(), false, `${selector}: hidden until requested`);
    await details.locator("summary").click();
    assert(await svg.isVisible(), `${selector}: SVG visible after opening`);
    const labelledBy = (await svg.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    assert.equal(labelledBy.length, 2, `${selector}: title and description linked to SVG`);
    for (const id of labelledBy)
      assert.equal(await svg.locator(`[id="${id}"]`).count(), 1, `${selector}: missing ${id}`);
    assert((await svg.locator("title").textContent()).trim().length > 15, `${selector}: meaningful title`);
    assert((await svg.locator("desc").textContent()).trim().length > 30, `${selector}: meaningful description`);
    assert((await details.locator("figure figcaption").innerText()).trim().length > 25, `${selector}: meaningful caption`);
    const equivalent = details.locator(".diagram-text");
    assert(await equivalent.isVisible(), `${selector}: visible textual equivalent`);
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
  assert.equal(await page.locator("#accueil .method-steps li:visible").count(), 6);
  assert.match(await page.locator("#accueil .method-steps").innerText(), /Définir le problème[\s\S]*Imaginer des solutions[\s\S]*Comparer les solutions[\s\S]*Choisir et préparer[\s\S]*Essayer dans la réalité[\s\S]*Évaluer et ajuster/);
  assert.match(await page.locator("#accueil .scale-intro").innerText(), /questions et les exemples seront adaptés/);
  assert.equal(await page.locator('#accueil a[href="#soutenir"]').count(), 1);
  assert.equal(await page.locator('#accueil a[href="#groupe"]').count(), 1);
  assert.equal(await page.locator("#accueil .method-steps details").count(), 6);
  assert(await page.locator("#accueil .early-help").evaluate((node) => node.nextElementSibling.matches(".scale-entry")), "Safety links precede the exercise choices");
  assert.equal(await page.locator('#accueil .help-others a[href="#proche"]').count(), 1);
  await page.screenshot({ path: path.join(output, "desktop-home.png"), fullPage: true });
  const methodItems = page.locator("#accueil .method-steps > li");
  const firstMethod = methodItems.first().locator("details");
  assert.equal(await firstMethod.evaluate((node) => node.open), false);
  await firstMethod.locator("summary").click();
  assert(await firstMethod.locator(".method-detail").isVisible());
  assert.match(await firstMethod.locator(".method-detail").innerText(), /documents sous quinze jours/);
  assert.deepEqual(await firstMethod.locator(".method-example").evaluateAll((nodes) => nodes.map((node) => node.dataset.level)), ["personal", "shared", "organization", "public"]);
  const expandedWidth = await methodItems.first().evaluate((node) => ({ item: node.getBoundingClientRect().width, grid: node.parentElement.getBoundingClientRect().width }));
  assert(expandedWidth.item >= expandedWidth.grid - 2, "An open step uses the available width");
  await firstMethod.screenshot({ path: path.join(output, "desktop-method-expanded.png") });
  assert.equal(new URL(page.url()).hash, "");
  await axe("open-method-step");
  await firstMethod.locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await firstMethod.evaluate((node) => node.open), false);
  for (const item of await methodItems.all()) {
    const details = item.locator("details");
    await details.locator("summary").click();
    assert.equal(await details.locator(".method-example").count(), 4, "Each step shows four contexts");
    await details.locator("summary").click();
  }
  const secondMethod = methodItems.nth(1).locator("details");
  await secondMethod.locator("summary").click();
  assert.match(await secondMethod.locator("summary").innerText(), /liste de solutions possibles/);
  assert.match(await secondMethod.locator(".method-detail").innerText(), /sites fiables[\s\S]*spécialiste[\s\S]*avant de choisir/);
  const methodWidths = await methodItems.evaluateAll((nodes) => nodes.map((node) => ({ item: node.getBoundingClientRect().width, grid: node.parentElement.getBoundingClientRect().width })));
  assert(methodWidths.every(({ item, grid }) => item >= grid - 2), "Opening any step leaves no empty grid cells");
  await page.locator("#accueil .method-overview").screenshot({ path: path.join(output, "desktop-second-step-open.png") });
  await secondMethod.locator("summary").click();
  const ipt = page.locator("#accueil [data-term=ipt]");
  await ipt.click();
  await visible("#term-dialog");
  assert.match(await page.locator("#term-detail").innerText(), /Integrated Psychological Treatment/);
  assert.equal(await page.locator("#term-source").getAttribute("href"), "#ref-1");
  await page.locator("#term-close").click();
  await page.locator('#accueil .early-help a[href="#violences"]').click();
  await visible("#violences");
  await visit("accueil");
  await page.locator('#accueil .early-help a[href="#securite"]').click();
  await visible("#securite");
  await visit("accueil");
  await page.locator("#accueil .welcome-explain summary").click();
  await visible("#accueil svg[aria-labelledby='method-title method-desc']");
  assert.match(await page.locator("#accueil svg").textContent(), /Évaluer et ajuster/);
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
      await contextPage.locator("#context-select option").evaluateAll((nodes) => nodes.map((n) => n.value)),
      group.options,
      `${group.scale}: choices must be scoped to this level`,
    );
    for (const [key, focus, situation, hint, method, idea, action] of group.cases) {
      await contextPage.locator("#context-select").selectOption(key);
      assert.match(await contextPage.locator("#context-focus").innerText(), focus);
      if (key === group.cases[0][0])
        await contextPage.screenshot({
          path: path.join(output, `context-${group.scale}-${key}.png`),
          fullPage: true,
        });
      await contextPage.locator('#steps [data-step="1"]').click();
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
        await contextPage.locator('#steps [data-step="2"]').click();
        assert.match(await contextPage.locator(".example-visible").innerText(), idea);
        await contextPage.locator('#steps [data-step="4"]').click();
        assert.match(await contextPage.locator(".example-visible").innerText(), action);
      }
      await contextPage.locator('#steps [data-step="0"]').click();
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
    await flowPage.locator('#steps [data-step="2"]').click();
    await flowPage.locator("#idea-1").fill("Un petit pas à examiner.");
    await flowPage.locator('#steps [data-step="3"]').click();
    await flowPage.locator('[data-choose="1"]').click();
    await flowPage.locator('#steps [data-step="4"]').click();
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
  assert.equal(await importPage.locator("#context-select").inputValue(), "other");
  assert.match(await importPage.locator("#context-review").innerText(), /relis ce que j’ai écrit/);
  await importPage.locator('#steps [data-step="1"]').click();
  assert.equal(await importPage.locator("#field-situation").inputValue(), legacy.fields.situation);
  await importPage.locator('#steps [data-step="3"]').click();
  assert.equal(await importPage.locator('[data-choose="2"][aria-pressed="true"]').count(), 1);
  await importPage.locator('#steps [data-step="4"]').click();
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
  assert.equal(await storedPage.locator("#context-select").inputValue(), "other");
  assert.match(await storedPage.locator("#context-review").innerText(), /contexte/);
  assert.deepEqual(await storedPage.evaluate(() => Object.keys(localStorage)), ["pas-a-pas.brouillon.v2"]);
  await storedPage.locator('#steps [data-step="1"]').click();
  assert.equal(await storedPage.locator("#field-situation").inputValue(), legacy.fields.situation);
  await storedPage.locator('#steps [data-step="0"]').click();
  await storedPage.locator("#context-select").selectOption("neighbors");
  await storedPage.reload();
  assert.equal(await storedPage.locator("#context-select").inputValue(), "neighbors");
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
  assert.equal(await v2Page.locator("#context-select").inputValue(), "colleague");
  assert.match(await v2Page.locator("#context-review").innerText(), /contexte/);
  await v2Page.locator('#steps [data-step="1"]').click();
  assert.equal(await v2Page.locator("#field-situation").inputValue(), previousColleague.fields.situation);
  await v2Page.evaluate((draft) => {
    localStorage.setItem("pas-a-pas.brouillon.v2", JSON.stringify(draft));
  }, { ...previousColleague, catalogRevision: 3 });
  await v2Page.reload();
  assert.equal(await v2Page.locator("#context-select").inputValue(), "colleague");
  assert.equal(await v2Page.locator("#context-review").count(), 0, "Current catalog needs no migration warning");
  await v2Page.locator('#steps [data-step="1"]').click();
  assert.equal(await v2Page.locator("#field-situation").inputValue(), previousColleague.fields.situation);
  await v2Context.close();
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
  assert.match(await page.locator("#groupe .group-overview svg").textContent(), /Décider ensemble/);
  await page.locator("#groupe .group-overview summary").click();
  assert.match(await page.locator("#group-step-title").innerText(), /Qui participe/);
  await page.locator("#group-note").fill("Décision : améliorer les horaires d’accueil.");
  await page.locator("#group-next").click();
  assert.match(await page.locator("#group-guidance").innerText(), /langue.*horaire.*format/);
  await page.locator("#group-method").selectOption("survey");
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
  await page.locator("#group-stage-select").selectOption("2");
  assert(await page.locator("#group-guidance [data-term=survey]").isVisible());
  await page.locator("#group-stage-select").selectOption("3");
  assert.match(await page.locator("#group-step-title").innerText(), /reconnaissent/);
  assert.match(await page.locator("#group-guidance").innerText(), /langue et un format compréhensibles/);
  await page.locator("#group-stage-select").selectOption("4");
  assert.match(await page.locator("#group-note-prompt").innerText(), /pistes possibles.*choix motivé/);
  await page.locator("#group-stage-select").selectOption("5");
  assert.match(await page.locator("#group-note-prompt").innerText(), /effet gênant/);
  await page.locator("#group-stage-select").selectOption("3");
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
  const violenceContexts = [
    "couple", "sibling", "peers", "family", "colleague",
    "work", "education", "care", "vulnerable", "other",
  ];
  assert.equal(await page.locator("#violence-context").inputValue(), "", "Generic entry asks for a relation");
  assert.equal(await page.locator("#meter [data-meter]").count(), 0, "Generic entry has no preselected guide");
  assert.match(await page.locator("#violences").innerText(), /choisir|choisissez|relation/i);
  assert.deepEqual(
    (await page.locator("#violence-context option").evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean))).sort(),
    [...violenceContexts].sort(),
    "Every authored guide is reachable from the relationship chooser",
  );
  assert.equal(await page.locator("#violence-credit").isVisible(), false, "Credits appear with a selected relation");
  await axe("meter-no-relation");
  const guideContent = new Set();
  const priorWork = {
    couple: [], sibling: [], peers: [53], family: [], colleague: [51, 57],
    work: [51, 55], education: [52, 58], care: [54], vulnerable: [], other: [],
  };
  for (const val of violenceContexts) {
    await page.locator("#violence-context").selectOption(val);
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
  await page.locator("#violence-context").selectOption("sibling");
  await page.locator('[data-meter="2"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator('[data-meter="2"]').getAttribute("aria-pressed"), "true", "Guide choices work from the keyboard");
  await page.locator("#violence-context").selectOption("colleague");
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
    assert.equal(await guidePage.locator("#violence-context").inputValue(), val, `${val}: direct link preselects the relation`);
    assert.equal(await guidePage.locator("#meter [data-meter]").count(), 6, `${val}: direct link shows six choices`);
    assert.equal(await guidePage.locator('#meter [aria-pressed="true"]').count(), 0, `${val}: direct link does not select a behavior`);
  }
  await guidePage.goto(url + "#violences");
  assert.equal(await guidePage.locator("#violence-context").inputValue(), "", "Generic deep link returns to the chooser");
  assert.equal(await guidePage.locator("#meter [data-meter]").count(), 0);
  await guidePage.close();
  const relationPage = await context.newPage();
  relationPage.on("pageerror", (e) => errors.push(e.message));
  relationPage.on("request", (r) => {
    if (!r.url().startsWith(url) && !r.url().startsWith("blob:")) external.push(r.url());
  });
  await relationPage.goto(url + "#outil-shared");
  for (const relation of ["colleague", "sibling", "peers", "couple"]) {
    await relationPage.evaluate(() => { location.hash = "outil-shared"; });
    await relationPage.locator("#outil").waitFor({ state: "visible" });
    await relationPage.locator("#context-select").selectOption(relation);
    await relationPage.locator('#steps [data-step="1"]').click();
    const sentence = `Situation conservée : ${relation}`;
    await relationPage.locator("#field-situation").fill(sentence);
    await relationPage.locator('#steps [data-step="0"]').click();
    const destination = `#violences-${relation}`;
    const link = relationPage.locator(`#outil a[href="${destination}"]`).first();
    assert(await link.isVisible(), `${relation}: the context offers its matching violence guide`);
    await link.click();
    await relationPage.locator("#violences").waitFor({ state: "visible" });
    assert.equal(new URL(relationPage.url()).hash, destination);
    assert.equal(await relationPage.locator("#violence-context").inputValue(), relation);
    await relationPage.evaluate(() => { location.hash = "outil"; });
    await relationPage.locator("#outil").waitFor({ state: "visible" });
    assert.equal(await relationPage.locator("#context-select").inputValue(), relation);
    await relationPage.locator('#steps [data-step="1"]').click();
    assert.equal(await relationPage.locator("#field-situation").inputValue(), sentence, `${relation}: returning preserves the draft`);
  }
  await relationPage.close();
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
  assert.match(await page.locator("#ref-1").innerText(), /Integrated Psychological Treatment/);
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
  const mobileMethod = page.locator("#accueil .method-steps details").nth(2);
  await mobileMethod.locator("summary").click();
  const mobileExamples = await mobileMethod.locator(".method-example").evaluateAll((nodes) => nodes.map((node) => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom })));
  assert(mobileExamples.every((rect, index) => index === 0 || rect.top >= mobileExamples[index - 1].bottom), "Examples stack without overlap on mobile");
  await overflow("open four examples on mobile");
  await mobileMethod.screenshot({ path: path.join(output, "mobile-method-expanded.png") });
  await axe("open-method-step-mobile");
  await mobileMethod.locator("summary").click();
  await page.locator("#accueil .welcome-explain summary").click();
  await overflow("open method diagram mobile");
  await page.locator("#accueil .teaching-figure").screenshot({ path: path.join(output, "method-mobile.png") });
  await visit("soutenir");
  await page.locator("#soutenir .support-illustration summary").click();
  await page.locator("#soutenir .teaching-figure").screenshot({ path: path.join(output, "support-figure-mobile.png") });
  await visit("groupe");
  await page.screenshot({ path: path.join(output, "mobile-group.png"), fullPage: true });
  await page.locator("#group-stage-select").selectOption("1");
  if (!(await page.locator("#group-method-diagram").evaluate((node) => node.open)))
    await page.locator("#group-method-diagram summary").click();
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
  assert.equal(await page.locator("#violence-context").inputValue(), "");
  assert(await page.locator('#violences .violence-urgent a[href="#securite"]').isVisible());
  await page.screenshot({
    path: path.join(output, "mobile-meter-chooser-390.png"),
    fullPage: true,
  });
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
