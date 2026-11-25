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
- JavaScript dans `js/app.js`, chargé avec `defer`, en **amélioration progressive**. Il ajoute `html.game` : **un niveau par écran, sans scroll de page** (le contenu d'une chambre défile dans `.room` si besoin). On change de niveau par la nav, les flèches ← →, PageUp/PageDown, le hash de l'URL (historique géré) ou la porte de sortie, avec un passage par un portail orange (`.warp`). Il gère aussi les énigmes, la barre de progression par niveau, `aria-current="step"` dans la nav, la voix du narrateur et la bascule « CV classique » (`html.classic` : page qui défile, mémorisée dans `localStorage`, forcée par `?classique`, imposée à l'impression). Sans JS, la page défile normalement avec toutes les chambres visibles et le lien PDF fonctionne : le contenu ne dépend jamais du script.
- **Rendu 3D réaliste : `js/scene3d.js`**, un moteur **WebGL2 écrit à la main, sans bibliothèque** (la règle « aucune dépendance » tient). Il dessine la salle (panneaux muraux, sol brillant qui reflète les néons, plafond lumineux), l'éclairage (néons, lumière colorée des portails, pièces lumineuses), les ombres portées (shadow map), le cube, toutes les pièces d'énigme et de **vrais portails** : quand un bleu et un orange sont ouverts, chacun montre la salle vue depuis l'autre (rendu en texture, scène recadrée sur le plan du portail).
  - **Principe à respecter : le moteur n'a aucune logique de jeu, il « habille » le DOM.** Chaque objet 3D est la peau d'un élément (table `SKINS` : sélecteur → fonction de dessin). À chaque image, `chain()` relit la position de l'élément dans le monde CSS 3D (offsets + `transform` calculés) et y dessine un maillage éclairé. La projection (`cssProjection`) reproduit exactement `perspective: 1000px` / `perspective-origin: 50% 42%` de `.chamber` et l'unité est le pixel CSS : WebGL et DOM se superposent au pixel près. Le DOM reste la zone cliquable, le focus clavier et le nom accessible ; les animations (CSS, Web Animations) et l'état (classes, `data-portal`, `data-gel`) sont lus tels quels. **Ajouter un objet = ajouter l'élément DOM + une entrée dans `SKINS`.**
  - `app.js` appelle `CV3D.init(main)` ; si WebGL2 marche il pose `html.gl`, puis `CV3D.frame(section, yaw, pitch, t)` à chaque image avec les angles de caméra qu'il donne aussi au DOM, et `CV3D.travel()` pour le travelling entre niveaux. En mode `.game.gl`, le CSS rend le décor DOM invisible (pas `display: none` : il doit rester mesurable) et pose les pièces réellement à plat (`--flat: 90deg`) ou en travers (`--across: 90deg`). **Sans WebGL2 ou si le contexte est perdu, `html.gl` est absent et la salle CSS 3D prend le relais.** Le niveau final (espace) reste en CSS.
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
├─ js/app.js             # jeu : niveaux, énigmes, caméra, vue classique (amélioration progressive)
├─ js/scene3d.js         # moteur de rendu WebGL2 fait main (salle, lumières, ombres, portails)
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

**Hommage, pas copie** : aucun logo, nom de marque, nom de personnage, réplique, texture ou son repris du jeu (pas de logo de l'entreprise fictive, pas de nom d'IA, pas de citation). Le cube est un cube lesté générique en 3D avec un emblème original (lentille lumineuse), **pas** le cube à cœur du jeu. Pictogrammes, textes du narrateur et formes sont originaux. Le pied de page mentionne l'hommage et l'absence d'affiliation.

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
- **Scène de niveau** (`.level-scene.level-<id>`) en bas de chaque chambre 01–05 : décor dans `.scene-decor` (`aria-hidden`), énigme puis porte de sortie (`.exit-btn`, verrouillée tant que l'énigme n'est pas résolue ; le menu permet toujours de passer) reliée par un fil indicateur (`.wire`). Sans JS, le CSS montre un décor résolu.
- **Informations verrouillées** (mode jeu) : comme dans le jeu, l'information est la récompense. Tant que l'énigme n'est pas résolue (`.chamber:not(.is-unlocked)`), les plaques du CV restent dans le mur et l'énigme occupe toute la salle, agrandie (`--k`). Résolue : `is-unlocked` est posé, l'énigme redescend en bandeau au sol et les plaques sortent. Un bouton discret « Passer l'énigme » (`.puzzle-skip`) déverrouille sans jouer : un CV doit rester lisible par quelqu'un de pressé. Le bouton « CV classique », l'absence de JS et le PDF montrent toujours tout.
- **Pièces en volume** : les éléments d'énigme ont une vraie profondeur dans la scène (`preserve-3d`) : dalles, fosse, plaque de propulsion et ponts de lumière couchés au sol (`rotateX`), surfaces de plafond suspendues, murs et vitre en travers de la salle (`rotateY`), bouton rouge avec socle et capuchon surélevé, porte en retrait avec son seuil.
- **Énigmes** (objet `puzzles` de `app.js`, une entrée par id de chambre : `hint`, `init(scene)`, `act(scene, win, fail)`) : on prépare, on déclenche avec `.puzzle-btn` (ou **E**), on regarde le résultat ; un échec affiche un indice dans `.puzzle-hint` (`role="status"`, aussi dit par le narrateur) et on recommence. Tout est en vrais `<button>` étiquetés.
  - 01 **portails** : `portalGun()` crée des surfaces blanches `.surf` ; un clic pose le portail bleu, le suivant l'orange, et ainsi de suite. Il faut relier le sol sous le distributeur au plafond au-dessus du bouton pour que le cube passe la vitre.
  - 02 **pont de lumière** : le pont frappe un mur ; un portail à l'impact et un au bord de la fosse le font ressortir au-dessus du vide.
  - 03 **laser** : l'émetteur suit le pointeur ; garder le faisceau sur le récepteur (E le fait au clavier).
  - 04 **plaque de propulsion** : lancer quand l'aiguille de la jauge est dans la zone verte, sinon le cube tombe trop court ou trop loin.
  - 05 **gels** : deux dalles `.tile` à régler (rien, orange = vitesse, bleu = rebond) ; il faut de la vitesse puis un rebond pour franchir la fosse.
- **Plaques du CV** : ce sont des panneaux muraux articulés, pas des cartes flottantes. Elles sortent du mur du fond à l'arrivée (`translateZ`), sont tenues par un bras-vérin (`::before`, rangée du haut), disposées en arc (`--pose`) et reculent puis reviennent de temps en temps (`plate-idle`). Des dalles du mur du fond (`.move-tile`) avancent et reculent seules.
- **Entrée de niveau** : `.chamber.is-in` déclenche la sortie des plaques ; le titre du niveau reçoit le focus.
- **Accueil** : fenêtre de salle d'observation, deux portails face à face, cube au sol.
- **Final** : brèche dans le plafond, étoiles sur deux couches, Terre éclairée de côté, cube à la dérive, sol lunaire SVG à cratères.
- **Narrateur** (JS, ≥ 900 px, en haut à droite, `aria-hidden`) : une phrase originale par chambre (`data-annonce`), ton pince-sans-rire, effacée après 7 s et en bas de page.
- **Salle 3D** (mode jeu) : `app.js` insère dans chaque chambre (sauf le final) un `.stage` décoratif (`aria-hidden`) de cinq `.wall` (fond, gauche, droite, sol, plafond) assemblés en boîte par `rotateX/rotateY` (profondeur `--depth`, perspective sur `.chamber`). Le numéro du niveau est peint sur le mur du fond (`data-num`). Le contenu du CV reste du **HTML normal** (lisibilité, accessibilité, SEO), mais il est placé dans le même monde 3D que les murs (`.chamber-inner` en `preserve-3d`, même rotation et même pivot que le `.stage`).
- **Caméra** : la rotation du `.stage` suit la souris ou l'inclinaison du téléphone (`deviceorientation`, sans demande de permission), avec un léger balancement au repos ; murs et contenu tournent ensemble. Coupée par `prefers-reduced-motion` et quand l'onglet est caché.
- **Interactions** : les plaques s'inclinent vers le pointeur avec un reflet (`.is-tilting`, souris uniquement) ; à l'accueil (≥ 900 px) les portails sont montés sur les vrais murs (fond et droite) et le cube à six faces est posé au sol : on l'attrape, il se soulève et tourne (inertie) ; le portail bleu mène au niveau 01 ; changer de niveau fait avancer la caméra dans la salle (`.is-leaving`) et arriver la suivante du fond (`.is-entering`).
- **Cube** (`.cube3d` > trois `.cube-face`) : vrai cube 3D en CSS (`preserve-3d`), coins renforcés, joints, lentille orange allumée ; taille par `--s`. Utilisé à l'accueil (pivote au survol), dans les niveaux 01 et 04 et à la dérive dans l'espace.
- **En-tête** (`header.site-header`, collant dans tous les modes) : à gauche les outils « Afficher le CV classique » (bouton `aria-pressed`, masqué sans JS) et « Exporter en PDF » (icônes seules sous 1360 px, libellés gardés pour les lecteurs d'écran, `title` en infobulle), puis le badge du sujet, puis le sélecteur de niveaux : chaque lien porte un segment lumineux, bleu pour le niveau courant (`aria-current`), orange pour un niveau résolu (`.is-solved`).
- **Pied de page** (`footer.site-footer`) : plaque de générique (identité, liens GitHub / LinkedIn / portfolio / PDF, mentions et retour à l'ascenseur). En mode jeu, il n'apparaît qu'au dernier niveau, en bandeau translucide sur la Lune.

### Typographie

Police système sans-serif, texte ≥ 16 px. Numéros de chambre en graisse 200, titres en 650–800.

### Accessibilité propre au style

- Aucune couleur `--portal-*` ne porte du texte. Ne pas éclaircir `--ink-muted`, `--blue`, `--orange`.
- Focus : contour `--blue` 2 px + halo ; contour blanc sur fonds sombres (en-tête, espace).
- Animations d'ambiance (champs, portails, étoiles, cube, énigmes) coupées par `prefers-reduced-motion` ; la flamme SVG (SMIL) est mise en pause par `app.js`, et aussi quand aucun portail n'est à l'écran (performance). Transitions d'interface ≤ 200 ms.
- `forced-colors` : décor masqué, bordures `CanvasText`.

### Responsive

Mobile-first, aucun scroll horizontal. Mode jeu : hauteur `100dvh`, < 640 px la nav ne montre que les numéros de niveau (libellés lisibles par les lecteurs d'écran), < 900 px le nom est masqué. Sans JS / vue classique : nav en grille sur mobile, en ligne ≥ 900 px avec en-tête collant. Narrateur ≥ 900 px. ≥ 1360 px : les outils fixes tiennent dans la ligne de l'en-tête.

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
