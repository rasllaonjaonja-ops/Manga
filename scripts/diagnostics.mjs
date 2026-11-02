// Diagnostic du dépôt : fichiers requis, JSON valides, syntaxe des scripts, fraîcheur du radar.
// Ne lit et n'affiche aucun secret. Le résumé est écrit dans GITHUB_STEP_SUMMARY si disponible.
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const problems = [];
const lines = [];

const required = ["index.html", "css/style.css", "js/app.js", "package.json", "data/sources.json", "data/latest-news.json",
  "data/reports.json", "scripts/collect-rss.mjs", ".github/workflows/radar.yml", ".github/workflows/deploy.yml"];
for (const file of required) {
  try { await fs.access(file); lines.push(`✅ Fichier présent : ${file}`); }
  catch { problems.push(`Fichier manquant : ${file}`); }
}

for (const file of ["data/sources.json", "data/latest-news.json", "data/reports.json", "package.json"]) {
  try { JSON.parse(await fs.readFile(file, "utf8")); lines.push(`✅ JSON valide : ${file}`); }
  catch (e) { problems.push(`JSON invalide : ${file} (${e.message})`); }
}

for (const file of ["scripts/collect-rss.mjs", "scripts/diagnostics.mjs", "scripts/check-app.mjs"]) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); lines.push(`✅ Syntaxe correcte : ${file}`); }
  catch (e) { problems.push(`Erreur de syntaxe : ${file}`); }
}

try {
  const news = JSON.parse(await fs.readFile("data/latest-news.json", "utf8"));
  if (news.updatedAt) {
    const ageH = Math.round((Date.now() - Date.parse(news.updatedAt)) / 3600000);
    lines.push(`ℹ️ Radar : ${news.items?.length ?? 0} article(s), mis à jour il y a ${ageH} h.`);
    if (ageH > 12) problems.push(`Radar non mis à jour depuis ${ageH} h (cycle attendu toutes les 5 h).`);
  } else {
    lines.push("ℹ️ Radar : aucune collecte enregistrée pour le moment.");
  }
} catch { /* déjà signalé plus haut */ }

const summary = [
  "## Diagnostic Anime Trend Studio V3", "",
  ...lines.map(l => `- ${l}`), "",
  problems.length ? "### Points à corriger" : "### Résultat : aucun problème détecté",
  ...problems.map(p => `- ❌ ${p}`)
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
if (problems.length) process.exit(1);
