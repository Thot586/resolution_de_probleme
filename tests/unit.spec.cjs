// Tests sans navigateur : le noyau réactif, les dérivés purs (ordre des repères de violence, routage) et le brouillon.
// Les scripts de l'application sont des scripts classiques assemblés par le build : on les charge dans un contexte `vm`,
// dans le même ordre que le build, puis on lit les noms dont on a besoin. Lancer : npm run test:unit
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = (name) => fs.readFileSync(path.join(root, "scripts", name), "utf8").replace(/\r\n/g, "\n");

// Charge les scripts donnés (dans l'ordre) et renvoie les valeurs demandées.
function load(files, names, globals = {}) {
  const context = vm.createContext({ console, queueMicrotask, ...globals });
  files.forEach((file) => vm.runInContext(source(file), context, { filename: file }));
  return vm.runInContext(`({ ${names.join(", ")} })`, context);
}

// ------------------------------------------------------------------------------------------------ gabarit
test("html échappe par défaut, raw laisse passer, les tableaux se concatènent", () => {
  const { html, raw, esc } = load(["core.js"], ["html", "raw", "esc"]);
  assert.equal(String(html`<p>${'<img src=x onerror="a">'} & ${"l'été & co"}</p>`), "<p>&lt;img src=x onerror=&quot;a&quot;&gt; & l&#39;été &amp; co</p>", "seules les valeurs insérées sont échappées, pas le gabarit lui-même");
  assert.equal(String(html`<b>${raw("<i>sûr</i>")}</b>`), "<b><i>sûr</i></b>");
  assert.equal(String(html`<ul>${["a", "<b>"].map((x) => html`<li>${x}</li>`)}</ul>`), "<ul><li>a</li><li>&lt;b&gt;</li></ul>");
  assert.equal(String(html`${null}${undefined}${false}${0}`), "0", "null, undefined et false n'écrivent rien ; 0 s'écrit");
  assert.equal(esc(undefined), "");
});

// ------------------------------------------------------------------------------------------------ réactivité
test("un effet se rejoue quand ce qu'il a lu change, et seulement alors", () => {
  const { reactive, effect } = load(["core.js"], ["reactive", "effect"]);
  const state = reactive({ a: 1, b: 1 });
  const seen = [];
  effect(() => seen.push(state.a));
  state.b = 2; // non lu : rien
  state.a = 2;
  state.a = 2; // même valeur : rien
  state.a = 3;
  assert.deepEqual(seen, [1, 2, 3]);
});

test("les objets et tableaux imbriqués sont réactifs, push compris", () => {
  const { reactive, effect } = load(["core.js"], ["reactive", "effect"]);
  const state = reactive({ fields: { situation: "" }, options: [{ id: 1, text: "" }] });
  const log = [];
  effect(() => log.push(`situation=${state.fields.situation}`));
  effect(() => log.push(`options=${state.options.map((o) => o.text).join("|")}`));
  state.fields.situation = "x";
  state.options[0].text = "a";
  state.options.push({ id: 2, text: "b" });
  state.options = state.options.filter((o) => o.id !== 1);
  assert.deepEqual(log, ["situation=", "options=", "situation=x", "options=a", "options=a|b", "options=b"]);
  assert.equal(JSON.stringify(state), '{"fields":{"situation":"x"},"options":[{"id":2,"text":"b"}]}', "l'état se sérialise comme un objet simple");
});

test("un tableau raccourci rejoue l'effet qui lisait une case supprimée", () => {
  const { reactive, effect } = load(["core.js"], ["reactive", "effect"]);
  const state = reactive({ list: ["a", "b", "c"] });
  const log = [];
  effect(() => log.push(state.list[2] ?? "vide"));
  state.list.length = 1;
  assert.deepEqual(log, ["c", "vide"]);
});

test("batch ne rejoue chaque effet qu'une fois, à la fin", () => {
  const { reactive, effect, batch } = load(["core.js"], ["reactive", "effect", "batch"]);
  const state = reactive({ scale: "personal", context: "other" });
  const seen = [];
  effect(() => seen.push(`${state.scale}/${state.context}`));
  batch(() => {
    state.scale = "organization";
    state.context = "service";
  });
  assert.deepEqual(seen, ["personal/other", "organization/service"]);
});

