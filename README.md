# CV web statique Olivier Dutoit

En ligne : https://cv.olivier-dutoit.fr — [PageSpeed Insights (mobile)](https://pagespeed.web.dev/analysis/https-cv-olivier-dutoit-fr/ba67vr7dkt?hl=fr&form_factor=mobile)

CV en ligne sur une seule page HTML, présenté comme un parcours de **chambres de test** façon jeu de puzzle à portails (hommage à Portal 2) qui se termine **sur la Lune**. Réalisé dans le cadre du sujet [cv_html_statique](https://github.com/fabrice1618/cv_html_statique).

## Stack

- HTML5 sémantique, écrit à la main
- CSS local uniquement (`css/style.css`) : aucune dépendance externe, aucun build, aucun backend, aucune webfont
- JavaScript vanilla en amélioration progressive (`js/app.js`)

## Concept

- Chaque section du CV est une chambre de test numérotée (00 accueil → 06 contact), avec son panneau, sa barre de progression et ses pictogrammes.
- Décor réaliste en CSS/SVG, sans image : panneaux muraux biseautés, champs d'énergie, grilles de sol, portails au bord en flamme (filtre SVG) qui laissent voir l'autre côté.
- Final : le plafond de la dernière chambre est éventré, on sort sur la Lune avec la Terre dans le ciel.
- Les liens internes « téléportent » : portail bleu au clic, portail orange à l'arrivée.
- Un narrateur commente chaque chambre (textes originaux).
- Bouton fixe en haut à gauche **« Afficher le CV classique »** : même contenu en mise en page sobre sur une colonne (mémorisé dans le navigateur, ou via `?classique`).
- **« Exporter en PDF »** : télécharge `cv-olivier-dutoit.pdf`, généré depuis la vue classique. L'impression du navigateur bascule aussi en vue classique.
- Sans JavaScript, tout le contenu reste affiché et lisible.
- Accessibilité : lien d'évitement, navigation clavier, `aria-current` sur la chambre courante, contrastes AA, `prefers-reduced-motion` (animations et flamme SVG coupées), `forced-colors`.
- Thème clair / sombre selon `prefers-color-scheme`.

Aucun logo, nom ni élément graphique du jeu n'est repris : projet personnel non affilié.

## Lancer en local

```powershell
python -m http.server 8000
```

Puis ouvrir http://localhost:8000. La commande pour régénérer le PDF est dans [AGENTS.md](AGENTS.md#régénérer-le-pdf).

## Structure

```
index.html            page unique
css/style.css         thème, composants, vue classique, impression
js/app.js             portails, narrateur, vue classique
cv-olivier-dutoit.pdf export PDF du CV
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
  - V1 (thème « rue en papier découpé ») : un seul fichier `index.html` de 309 ko avec police embarquée en base64 → refonte en HTML/CSS/JS séparés, sans webfont (≈ 65 ko au total, 16 ko compressés).
  - …
