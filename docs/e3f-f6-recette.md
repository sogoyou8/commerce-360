# Commerce 360 — E3.F / F6 : consolidation et recette

**Livraison :** branche de travail `feature/demo-web-interactive`, [PR #7](https://github.com/sogoyou8/commerce-360/pull/7) vers `main`. **Date :** 19 octobre 2026. **Validation visuelle et autorisation explicite de fusion obtenues** ; l'état de fusion est consultable sur GitHub.

## Recette finale de publication — 19 octobre 2026

**Statut : recette technique favorable, validation visuelle du propriétaire obtenue, fusion expressément autorisée.**

- Les cinq vues et les lots **E0–E8**, **F0–F6**, **P1–P5** sont livrés. Les agrégats Olist demeurent inchangés.
- Sur le commit de recette `ccb0c34f`, GitHub Actions **Web demo** et **Python quality** ont réussi et Vercel a répondu **READY**. La publication de `main` doit être recontrôlée après la fusion.
- **axe-core 4.10.3** : 10 scans (5 vues × 1440×810 et 390×844), **aucune violation détectée** ; aucun débordement horizontal. Les contrôles automatiques `color-contrast` et `aria-valid-attr-value` comprennent des cas `incomplete`, qui ne constituent ni une réussite ni une violation.
- **Contrastes du rendu échantillonné** : 35 captures sur les cinq vues (320×740, 1180×750, 1440×810, 1920×1080, 390×844 en trois positions de défilement), 2 693 portions de texte visibles ; **aucun échec mesuré** par rapport aux seuils 4,5:1 pour le texte ordinaire et 3:1 pour le grand texte. Mesure par pixels et échantillonnage, pas une certification WCAG.
- **Navigation clavier** : Home/End, focus visible 2px sur cinq vues ; carte SVG Brésil End/Entrée, tableau alternatif des 27 États lisible dans l'arbre d'accessibilité, sélecteur mobile de 27 options ; fenêtre Données, fermeture Échap et retour du focus.
- **Confidentialité de la livraison** : la PR ajoute des fichiers statiques et des agrégats ; aucun CSV brut, XLSX, PBIX, ZIP ou `.env` parmi les fichiers modifiés.
- **Réserve explicite et persistante : aucun essai humain avec un véritable lecteur d'écran NVDA ou VoiceOver n'a été effectué.** Les tests du DOM, de l'arbre d'accessibilité et d'axe-core ne remplacent pas ce contrôle. Aucune certification WCAG n'est revendiquée.
- Défaut esthétique non bloquant connu : la ligne SE est partiellement visible en bas du classement interne défilant sur une capture Livraisons ; le classement est accessible par défilement.

## État du produit

Socle : F0 (responsive), F1 (structure des panneaux), F2 (proportions), F3 (globe natif transparent et suppression du raccord), F4 (design system), F5 (cartes inférieures). F6 retire le CSS hérité NASA devenu obsolète et vérifie la cohérence du système sans changer les données ou les calculs.

## Vérifications navigateur (sur prévisualisation de branche au commit F3 `80c80fbb`)

| Résolution | Terre | Débordement horizontal | Page sans scroll |
| --- | --- | --- | --- |
| 1180×750 | Visible et entièrement contenue à droite | Non | Oui |
| 1440×900 | Visible, 504 px ; KPI 4 sans fond rectangle | Non | Oui |
| 1920×993 | Visible et entièrement contenue à droite | Non | Oui |
| 390×844 | Masquée | Non | Scroll vertical mobile autorisé |
| 320×740 | Masquée | Non | Scroll vertical mobile autorisé |
| 430×932 | Masquée | Non | Scroll vertical mobile autorisé |

- Image `earth-f3-native.webp` servie en HTTP 200, **1254×1254 px**, sans masque.
- F3 : `.metric:last-child` transparent, chiffres protégés par une ombre de texte, pas de bord rectangulaire dans la marge.
- Tous les cinq modes ont été navigués avec quatre KPI, un graphique, un inspecteur cohérent et trois cartes inférieures : **Vue d'ensemble**, **Ventes**, **Livraisons**, **Qualité**, **Clients**.
- Trois cartes inférieures conservent notamment le complément *Autres (22 États)* visible en desktop compact. Aucun changement aux agrégats ni aux pourcentages.
- JavaScript et CSS versionnés ; le nettoyage F6 du vieux bloc NASA ne touche pas à la logique métier.

## Vérifications CI / déploiement

Pour chaque dernier commit, exiger **Commerce 360 / Web demo** et **Commerce 360 / Python quality** en succès, et **Vercel READY** sur exactement le même SHA. Vérifier la branche preview via [Commerce 360 sur Vercel](https://commerce-360-explorer-git-featu-9178df-yoanns-projects-e74472b3.vercel.app/). Ne pas déduire la conformité visuelle du seul état READY.

## Limites et décisions de publication

- Les données sont historiques, issues des agrégats Olist de 2017–2018. Il n'existe aucune donnée de démo fabriquée à partir du concept UI.
- Les règles CSS anciennes non liées directement à l'asset NASA ont été volontairement laissées en place : un grand refactoring serait un chantier distinct, plus risqué.
- Pas de certification WCAG complète, ni de test sur appareil Retina physique revendiqué.
- **Validation visuelle du propriétaire obtenue** pour les cinq vues ; le test humain de lecteur d'écran demeure non effectué.
- **Autorisation explicite de fusion de la PR #7 vers `main` reçue le 19 octobre 2026**, en conservant la réserve NVDA non réalisé.

## Phase suivante

**E3.P / P1–P5 terminées** : Vue d'ensemble, Ventes, Livraisons, Qualité, Clients et cohortes. Publication du site à vérifier après fusion, sans considérer le test humain de lecteur d'écran comme réalisé.