test("un effet suit ses dépendances à chaque tour (lecture conditionnelle)", () => {
  const { reactive, effect } = load(["core.js"], ["reactive", "effect"]);
  const state = reactive({ chosen: false, context: "x" });
  let runs = 0;
  effect(() => {
    runs++;
    if (state.chosen) void state.context;
  });
  state.context = "y"; // pas encore lu
  assert.equal(runs, 1);
  state.chosen = true;
  assert.equal(runs, 2);
  state.context = "z"; // lu désormais
  assert.equal(runs, 3);
  state.chosen = false;
  state.context = "w"; // n'est plus lu
  assert.equal(runs, 4);
});

test("un effet qui écrit ce qu'il lit ne boucle pas ; l'arrêt est définitif", () => {
  const { reactive, effect } = load(["core.js"], ["reactive", "effect"]);
  const state = reactive({ n: 0 });
  let runs = 0;
  const stop = effect(() => {
    runs++;
    state.n = state.n + 1;
  });
  assert.equal(runs, 1);
  assert.equal(state.n, 1);
  stop();
  state.n = 10;
  assert.equal(runs, 1);
});

test("computed : calculé à la demande, gardé, invalidé par ce qu'il lit, et lisible depuis un effet", () => {
  const { reactive, effect, computed } = load(["core.js"], ["reactive", "effect", "computed"]);
  const state = reactive({ a: 1, b: 2 });
  let calls = 0;
  const sum = computed(() => {
    calls++;
    return state.a + state.b;
  });
  assert.equal(calls, 0, "paresseux");
  assert.equal(sum.value, 3);
  assert.equal(sum.value, 3);
  assert.equal(calls, 1, "gardé");
  const seen = [];
  effect(() => seen.push(sum.value));
  state.a = 10;
  assert.deepEqual(seen, [3, 12]);
  assert.equal(calls, 2);
});

test("piège : un effet qui sort avant de lire l'état ne se rejouera jamais", () => {
  const { reactive, effect } = load(["core.js"], ["reactive", "effect"]);
  const state = reactive({ title: "a" });
  let element = null; // l'élément du DOM n'existe pas encore au démarrage
  const written = [];
  effect(() => {
    if (!element) return; // sort sans rien lire
    written.push(state.title);
  });
  const careful = [];
  effect(() => {
    const title = state.title; // lit d'abord
    if (element) careful.push(title);
  });
  element = {};
  state.title = "b";
  assert.deepEqual(written, [], "l'effet qui n'a rien lu n'est jamais prévenu");
  assert.deepEqual(careful, ["b"], "l'effet qui lit d'abord se rejoue");
});

test("untracked lit sans s'abonner", () => {
  const { reactive, effect, untracked } = load(["core.js"], ["reactive", "effect", "untracked"]);
  const state = reactive({ watched: 1, ignored: 1 });
  const seen = [];
  effect(() => seen.push(`${state.watched}/${untracked(() => state.ignored)}`));
  state.ignored = 2;
  assert.deepEqual(seen, ["1/1"]);
  state.watched = 2;
  assert.deepEqual(seen, ["1/1", "2/2"]);
});

test("l'erreur d'un effet rejoué ne casse pas l'écriture qui l'a déclenché", () => {
  const later = [];
  const { reactive, effect } = load(["core.js"], ["reactive", "effect"], { queueMicrotask: (fn) => later.push(fn) });
  const state = reactive({ n: 0 });
  effect(() => {
    if (state.n === 1) throw new Error("effet cassé");
  });
  state.n = 1; // ne lève pas
  assert.equal(state.n, 1, "l'écriture a abouti");
  assert.equal(later.length, 1, "l'erreur est remise à plus tard, pour rester visible");
  assert.throws(later[0], /effet cassé/);
});

