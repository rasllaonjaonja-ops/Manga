# ANIME TREND STUDIO V3

Studio éditorial local et gratuit pour la page **Manga, Animé et Actualités** : rédaction de publications, campagnes, visuels PNG, Reels, file éditoriale, calendrier, médiathèque et radar d'actualités RSS.

Aucune clé API, aucun serveur payant, aucune publication automatique sur Facebook. Les publications restent manuelles (Meta Business Suite).

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
  deploy.yml            Contrôle, tests puis publication GitHub Pages
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

Ces contrôles tournent aussi dans les workflows : le déploiement ne publie rien si un contrôle échoue.

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

- Sources : Anime News Network, MyAnimeList, Google Actualités (manga et anime), modifiables dans `data/sources.json`. Seules les adresses HTTPS sont acceptées.
- Toutes les 5 heures, GitHub Actions collecte les titres, résumés, dates et liens. Les doublons (URL ou titre) sont retirés.
- Si aucun flux ne répond, les actualités précédentes sont conservées et le run est signalé en erreur.
- **Enregistrer** une actualité la place dans « Actualités enregistrées ». Elle reste « À vérifier » tant que vous n'avez pas consulté la source originale et confirmé l'information.
- **Créer un brouillon** n'est possible qu'après vérification ; le brouillon reprend le titre, la source et le lien, avec un espace pour votre commentaire original.
- Les articles ne sont pas recopiés intégralement : chaque actualité renvoie vers sa source. Vérifiez toujours l'information avant publication.

## Limites connues

- Aucune publication Facebook automatique : le studio prépare et exporte, vous publiez.
- Le studio ne génère pas d'images ni de vidéos : il produit des prompts, des scripts et des storyboards.
- Les GIF animés deviennent une image fixe lorsqu'ils sont importés.

## Fichiers retirés par rapport aux versions précédentes

`index-4.html`, `assets/card-auto.jpg`, `assets/card-create.jpg`, `assets/card-production.jpg`, `assets/hero-light.jpg`, `assets/quote-light.jpg`, `assets/recent-1.jpg` à `recent-4.jpg`, `assets/recent-generated-1.jpg` à `recent-generated-4.jpg`, `assets/sidebar-generated.jpg`, `assets/sidebar-light.jpg`.
