import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const required = [
  "index.html", "css/style.css", "js/app.js", "package.json",
  "data/sources.json", "data/latest-news.json", "scripts/collect-rss.mjs",
  "tests/collect.test.mjs", "tests/e2e.py"
];
const errors = [];
for (const file of required) {
  if (!fs.existsSync(file)) errors.push("Fichier requis manquant : " + file);
  else if (!fs.statSync(file).isFile()) errors.push("Le chemin requis n'est pas un fichier : " + file);
}

if (fs.existsSync("index.html") && fs.existsSync("js/app.js")) {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("js/app.js", "utf8");
  const css = fs.existsSync("css/style.css") ? fs.readFileSync("css/style.css", "utf8") : "";

  if (!/<html\b/i.test(html)) errors.push("index.html ne contient pas de balise html.");
  if (!/<meta\s+charset=/i.test(html)) errors.push("Encodage charset absent de index.html.");
  if (!/css\/style\.css/i.test(html)) errors.push("La feuille css/style.css n'est pas référencée.");
  if (!/js\/app\.js/i.test(html)) errors.push("Le script js/app.js n'est pas référencé.");
  if (!/js\/assistant\.js/i.test(html)) errors.push("Le script js/assistant.js n'est pas référencé.");
  if (/Anime Trend Studio 3\.0|ANIME TREND STUDIO V3/i.test(html)) errors.push("Une ancienne identité V3 est encore affichée dans index.html.");
  if (!css.includes("--font-size")) errors.push("La variable CSS --font-size est absente.");

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  const idSet = new Set(ids);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length) errors.push("Identifiants HTML en double : " + [...new Set(duplicates)].join(", "));

  const dynamicIds = new Set(["issueBanner", "issueText"]);
  const refs = [...app.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  const missing = [...new Set(refs.filter(id => !idSet.has(id) && !dynamicIds.has(id)))];
  if (missing.length) errors.push("Éléments référencés par JavaScript mais absents du HTML : " + missing.join(", "));

  const pageIds = new Set([...html.matchAll(/id=["']p-([^"']+)["']/g)].map(m => m[1]));
  const pageTargets = [
    ...[...html.matchAll(/data-page=["']([^"']+)["']/g)].map(m => m[1]),
    ...[...html.matchAll(/data-go=["']([^"']+)["']/g)].map(m => m[1])
  ];
  const badPages = [...new Set(pageTargets.filter(id => !pageIds.has(id)))];
  if (badPages.length) errors.push("Navigation vers des pages inexistantes : " + badPages.join(", "));

  const localRefs = [...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)]
    .map(m => m[1].split("?")[0].split("#")[0])
    .filter(ref => ref && !/^(?:https?:|data:|mailto:|tel:|javascript:)/i.test(ref));
  for (const ref of [...new Set(localRefs)]) {
    const clean = ref.replace(/^\.\//, "");
    if (!fs.existsSync(path.resolve(clean))) errors.push("Ressource locale introuvable : " + ref);
  }

  if (!app.trim()) errors.push("js/app.js est vide.");
  if (/\beval\s*\(/.test(app) || /\bnew\s+Function\s*\(/.test(app)) {
    errors.push("Usage interdit de eval() ou new Function() détecté dans js/app.js.");
  }
  if (!/localStorage/.test(app)) errors.push("Le stockage local attendu n'est pas détecté.");
  const syntax = spawnSync(process.execPath, ["--check", "js/app.js"], { encoding: "utf8" });
  if (syntax.status !== 0) errors.push("Erreur de syntaxe JavaScript : " + (syntax.stderr || syntax.stdout).trim());
}

for (const file of ["js/assistant.js", "cloudflare-ai/worker.js", "scripts/collect-rss.mjs", "scripts/diagnostics.mjs", "scripts/check-app.mjs"]) {
  if (!fs.existsSync(file)) continue;
  const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (syntax.status !== 0) errors.push("Erreur de syntaxe dans " + file + " : " + (syntax.stderr || syntax.stdout).trim());
}

try {
  const sources = JSON.parse(fs.readFileSync("data/sources.json", "utf8"));
  if (!Array.isArray(sources) || sources.length === 0) errors.push("data/sources.json doit contenir au moins une source.");
  else {
    const names = sources.map(x => x?.name).filter(Boolean);
    if (new Set(names).size !== names.length) errors.push("Les noms des sources RSS doivent être uniques.");
    for (const source of sources) if (!/^https:\/\//i.test(String(source?.url || ""))) errors.push("URL RSS HTTPS invalide : " + (source?.name || "source sans nom"));
  }
} catch (e) { errors.push("Impossible de lire data/sources.json : " + e.message); }

if (errors.length) {
  for (const error of errors) console.error("❌ " + error);
  console.error("Contrôle échoué : " + errors.length + " problème(s).");
  process.exit(1);
}
console.log("✅ Contrôle V4 réussi : fichiers, ressources locales, navigation, identifiants DOM, sources RSS et syntaxe vérifiés.");