// ------------------------------------------------------------------------------------------------ dérivés purs
const derived = () =>
  load(["core.js", "data.js", "context-catalog.js", "selectors.js"], ["violenceGroups", "violenceData", "violenceLists", "violenceFirst", "contextCatalog", "scales", "violenceGroupsFor", "violenceOriginNote", "orderViolenceGroups", "parseRoute"]);
// (Array.from : les tableaux venus du contexte vm n'ont pas le même prototype que ceux du test ; deepEqual les refuserait.)
const keysOf = (groups) => Array.from(groups, ([, items]) => Array.from(items, ([key]) => key)).flat();
const labelsOf = (groups) => Array.from(groups, ([label]) => label);

test("la table d'ordre des repères ne cite que des relations et des contextes qui existent", () => {
  const { violenceFirst, violenceData, violenceLists, contextCatalog, violenceGroups } = derived();
  const relations = new Set(keysOf(violenceGroups));
  for (const [where, first] of Object.entries(violenceFirst)) {
    const [scale, context] = where.split("/");
    assert(Object.hasOwn(contextCatalog, scale), `${where}: niveau inconnu`);
    if (context) assert(Object.hasOwn(contextCatalog[scale], context), `${where}: contexte inconnu`);
    for (const key of first) {
      assert(relations.has(key), `${where}: relation « ${key} » absente de la liste`);
      assert(Object.hasOwn(violenceData, key) || Object.hasOwn(violenceLists, key), `${where}: « ${key} » n'a ni repère gradué ni repère non gradué`);
    }
  }
});

test("sans problème choisi, l'ordre est celui d'origine ; avec un problème, rien ne disparaît et « Autre situation » reste en dernier", () => {
  const { violenceGroups, violenceGroupsFor, scales, contextCatalog } = derived();
  assert.deepEqual(violenceGroupsFor("", ""), violenceGroups);
  const all = keysOf(violenceGroups).sort();
  for (const scale of Object.keys(scales)) {
    for (const context of Object.keys(contextCatalog[scale])) {
      const groups = violenceGroupsFor(scale, context);
      assert.deepEqual(keysOf(groups).sort(), all, `${scale}/${context}: toutes les relations, une seule fois`);
      assert.equal(labelsOf(groups).at(-1), "Autre situation", `${scale}/${context}: « Autre situation » reste en dernier`);
    }
  }
});

test("l'ordre suit le problème en cours", () => {
  const { violenceGroupsFor } = derived();
  assert.deepEqual(labelsOf(violenceGroupsFor("organization", "conditions")), ["Travail et études", "Droits et signalement", "Vie personnelle", "Soins", "Autre situation"]);
  assert.deepEqual(keysOf(violenceGroupsFor("organization", "conditions")).slice(0, 3), ["work", "colleague", "education"]);
  assert.equal(labelsOf(violenceGroupsFor("public", "mobility"))[0], "Droits et signalement");
  assert.equal(labelsOf(violenceGroupsFor("personal", "health"))[0], "Soins");
  assert.equal(labelsOf(violenceGroupsFor("personal", "work"))[0], "Travail et études");
  assert.equal(labelsOf(violenceGroupsFor("personal", "daily"))[0], "Vie personnelle", "un contexte sans relation proche garde l'ordre d'origine");
  assert.deepEqual(keysOf(violenceGroupsFor("shared", "family")).slice(0, 2), ["family", "sibling"]);
  assert.deepEqual(violenceGroupsFor("organization", "inexistant").length, 5, "un contexte inconnu retombe sur le niveau");
});

test("la note d'origine nomme le niveau et le contexte, et se tait quand rien n'a bougé", () => {
  const { violenceOriginNote } = derived();
  assert.match(violenceOriginNote("organization", "conditions"), /Équipe ou institution · Conditions de travail et sécurité.*Rien n’est choisi à ma place/);
  assert.equal(violenceOriginNote("", ""), "");
  assert.equal(violenceOriginNote("personal", "daily"), "", "ordre inchangé : pas de note");
  assert.equal(violenceOriginNote("shared", "couple"), "", "ordre inchangé : pas de note");
});

