// Collecte RSS/Atom du radar Anime Trend.
// Garanties :
// - si aucun flux n'est accessible, les anciennes données sont conservées (jamais écrasées par une liste vide) ;
// - déduplication par URL et par titre normalisé, après tri par pertinence ;
// - un rapport d'exécution est ajouté à data/reports.json, même en cas d'erreur ;
// - code de sortie 1 si aucun flux n'a répondu ou si une erreur inattendue survient.
// Variables d'environnement (pour les tests) : RADAR_SOURCES, RADAR_OUTPUT, RADAR_REPORTS, RADAR_ALLOW_HTTP=1.
import fs from "node:fs/promises";
import crypto from "node:crypto";

const SOURCES_FILE = process.env.RADAR_SOURCES || "data/sources.json";
const OUTPUT_FILE = process.env.RADAR_OUTPUT || "data/latest-news.json";
const REPORTS_FILE = process.env.RADAR_REPORTS || "data/reports.json";
const ALLOW_HTTP = process.env.RADAR_ALLOW_HTTP === "1";
const MAX_PER_SOURCE = 25;
const MAX_AGE_DAYS = 21;
const MAX_ITEMS = 100;
const MAX_SUMMARY_CHARS = 2000;
const MAX_REPORTS = 60;

export async function collect() {
  const startedAt = new Date();
  const errors = [];
  let status = "erreur";
  let okSources = 0;
  let sourcesTotal = 0;
  let articlesFound = 0;
  let articlesKept = null;

  try {
    const sources = await loadSources();
    sourcesTotal = sources.length;
    const sourceResults = await Promise.all(sources.map(s => readSource(s, errors)));
    okSources = sourceResults.filter(r => r.ok).length;
    const merged = sourceResults.flatMap(r => r.items);
    articlesFound = merged.length;

    if (okSources === 0) {
      status = "conserve";
    } else {
      const now = Date.now();
      const ranked = merged
        .filter(isRelevantNews)
        .filter(x => !x.publishedAt || (now - Date.parse(x.publishedAt)) <= MAX_AGE_DAYS * 86400000)
        .map(x => ({ ...x, score: rank(x) }))
        .sort((a, b) => b.score - a.score || Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
      // Regroupe les titres proches : plusieurs sources parlant du même sujet renforcent sa tendance,
      // sans créer plusieurs places artificielles dans le TOP 5.
      const items = clusterSimilar(ranked).slice(0, MAX_ITEMS);
      status = okSources === sources.length ? "ok" : "partiel";
      await fs.writeFile(OUTPUT_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), count: items.length, items }, null, 2) + "\n");
      articlesKept = items.length;
    }
  } catch (error) {
    errors.push({ source: "radar", message: error.message });
    status = "erreur";
  }

  const report = {
    runAt: startedAt.toISOString(),
    durationSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    status, sourcesTotal, sourcesOk: okSources, articlesFound, articlesKept, errors
  };
  await appendReport(report);

  const message = status === "conserve" || status === "erreur"
    ? `statut ${status} · données précédentes conservées`
    : `statut ${status} · ${okSources}/${sourcesTotal} flux · ${articlesKept} articles`;
  console.log(`Radar : ${message}.`);
  return { ok: status === "ok" || status === "partiel", status, report };
}

async function appendReport(report) {
  const reports = await readJson(REPORTS_FILE, { runs: [] });
  const runs = Array.isArray(reports.runs) ? reports.runs : [];
  reports.runs = [report, ...runs].slice(0, MAX_REPORTS);
  await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2) + "\n");
}

