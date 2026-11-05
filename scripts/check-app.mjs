import fs from "node:fs";
import { spawnSync } from "node:child_process";

const required = [
  "index.html",
  "css/style.css",
  "js/app.js",
  "data/sources.json",
  "data/latest-news.json",
  "scripts/collect-rss.mjs"
];

const errors = [];
for (const file of required) {
  if (!fs.existsSync(file)) errors.push(\`Fichier requis manquant : \${file}\`);
  else if (!fs.statSync(file).isFile()) errors.push(\`Le chemin requis n'est pas un fichier : \${file}\`);
}

if (fs.existsSync("index.html")) {
  const html = fs.readFileSync("index.html", "utf8");
  if (!/<html\b/i.test(html)) errors.push("index.html ne contient pas de balise html.");
  if (!/<meta\s+charset=/i.test(html)) errors.push("Encodage charset absent de index.html.");
  if (!/css\/style\.css/i.test(html)) errors.push("La feuille css/style.css n'est pas référencée.");
  if (!/js\/app\.js/i.test(html)) errors.push("Le script js/app.js n'est pas référencé.");
}

if (fs.existsSync("js/app.js")) {
  const app = fs.readFileSync("js/app.js", "utf8");
  if (!app.trim()) errors.push("js/app.js est vide.");
  if (/\beval\s*\(/.test(app) || /\bnew\s+Function\s*\(/.test(app)) {
    errors.push("Usage interdit de eval() ou new Function() détecté dans js/app.js.");
  }
  if (!/localStorage/.test(app)) errors.push("Le stockage local attendu n'est pas détecté.");
  const syntax = spawnSync(process.execPath, ["--check", "js/app.js"], { encoding: "utf8" });
  if (syntax.status !== 0) errors.push("Erreur de syntaxe JavaScript : " + (syntax.stderr || syntax.stdout).trim());
}

if (fs.existsSync("scripts/collect-rss.mjs")) {
  const syntax = spawnSync(process.execPath, ["--check", "scripts/collect-rss.mjs"], { encoding: "utf8" });
  if (syntax.status !== 0) errors.push("Erreur de syntaxe du collecteur : " + (syntax.stderr || syntax.stdout).trim());
}

if (errors.length) {
  for (const error of errors) console.error("❌ " + error);
  console.error(\`Contrôle échoué : \${errors.length} problème(s).\`);
  process.exit(1);
}

console.log("✅ Contrôle statique réussi : fichiers requis, références locales et syntaxe JavaScript vérifiés.");
