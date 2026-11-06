# ANIME TREND STUDIO V4

Studio éditorial local et gratuit pour la page **Manga, Animé et Actualités** : rédaction de publications, campagnes, visuels PNG, Reels, file éditoriale, calendrier, médiathèque et radar d'actualités RSS.

Aucune clé API à saisir dans l’interface. La génération IA passe par le Worker Cloudflare configuré ; ses quotas gratuits peuvent évoluer. Aucune publication automatique sur Facebook : les publications restent manuelles via Meta Business Suite.

## Structure du projet

```
index.html              Structure de l'application (pages, navigation)
css/style.css           Feuille de style unique (thème clair)
js/app.js               Logique de l'application (données, pages, exports)
assets/                 Illustrations et logo, locaux (aucune image externe)
data/
  sources.json          Sources RSS du radar
  latest-news.json      Actualités collectées (généré par GitHub Actions)
  reports.json          Journal des exécutions du radar (généré)
scripts/
  collect-rss.mjs       Collecte RSS/Atom, dédoublonnage, rapport
  check-app.mjs         Contrôle statique de l'application
  diagnostics.mjs       Diagnostic du dépôt
tests/
  collect.test.mjs      Tests du collecteur (npm test)
  e2e.py                Tests de bout en bout dans un navigateur
.github/workflows/
  radar.yml             Collecte RSS toutes les 5 heures
  deploy.yml            Déploiement historique V3 (main/master uniquement)
  diagnostics.yml       Diagnostic quotidien
```

## Installation sur GitHub

1. Créez le dépôt (par exemple `Manga_studio`) ou ouvrez le dépôt existant.
2. **Remplacez** le contenu du dépôt par celui de ce dossier. Supprimez les anciens fichiers qui ne sont plus dans le projet : `index-4.html`, et les anciennes images listées dans la section « Fichiers retirés » ci-dessous.
3. Settings → **Actions → General → Workflow permissions** : choisissez *Read and write permissions*.
4. Settings → **Pages** : Source = *GitHub Actions*.
5. Actions → **Anime Trend RSS Radar** → *Run workflow* pour une première collecte.
6. Ouvrez l'adresse GitHub Pages du dépôt.

### Éviter les conflits Git

- Faites toujours `git pull --rebase` avant de modifier le dépôt.
- `data/latest-news.json` et `data/reports.json` sont écrits par GitHub Actions : ne les modifiez pas à la main.
- Pour résoudre automatiquement les conflits sur ces deux fichiers : `git config merge.ours.driver true`.
- Les fins de ligne sont normalisées (`.gitattributes`) : pas de conflits dus à Windows.

## Utilisation sur Android

Ouvrez l'adresse GitHub Pages dans Chrome, puis utilisez le menu ☰ pour changer de page. Les exports (PNG, JSON, texte) passent par les téléchargements du navigateur : retrouvez-les dans *Téléchargements*.

## Contrôles et tests