async function loadSources() {
  const raw = JSON.parse(await fs.readFile(SOURCES_FILE, "utf8"));
  if (!Array.isArray(raw)) throw new Error("sources.json doit contenir une liste.");
  const pattern = ALLOW_HTTP ? /^https?:\/\//i : /^https:\/\//i;
  const valid = raw.filter(s => s && typeof s.name === "string" && pattern.test(String(s.url || "")));
  if (valid.length !== raw.length) console.warn(`${raw.length - valid.length} source(s) ignorée(s) : nom ou URL manquant.`);
  if (valid.length === 0) throw new Error("aucune source valide.");
  return valid;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function readSource(source, errors) {
  try {
    const response = await fetch(source.url, {
      headers: { "user-agent": "AnimeTrendStudioRSS/3.0 (+GitHub Actions)" },
      signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const items = parseFeed(xml, source).slice(0, MAX_PER_SOURCE);
    if (items.length === 0) throw new Error("flux lu mais aucun article reconnu");
    return { ok: true, items };
  } catch (error) {
    console.warn(`Flux indisponible : ${source.name} — ${error.message}`);
    errors.push({ source: source.name, message: error.message });
    return { ok: false, items: [] };
  }
}

export function parseFeed(xml, source) {
  const chunks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  return chunks.map(block => {
    const title = clean(tag(block, "title"));
    const link = tag(block, "link") || (block.match(/<link[^>]+href=["']([^"']+)/i) || [])[1] || "";
    const guid = tag(block, "guid") || tag(block, "id") || link || title;
    const rawDate = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
    const parsed = rawDate ? new Date(rawDate) : null;
    const publishedAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
    const summary = clean(tag(block, "description") || tag(block, "summary") || tag(block, "content"));
    if (!title || !/^https?:\/\//i.test(link)) return null;
    return {
      id: crypto.createHash("sha1").update(String(guid)).digest("hex"),
      title, url: link, source: source.name, publishedAt,
      summary: summary.slice(0, MAX_SUMMARY_CHARS)
    };
  }).filter(Boolean);
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
  const match = block.match(re);
  if (match) return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  if (name === "link") {
    const attr = block.match(/<link[^>]+href=["']([^"']+)/i);
    return attr ? attr[1] : "";
  }
  return "";
}

// Décodage sûr : balises retirées, entités décodées, &amp; en dernier, puis nouvelle suppression des balises.
export function clean(value) {
  let s = String(value || "").replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const named = { nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">", hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
  s = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return named[e.toLowerCase()] ?? m;
  });
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/<[^>]+>/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

function normTitle(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function dedupe(list) {
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const item of list) {
    const url = item.url.split("#")[0];
    const title = normTitle(item.title);
    if (seenUrl.has(url) || (title && seenTitle.has(title))) continue;
    seenUrl.add(url);
    if (title) seenTitle.add(title);
    out.push(item);
  }
  return out;
}

function trendTokens(value) {
  const stop = new Set(["the","and","for","with","from","gets","get","new","anime","manga","de","des","les","une","un","du","la","le","to","of","on","in","a","an","is","by","as","its","their","this","that","reveals","revealed","reveal","unveils","unveiled","announced","announcement","adaptation","live","action","film","movie","teaser","trailer","promo","promotional","video","visual","cast","casting","director","voice","actor","actress","staff","main","additional","season","series","tv","arc","second","third","fourth","part","premiere","premieres","release","released","march","january","november","getting","receives","received","official","website"]);
  return normTitle(value).split(" ").filter(t => t.length > 2 && !stop.has(t));
}

function canonicalStoryText(value) {
  let text = normTitle(value);
  const aliases = [
    [/oshi ni amagami/g, "otaku vampire love bite"],
    [/watashi wo center ni suru to chikaimasu ka/g, "promise me the spotlight"],
    [/tensei shitara ken deshita/g, "reincarnated as a sword"],
    [/mahoutsukai no yoru/g, "witch on the holy night"]
  ];
  for (const [pattern, canonical] of aliases) text = text.replace(pattern, canonical);
  return text;
}

function storyText(item) { return String(item.title || "") + " " + String(item.summary || ""); }

function eventKind(item) {
  // Le titre, et non le résumé, détermine l'annonce principale.
  const text = normTitle(item.title || "");
  if (/\b(cast|casting|director|voice actor|voice actress)\b/.test(text)) return "cast";
  if (/\b(trailer|teaser|promo|promotional|pv)\b/.test(text)) return "promo";
  if (/\b(final arc|climax|ends|ending|final chapter)\b/.test(text)) return "ending";
  if (/\b(adaptation|adapted|gets anime|gets tv anime|live action|movie adaptation|film adaptation)\b/.test(text)) return "adaptation";
  if (/\b(premiere|premieres|release date|opens in|debut)\b/.test(text)) return "release";
  return "general";
}

function titleSimilarity(a, b) {
  const aa = new Set(trendTokens(a)), bb = new Set(trendTokens(b));
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const token of aa) if (bb.has(token)) common++;
  return common / (aa.size + bb.size - common);
}

export function isRelevantNews(item) {
  if (item.source !== "Google Actualités" && item.source !== "Crunchyroll (Google Actualités)") return true;
  const title = normTitle(item.title || ""), combined = title + " " + normTitle(item.summary || "");
  const offTopic = /\b(halloween|figurine|figurines|soldes|reduction|reductions|promo|promotion|condamne|condamnes|pilleurs|tronconneuse|defile|deguise|fete|service civique|seniors|librairie momie|parassy|guerigny|place coquilleau)\b/;
  if (offTopic.test(combined)) return false;
  const explicitTopic = /\b(manga|mangas|anime|animes|shonen|seinen|shojo|manhwa|webtoon|light novel|otaku|crunchyroll|myanimelist|animenewsnetwork)\b/;
  if (!explicitTopic.test(combined)) return false;
  if (/\banime les rues\b|\banime la fete\b/.test(title)) return false;
  // Écarte les fiches d'épisodes, critiques et catalogues issus de Google News.
  if (/\bepisode\s*#?\s*\d+\b|\bcritiques?\b|\bavis sur\b|\bfigurines?\b|\bprecommandes?\b/.test(combined)) return false;
  return true;
}

export function clusterSimilar(list) {
  const groups = [];
  for (const item of list) {
    let match = null, best = 0;
    const text = storyText(item), kind = eventKind(item);
    for (const group of groups) {
      if (kind !== group.kind) continue;
      const similarity = titleSimilarity(canonicalStoryText(text), canonicalStoryText(storyText(group.item)));
      if (similarity > best) { best = similarity; match = group; }
    }
    if (match && best >= 0.24) {
      if (item.source && !match.sources.includes(item.source)) match.sources.push(item.source);
      match.articles.push({ title: item.title, source: item.source || "Source", url: item.url, summary: item.summary || "", publishedAt: item.publishedAt || null });
      if ((item.summary || "").length > (match.item.summary || "").length || (item.score || 0) > (match.item.score || 0)) match.item = item;
      if (item.publishedAt && (!match.latest || Date.parse(item.publishedAt) > Date.parse(match.latest))) match.latest = item.publishedAt;
    } else {
      groups.push({ item, kind, sources: item.source ? [item.source] : [], articles: [{ title: item.title, source: item.source || "Source", url: item.url, summary: item.summary || "", publishedAt: item.publishedAt || null }], latest: item.publishedAt || null });
    }
  }
  return groups.map(group => ({
    ...group.item, publishedAt: group.latest || group.item.publishedAt || null,
    trendSources: group.sources, trendArticles: group.articles,
    trendSourceCount: group.sources.length || 1,
    trendScore: Math.round(((group.item.score || 0) + Math.max(0, group.sources.length - 1) * 5) * 10) / 10
  })).sort((a,b) => b.trendScore-a.trendScore || Date.parse(b.publishedAt || 0)-Date.parse(a.publishedAt || 0));
}
function rank(item) {
  const text = (item.title + " " + item.summary).toLowerCase();
  let score = 0;
  for (const [word, points] of Object.entries({
    "anime": 3, "manga": 3, "trailer": 4, "teaser": 4, "season": 3, "saison": 3,
    "film": 2, "movie": 2, "announced": 3, "annonce": 3, "release": 2, "date": 2,
    "adaptation": 3, "new": 1, "nouveau": 1, "final": 2, "ending": 2, "cast": 2
  })) if (text.includes(word)) score += points;
  if (item.publishedAt) {
    const ageHours = Math.max(0, (Date.now() - Date.parse(item.publishedAt)) / 3600000);
    score += Math.max(0, 10 - ageHours / 12);
  }
  return Math.round(score * 10) / 10;
}

// Exécution directe uniquement (pas lors d'un import par les tests).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("collect-rss.mjs")) {
  const result = await collect();
  process.exit(result.ok ? 0 : 1);
}
