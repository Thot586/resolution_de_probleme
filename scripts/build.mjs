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
// Scripts : un seul <script> classique, dans cet ordre (chacun peut lire les noms définis avant lui).
// tests/unit.spec.cjs charge les mêmes fichiers dans le même ordre.
const scriptFiles = ["core", "data", "workflows", "context-catalog", "decision-diagram", "choice-group", "draft", "selectors", "group", "app"];
const [tokensCss, baseCss, pathsCss, componentsCss, scriptParts, pageParts] = await Promise.all([
  read("styles/tokens.css"),
  read("styles/base.css"),
  read("styles/paths.css"),
  read("styles/components.css"),
  Promise.all(scriptFiles.map((name) => read(`scripts/${name}.js`))),
  Promise.all(pages.map((name) => read(`pages/${name}.html`))),
]);
const pageHtml = pageParts.join("");
// Les commentaires des feuilles de style (≈ 29 Ko) restent dans les sources ; le fichier livré n'en garde que ceux qui commencent par « /*! »
// (la mention de licence de la police). Aucune chaîne CSS du projet ne contient « /* ».
const stripCssComments = (css) => css.replace(/\/\*(?!!)[\s\S]*?\*\//g, "").replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
const allCss = stripCssComments(`${tokensCss}\n${baseCss}\n${pathsCss}\n${componentsCss}`).replace("__BARLOW_BOLD_WOFF2__", fontUri);
html = html.replace(
  "<!-- STYLES -->",
  () => `<style>\n${allCss}    </style>`,
);
html = html.replace(
  "<!-- PAGES -->",
  () => pageHtml,
);
html = html.replace(
  "<!-- SCRIPT -->",
  () => `<script>\n      "use strict";\n${scriptParts.join("\n")}    </script>`,
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