- `npm run check` : contrôle statique (syntaxe, éléments manquants, navigation, échappements, attributs non échappés, `eval`, secrets). **Bloque le déploiement** en cas d'erreur.
- `npm test` : tests du collecteur RSS (décodage, dédoublonnage, flux partiels, échec total, configuration invalide).
- `python tests/e2e.py` : tests de bout en bout dans un navigateur réel (instructions dans l'en-tête du fichier).
- Dans l'application : **Réglages → Vérifier l'application** affiche un contrôle local du stockage, des exports, de l'interface et des données.

Les contrôles Node.js tournent dans le workflow de diagnostic V4. Les tests navigateur sont exécutés séparément par ce même workflow. Le déploiement historique GitHub Pages reste limité à main/master afin de protéger la V3.

## Connexion IA Cloudflare (branche V4)

- Dans **Réglages → Connexion IA Cloudflare**, vérifiez l'adresse du Worker puis utilisez **Tester la connexion IA**.
- Dans **Atelier de publications**, saisissez un sujet et, si possible, collez les sources ou faits vérifiés dans le champ dédié.
- Cliquez sur **Générer avec l'IA Cloudflare**. La requête transmet uniquement `topic` et `sources` au point d'accès `/generate`.
- Le test de connexion utilise `/health`. Le Worker doit autoriser les requêtes du site GitHub Pages avec CORS, y compris les requêtes `OPTIONS` nécessaires au POST JSON.
- Le texte généré reste modifiable. Relisez les informations et les sources avant de l'enregistrer. Aucune publication Facebook automatique n'est déclenchée.
- L'adresse du Worker est un point d'accès public, pas un secret. Ne placez aucun jeton privé dans le code HTML ou JavaScript public.

## Données et confidentialité

- Les créations sont enregistrées dans le **stockage local du navigateur**. Elles ne sont pas synchronisées entre appareils.
- Utilisez **Réglages / Exporter la sauvegarde JSON** pour conserver une copie régulièrement.
- Les visuels importés sont optimisés (1280 px, JPEG). Le stockage du navigateur est limité (environ 5 Mo) : exportez vos données avant d'ajouter beaucoup d'images.
- Une sauvegarde importée est validée avant remplacement ; les données invalides sont écartées.

## Calendrier éditorial

- Vues **Liste, Jour, Semaine, Mois**, avec navigation précédent / aujourd'hui / suivant. Touchez un jour du mois pour voir ses échéances.
- Chaque échéance a un titre, une date, une heure facultative, un format et un statut (Brouillon, À vérifier, Prêt, Programmé, Publié manuellement, Archivé).
- **Déplacer** change la date. Passer à « Publié manuellement » demande une confirmation : l'application ne publie rien elle-même.

## Radar d'actualités

- Sources actives : Anime News Network (flux général), MyAnimeList, Google Actualités, Anime Corner, Crunchyroll via Google Actualités, Anime Herald, Anime UK News, recherches ciblées d'annonces officielles (Aniplex, Toei, Shueisha) et Otaku USA via Google Actualités. Soit 9 flux configurés dans `data/sources.json`. La liste est affichée dans le Radar et le filtre des articles est construit automatiquement à partir des sources réellement présentes. Le flux Tokyo Otaku Mode a été retiré après des réponses HTTP 403 répétées. Seules les adresses HTTPS sont acceptées.
- Toutes les 5 heures, GitHub Actions collecte les titres, résumés, dates et liens. Les doublons (URL ou titre) sont retirés.
- Si aucun flux ne répond, les actualités précédentes sont conservées et le run est signalé en erreur.
- **Enregistrer** une actualité la place dans « Actualités enregistrées ». Elle reste « À vérifier » tant que vous n'avez pas consulté la source originale et confirmé l'information.
- **Créer un brouillon** n'est possible qu'après vérification ; le brouillon reprend le titre, la source et le lien, avec un espace pour votre commentaire original.
- Les articles ne sont pas recopiés intégralement : chaque actualité renvoie vers sa source. Vérifiez toujours l'information avant publication.

## Sources multiples et contrôle éditorial (V4)

- Le Radar lit neuf flux RSS publics, dont des médias spécialisés et des recherches ciblées vers des sites officiels/éditeurs. Les résultats des agrégateurs restent à ouvrir et à vérifier sur leur page d'origine.
- Les articles qui semblent couvrir le même événement sont regroupés ; les liens et noms de médias associés sont conservés dans le Radar, dans les actualités enregistrées et lors du transfert vers la rédaction.
- Le nombre de sources indique des publications repérées, pas nécessairement des confirmations indépendantes : plusieurs médias peuvent reprendre un même communiqué. Le contrôle humain reste obligatoire.
- Les résumés RSS sont des extraits. Le studio ne prétend pas avoir lu l'article intégral lorsqu'il n'est pas fourni dans le flux.
- Les images liées à un brouillon peuvent conserver leur origine (ChatGPT, Gemini, personnelle, média/officielle ou licence), leur crédit, leur URL de provenance et un statut de droits. « Officielle » ne signifie pas libre de réutilisation ; « droits inconnus » signifie ne pas publier avant vérification.

## Limites connues

- Aucune publication Facebook automatique : le studio prépare et exporte, vous publiez.
- Le studio ne génère pas d'images ni de vidéos : il produit des prompts, des scripts et des storyboards.
- Les GIF animés deviennent une image fixe lorsqu'ils sont importés.

## Fichiers retirés par rapport aux versions précédentes

`index-4.html`, `assets/card-auto.jpg`, `assets/card-create.jpg`, `assets/card-production.jpg`, `assets/hero-light.jpg`, `assets/quote-light.jpg`, `assets/recent-1.jpg` à `recent-4.jpg`, `assets/recent-generated-1.jpg` à `recent-generated-4.jpg`, `assets/sidebar-generated.jpg`, `assets/sidebar-light.jpg`.

## Publications : historique et projets (V4)

- L’onglet **Publications** sépare les contenus confirmés comme **Publiés manuellement** des contenus encore en projet (Brouillon, À vérifier, Prêt ou Archivé).
- Chaque carte permet de consulter le texte complet, de le copier, de faire évoluer son statut ou de supprimer le contenu.
- Le statut « Publié manuellement » exige une confirmation explicite : cette action ne publie rien sur Facebook.
- Les publications restent dans le stockage local du navigateur, comme les autres créations. Exportez régulièrement une sauvegarde JSON ; elles ne sont pas synchronisées entre appareils.


## Passerelle IA gratuite multi-moteurs (branche V4)

Le dossier `cloudflare-ai/` contient une passerelle compatible avec les routes déjà utilisées par l'application (`GET /health` et `POST /generate`). Elle tente dans cet ordre :
1. Cloudflare Workers AI (binding `AI`, sans clé API dans le navigateur) ;
2. Gemini API si le secret `GEMINI_API_KEY` est configuré ;
3. OpenRouter si le secret `OPENROUTER_API_KEY` est configuré.

Le basculement ne cherche que les fournisseurs configurés et n'appelle aucun fournisseur payant volontairement. Les quotas gratuits, l'éligibilité et les conditions des fournisseurs peuvent changer. Il n'existe aucune garantie de disponibilité continue. Claude n'est pas inclus comme API gratuite permanente ; il reste utilisable manuellement sur claude.ai.

### Déploiement requis une seule fois
Le Worker Cloudflare actuellement configuré dans l'application est hébergé séparément : modifier le dépôt GitHub ne le remplace pas automatiquement. Pour activer cette passerelle, déployez le contenu de `cloudflare-ai/worker.js` comme Worker, configurez le binding Workers AI nommé `AI`, puis ajoutez facultativement les secrets `GEMINI_API_KEY` et `OPENROUTER_API_KEY`. Vous pouvez ne configurer aucune clé facultative : Cloudflare AI seul sera utilisé.

Après déploiement, gardez la même adresse Worker dans Réglages V4 si vous remplacez le Worker existant. Testez `/health`, puis `/generate`. N'enregistrez jamais les clés API dans GitHub, dans `wrangler.toml`, dans `index.html` ou dans `js/app.js`. Le Worker renvoie le fournisseur réellement utilisé et les erreurs des moteurs précédents.
