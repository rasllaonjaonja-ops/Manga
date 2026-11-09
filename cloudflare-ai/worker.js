/**
 * ANIME TREND STUDIO V4 — passerelle IA gratuite
 * Déploiement : Cloudflare Workers + binding Workers AI (AI).
 * Fournisseurs facultatifs : Gemini et OpenRouter via secrets.
 * Aucun basculement vers une API payante.
 */
const MAX_BODY = 30000;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept",
  "Access-Control-Max-Age": "86400"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function promptFor(topic, sources) {
  return [
    "Tu es le rédacteur en chef de la page Facebook Manga, Animé et Actualités.",
    "Rédige en français naturel une publication Facebook précise, attractive et digne d'une page spécialisée.",
    "RÈGLES STRICTES : utilise uniquement les faits explicitement présents dans le sujet et les sources fournies.",
    "N'invente aucun nom, rôle, date, chiffre, casting, citation, studio, annonce ou détail.",
    "Ne prétends jamais avoir lu un article complet si seul un extrait est fourni.",
    "Distingue clairement les faits confirmés des hypothèses. Si les sources sont insuffisantes, reste bref et prudent.",
    "Conserve les liens sources fournis et attribue l'information au média indiqué.",
    "Structure : accroche spécifique, 2 à 4 paragraphes courts, question communautaire finale et 3 à 6 hashtags pertinents.",
    "Évite les formulations génériques, le sensationnalisme et les répétitions.",
    "\nSUJET :\n" + topic,
    "\nSOURCES FOURNIES :\n" + sources
  ].join("\n");
}
async function cloudflare(prompt, env) {
  if (!env.AI || typeof env.AI.run !== "function") throw new Error("Workers AI non configuré (binding AI absent).");
  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    messages: [
      { role: "system", content: "Tu es un rédacteur francophone spécialisé manga et anime. Respecte strictement les sources." },
      { role: "user", content: prompt }
    ],
    max_tokens: 900,
    temperature: 0.55
  });
  const text = result && (result.response || result.result && result.result.response);
  if (!text) throw new Error("Workers AI a renvoyé une réponse vide.");
  return { provider: "cloudflare", text };
}
async function gemini(prompt, env) {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini non configuré.");
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(env.GEMINI_API_KEY);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.55, maxOutputTokens: 1100 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Gemini HTTP " + response.status + ": " + (data.error && data.error.message || "requête refusée"));
  const text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.map(p => p.text || "").join("");
  if (!text) throw new Error("Gemini a renvoyé une réponse vide.");
  return { provider: "gemini", text };
}
async function openrouter(prompt, env) {
  if (!env.OPENROUTER_API_KEY) throw new Error("OpenRouter non configuré.");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.OPENROUTER_API_KEY,
      "Content-Type": "application/json",
      "HTTP-Referer": env.SITE_URL || "https://github.com/rasllaonjaonja-ops/Manga",
      "X-Title": "Anime Trend Studio V4"
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || "openrouter/free",
      messages: [
        { role: "system", content: "Tu es un rédacteur francophone spécialisé manga et anime. Respecte strictement les sources." },
        { role: "user", content: prompt }
      ],
      temperature: 0.55,
      max_tokens: 1100
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("OpenRouter HTTP " + response.status + ": " + (data.error && data.error.message || "requête refusée"));
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error("OpenRouter a renvoyé une réponse vide.");
  return { provider: "openrouter", text };
}
const RADAR_REPOSITORY = "rasllaonjaonja-ops/Manga";
const RADAR_WORKFLOW = "radar.yml";
const RADAR_BRANCH = "manga-trend-studio-v4-work";

