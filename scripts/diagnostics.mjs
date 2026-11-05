// Diagnostic V4 : fichiers, JSON, scripts, cohérence du radar et fraîcheur des données.
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const problems = [];
const warnings = [];
const lines = [];
let configuredSourceCount = null;
const required = [
  "index.html", "css/style.css", "js/app.js", "package.json",
  "data/sources.json", "data/latest-news.json", "data/reports.json",
  "scripts/collect-rss.mjs", "scripts/diagnostics.mjs", "scripts/check-app.mjs",
  "tests/collect.test.mjs", "tests/e2e.py",
  ".github/workflows/radar.yml", ".github/workflows/diagnostics.yml"
];
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
  catch { problems.push(`Erreur de syntaxe : ${file}`); }
}
try {
  const sources = JSON.parse(await fs.readFile("data/sources.json", "utf8"));
  if (!Array.isArray(sources) || !sources.length) problems.push("Aucune source RSS configurée.");
  else { configuredSourceCount = sources.length; lines.push(`ℹ️ Sources RSS configurées : ${sources.length}.`); }
  const news = JSON.parse(await fs.readFile("data/latest-news.json", "utf8"));
  const items = Array.isArray(news.items) ? news.items : [];
  if (Number(news.count) !== items.length) problems.push(`Le compteur du radar (${news.count}) ne correspond pas aux données (${items.length}).`);
  if (items.some(x => !x || typeof x.title !== "string" || !/^https?:\/\//i.test(String(x.url || "")))) problems.push("Un article du radar a un titre ou un lien invalide.");
  if (items.some(x => x.summaryIsExcerpt !== true)) problems.push("Un article du radar n'est pas marqué comme extrait RSS.");
  if (news.updatedAt) {
    const stamp = Date.parse(news.updatedAt);
    if (Number.isNaN(stamp)) problems.push("La date de mise à jour du radar est invalide.");
    else {
      const ageH = Math.max(0, Math.round((Date.now() - stamp) / 3600000));
      lines.push(`ℹ️ Radar : ${items.length} article(s), mis à jour il y a ${ageH} h.`);
      if (ageH > 12) problems.push(`Radar non mis à jour depuis ${ageH} h (cycle attendu toutes les 5 h).`);
    }
  } else warnings.push("Aucune collecte RSS enregistrée pour le moment.");
  lines.push("✅ Articles contrôlés : titres, liens et indicateurs d'extrait RSS.");
} catch { /* erreurs JSON déjà signalées */ }

try {
  const reports = JSON.parse(await fs.readFile("data/reports.json", "utf8"));
  const latest = Array.isArray(reports.runs) ? reports.runs[0] : null;
  if (latest) {
    if (configuredSourceCount !== null && Number(latest.sourcesTotal) !== configuredSourceCount) {
      warnings.push(`Le dernier rapport concerne ${latest.sourcesTotal} source(s), mais la configuration actuelle en contient ${configuredSourceCount}. Relancez le radar pour actualiser ce rapport.`);
    } else {
      if (latest.status !== "ok") warnings.push(`Dernière collecte RSS : statut ${latest.status} (${latest.sourcesOk}/${latest.sourcesTotal} flux disponibles).`);
      if (Array.isArray(latest.errors) && latest.errors.length) warnings.push(...latest.errors.map(e => `Source ${e.source} : ${e.message}`));
    }
  }
} catch { /* erreurs JSON déjà signalées */ }

const summary = [
  "## Diagnostic Anime Trend Studio V4", "",
  ...lines.map(l => `- ${l}`),
  ...warnings.map(w => `- ⚠️ ${w}`), "",
  problems.length ? "### Résultat : problèmes détectés" : "### Résultat : aucun problème bloquant détecté",
  ...problems.map(p => `- ❌ ${p}`)
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
if (problems.length) process.exit(1);
