// A4 pagination checks: every card fits, all answer text is preserved, repeated
// prints rebuild the current values, and the interactive interface is unchanged.
const { chromium } = require(
  process.env.QA_NODE_MODULES
    ? process.env.QA_NODE_MODULES + "/playwright"
    : "playwright",
);
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const out = process.env.QA_OUTPUT || "/tmp/pas-a-pas-print";
    await fs.mkdir(out, { recursive: true });
    await page.goto("file://" + path.resolve(__dirname, "../index.html"));
    const samples = {
      short: {
        situation: "Deux demandes avec la même échéance.",
        goal: "Clarifier les priorités.",
        obstacle: "Temps insuffisant.",
        action: "Préparer une liste de tâches.",
        when: "Demain à 9 h.",
        measure: "Un rendez-vous fixé.",
      },
      expanded: Object.fromEntries(
        [
          "situation",
          "goal",
          "obstacle",
          "control",
          "outside",
          "emotion",
          "action",
          "when",
          "support",
          "backup",
          "measure",
          "result",
          "learning",
          "next",
        ].map((k, i) => [
          k,
          `Réponse ${i + 1}. Un paragraphe précis pour expliquer la situation et les ressources disponibles.\n\n`.repeat(
            (i % 3) + 4,
          ),
        ]),
      ),
      long: {
        situation:
          "Un premier paragraphe détaille les faits sans imposer de solution. Un second point explique ce qui bloque et ce qui aiderait.\n\n".repeat(
            45,
          ),
        goal: "OBJECTIF_FINAL conservé.",
        obstacle: "Obstacle après une réponse longue.",
        action:
          "Une action concrète et réalisable. Nous cherchons un appui utile avant de continuer. ".repeat(
            65,
          ),
        measure: "PROGRES_FINAL conservé.",
        result: "BILAN_FINAL conservé.",
        learning: "APPRENTISSAGE_FINAL conservé.",
        next: "SUITE_FINALE conservée.",
      },
      unbroken: {
        situation: "X".repeat(6000),
        goal: "Après la réponse sans espaces.",
      },
    };
    for (const [name, fields] of Object.entries(samples)) {
      await page.evaluate((fields) => {
        state = fresh();
        Object.assign(state.fields, fields);
        state.fields.trial = "yes";
        state.options = [
          {
            id: 1,
            text: "Première piste à essayer.",
            plus: "Bénéfice possible.",
            minus: "Limite à prendre en compte.",
          },
        ];
        state.chosen = 1;
        preparePrint();
      }, fields);
      const validation = await page.evaluate(() => {
        const pages = [...document.querySelectorAll(".print-page")];
        const overflows = pages.flatMap((page, i) => {
          const body = page.querySelector(".print-page-body");
          const limit = body.getBoundingClientRect().bottom;
          return [...body.children]
            .filter((el) => el.getBoundingClientRect().bottom > limit + 0.5)
            .map((el) => ({ page: i + 1, text: el.textContent.slice(0, 60) }));
        });
        const cards = [...document.querySelectorAll(".print-card")];
        return {
          pageCount: pages.length,
          overflows,
          emptyCards: cards.filter((c) => !c.querySelector(".print-entry"))
            .length,
          answers: [...document.querySelectorAll(".print-entry")].map((el) => [
            el
              .querySelector(".print-entry-label")
              .textContent.replace(/ \(suite\)$/, ""),
            el.querySelector(".print-entry-text").textContent,
          ]),
        };
      });
      assert.deepEqual(validation.overflows, [], name + " overflowing content");
      assert.equal(validation.emptyCards, 0);
      for (const [key, label] of Object.entries({
        situation: "Les faits",
        goal: "Mon but",
        obstacle: "Mon obstacle",
        action: "Action",
        when: "Quand et où",
        support: "Appui",
        backup: "Si ça bloque",
        measure: "Signe de progrès",
        result: "Résultat",
        learning: "Ce que j’en retiens",
        next: "Prochaine étape",
      }))
        if (fields[key])
          assert.equal(
            validation.answers
              .filter(([l]) => l === label)
              .map(([, t]) => t)
              .join(""),
            fields[key],
            name + " missing " + key,
          );
      await page.pdf({
        path: path.join(out, name + ".pdf"),
        preferCSSPageSize: true,
        printBackground: true,
      });
      assert(
        !(await page.locator("#print-document").isVisible()),
        "Print-only layout must disappear after printing",
      );
      console.log(
        name +
          ": " +
          validation.pageCount +
          " page(s), no overflowing block, all answers preserved.",
      );
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
