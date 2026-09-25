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

- **Site 100 % statique** : aucun backend, aucune étape de build, aucun Node/npm, **aucune dépendance externe** (pas de CDN). On ouvre `index.html` dans le navigateur et ça marche.
- **HTML5** écrit à la main, **CSS local** dans `css/style.css` : variables de thème, composants, et une petite section « Utilitaires » (`flex`, `grid`, `gap-2`, `mt-4`, `text-xl`, `sm:grid-cols-2`…) reprise de la nomenclature Tailwind pour rester lisible. Tailwind lui-même n'est plus chargé : le Play CDN pesait ≈ 400 ko de JS et plombait PageSpeed.
- Pas de framework JS ni CSS.
- JavaScript dans `js/app.js`, chargé avec `defer`, en **amélioration progressive** : il gère le bureau interactif (ouvrir/fermer/réduire/agrandir/déplacer les fenêtres, panneau, menu du lanceur, horloge, easter eggs). Sans JS, toutes les fenêtres sont affichées empilées et le site reste complet et lisible. Toute nouvelle fonctionnalité JS doit respecter ce principe : le contenu ne dépend jamais du script.
- Écran de démarrage (`#boot`) : affiché par JS à chaque chargement, jamais si `prefers-reduced-motion` ; lignes de boot puis splash avec anneau et barre, ≈ 3 s, passable d'une touche ou d'un clic (pas de bouton), focus rendu à la fenêtre active à la fin. Aucun logo ni nom de distribution.
- Easter eggs : ils doivent rester inoffensifs, fermables au clavier (n'importe quelle touche ou clic, avec retour du focus), présentés comme des `role="dialog"` focusables, sans texte ni visuel de marque. Existants : terminal interactif (`#terminal`, commandes dans `termCommands` de `app.js`, le contenu des `cat` est lu dans le DOM des fenêtres, jamais dupliqué), notifications (`notify()` : `role="status"`, auto-fermeture 9 s mise en pause au survol/focus, bouton Fermer, Échap), kernel panic (Konami ou `panic`), « Quitter la session », `rm -rf /` qui fait disparaître puis restaurer les icônes. Une nouvelle commande de terminal s'ajoute dans `termCommands` et dans le texte de `help`.
- Police système (pas de webfont) sauf décision contraire.

### Organisation du CSS

- `css/style.css` est le seul fichier de style, dans cet ordre : variables `:root` (+ surcharge thème sombre), base, utilitaires, bureau, fenêtres, boutons, panneau, lanceur, écrans plein écran, démarrage, mode interactif `.js`, préférences d'accessibilité (`prefers-reduced-transparency`, `forced-colors`), impression.
- Un utilitaire n'est ajouté que s'il est utilisé au moins deux fois ; sinon, écrire une règle sur le composant.
- Toute couleur passe par une variable : jamais de code couleur en dur dans une règle de composant (sauf les pastilles `badge-*` et le terminal).
- `@media print` doit rester fonctionnel : le CV s'imprime en une colonne, sans bureau ni panneau.

### Arborescence

```
.
├─ index.html          # la page (seule page du site)
├─ css/
│  └─ style.css        # variables de thème, utilitaires, composants (CSS ordinaire)
├─ js/
│  └─ app.js           # bureau interactif (amélioration progressive)
├─ img/                # images optimisées (WebP/AVIF, ≤ 150–300 ko)
├─ cv_base.md          # contenu source
├─ grille_evaluation.md # grille de notation du sujet
├─ AGENTS.md
├─ CLAUDE.md           # charge AGENTS.md
└─ README.md           # consignes + section « Auto-évaluation »
```

### Tester en local

Ouvrir `index.html` directement, ou servir le dossier (`python -m http.server 8000`) pour tester comme en ligne. Aucune commande de build.

## Règles HTML

- `<html lang="fr">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- `<title>` descriptif (ex. « Olivier Dutoit — CV, alternant BTS SIO SISR ») et `<meta name="description">` pertinente.
- Structure : `header` → `main` (une `section` par bloc, chacune avec son titre) → `footer`. `nav` si ancres internes.
- **Un seul `<h1>`** (le nom). Hiérarchie sans saut : `h2` pour les sections, `h3` pour les entrées (poste, projet, diplôme).
- Balises adaptées : `ul/li` pour les listes, `time datetime="2025-09"` pour les dates, `article` pour une expérience ou un projet, `address` n'est **pas** utilisé (pas de coordonnées).
- Images : `alt` descriptif (ou `alt=""` si décorative), `width`/`height` renseignés, `loading="lazy"` hors premier écran.
- Liens : textes explicites (jamais « cliquez ici »), `rel="noopener noreferrer"` sur les `target="_blank"`.
- Indentation 2 espaces, attributs entre guillemets doubles, HTML valide W3C.

## Direction artistique : bureau Linux moderne (inspiré de Kubuntu / KDE Plasma)

Le site imite un bureau Linux contemporain à la manière de Kubuntu : fond d'écran clair aux formes abstraites, panneau sombre en bas avec lanceur d'applications, fenêtres plates aux coins légèrement arrondis avec barre de titre claire. Chaque section du CV est une **application** ouverte dans sa fenêtre. Le rendu doit être immédiatement reconnaissable, mais rester un CV lisible et sérieux : le bureau est le décor, pas le message.

### Palette (déclarée dans `:root` de `css/style.css`)

Thème **clair** type Breeze/Plasma 6 : fenêtres claires dont la barre de titre se fond dans la fenêtre (même couleur, pas de séparateur), panneau, lanceur et notifications en **verre clair translucide** (flou d'arrière-plan). En thème sombre, le verre devient sombre (`rgba(27,30,32,.72)`). Les libellés d'icônes du bureau suivent `--color-icon-label` : sombres sur le fond clair, blancs avec ombre sur le fond sombre ; le fond d'écran clair doit rester pâle (≥ 7:1 avec `#232629`).

| Token | Valeur | Rôle |
|---|---|---|
| `--color-desktop-1` / `-2` / `-3` | `#b7d1ec` / `#f0d0cd` / `#dde8f3` | fond d'écran clair : dégradé bleu pâle → clair → corail pâle, deux halos blancs ; les libellés d'icônes (`--color-icon-label`) sont sombres dessus (≥ 7:1). En sombre : fond bleu nuit → bordeaux, libellés blancs avec ombre |
| `--color-panel` | `rgba(239,240,241,.72)` | **verre clair** (`backdrop-filter` `--glass-blur`) pour le panneau, le lanceur et les notifications ; texte `#232629`, séparateurs `--color-panel-line`, champs `--color-panel-input` |
| `--color-titlebar` | `#eff0f1` | barre de titre active (texte `#232629`) |
| `--color-titlebar-inactive` | `#f7f7f8` | barre de titre inactive (texte `#5b6166`, ≥ 4,5:1) |
| `--color-window` | `#eff0f1` | fond des fenêtres |
| `--color-surface` | `#fcfcfc` | zones de contenu, cartes, chips, boutons |
| `--color-border` | `#c2c7cc` | bordures fines, séparateurs |
| `--color-text` | `#232629` | texte courant |
| `--color-text-muted` | `#55606a` | dates, métadonnées (≥ 4,5:1 sur `window`) |
| `--color-accent` | `#2980b9` | liens, focus, bouton principal (blanc dessus ≥ 4,5:1) |
| `--color-accent-bright` | `#3daee9` | accents décoratifs seulement (soulignement de tâche active, survols) : trop clair pour du texte |
| `--color-accent-soft` | `#d5ecf8` | survol de bouton |
| `--color-danger` | `#da4453` | survol du bouton Fermer |

Les tokens sont neutres (`--color-accent`, pas `--color-breeze`) : la palette évoque l'ambiance, elle ne copie pas un thème existant.

### Composants

- **Fenêtre** (`section`) : fond `window`, coins arrondis 6 px, ombre portée (`--shadow-window`). Barre de titre **claire** (`titlebar`) sur une grille 3 colonnes : pastille d'icône à gauche, titre `h2` centré en 15 px semi-gras, et à droite trois boutons plats **réduire (chevron bas) / agrandir (chevron haut) / fermer (croix)**, décoratifs sans JS, fonctionnels avec JS (`<button>` étiquetés). Fermer passe en rouge `danger` au survol.
- **Icônes d'application** : pastille carrée arrondie (`.app-badge`, 52 px sur le bureau, 24 px en barre de titre) de couleur unie (`badge-blue`, `badge-orange`, `badge-teal`, `badge-purple`, `badge-green`, `badge-red`, `badge-dark`) avec un pictogramme blanc à traits arrondis. Chaque application garde la même couleur partout (bureau, barre de titre, lanceur, panneau).
- **Panneau** : `footer` fixé en bas, hauteur ≈ 46 px, fond `panel`. Sur bureau (≥ 768 px, JS), il est **flottant** (marge 8 px, coins arrondis 10 px, fond translucide `--color-panel-glass` avec `backdrop-filter`) tant qu'aucune fenêtre n'est agrandie ; dès qu'une fenêtre est agrandie, `html.has-maximized` l'ancre au bord (pleine largeur, opaque, sans arrondi). Il contient : le **bouton lanceur** (icône grille de points, sans texte), les **tâches** (icône + nom, soulignement `accent-bright` sous la fenêtre active), la **zone système** à droite (lien GitHub, horloge sur deux lignes heure / date, bouton « Afficher le bureau » qui réduit tout).
- **Lanceur d'applications** : panneau sombre ancré au-dessus du bouton, largeur ≈ 640 px, sur trois zones : en-tête (avatar, nom d'utilisateur, champ de recherche qui filtre les applications, Entrée ouvre la première), corps à deux colonnes (raccourcis et liens externes à gauche, grille d'applications à droite), pied (Applications / Tout fermer / Quitter la session). Sur mobile, la colonne de gauche est masquée.
- **Bureau** : icônes d'applications en colonne à gauche (pastille + libellé sombre), qui ouvrent la fenêtre correspondante.
- **Boutons** : plats, coins arrondis 4 px, fond `surface` avec bordure `border` ; bouton principal fond `accent` texte blanc ; survol `accent-soft`. Pas de relief, pas de dégradé.
- **Icônes** : SVG inline originaux (traits arrondis, `stroke: currentColor`), dans un sprite `<symbol>` en haut du `<body>`. **Aucune** icône, logo, fond d'écran ou nom de marque KDE, Kubuntu, Ubuntu ou Canonical (pas de logo Plasma/Kubuntu, pas d'engrenage KDE, pas de « cercle d'amis » Ubuntu, pas les mots « Kubuntu » ou « KDE » dans le contenu). Le style est un hommage, pas une copie.
- **Cartes** : les expériences (`article.card`), les projets et la formation (`ul.card-list`) sont des cartes blanches `surface` à bordure fine et coins 6 px sur le fond `window`, comme les listes des applications Plasma. Les compétences sont des étiquettes (« chips ») ; pas de pourcentages inventés.

### Typographie

- Texte courant : police système sans-serif (`ui-sans-serif, system-ui, "Noto Sans", "DejaVu Sans", Arial, sans-serif`), **≥ 16 px**.
- Barres de titre : 15–16 px, graisse 600 ; titres de sections `h3` : 17–18 px, graisse 600.
- Pas de webfont : la police système suffit et préserve la performance.

### Contraintes d'accessibilité propres au style

- Texte `text` sur `window` (≈ 14:1) et blanc sur `panel` (≈ 17:1) sont conformes AAA ; `text-muted`, `titlebar-text-inactive` et `accent` sont calés pour ≥ 4,5:1 : ne pas les éclaircir. `accent-bright` (`#3daee9`) ne porte jamais de texte.
- Les libellés des icônes du bureau sont en `text` sur le fond d'écran clair : garder le fond d'écran au-dessus de `#b9c3cf` pour rester ≥ 7:1.
- La couleur seule ne signale jamais un état : la fenêtre active a aussi un titre plus foncé, la tâche active un soulignement.
- `focus-visible:` : anneau `accent` de 2 px avec décalage 2 px, visible sur fond clair comme sombre (doubler d'un contour blanc sur le panneau).
- Toute animation (ouverture de fenêtre, menu) reste ≤ 200 ms et respecte `prefers-reduced-motion`.

### Responsive

- Mobile : pas d'icônes de bureau flottantes ; les applications sont listées en haut, les fenêtres s'empilent pleine largeur, le panneau reste en bas avec icônes seules.
- `md:` et plus : bureau avec icônes à gauche, fenêtres positionnées librement (déplaçables avec JS) sans jamais dépasser l'écran.

## Règles Tailwind / design

- **Mobile-first** : styles de base pour mobile, puis `sm:` `md:` `lg:`. Aucun scroll horizontal.
- Utilitaires Tailwind dans le HTML ; une classe dans `css/style.css` seulement pour un motif répété (fenêtre, biseau, bouton).
- Couleurs, polices et espacements personnalisés définis une seule fois dans `:root` de `css/style.css`.
- Accessibilité : contraste AA minimum (4,5:1 pour le texte), texte ≥ 16 px, focus visible (`focus-visible:` ring/outline), ordre de tabulation logique, `prefers-reduced-motion` respecté pour toute animation.
- Sobre et lisible : blocs scannables, espacements réguliers, pas d'effets gratuits.

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
