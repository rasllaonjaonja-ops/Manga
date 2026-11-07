# Passerelle IA Manga Trend Studio V4

## Déploiement du Worker

Le code de cette passerelle est dans ce dossier. Le déploiement est volontairement séparé du site Pages : modifier le Studio ne met pas automatiquement à jour le Worker Cloudflare.

### Préparer les secrets GitHub

Dans le dépôt GitHub, ouvrir **Settings → Secrets and variables → Actions**, puis créer ces deux secrets :

- `CLOUDFLARE_API_TOKEN` : jeton Cloudflare autorisé à déployer des Workers.
- `CLOUDFLARE_ACCOUNT_ID` : identifiant du compte Cloudflare.

Ne jamais inscrire ces valeurs dans un fichier du dépôt, dans le Studio ou dans une conversation.

### Lancer le déploiement

1. Ouvrir l'onglet **Actions** du dépôt.
2. Choisir **Deploy Manga Trend Studio V4 AI Worker**.
3. Cliquer sur **Run workflow** et sélectionner `manga-trend-studio-v4-work`.
4. Attendre le résultat du déploiement et les deux vérifications HTTP.

Le workflow déploie uniquement le Worker déclaré dans `wrangler.toml`. Il ne modifie ni V3, ni `main`, ni la publication Facebook.

### Vérifier sans consommer de génération IA

- `GET /health` indique si le binding Cloudflare AI est présent.
- `GET /assistant` vérifie que la route de l'assistant est déployée, sans lancer de génération.
- `POST /assistant` est la route utilisée par l'interface pour demander une réponse IA.

Le modèle principal configuré est `@cf/meta/llama-3.1-8b-instruct-fp8`. Gemini reste un secours facultatif qui nécessite une clé API stockée comme secret Cloudflare `GEMINI_API_KEY`. Aucun fournisseur payant n'est appelé par ce Worker.

La publication Facebook reste manuelle via Meta Business Suite.
