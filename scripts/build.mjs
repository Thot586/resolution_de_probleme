import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFile(join(root, path), "utf8");
const pages = [
  "accueil",
  "outil",
  "soutenir",
  "groupe",
  "proche",
  "violences",
  "comprendre",
  "securite",
  "bibliographie",
  "recap",
];

let html = await read("index.template.html");
// Police des titres : sous-ensemble WOFF2 intégré en data: URI (aucune requête, aucun changement brusque au chargement).
const fontBase64 = (await readFile(join(root, "assets/fonts/BarlowCondensed-Bold.subset.woff2"))).toString("base64");
const [baseCss, pathsCss, dataJs, workflowJs, contextCatalogJs, decisionDiagramJs, groupJs, appJs, pageParts] = await Promise.all([
  read("styles/base.css"),
  read("styles/paths.css"),
  read("scripts/data.js"),
  read("scripts/workflows.js"),
  read("scripts/context-catalog.js"),
  read("scripts/decision-diagram.js"),
  read("scripts/group.js"),
  read("scripts/app.js"),
  Promise.all(pages.map((name) => read(`pages/${name}.html`))),
]);
const pageHtml = pageParts.join("");
html = html.replace(
  "<!-- STYLES -->",
  () => `<style>\n${baseCss.replace("__BARLOW_BOLD_WOFF2__", `data:font/woff2;base64,${fontBase64}`)}\n${pathsCss}    </style>`,
);
html = html.replace(
  "<!-- PAGES -->",
  () => pageHtml,
);
html = html.replace(
  "<!-- SCRIPT -->",
  () => `<script>\n      "use strict";\n${dataJs}\n${workflowJs}\n${contextCatalogJs}\n${decisionDiagramJs}\n${groupJs}\n${appJs}    </script>`,
);
if (html.includes("__BARLOW_BOLD_WOFF2__")) throw new Error("La police intégrée n'a pas été insérée.");
if (html.includes("<!-- STYLES -->") || html.includes("<!-- PAGES -->") || html.includes("<!-- SCRIPT -->")) {
  throw new Error("Un emplacement du modèle n'a pas été rempli.");
}
await writeFile(join(root, "index.html"), html);
console.log("index.html généré à partir des modules.");