// Déclenche le workflow existant sur la branche V4 sans modifier main ni V3.
// Le jeton est un secret Cloudflare nommé GITHUB_TOKEN (jamais une variable publique).
async function dispatchRadar(env) {
  if (!env.GITHUB_TOKEN) throw new Error("Secret GITHUB_TOKEN absent du Worker.");
  const endpoint = "https://api.github.com/repos/" + RADAR_REPOSITORY +
    "/actions/workflows/" + RADAR_WORKFLOW + "/dispatches";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Anime-Trend-Studio-V4",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ref: RADAR_BRANCH })
  });
  if (response.status !== 204) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error("GitHub workflow_dispatch HTTP " + response.status + (detail ? " : " + detail : ""));
  }
  console.log("Radar V4 déclenché avec succès sur " + RADAR_BRANCH + ".");
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(dispatchRadar(env).catch(error => {
      console.error("Échec du déclenchement automatique du Radar V4 :", error.message);
      throw error;
    }));
  },
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/health")) {
      return json({
        success: true,
        service: "Anime Trend Studio V4 AI Gateway",
        providers: {
          cloudflare: !!env.AI,
          gemini: !!env.GEMINI_API_KEY
        },
        assistant_route: true,
        assistant_method: "POST",
        model: "@cf/meta/llama-3.1-8b-instruct-fp8",
        facebook_publishing: false,
        billing: "Aucun fournisseur payant configuré par ce Worker."
      });
    }
    const assistantRoute = url.pathname.endsWith("/assistant");
    // Sonde sans consommation IA : distingue une route déployée d'une ancienne version.
    if (request.method === "GET" && assistantRoute) {
      return json({
        success: true,
        route: "/assistant",
        method: "POST",
        ready: !!env.AI,
        service: "Anime Trend Studio V4 AI Gateway",
        facebook_publishing: false
      });
    }
    if (request.method !== "POST" || (!url.pathname.endsWith("/generate") && !assistantRoute)) return json({ success: false, error: "Route inconnue." }, 404);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_BODY) return json({ success: false, error: "Requête trop volumineuse." }, 413);
    let body;
    try { body = await request.json(); } catch (_) { return json({ success: false, error: "JSON invalide." }, 400); }
    const message = assistantRoute && typeof body.message === "string" ? body.message.trim().slice(0, 8000) : "";
    const context = assistantRoute && body.context && typeof body.context === "object" ? JSON.stringify(body.context).slice(0, 14000) : "";
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 12000) : "";
    const sources = typeof body.sources === "string" ? body.sources.trim().slice(0, 16000) : "";
    if (assistantRoute && !message) return json({ success: false, error: "Le message est obligatoire." }, 400);
    if (!assistantRoute && !topic) return json({ success: false, error: "Le sujet est obligatoire." }, 400);
    const prompt = assistantRoute ? [
      "Tu es ANIME TREND INTELLIGENT ASSISTANT, copilote éditorial avancé du média Manga, Animé et Actualités.",
      "Réponds exclusivement en français naturel, professionnel, vivant, précis et directement exploitable.",
      "Tes missions : analyser les titres et extraits RSS transmis, hiérarchiser prudemment les sujets, rédiger et améliorer les publications Facebook, proposer des hashtags, contrôler la cohérence éditoriale, repérer les répétitions, préparer des concepts et prompts de visuels, proposer des réponses communautaires et organiser un planning.",
      "Utilise uniquement les informations présentes dans le message et le contexte fourni. Un titre, un lien ou un extrait RSS ne prouve pas le contenu intégral d'un article. Ne prétends jamais avoir ouvert un lien, consulté Internet, lu une page ou vérifié un fait si son contenu ne t'a pas été fourni.",
      "N'invente aucun nom, rôle, date, chiffre, annonce, casting, citation, studio, source ou détail d'intrigue. Distingue clairement fait confirmé, hypothèse et opinion. Si les sources sont insuffisantes ou contradictoires, signale-le et demande les éléments manquants.",
      "Pour une publication Facebook, propose une accroche honnête, un contexte fidèle, 2 à 4 paragraphes courts, une question communautaire pertinente et 3 à 6 hashtags utiles. Évite les répétitions, le sensationnalisme et les affirmations génériques.",
      "Pour un contrôle qualité, examine précision, clarté, source, date, cohérence, répétitions, ton et hashtags. Ne présente jamais un contrôle de forme comme une vérification factuelle.",
      "Pour les visuels, propose un concept original et un prompt sans supposer qu'une image a été générée. Respecte les droits d'auteur et signale les droits inconnus.",
      "Tu es un copilote de conseil : tu n'as pas accès aux commandes du navigateur, au stockage local ni aux API Facebook. N'affirme jamais avoir modifié, enregistré, planifié ou publié un contenu si tu ne l'as pas réellement fait.",
      "La publication Facebook reste strictement manuelle via Meta Business Suite. N'essaie jamais de publier, programmer ou contacter Facebook. Ne demande jamais de mot de passe, jeton ou clé secrète.",
      "\nMESSAGE UTILISATEUR :\n" + message,
      "\nCONTEXTE DU STUDIO :\n" + (context || "Aucun contexte disponible.")
    ].join("\n") : promptFor(topic, sources || "Aucune source fournie. Ne pas inventer de faits.");
    const providers = [
      ["Cloudflare Workers AI", () => cloudflare(prompt, env)],
      ["Gemini", () => gemini(prompt, env)]
    ];
    const errors = [];
    for (const [name, run] of providers) {
      try {
        const result = await run();
        return assistantRoute ? json({ success: true, provider: result.provider, answer: result.text, fallback: errors.length > 0, notices: errors }) : json({ success: true, provider: result.provider, article: result.text, fallback: errors.length > 0, notices: errors });
      } catch (error) {
        errors.push(name + " : " + String(error && error.message || error).slice(0, 220));
      }
    }
    return json({
      success: false,
      error: "Aucun moteur IA gratuit n'est disponible. Vérifiez le binding Cloudflare AI, les clés gratuites facultatives et les quotas. Aucun service payant n'a été appelé.",
      details: errors
    }, 503);
  }
};
