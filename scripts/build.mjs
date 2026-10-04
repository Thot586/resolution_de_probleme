import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// Fins de ligne normalisées en LF : le même index.html sur toutes les plates-formes (le dépôt est en CRLF sous Windows).
const read = async (path) => (await readFile(join(root, path), "utf8")).replace(/\r\n/g, "\n");
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
// Police des titres, logo et icône : intégrés en data: URI (aucune requête, aucun changement brusque au chargement).
const dataUri = async (path, type) => `data:${type};base64,${(await readFile(join(root, path))).toString("base64")}`;
const fontUri = await dataUri("assets/fonts/BarlowCondensed-Bold.subset.woff2", "font/woff2");
const logoUri = await dataUri("assets/trimobe-logo-176.jpeg", "image/jpeg");
const faviconUri = await dataUri("assets/trimobe-logo-64.jpeg", "image/jpeg");
const [tokensCss, baseCss, pathsCss, componentsCss, dataJs, workflowJs, contextCatalogJs, decisionDiagramJs, choiceGroupJs, groupJs, appJs, pageParts] = await Promise.all([
  read("styles/tokens.css"),
  read("styles/base.css"),
  read("styles/paths.css"),
  read("styles/components.css"),
  read("scripts/data.js"),
  read("scripts/workflows.js"),
  read("scripts/context-catalog.js"),
  read("scripts/decision-diagram.js"),
  read("scripts/choice-group.js"),
  read("scripts/group.js"),
  read("scripts/app.js"),
  Promise.all(pages.map((name) => read(`pages/${name}.html`))),
]);
const pageHtml = pageParts.join("");
html = html.replace(
  "<!-- STYLES -->",
  () => `<style>\n${tokensCss}\n${baseCss.replace("__BARLOW_BOLD_WOFF2__", fontUri)}\n${pathsCss}\n${componentsCss}    </style>`,
);
html = html.replace(
  "<!-- PAGES -->",
  () => pageHtml,
);
html = html.replace(
  "<!-- SCRIPT -->",
  () => `<script>\n      "use strict";\n${dataJs}\n${workflowJs}\n${contextCatalogJs}\n${decisionDiagramJs}\n${choiceGroupJs}\n${groupJs}\n${appJs}    </script>`,
);
html = html.replaceAll("__LOGO_DATA_URI__", logoUri).replaceAll("__FAVICON_DATA_URI__", faviconUri);
// Typographie : une flèche ne reste jamais seule en début de ligne (espace insécable avant « → » et « ↗ », après « ← »).
html = html.replace(/ ([→↗])/g, " $1").replace(/([←]) /g, "$1 ");
if (/__BARLOW_BOLD_WOFF2__|__LOGO_DATA_URI__|__FAVICON_DATA_URI__/.test(html)) throw new Error("Une ressource intégrée n'a pas été insérée.");
if (html.includes("<!-- STYLES -->") || html.includes("<!-- PAGES -->") || html.includes("<!-- SCRIPT -->")) {
  throw new Error("Un emplacement du modèle n'a pas été rempli.");
}
await writeFile(join(root, "index.html"), html);
console.log("index.html généré à partir des modules.");
