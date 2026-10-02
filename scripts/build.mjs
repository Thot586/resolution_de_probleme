import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFile(join(root, path), "utf8");
const pages = [
  "accueil",
  "outil",
  "soutenir",
  "proche",
  "violences",
  "comprendre",
  "securite",
  "bibliographie",
  "recap",
];

let html = await read("index.template.html");
const [baseCss, pathsCss, dataJs, workflowJs, appJs, pageParts] = await Promise.all([
  read("styles/base.css"),
  read("styles/paths.css"),
  read("scripts/data.js"),
  read("scripts/workflows.js"),
  read("scripts/app.js"),
  Promise.all(pages.map((name) => read(`pages/${name}.html`))),
]);
const pageHtml = pageParts.join("");
html = html.replace(
  "<!-- STYLES -->",
  () => `<style>\n${baseCss}\n${pathsCss}    </style>`,
);
html = html.replace(
  "<!-- PAGES -->",
  () => pageHtml,
);
html = html.replace(
  "<!-- SCRIPT -->",
  () => `<script>\n      "use strict";\n${dataJs}\n${workflowJs}\n${appJs}    </script>`,
);
if (html.includes("<!-- STYLES -->") || html.includes("<!-- PAGES -->") || html.includes("<!-- SCRIPT -->")) {
  throw new Error("Un emplacement du modèle n'a pas été rempli.");
}
await writeFile(join(root, "index.html"), html);
console.log("index.html généré à partir des modules.");