test("parseRoute : pages, niveaux, repères de violence et références", () => {
  const { parseRoute } = derived();
  assert.deepEqual({ ...parseRoute("") }, { name: "accueil", page: "accueil", scale: "", violenceKey: "", violence: false, ref: false });
  assert.equal(parseRoute("#outil").page, "outil");
  assert.deepEqual({ ...parseRoute("#outil-organization") }, { name: "outil-organization", page: "outil", scale: "organization", violenceKey: "", violence: false, ref: false });
  assert.equal(parseRoute("#outil-inconnu").page, "accueil");
  assert.deepEqual({ ...parseRoute("#violences") }, { name: "violences", page: "violences", scale: "", violenceKey: "", violence: true, ref: false });
  assert.deepEqual({ ...parseRoute("#violences-couple") }, { name: "violences-couple", page: "violences", scale: "", violenceKey: "couple", violence: true, ref: false });
  assert.equal(parseRoute("#violences-authority").violenceKey, "authority", "un repère non gradué est aussi une relation");
  assert.equal(parseRoute("#violences-inconnue").page, "accueil");
  assert.equal(parseRoute("#violences-inconnue").violence, false);
  assert.deepEqual({ ...parseRoute("#ref-22") }, { name: "ref-22", page: "bibliographie", scale: "", violenceKey: "", violence: false, ref: true });
  for (const page of ["accueil", "outil", "soutenir", "groupe", "proche", "violences", "comprendre", "bibliographie", "securite", "recap"]) assert.equal(parseRoute("#" + page).page, page);
});

// ------------------------------------------------------------------------------------------------ brouillon
const draft = () => load(["core.js", "data.js", "context-catalog.js", "draft.js"], ["fresh", "validateDraft", "scales", "contextCatalog"]);

test("un brouillon vide se valide et garde la forme d'un état neuf", () => {
  const { fresh, validateDraft } = draft();
  const clean = validateDraft(JSON.parse(JSON.stringify(fresh())));
  assert.deepEqual(JSON.parse(JSON.stringify(clean)), JSON.parse(JSON.stringify(fresh())));
});

test("un brouillon invalide est refusé, et les textes sont tronqués à 6000 caractères", () => {
  const { fresh, validateDraft } = draft();
  assert.throws(() => validateDraft(null));
  assert.throws(() => validateDraft({ version: 3 }));
  assert.throws(() => validateDraft({ ...fresh(), options: [] }), "au moins une piste");
  assert.throws(() => validateDraft({ ...fresh(), options: Array.from({ length: 9 }, (_, i) => ({ id: i + 1, text: "" })) }), "au plus huit pistes");
  assert.throws(() => validateDraft({ ...fresh(), scale: "inconnu" }));
  assert.throws(() => validateDraft({ ...fresh(), context: "inconnu" }));
  const long = fresh();
  long.fields.situation = "x".repeat(7000);
  assert.equal(validateDraft(long).fields.situation.length, 6000);
});

test("un brouillon v1 est migré : contexte converti, relecture demandée, premier écran", () => {
  const { fresh, validateDraft } = draft();
  const old = { version: 1, scale: "shared", context: "work", step: 3, fields: { ...fresh().fields, situation: "Ancien texte." }, options: [{ id: 5, text: "Piste", plus: "", minus: "" }], chosen: 5, scaleChosen: true, safety: "safe" };
  const migrated = validateDraft(old);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.context, "other", "l'ancien « travail » entre personnes n'a pas de contexte équivalent");
  assert.equal(migrated.reviewContext, true);
  assert.equal(migrated.step, 0, "on revient au début pour relire");
  assert.equal(migrated.fields.situation, "Ancien texte.");
  assert.equal(migrated.chosen, 1, "l'identifiant de la piste choisie suit la renumérotation");
});

test("un ancien contexte « collègues » demande une relecture tant que le catalogue n'est pas en révision 3", () => {
  const { fresh, validateDraft } = draft();
  const base = { ...JSON.parse(JSON.stringify(fresh())), scale: "shared", context: "colleague", scaleChosen: true };
  assert.equal(validateDraft({ ...base, catalogRevision: 2 }).reviewContext, true);
  assert.equal(validateDraft({ ...base, catalogRevision: 3 }).reviewContext, false);
});
