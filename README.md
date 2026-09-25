# CV web statique Olivier Dutoit

Accésible :[https://cv.olivier-dutoit.fr]() / Speed insight https://pagespeed.web.dev/analysis/https-cv-olivier-dutoit-fr/ba67vr7dkt?hl=fr&form_factor=mobile

CV en ligne sur une seule page HTML, présenté comme un bureau Linux moderne (inspiré de Kubuntu), réalisé dans le cadre du sujet [cv_html_statique](https://github.com/fabrice1618/cv_html_statique).

## Stack

- HTML5 sémantique, écrit à la main
- CSS local uniquement (`css/style.css`) : aucune dépendance externe, aucun build, aucun backend
- JavaScript vanilla en amélioration progressive (`js/app.js`)

## Concept

- Chaque section du CV (À propos, Compétences, Expériences, Projets, Formation, Profil, Contact) est une application ouverte dans sa fenêtre.
- Panneau en bas avec lanceur d'applications (recherche, grille d'applications), fenêtres ouvertes et horloge. Le panneau est flottant et translucide tant qu'aucune fenêtre n'est agrandie, puis s'ancre au bord de l'écran.
- Écran de démarrage (lignes de boot puis splash) à chaque chargement, passable d'une touche ou d'un clic, désactivé si `prefers-reduced-motion`.
- Sans JavaScript, toutes les fenêtres sont affichées les unes sous les autres : le contenu reste lisible et indexable.
- Accessibilité : lien d'évitement, navigation clavier, boutons étiquetés, contrastes AA, `prefers-reduced-motion` respecté.
- Thème clair / sombre : suit `prefers-color-scheme`, bascule manuelle dans la zone système (mémorisée dans le navigateur).

### Easter eggs

- Code Konami (↑ ↑ ↓ ↓ ← → ← → B A) ou taper `panic` : kernel panic.
- Lanceur → « Quitter la session » : écran de fin de session.
- Application « Terminal » : un vrai prompt. `help`, `cvfetch`, `ls`, `cat competences.txt`, `open projets`, `theme dark`, `sudo recruter olivier`, `rm -rf /`…
- Notifications façon bureau (mise à jour disponible, astuce) avec actions, fermables, mises en pause au survol.
- Double-clic sur une barre de titre : agrandir / restaurer.

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
python -m http.server 8000
```

## Structure

```
index.html            page unique
css/style.css         thème + composants
js/                   scripts (facultatif)
img/                  images optimisées
cv_base.md            contenu source du CV
grille_evaluation.md  grille de notation du sujet
AGENTS.md             consignes pour les agents IA
```

## Auto-évaluation

_À compléter._

- W3C : …
- Outiref : …
- PageSpeed (mobile) : Performance …, Accessibilité …, Bonnes pratiques …, SEO …
- Améliorations V1 → finale :
  - …
