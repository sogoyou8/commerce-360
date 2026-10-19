# Commerce 360 — E3.F / F6 : consolidation et recette

**Branche :** `feature/demo-web-interactive` · **PR :** [#7](https://github.com/sogoyou8/commerce-360/pull/7), toujours en brouillon et non fusionnée. **Date :** 19 octobre 2026.

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
- **Validation visuelle du propriétaire toujours nécessaire avant de déclarer le socle définitivement figé.**
- **Ne pas fusionner la PR sans autorisation explicite.**

## Phase suivante

Après la recette et le feu vert visuel : **E3.P**, finition visuelle et interactive **page par page**, dans l'ordre **Vue d'ensemble → Ventes → Livraisons → Qualité → Clients et cohortes**.
