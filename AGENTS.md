# AGENTS.md — CV web statique d'Olivier Dutoit

Instructions pour tout agent (Claude Code, Copilot…) qui travaille sur ce dépôt.

## Objectif

Publier un **CV en ligne sur une seule page HTML statique**, sémantique, responsive, accessible, bien référencée et rapide. Le projet suit le sujet [fabrice1618/cv_html_statique](https://github.com/fabrice1618/cv_html_statique). Il est noté selon la grille de [`grille_evaluation.md`](grille_evaluation.md) (copie de `prompt.md` du dépôt du sujet) : contenu, HTML sémantique, responsive, accessibilité, SEO, performance, validation, publication, auto-évaluation, confidentialité et qualité du dépôt. **Relire cette grille avant chaque étape importante** et viser le niveau 4 de chaque critère.

## Source du contenu

- `cv_base.md` est la **source de vérité** du contenu. Le site en est une mise en forme, jamais une réécriture.
- Ne rien inventer (dates, chiffres, intitulés). Si une info manque, demander.
- Le CV web est une lecture rapide : garder 3–4 expériences/projets mis en avant, formulés par résultats concrets.

## Confidentialité (non négociable)

`cv_base.md` contient des données personnelles qui **ne doivent jamais apparaître sur le site** ni dans le HTML, les commentaires ou les métadonnées :

- pas de numéro de téléphone ;
- pas d'adresse e-mail ;
- pas d'adresse postale (la ville/région suffit au maximum) ;
- pas d'âge ni de date de naissance.

Contact : **lien vers le profil GitHub uniquement** (texte explicite, ex. « Voir mon profil GitHub »). LinkedIn et le portfolio peuvent être liés.

## Stack et environnement

- **Site 100 % statique** : aucun backend, aucune étape de build, aucun Node/npm, **aucune dépendance externe** (pas de CDN, pas de webfont). On sert le dossier et ça marche.
- **HTML5** écrit à la main, **CSS local** dans `css/style.css` (CSS ordinaire, variables de thème dans `:root`). Pas de framework JS ni CSS.
- JavaScript dans `js/app.js`, chargé avec `defer`, en **amélioration progressive**. Il gère : la bascule « CV classique » (mémorisée dans `localStorage`, forcée par `?classique` dans l'URL), le passage en vue classique à l'impression, la navigation par portails (portail bleu au clic, portail orange à l'arrivée), la barre de progression, la chambre courante dans la nav (`aria-current`) et la voix du narrateur. Sans JS, toutes les chambres restent affichées et lisibles et le lien PDF fonctionne : le contenu ne dépend jamais du script.
- **Export PDF** : `cv-olivier-dutoit.pdf` est généré depuis la vue classique (voir « Régénérer le PDF »). Le régénérer et le commiter à chaque modification du contenu.

### Organisation du CSS

- `css/style.css` est le seul fichier de style, dans cet ordre : variables `:root` (+ thème sombre), base, outils fixes, en-tête, chambres, composants, accueil, portails, final spatial, pied de page, points de rupture, couche JS (`.js`), vue classique (`html.classic`), préférences (`prefers-reduced-motion`, `forced-colors`), impression.
- Toute couleur de composant passe par une variable. Exceptions assumées : décor (lune, Terre, métal, fenêtre d'observation) et vues à travers les portails.
- La vue classique et `@media print` doivent rester fonctionnelles : CV sur une colonne, sans décor.

### Arborescence

```
.
├─ index.html            # la page (seule page du site)
├─ css/style.css         # thème, composants, vue classique, impression
├─ js/app.js             # portails, narrateur, vue classique (amélioration progressive)
├─ cv-olivier-dutoit.pdf # export PDF généré depuis la vue classique
├─ cv_base.md            # contenu source
├─ grille_evaluation.md  # grille de notation du sujet
├─ robots.txt
├─ sitemap.xml
├─ AGENTS.md
├─ CLAUDE.md             # charge AGENTS.md
└─ README.md             # consignes + section « Auto-évaluation »
```

### Tester en local

Servir le dossier (`python -m http.server 8000`) puis ouvrir http://localhost:8000. Aucune commande de build.

### Régénérer le PDF

Serveur local lancé, depuis la racine du dépôt (PowerShell) :

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=3000 --print-to-pdf="$PWD\cv-olivier-dutoit.pdf" "http://localhost:8000/?classique"
```

Vérifier ensuite que le PDF ne contient ni e-mail, ni téléphone, ni adresse.

## Règles HTML

- `<html lang="fr">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- `<title>` descriptif (ex. « Olivier Dutoit — CV, alternant BTS SIO SISR ») et `<meta name="description">` pertinente.
- Structure : `header` → `main` (une `section` par bloc, chacune avec son titre) → `footer`. `nav` si ancres internes.
- **Un seul `<h1>`** (le nom). Hiérarchie sans saut : `h2` pour les sections, `h3` pour les entrées (poste, projet, diplôme).
- Balises adaptées : `ul/li` pour les listes, `time datetime="2025-09"` pour les dates, `article` pour une expérience ou un projet, `address` n'est **pas** utilisé (pas de coordonnées).
- Images : `alt` descriptif (ou `alt=""` si décorative), `width`/`height` renseignés, `loading="lazy"` hors premier écran.
- Liens : textes explicites (jamais « cliquez ici »), `rel="noopener noreferrer"` sur les `target="_blank"`.
- Indentation 2 espaces, attributs entre guillemets doubles, HTML valide W3C.

## Direction artistique : chambres de test d'un laboratoire, fin dans l'espace

Hommage à l'esthétique des jeux de puzzle à portails (Portal 2) : le CV est un parcours de **chambres de test** numérotées 00 → 06. On arrive par l'ascenseur (accueil, chambre 00), on traverse une chambre par section du CV, puis le plafond de la dernière chambre est éventré et on sort **sur la Lune**, la Terre dans le ciel (contact, chambre 06). Le décor est poussé vers le réalisme, mais reste un décor : le CV doit rester lisible et sérieux.

**Hommage, pas copie** : aucun logo, nom de marque, nom de personnage, réplique, texture ou son repris du jeu (pas de logo de l'entreprise fictive, pas de nom d'IA, pas de cube à cœur, pas de citation). Pictogrammes, textes du narrateur et formes sont originaux. Le pied de page mentionne l'hommage et l'absence d'affiliation.

### Palette (dans `:root` de `css/style.css`)

| Token | Valeur | Rôle |
|---|---|---|
| `--wall`, `--wall-seam`, `--wall-bevel` | `#e4e7ea`, joint sombre, biseau blanc | panneaux muraux de 96 px (`--tile`) avec joint, biseau et ombrage |
| `--surface`, `--surface-2` | `#fff`, `#f3f5f6` | plaques vissées (`.panel`), étiquettes |
| `--line` | `#c9d0d5` | bordures |
| `--ink`, `--ink-muted` | `#1d2226`, `#4f5961` | texte (≥ 4,5:1 sur `wall` et `surface`) |
| `--strip`, `--metal-1`, `--metal-2` | `#24292d`, `#2b3034`, `#171a1d` | en-tête, grilles de sol, cadres |
| `--blue`, `--orange` | `#0b63b6`, `#a84a00` | accents **texte** (liens, étiquettes) |
| `--btn-blue`, `--btn-orange` | mêmes valeurs, fixes | fonds de boutons : texte blanc ≥ 4,5:1 dans tous les thèmes |
| `--portal-blue`, `--portal-orange` | `#27a7ff`, `#ff9d2e` | lumière des portails, champs d'énergie : **jamais de texte** |
| `--space`, `--space-2`, `--space-ink` | `#03050a`, `#0b1122`, `#eef2f7` | final spatial |

Thème sombre (`prefers-color-scheme`) : « aile désaffectée » du labo, panneaux sombres, accents texte éclaircis. La vue classique force le thème clair.

### Composants

- **Chambre** (`section.chamber`) : champ d'énergie bleu animé en haut (`::before`), grille de sol métallique en bas (`::after`).
- **Panneau de chambre** (`.chamber-head`) : plaque rétroéclairée avec grand numéro fin (`.chamber-num`), kicker « Chambre de test 0X sur 06 », `h2`, barre de progression (`.sign-bar`, variable `--p`) et pictogrammes (`.sign-icons`).
- **Plaques** (`.panel`) : cartes blanches à deux vis ; compétences en étiquettes (`.chips`), expériences en `article.card`, projets en `.card-list`, formation en `.timeline` numérotée.
- **Portails** (`.portal` > `.portal-view` + SVG `<use href="#portal-rim">`) : bord en flamme par filtre SVG (`#f-rim` : turbulence animée, double halo), lumière projetée sur le mur, vue de l'autre côté avec récursion (on aperçoit l'autre portail au fond), montés en perspective sur les murs ; un portail est posé au sol sur la Lune.
- **Scène de niveau** (`.level-scene.level-<id>`, `aria-hidden`) en bas de chaque chambre 01–05 : une énigme puis une porte de sortie (`.exit`) reliée par un fil indicateur (`.wire`). 01 cube et bouton, 02 pont de lumière, 03 laser et récepteur, 04 plaque de propulsion et trajectoire, 05 gels. Le HTML/CSS montre l'état **résolu** ; avec JS, `.js .level-scene:not(.is-cleared)` montre l'état non résolu et `app.js` ajoute `is-cleared` quand la scène est visible à 80 % (porte qui s'ouvre, fil orange, voix « Niveau 0X terminé »). Une nouvelle énigme : un bloc d'éléments décoratifs + sa règle « non résolu ».
- **Entrée de niveau** : avec JS et sans `prefers-reduced-motion`, les plaques se déplient du mur quand la chambre entre à l'écran (`.chamber.is-in`). Jamais en vue classique ni à l'impression.
- **Accueil** : fenêtre de salle d'observation, deux portails face à face, cube au sol.
- **Final** : brèche dans le plafond, étoiles sur deux couches, Terre éclairée de côté, cube à la dérive, sol lunaire SVG à cratères.
- **Narrateur** (JS, ≥ 900 px, `aria-hidden`) : une phrase originale par chambre (`data-annonce`), ton pince-sans-rire, effacée après 7 s et en bas de page.
- **Outils fixes** (`.view-tools`, en haut à gauche) : « Afficher le CV classique » (bouton `aria-pressed`, masqué sans JS) et « Exporter en PDF » (lien `download`).

### Typographie

Police système sans-serif, texte ≥ 16 px. Numéros de chambre en graisse 200, titres en 650–800.

### Accessibilité propre au style

- Aucune couleur `--portal-*` ne porte du texte. Ne pas éclaircir `--ink-muted`, `--blue`, `--orange`.
- Focus : contour `--blue` 2 px + halo ; contour blanc sur fonds sombres (en-tête, espace).
- Animations d'ambiance (champs, portails, étoiles, cube, énigmes) coupées par `prefers-reduced-motion` ; la flamme SVG (SMIL) est mise en pause par `app.js`, et aussi quand aucun portail n'est à l'écran (performance). Transitions d'interface ≤ 200 ms.
- `forced-colors` : décor masqué, bordures `CanvasText`.

### Responsive

Mobile-first, aucun scroll horizontal. Mobile : nav en grille, scène d'accueil sous le texte. ≥ 900 px : en-tête collant, nav en ligne, narrateur. ≥ 1360 px : les outils fixes tiennent dans la ligne de l'en-tête.

## Validation avant livraison

1. W3C : https://validator.w3.org/ — 0 erreur.
2. Outiref : https://www.outiref.fr/ — H1 unique, hiérarchie correcte.
3. PageSpeed (mobile) : https://pagespeed.web.dev/?hl=fr — viser ≥ 90 partout.
4. Test clavier (Tab) et rendu à 375 px de large.

Reporter résultats et corrections (V1 → finale) dans la section « Auto-évaluation » du `README.md`.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/), **en anglais**, courts et à l'impératif :

```
<type>: <what was done>
```

- Une seule ligne de 72 caractères max, minuscule après le préfixe, sans point final.
- Un corps (après une ligne vide) seulement si le « pourquoi » n'est pas évident.
- Un commit = un changement cohérent.

| Type | Usage |
|---|---|
| `feat` | nouvelle section ou fonctionnalité visible |
| `fix` | correction (bug, erreur W3C, contraste, lien cassé) |
| `style` | mise en forme / design sans changer le contenu |
| `content` | modification du texte du CV |
| `perf` | optimisation (images, CSS, chargement) |
| `a11y` | amélioration d'accessibilité |
| `refactor` | restructuration du code sans changement visible |
| `docs` | README, AGENTS.md, auto-évaluation |
| `chore` | outillage, dépendances, config, `.gitignore` |

Exemples :

```
feat: add projects section with infrastructure highlights
fix: correct heading hierarchy in experience section
perf: convert profile picture to webp
chore: set up tailwind cli build scripts
docs: add pagespeed results to self-assessment
```

### Code écrit par un agent IA

Si un agent IA a écrit ou modifié tout ou partie du contenu du commit, l'indiquer **obligatoirement** en dernière ligne du message avec un trailer `Co-Authored-By` qui nomme l'agent **et** le modèle exact :

```
Co-Authored-By: <Agent> (<modèle>) <adresse noreply>
```

```
feat: add skills section with tailwind grid layout

Co-Authored-By: Claude Code (Claude Opus 5) <noreply@anthropic.com>
```

- Utiliser le nom réel de l'agent et du modèle en cours d'exécution, jamais un nom deviné ou recopié d'un ancien commit.
- Plusieurs agents/modèles → une ligne `Co-Authored-By` par agent.
- Commit entièrement écrit à la main → pas de trailer.

Ne jamais commiter ni pousser sans que l'utilisateur le demande.
