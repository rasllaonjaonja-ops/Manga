// Sauvegarde du code fourni par l'utilisateur le 2026-11-05.
// IMPORTANT : copie de référence uniquement. Ne pas déployer sans comparaison
// avec le Worker actif et validation du modèle Workers AI.
// Le code utilise @cf/meta/llama-3-8b-instruct ; le test précédent avait
// indiqué @cf/meta/llama-3.1-8b-instruct-fp8. Cette différence doit être vérifiée.

const SYSTEM_PROMPT = `
Tu es un rédacteur pour Manga Trend Studio.
MISSION :
Produire des contenus journalistiques professionnels, intéressants, précis et agréables à lire.

RÈGLES ÉDITORIALES :
Écris exclusivement en français.
Adopte un ton professionnel, vivant et naturel.
Donne un titre accrocheur mais honnête.
Présente le contexte avant ton analyse.
Distingue les faits, les hypothèses et les opinions.
N'invente jamais de dates, de citations ou de sources.
Si une information n'est pas confirmée, signale-le.
Ne prétends jamais avoir consulté une source non fournie.
Respecte les œuvres et leurs communautés de fans.

IDENTITÉ DE MARQUE :
Manga Trend Studio V4 – L'actualité manga et anime autrement
`;

const MODEL = "@cf/meta/llama-3-8b-instruct";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const send = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

    if (pathname === "/" && request.method === "GET") {
      return send({
        service: "Manga Trend Studio AI",
        version: "1.1",
        status: "online",
        identity: "Média manga et anime francophone",
        routes: ["/health", "/test-ai", "/generate"]
      });
    }

    if (pathname === "/health" && request.method === "GET") {
      return send({
        status: "ok",
        ai_binding: Boolean(env.AI),
        service: "Manga Trend Studio AI"
      });
    }

    if (pathname === "/test-ai") {
      try {
        if (!env.AI) throw new Error("La liaison Workers AI n'est pas configurée.");
        const result = await env.AI.run(MODEL, {
          messages: [{ role: "user", content: "Dis bonjour." }]
        });
        return send({ success: true, response: result.response });
      } catch (error) {
        return send({ success: false, error: error.message }, 500);
      }
    }

    if (pathname === "/generate" && request.method === "POST") {
      try {
        if (!env.AI) throw new Error("La liaison Workers AI n'est pas configurée.");

        let body;
        try {
          body = await request.json();
        } catch {
          return send({ success: false, error: "Le format JSON envoyé est invalide." }, 400);
        }

        if (!body.topic || typeof body.topic !== "string" || !body.topic.trim()) {
          return send({ success: false, error: "Veuillez fournir un sujet manga ou anime." }, 400);
        }

        const topic = body.topic.trim().slice(0, 500);
        const sources = typeof body.sources === "string" ? body.sources.slice(0, 5000) : "";

        const result = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: "Rédige un article éditorial professionnel sur ce sujet :\n" +
                topic +
                "\n\nSources et informations fournies :\n" +
                (sources || "Aucune source fournie.") +
                "\n\nNe présente pas les informations non vérifiées comme des faits."
            }
          ],
          max_tokens: 1400
        });

        return send({
          success: true,
          brand: "Manga Trend Studio V4",
          topic,
          article: result.response,
          verification: sources
            ? "Sources fournies à examiner, vérification externe non effectuée. Les faits doivent être vérifiés."
            : "Aucune source fournie : les faits doivent être vérifiés."
        });
      } catch (error) {
        return send({ success: false, error: error.message }, 500);
      }
    }

    return send({ success: false, error: "Route introuvable." }, 404);
  }
};