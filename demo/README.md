## Jalon 3/5 — Livraisons : sélection régionale et interaction (19/10/2026)

Une inspection navigateur au dernier commit 2/5 a confirmé : carte SVG réelle (27 géométries, taux de retard, accessibilité F5), classement des 27 États triés par taux ou délai, carte toujours colorée **par le taux de retard**, même lorsque le classement est trié par délai. Défaut réel : le focus était perdu après la sélection d'un État dans la liste et via les flèches de l'inspecteur.

Correctif : rang sélectionné toujours visible dans le classement défilant, 27 lignes pilotables au clavier (flèches haut/bas, Home/End, un seul Tab stop dans le groupe), focus restauré au clic, et clavier conservé lors de l'ouverture d'un État depuis la carte SVG. Mise en valeur des libellés « taux / délai / commandes » et des 27 lignes avec min-height 44px dans l'atlas principal, sans transformer les taux en volumes ni modifier les données. `delivery-finish.css` dédié, dossier de données Olist inchangé. Les deux cartes (atlas + dock) possèdent des IDs SVG uniques grâce à F5.

Recette : 320,390,430,768,1180,1440,1649,1920px ; sélectionner un État en bas du classement et vérifier focus/scroll ; basculer Retard (%) → Délai (jours) ; inspecteur et classement cohérents ; préserver la mise en évidence de la carte ; vérifier clavier Home/End, flèches inspector, absence de débordement horizontal, desktop sans scroll, tests GitHub Web/Python et Vercel READY sur même SHA. PR #7 demeure draft et non fusionnée.

---

## Jalon 2/5 — Vérification finale UX de Ventes (19/10/2026)

Rapport de recherche approfondie relu contre le code actuel et la capture réelle. Les barres 2017/2018 sont déjà des boutons HTML avec `aria-label`, le clavier (flèches/Home/End), et un tableau natif de huit lignes (ventes BRL et commandes de 2017/2018) ; ajouter un SVG `role=img` ou dupliquer les marqueurs accessibles serait contre-productif.

Correction visuelle mesurée : plus de contraste entre barres 2017/2018 et leurs libellés ; comparaisons d'inspecteur plus visibles, notes « Période comparable » maintenues. Défaut confirmé en navigateur à 1180×750 : classement d'États avec 19 px par ligne mais 22 px pour deux lignes de chiffres. La nouvelle couche `sales-audit.css` attribue 210 px au dock compact (au lieu de 180), préserve les six rangs et le contenu du graphique, et supprime l'écrasement sans cacher ni inventer de métrique. Contrôles exigés à 1180×750, 1440×900, 1649×928, 320×740, 390×844 et 1920×993 ; zéro débordement document et desktop sans scroll ; CI Web/Python et preview Vercel même SHA. PR #7 demeure en brouillon non fusionnée.

---

## Jalon 2/5 — Ventes, comparaisons à mois équivalent (19/10/2026)

Le jalon 1/5 est terminé techniquement (tests GitHub et navigateur, sans certification d'accessibilité). Ventes : 8 groupes janvier–août 2017/2018, chiffres réels Olist. Navigation clavier par flèches, Home/End, focus conservé après clic, navigation inspecteur et changement de mesure ; un tableau alternatif complet avec ventes BRL et commandes des deux années, 8 mois. Le graphique défile **en interne** sous 801px (8 groupes de 50px) ; les autres vues et les KPI nationaux restent indépendants.

Les variations affichées proviennent exclusivement des mêmes agrégats publics et comparent **janvier–août** des deux années, pas 2017 complet vs 2018 partiel. Aucun filtre transversal fictif, aucun fichier `data/public.json` modifié. Couche `sales-finish.css` séparée, PR #7 toujours draft. Recette navigateur 320–1920px, focus, inspecteur, sélection, 8 lignes du tableau, aucun overflow document, CI Web/Python et Vercel READY même SHA.

---

## Jalon 1/5 — Vue d'ensemble, finition visuelle (19/10/2026)

**Nomenclature unique à compter de maintenant :** Jalon 1/5 Vue d'ensemble ; 2/5 Ventes ; 3/5 Livraisons ; 4/5 Qualité ; 5/5 Clients. Les anciens E3/F1–F6 et P1 sont des noms de lots historiques, pas des étapes supplémentaires.

Le rapport approfondi signalait les textes condensés, la carte et l'anneau trop discrets, le vide dans l'inspecteur et les alternatives accessibles. L'audit navigateur de la version P1 à **1649×928** montre déjà un dock de **288px**, une carte SVG de **240×211px** et un anneau de **145×145px** : les captures antérieures sous-estimaient les tailles de la version actuelle. Retouches **mesurées** plutôt que refonte : hiérarchie typographique et contraste renforcés, inspecteur plus équilibré, carte un peu élargie, anneau à 151px maximum ; couche `overview-finish.css` séparée. La géométrie principale et les échelles des données ne changent pas.

Trois alternatives structurées en vrais tableaux HTML `sr-only` sont générées depuis `data.monthly` (20 mois), `data.categories` (12 catégories) et `data.totals`/`data.satisfaction` (notes). La carte des 27 États avait déjà son tableau F5. Les 44px mobiles et le sélecteur natif d'État restent en place. **Les KPI nationaux ne changent pas lors d'une sélection mensuelle** : grains distincts, aucun filtrage croisé fictif. Aucun appel API Olist temps réel : données publiques agrégées statiques et validées.

Recette : tailles 320,390,430,768,1024,1180,1440,1649,1920 ; contrôle des 3 tableaux alternatifs, focus mois et État, absence de scroll document horizontal et desktop vertical, carte et anneau non tronqués, navigation cinq modes, GitHub Web/Python et Vercel READY même SHA. Ce n'est pas une certification WCAG 2.2 ni un test humain avec lecteur d'écran. PR #7 reste **draft**, sans fusion.

---

## E3.P / P1 — Vue d'ensemble (19/10/2026)

Après validation technique de F5, la finition du graphique mensuel corrige trois problèmes observés sur le navigateur : sur mobile 320px les barres ne font que ~31px, le graphique ouvert sur janvier cache le dernier mois pourtant sélectionné (août 2018), et les sélections par clic perdent le focus lorsque l'interface est reconstruite.

Correctifs isolés : largeur de frise de 880px sous 1180px (20 mois ×44px), défilement horizontal **dans** le graphique et recentrage du mois actif après rendu ; focus conservé après clic sur une colonne et après navigation par flèches de l'inspecteur ; consignes clavier dans la légende accessible des boutons ; libellés de janvier 2017 et août 2018 ancrés vers l'intérieur pour éviter la troncature ; flèches d'inspecteur 44px sur mobile. Couche `overview-e3p.css` séparée. Aucun KPI ou pourcentage nouveau, aucun fichier `demo/data/public.json` modifié. Conserver la PR #7 en brouillon, sans fusion.

Recette : navigateur sur 320,390,430,768,1180,1440,1920px ; état initial août 2018 visible en mobile ; flèches, Home/End et focus clavier ; mois sélectionné reflété dans l'inspecteur ; pas de débordement horizontal du document, desktop sans scroll ; Web+Python CI, Vercel READY même SHA. Les autres modes sont conservés mais non encore polis.

---

## F5.6 — Composant de carte réutilisé sans fuite UI (19/10/2026)

Recette navigateur F5.5 : la carte est utilisée **à la fois dans le dock et dans le graphique du mode Livraisons**. Le sélecteur des 27 États ne doit apparaître que sous la carte du dock sur mobile. `renderBrazilMap(withMobilePicker=false)` laisse le graphique détaillé inchangé ; seul l'appel du dock active le sélecteur. Des IDs SVG uniques (compteur de rendu) évitent les doublons de `title`/`desc` lorsque deux cartes existent dans le même DOM. Des tests de non-régression figent ces deux invariants. Données et autres couches inchangées. Valider en navigateur les deux cartes dans le mode Livraisons ainsi que le sélecteur mobile. PR #7 conservée draft.

---

## F5.5 — Accès tactile à tous les États (19/10/2026)

Une carte SVG choroplèthe ne peut pas garantir des zones de 44px pour ses 27 formes géographiques rapprochées. Pour conserver la vraie géographie sans grossir artificiellement les petits États, la carte affiche désormais sous 480px un **sélecteur natif « Choisir un État »**, entièrement libellé, de 44px, avec **27 options provenant de `data.states`** (code et taux de retard Olist réels). Son changement ouvre le mode Livraisons et sélectionne l'État concerné. Le SVG et ses raccourcis clavier restent inchangés, tout comme le classement des cinq États de plus fort volume.

Le sélecteur est masqué sur desktop et uniquement visible en version mobile. Les cartes s'agrandissent naturellement, sans raccourcir les chiffres ni provoquer de défilement horizontal. Contrôler les 27 options, un État absent du top 5, le retour à Livraisons, et les viewports 320–480px après déploiement. Les données Olist restent intactes.

---

## F5.4 — Fin de l'audit accessibilité (19/10/2026)

À la suite de la recherche approfondie, le dépôt confirme que les contrastes, les focus et l'absence de débordements étaient déjà traités ; la balise `<meta name="viewport">` était déjà présente. Corrections ciblées : la carte interactive du Brésil conserve `role="group"` et son fonctionnement flèches/Entrée ; elle comprend désormais des éléments SVG `<title>` et `<desc>` liés par `aria-labelledby`/`aria-describedby`. La description de l'État actif affiche uniquement le **taux de retard observé** et le nombre de **livraisons datées** du véritable jeu de données Olist, sans inventer de chiffres. Sur mobile ≤480px, les liens « Explorer » et les boutons de catégories et d'États passent à **44 px minimum**. La carte reste vectorielle, les petites zones géographiques restent la géométrie native, et la liste d'États offre l'alternative tactile de 44 px. Des cartes mobiles plus hautes autorisent un défilement vertical naturel, sans tronquer les chiffres.

Tests source ajoutés. Vérifier en navigateur les tailles 320/390/430/480, les sept lignes de catégories et les six rangs d'États, les attributs SVG et la navigation clavier, ainsi que CI et Vercel READY sur le SHA du commit. F1–F4/F6 et `demo/data/public.json` sont inchangés. La PR #7 reste en brouillon et non fusionnée.

---

## F5.3 — Accessibilité et coût réel de la carte (19/10/2026)

Le rapport F5 recommandait couleurs WCAG, grandes cibles tactiles, performances et gestion des assets. La vérification du dépôt a révélé une **carte SVG native de 27 États (~65 Ko)**, des visualisations DOM/SVG, un `app.js` ES module d'environ 51 Ko et **aucune dépendance Chart.js/Recharts**, aucune rasterisation de carte et aucun bénéfice à imposer un build ou une conversion WebP.

Corrections effectives ciblées :
- Palette de contraste renforcée pour les sous-titres, métadonnées, barres et contours de la carte ; garde-fous de contrastes conservateurs dans les tests (texte ≥4,5:1, marques ≥3:1 contre une surface de référence `#223d60`), sans revendication d'audit WCAG exhaustif.
- Sur écrans ≤480 px, catégories et lignes d'État ont des zones tactiles d'au moins **40 px** ; les trois cartes restent réelles, et la carte du Brésil passe au-dessus des classements jusqu'à 480 px. Les cartes mobiles peuvent grandir verticalement pour éviter d'écraser les valeurs ; desktop sans scroll inchangé.
- La carte SVG déjà vectorielle n'est plus téléchargée immédiatement lorsqu'elle est hors écran sur mobile : **IntersectionObserver** déclenche la récupération à l'approche de la carte (marge 400 px), avec chargement immédiat de secours si l'API est indisponible. Desktop continue de la charger directement. La carte est décrite comme utilisable au toucher ou avec les flèches/Entrée.
- Mode de contraste renforcé et couleurs forcées respectés. Les montants, taux, catégories, États, cohortes et métadonnées d'Olist sont inchangés. F1/F2, F3, F4, F6 non modifiés. PR #7 toujours en brouillon.

**À valider sur le déploiement HEAD :** tests Web/Python, carte SVG réseau mobile (avant/après intersection), focus, tap, dimensions 320/390/430/480 et 1180/1440/1920. Les mesures statiques de contraste ne remplacent pas une analyse automatisée d'accessibilité complète.

---

## F5.2 — Finition des trois cartes permanentes (19/10/2026)

Améliorations **strictement de présentation** dans `demo/dock-f5.css` : libellés, valeurs et barres des catégories plus lisibles en grand viewport ; carte du Brésil mise en valeur (les couleurs restent fondées sur les taux Olist réels) ; classement d'États moins comprimé en desktop ; anneau de satisfaction un peu plus lisible, sans prétendre disposer d'une comparaison temporelle absente. Un nouvel affichage sur téléphone **≤420px** empile la carte du Brésil et son classement au lieu de réduire le texte et les barres à quelques pixels. Le défilement vertical mobile est autorisé, contrairement au cockpit desktop qui reste sans scroll. Les boutons conservent un focus clavier visible, y compris en contraste forcé.

**Données :** aucun changement de `demo/data/public.json`, des calculs, des mois, des États, des avis ou des sélections. Les trois cartes restent des raccourcis vers les modes correspondants. **Périmètre :** aucun changement F1/F2, F3, F4, F6 ni structure/JS. CI et prévisualisation multi-tailles requises avant validation visuelle ; PR #7 maintenue en brouillon.

---

## E3.F — F6 : consolidation et recette technique (19/10/2026)

La base `demo/styles.css` ne dépend plus de l'ancienne image NASA distante (ou de son masque radial), remplacée par l'illustration originale transparente `demo/assets/earth-f3-native.webp` depuis F3. Ordre explicite des couches CSS conservé : **styles → F1/F2 → F3 → F4 → F5**. La base est versionnée afin de contourner les caches du navigateur. Aucun regroupement risqué des nombreuses autres règles historiques de `styles.css` : elles restent testées par la CI et par la recette visuelle, pour ne pas introduire de régression.

**Contrôles avant clôture :** mode Vue d'ensemble / Ventes / Livraisons / Qualité / Clients en navigateur ; viewport 1180×750, 1440×900, 1920×993, 320×740, 390×844, 430×932 ; aucun scroll de page desktop ni débordement horizontal mobile ; cinq KPI adaptés, trois cartes inférieures et interactions intactes. Le globe 1254 px se limite au desktop, l'ancienne surcouche rectangulaire du quatrième KPI est absente. Rapport détaillé : `docs/e3f-f6-recette.md`.

**Statut :** validation technique prévue sur commit F6 ; validation esthétique finale du propriétaire et autorisation de fusion distincte toujours nécessaires. Aucun fichier `demo/data/public.json` modifié.

---

## F3 — Raccord KPI / globe corrigé (19/10/2026)

Le quatrième KPI avait un **fond rectangulaire** qui s'arrêtait au bord du cockpit, révélant un raccord vertical contre la Terre décorative dans la marge. Ce fond a été retiré au profit d'une ombre de texte douce, qui protège la lecture sans interrompre le décor. Globe natif WebP transparent **1254×1254** conservé, largeur réduite à 450–565px, ancrage positif 16–34px ; halo et opacité plus discrets. Le fond de l'inspecteur reste indépendant et plus opaque pour la lisibilité des chiffres.

Seule F3 est retouchée. F1/F2, F4, F5, interactions et `data/public.json` inchangés. Le globe reste masqué sur mobile, économie de données et contraste forcé. PR #7 draft ; recette technique et validation visuelle requises avant fusion.

---

## F3 — Source native et cadrage complet (19/10/2026)

L'illustration originale disponible mesure **1254×1254 RGBA** et non 2048 px comme l'indiquait le rapport de recherche. Elle a été exportée en WebP transparent **1254×1254**, `demo/assets/earth-f3-native.webp` (~379 KiB), sans agrandissement artificiel. L'ancienne variante WebP 1024px n'est plus référencée par le CSS actif.

Le globe reste **entièrement dans la fenêtre** via une marge droite positive de 10 à 24px et une largeur desktop de 455 à 620px. Le halo est réduit et aligné ; le quatrième KPI et l'inspecteur ont un fond de contraste renforcé. La Terre reste décorative (non associée à des données), masquée sur mobile (<1180px), mode économie de données et contraste forcé. Les couches F1/F2 et F4/F5, les valeurs Olist et les interactions sont inchangées. Tests CI et recette navigateur requis avant validation visuelle ; PR #7 toujours draft et non fusionnée.

---

## F5 — Cartes inférieures et lisibilité (19/10/2026)

Couche de présentation indépendante `demo/dock-f5.css`, chargée après F4. Les trois cartes permanentes (catégories, États, satisfaction) reçoivent une hiérarchie homogène, des barres plus lisibles, une carte du Brésil agrandie selon l'espace disponible, un anneau de note renforcé et des états de focus cohérents. Les lignes « Autres ventes » et « Autres (22 États) », calculées à partir des totaux nationaux vérifiés, restent visibles même sur desktop compact. Sur mobile, les cartes s'empilent et gardent les valeurs accessibles sans débordement horizontal.

Les contrôles du dock ont des libellés accessibles contenant le montant ou le nombre exact, le taux et le périmètre. L'anneau décrit la vraie moyenne des avis. Aucun nouveau KPI, pourcentage, comparaison fictive ou donnée source n'est ajouté ; `demo/data/public.json` et les cinq modes ne changent pas. F3 reçoit uniquement une protection de contraste légèrement plus forte derrière le quatrième KPI. La ressource Terre active est `assets/earth-f3-hd.webp` en 1024×1024, **pas** un PNG ; une variante Retina native 2048px ne doit pas être inventée par simple agrandissement. Validation CI et navigateur nécessaire avant fusion, PR #7 conservée en draft.

---

## F4 — Design system transversal (19/10/2026)

Couche `demo/design-system-f4.css` chargée **après** F0, F1/F2 et F3 pour mutualiser l'expression graphique des cinq modes :

- **F4.1** typographie et chiffres tabulaires cohérents, titres équilibrés, contraste des légendes augmenté ;
- **F4.2** palette de tokens `--ui-*` définissant texte, bordures, accent, états positifs et négatifs ;
- **F4.3** apparence partagée des boutons, navigation, options, flèches et raccourcis des trois panneaux ;
- **F4.4** bordures et surfaces harmonisées sur graphique, inspecteur et exploration ;
- **F4.5** hover, pressé, sélection et focus clavier lisibles, respects de reduced motion et forced colors ;
- **F4.6** validation attendue en vrai navigateur, sur cinq modes et tailles desktop/mobile.

La couche F4 ne définit aucune nouvelle grille ni dimension de cockpit : F1/F2 demeurent propriétaires de la structure. Les données Olist `data/public.json`, le JS et le SVG des États restent inchangés. Les états de contrôle utilisent des attributs ARIA réels, pas de comparaisons inventées. PR #7 toujours draft.

---

## F3 final — planète détourée intégrée (19/10/2026)

**Asset produit et ajouté dans le dépôt :** `demo/assets/earth-f3.webp` (WebP RGBA, 160×160, ~8 Ko), version légère de l'illustration Terre nocturne générée pour Commerce 360. L'image source haute définition reste disponible séparément ; l'asset WebP est une variante décorative basse résolution pour chargement rapide, non une carte de données.

L'ancienne photo rectangulaire NASA et son masque radial sont retirés de la feuille `demo/ambience-f3.css` active ; le visuel généré est une sphère autonome réellement transparente, accompagnée d'un halo léger. Le quatrième KPI et l'inspecteur disposent d'un fond de contraste. Le décor est supprimé sur écrans étroits, économie de données et modes de contraste forcé. Son attribution est corrigée dans Données. Aucun fichier `public.json`, comportement ni layout F1/F2 n'est modifié. Une nouvelle validation visuelle reste nécessaire avant approbation par le propriétaire.

---

## F3 — Retouche de cadrage (18/10/2026)

Après contrôle visuel du propriétaire, la première F3 laissait une surface bleue trop étalée : l'arc de la planète était principalement visible sur le bord de la fenêtre. Retouche **ciblée** : Terre NASA/Suomi NPP à la taille de 49vw plafonnée à 760px, recentrée dans la partie droite, bord circulaire mieux défini et halo plus proche du limbe. L'opacité derrière le quatrième KPI est atténuée pour préserver le contraste ; l'inspecteur reçoit un fond translucide plus protecteur. Sur desktop compact, une taille et une transparence réduites sont appliquées. Le globe reste totalement décoratif, avec son crédit dans Données.

Aucun changement du layout F1/F2, du CSS des graphiques et cartes, du JS ou des données Olist. Tests CI, déploiement Vercel et recette viewport avant validation visuelle.

---

## E3.F / F3 — Terre et ambiance (18/10/2026)

La direction artistique nocturne reçoit une couche CSS indépendante `demo/ambience-f3.css`, chargée après F1/F2. Elle utilise l'image NASA/Suomi NPP déjà créditée dans la fenêtre Données, avec un masque sphérique plus progressif, une mise à l'échelle qui laisse voir les continents et un halo atmosphérique bleu. Les dégradés sont conservés comme secours si la photo NASA ne charge pas. Les KPI à droite et l'inspecteur ont un fond de protection pour préserver le contraste et la lisibilité. Sur mobile, mode économie de données ou contraste forcé, la photo est masquée.

**Portée exclusivement visuelle :** aucun changement de layout F1/F2, de données Olist, de navigation, de carte SVG métier, de JS métier, ou de comparaison. La Terre reste décorative et n'est jamais une carte de données. Vérification visuelle requise en desktop à 1440×900, 1180×750, 1920×993, et sur mobile 390×844 ; vérifier les effets de transparence et la lisibilité des KPI sur toute la navigation. PR #7 reste draft/non fusionnée.

---

## E3.F — F1+F2 (18/10/2026) : structure et proportions globales

Le graphique principal et l'inspecteur deviennent deux surfaces indépendantes sur desktop, avec deux bordures complètes et un espacement visuel de 12 à 20px. Leurs niveaux de données, contenus et interactions ne sont pas modifiés. La structure responsive conserve les deux surfaces en colonne sous 1180px.

Les lignes du cockpit desktop sont recalibrées en KPI, visualisation et dock. Le dock passe à 31vh (240–306px) au-dessus de 850px de hauteur et 180px sur desktop compact (1180×750), afin de valoriser les trois panneaux permanents tout en conservant la page sans scroll. Le rendu est isolé dans `demo/layout-f1f2.css`, chargé après les anciens styles pour permettre une recette visuelle et une éventuelle consolidation à F6.

Les agrégats Olist `demo/data/public.json`, les vues et le JavaScript métier restent intégralement inchangés. La PR #7 reste draft, non fusionnée.

**Validation demandée :** captures 1920×993, 1440×900, 1180×750, 390×844, 430×932 ; bordures des deux panneaux entièrement visibles, aucun chevauchement, aucune disparition de valeur, pas de défilement desktop ni débordement horizontal mobile, mêmes cinq modes et interactions.

---

## F0 — Stabilisation (18/10/2026)

Vérifications sur PR #7 : GitHub Web/Python réussis, Vercel READY sur le même HEAD, 27 États, 12 catégories, 7 segments, 20 cohortes, 20 mois. Totaux Olist réconciliés : 96 211 commandes, 93 104 clients, 2 789 réacheteurs, 13 181 027,13 BRL de ventes d'articles. La branche ne contient qu'un JSON agrégé dans demo/data ; aucun export client brut dans la démo. Le fichier .env.example ne contient qu'une URL PostgreSQL locale de démonstration (non secrète).

Correctif conservateur : suppression du min-width HTML/body de 320px qui forçait 15px de débordement à 320px de viewport avec la barre de défilement. La navigation conserve son défilement horizontal interne, sans rendre la page horizontalement défilante. Les dimensions desktop et les agrégats ne changent pas.

F0 ne comprend aucune modification visuelle de F1–F6 ; PR #7 reste draft.

---

## Finition E3 premium — carte territoriale, Qualité et Clients (18/10/2026)

La livraison principale affiche une grande carte cliquable des 27 États à côté du classement intégral. Les couleurs de la carte représentent toujours les taux de retard parmi les livraisons datées ; la liste bascule entre taux et délai moyen. Qualité utilise deux jauges radiales pour le groupe ponctuel / en retard et la mesure sélectionnée ; tous les chiffres sont issus du JSON de données vérifiées. Clients renforce visuellement les sept segments RFM et conserve les cohortes historiques. Terre NASA rendue plus visible en fond (crédit dans Données). Aucune modification des agrégats, aucune comparaison fictive. La PR #7 reste draft.

Recette requise : vérifier les cinq modes et les interactions carte/Qualité/Clients, et confirmer le layout à 1920×993, 1440×900, 1180×750 et 390×844 avant validation visuelle.

---

## Troisième passe PXM (18/10/2026) — corrections fondées sur six captures

- **P0 :** correction des 16 barres 2017/2018 invisibles dans Ventes ; le conteneur annuel utilise maintenant un div explicite, séparé du libellé des mois, et les tests de source empêchent la régression. La recette navigateur doit en plus vérifier les dimensions réelles des 16 barres.
- **Ventes :** taux et totaux de l'en-tête du graphique calculés selon l'option active Ventes ou Commandes, et non un taux Ventes conservé sous Commandes.
- **Qualité :** deux cartes rééquilibrées, avec valeur principale, mesure secondaire réellement observée et barre de progression visible.
- **Dock :** « Autres ventes » = total national moins six catégories affichées ; « Autres (22 États) » = commandes nationales moins celles des cinq principaux États. Les deux lignes sont masquées uniquement sur les cockpits de faible hauteur pour ne rien rogner. Le plein détail demeure accessible dans les modes métier.
- **Atmosphère :** Terre nocturne NASA/Suomi NPP dans l'angle supérieur droit sur grand écran, avec crédit source dans la fenêtre Données. Aucune donnée d'analyse n'est associée à cette image décorative et le fond dégradé existant reste visible en cas de non-chargement.
- **Invariants :** pas de modification de `data/public.json`, pas de chiffres repris de la maquette cible, cinq modes conservés, PR #7 non fusionnée.
- **Recette à réaliser :** mesures live des 16 barres, viewport desktop 1180×750 / 1440×900 / 1920×993, mobile 390×844, cinq vues et tests CI.

---

## Passe de finition E3/PXM — direction artistique / visualisation (18 octobre 2026)

Sur PR #7, raffinement de la version E3 existante : axes de ventes et de commandes arrondis à des bornes lisibles (sans modifier les valeurs), colonnes inactives assombries, courbe et grille allégées, comparaisons de l'inspecteur regroupées, bordures atténuées, dock agrandi sur desktop ≥1180px et hauteur >850px. Sur les petits écrans desktop, conservation de la variante compacte. La carte reste colorée par **taux de retard des livraisons datées** mais le mini-classement de la vue d'ensemble porte maintenant sur les **commandes livrées par État** avec taux affiché, pour éviter de confondre volume et performance. Satisfaction : deux comparaisons visibles et anneau lisible (arrondi d'affichage 4,2/5, valeur 4,16/5 conservée dans le mode Qualité).

Les agrégats `demo/data/public.json`, les cinq modes, les contrats de grain et les données de référence **ne sont pas modifiés**. La PR reste draft jusqu'à validation des captures desktop/mobile et test des sélections.

---

## Passe visuelle E3/PXM — 18 octobre 2026

Sur la branche de prévisualisation de la PR #7 (toujours draft) : hiérarchie desktop ramenée à trois lignes utiles, KPI renforcés, graphique mensuel avec règle de sélection et navigation clavier roving, inspecteur sans défilement interne, repères détaillés déplacés dans « Données », six catégories vérifiées, carte SVG cliquable des 27 UF, anneau de satisfaction issu du JSON. Les cinq modes et le flux mobile sont conservés. Le mode Vue d'ensemble affiche simultanément ventes et commandes, sans toggle trompeur. La carte représente le taux de retard parmi les livraisons datées et ne prétend pas montrer une causalité.

**Source et licence de la carte :** [@svg-maps/brazil](https://github.com/VictorCazanave/svg-maps/tree/master/packages/brazil), Victor Cazanave et contributeurs, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Adaptation : SVG local et coloration/interaction à partir des 27 agrégats E2. Aucun appel externe de cartographie à l'exécution.

**Recette encore nécessaire :** contrôle navigateur et captures aux résolutions 1920×993, 1440×900, 1180×750, 390×844 et 430×932, tests des cinq modes et du clavier, vérification de l'absence de débordement. Ne pas fusionner la PR #7 avant validation visuelle. Les valeurs du fichier `data/public.json` et le contrat E2 sont inchangés.

---

# Commerce 360 — Démonstration web

Une expérience web **statique, sans serveur ni cookies**, pour explorer les données Olist historiques issues du pipeline E0–E8 : **Vue d'ensemble, Ventes, Livraisons, Qualité, Clients**.

La démo est un produit de **data storytelling interactif**, pas une duplication trompeuse du PBIX et pas un accès à la base PostgreSQL. Les cinq vues partagent les définitions, mais les interactions sont volontairement **limitées à leur grain** : mois, État client, groupe de satisfaction ou segment RFM.

## Comprendre l'étude avant d'explorer — E1

Commerce 360 est une **étude de cas Data Analyst indépendante** sur neuf sources e-commerce Olist (Brésil, achats historiques de janvier 2017 à août 2018). La question métier est : *comment transformer des transactions brutes en indicateurs fiables pour analyser les ventes, les livraisons, la satisfaction et les comportements clients ?*

- Le bandeau identifie immédiatement le sujet **Olist · Brésil · 2017–2018** ; la vue d'ensemble explicite la problématique.
- Le contrôle **« À propos / Données »** dans l'en-tête ouvre un panneau flottant, fermable par **Échap**, clic extérieur ou bouton de fermeture. Il détaille les neuf sources, la démarche SQL/Python/Power BI, les KPI de référence et un accordéon de limites méthodologiques.
- Le panneau relie directement au **[dépôt GitHub](https://github.com/sogoyou8/commerce-360)** et au **[bilan analytique vérifié](../docs/e8-bilan.md)**.
- Les données historiques ne sont ni l'activité actuelle d'Olist ni une mesure de marge ; les retards, avis et clients ont leurs propres dénominateurs. Aucun croisement analytique inexistant n'est simulé.

## E3 — Un cockpit PXM, cinq modes

Le socle de la démo est désormais **un seul espace de travail** : navigation horizontale à cinq modes, sous-titre métier court, quatre KPI **contextuels**, grand graphique central et **inspecteur** mis à jour à chaque sélection. Plus de sidebar verticale, de grand Hero, de rangée de cartes décoratives ni de footer de dashboard.

**Interaction :** choisir un mode depuis la barre supérieure (également par les flèches gauche/droite, Début/Fin lorsque la navigation a le focus), choisir une mesure dans le graphique, puis sélectionner le mois, le groupe de satisfaction, l'État documenté ou le segment client. L'inspecteur expose la valeur et sa prudence méthodologique. Un volet replié conserve des repères complémentaires sans encombrer l'écran. Le panneau « À propos / Données » d'E1 reste accessible en haut à droite.

**Affichage :** le viewport desktop devient l'espace principal (sans scroll de page sur les écrans d'au moins 960 px de large et 670 px de haut) ; le graphique et l'inspecteur gèrent leurs propres débordements. Les écrans plus petits s'adaptent en colonne et autorisent le scroll nécessaire à l'accessibilité.

**Données :** E3 conserve les KPI nationaux vérifiés et ne simule aucun filtrage croisé impossible. E2 a ensuite enrichi le JSON public à partir des 12 CSV E4/E5 et des manifestes SHA-256 validés : 27 États clients, 12 catégories commerciales, 7 segments RFM, 20 cohortes et 15 États vendeurs agrégés.

Cette PR est encore une **prévisualisation** ; la deuxième passe PXM E3.1–E3.5 et les tests automatisés ont suivi. La recette navigateur desktop/mobile et l'intégration complète des exports E2 restent requises avant publication finale.

## E3.1–E3.5 — Deuxième passe PXM (18 octobre 2026)

**Direction :** se rapprocher de la composition conceptuelle premium sans en copier les données fictives, ses pourcentages inventés ou sa carte nationale non justifiée.

- **E3.1 — Socle :** une seule navbar avec cinq modes, période historique, accès GitHub et panneau « À propos / Données ». Titre métier compact et quatre KPI contextuels ; disparition de l'ancienne ligne de navigation secondaire.
- **E3.2 — Visualisation principale :** sur la vue d'ensemble, **colonnes = ventes d'articles hors fret**, **courbe = commandes livrées**, sur **20 mois exacts (janvier 2017 à août 2018)**, avec deux axes séparés. Chaque mois est sélectionnable ; les années et données inexistantes ne sont jamais extrapolées.
- **E3.3 — Inspecteur :** précédent/suivant, montants et commandes du mois, panier moyen *réellement calculable* par le ratio mensuel et comparaisons mois précédent / même mois de l'année précédente **uniquement quand les deux périodes existent**. Pour les autres modes : inspecteur de l'état, du groupe de satisfaction ou du segment RFM, avec dénominateurs explicites.
- **E3.4 — Trois explorations secondaires** accessibles sans quitter la page : les 12 catégories principales réellement publiées, les 27 États clients vérifiés et la satisfaction nationale par ponctualité. **Aucune catégorie fictive ni total régional inventé.**
- **E3.5 — Mise en page responsive :** le cockpit est contenu dans une hauteur de viewport sur desktop ≥ 1180 px et ≥ 750 px ; sur écrans plus petits, les sections deviennent verticales avec scroll accessible et les tableaux longs défilent dans leur région. La navigation reste utilisable au clavier.

**E3.1–E3.5** ont été développées sans modifier les références du snapshot initial. **E2 a maintenant enrichi `demo/data/public.json`** à partir des 12 exports locaux validés. La CI vérifie la syntaxe, la sécurité, les contrats de données et la structure UI ; une recette visuelle desktop/mobile et des cinq modes reste nécessaire avant fusion. Le statut Vercel READY ne garantit pas la conformité visuelle.

## Prévisualisation Vercel

Une prévisualisation de la branche `feature/demo-web-interactive` a été déployée avec le statut **READY** : [Commerce 360 — démo web](https://commerce-360-explorer-git-featu-9178df-yoanns-projects-e74472b3.vercel.app/).

Cette URL est une **prévisualisation de branche**, pas une validation de publication définitive. Le statut READY et la CI réussie ne remplacent pas une recette visuelle et interactive dans le navigateur. La couverture E2 de la branche est complète sur les agrégats publiables : 27 États clients, 12 catégories principales, 20 cohortes et 15 États vendeurs sous seuil d'au moins 5 vendeurs.

## Démarrage local (Windows / Antigravity)

Depuis la racine du dépôt :

```powershell
git fetch origin
git switch --track origin/feature/demo-web-interactive
py -m http.server 8000 --directory demo
```

Ouvrir **http://localhost:8000**. Si la branche est déjà locale, utiliser `git switch feature/demo-web-interactive`. Fermer le serveur avec Ctrl+C.

La page nécessite JavaScript et un serveur HTTP statique : ouvrir directement le fichier `index.html` avec `file://` n'est pas pris en charge, car les agrégats sont chargés par `fetch`.

## Interactions réelles des cinq modes

| Mode | Interaction | Grain et source |
|---|---|---|
| 01 Vue d'ensemble | Changer ventes/commandes et sélectionner chacun des 20 mois | `mart.e3_monthly_sales` / référence E3 |
| 02 Ventes | Choisir ventes/commandes et comparer janvier–août 2017 avec les mêmes mois de 2018 | Référence E3 ; **12 catégories** principales dans le JSON enrichi |
| 03 Livraisons | Choisir un État et basculer entre taux de retard et délai | États **CE, RJ, SP** documentés dans la validation E7 |
| 04 Qualité | Choisir ponctuel/retard et basculer entre note et avis négatifs | `mart.e3_delivery_satisfaction` : un avis sélectionné par commande |
| 05 Clients | Trier les sept segments par clients, ventes ou réacheteurs ; cliquer sur un segment | `mart.e5_segments_summary` ; 93 104 clients et 2 789 réacheteurs |

**Les quatre KPI nationaux ne changent pas artificiellement quand on sélectionne un mois ou un État** : le jeu public initial ne fournit pas les tables de jointure nécessaires. Les fiches de détail indiquent explicitement le filtre appliqué.

## E2 — Finaliser les données avec les exports validés du PC

La **version initiale** présentait 3 États (CE / RJ / SP) et 2 catégories. **E2 a été validée à partir des 12 exports CSV E4/E5 et de leurs manifestes SHA-256**, puis le JSON public enrichi a été intégré à la PR #7 : 27 États clients, 12 catégories principales, 15 États vendeurs agrégés, 20 cohortes mensuelles et 7 segments RFM. Les fichiers détaillés (CSV, XLSX, PBIX) ne sont pas publiés.

### Une seule procédure — PowerShell, dans le dépôt Commerce 360

Avant de modifier quoi que ce soit, vérifier que les changements locaux sont sauvegardés ; ne pas écraser un travail en cours en changeant de branche.

```powershell
git status --short
git fetch origin
git switch feature/demo-web-interactive
git pull --ff-only origin feature/demo-web-interactive

# Vérifie les 9 CSV E4 + les 3 CSV E5, les empreintes, les grains et les totaux.
.\.venv\Scripts\python.exe scripts\validate_e6.py

# Recette E2 SANS modifier demo/data/public.json.
.\.venv\Scripts\python.exe scripts\build_web_data.py --check-only

# Exporte seulement les agrégats vérifiés ; ne copie aucune ligne client/commande.
.\.venv\Scripts\python.exe scripts\build_web_data.py

# Recette finale du vrai fichier public.
node --test demo/tests/*.test.mjs
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
git diff -- demo/data/public.json
```

L'export **échoue sans écrire** si les dossiers locaux E4/E5 sont absents, si l'un des 12 SHA-256 diffère, si les volumes ne concordent pas ou si les agrégats publiés contredisent les références E3/E5/E7.

**Résultat attendu après la procédure locale :** 20 mois, **27 États clients**, **12 catégories en tête**, 7 segments RFM, États vendeurs agrégés uniquement à partir de **5 vendeurs par État** et cohortes avec au moins **20 clients** par groupe. Les cohortes trop petites sont exclues explicitement, pas présentées comme des zéros.

**Avant tout commit :** vérifier que seul `demo/data/public.json` est destiné à être diffusé ; le répertoire `.data/`, les archives Olist, le PBIX, les identifiants individuels et les manifests locaux ne doivent **jamais** être versionnés. Ne publier le JSON enrichi qu'après inspection des mesures réelles, revue des graphiques et contrôle des tests CI sur la PR #7.

### Si le PC ne possède plus les 12 exports

**Réimportation future :** ne jamais publier les sources détaillées. Si les agrégats doivent être régénérés, utiliser les procédures [E4](../docs/e4-excel-recette.md) et [E5](../docs/e5-rfm.md), valider les manifestes SHA-256 et exécuter les contrats Web avant mise en production.


## Validation hors ligne

```powershell
node --check demo/app.js
node --test demo/tests/contracts.test.mjs
```

La CI de `.github/workflows/web-demo.yml` exécute ces contrôles et refuse la présence de CSV/PBIX/XLSX/ZIP sous `demo/`.

## Publier sur Vercel

Projet **statique**, sans build ni package npm. Configurer le projet connecté au dépôt GitHub `sogoyou8/commerce-360` avec :

- **Root Directory** : `demo`
- **Framework Preset** : `Other` (aucun framework)
- **Build Command** : aucune
- **Output Directory** : `.`
- **Install Command** : aucune

Une URL n'est considérée comme publiée **qu'après un déploiement Vercel confirmé comme Ready et testé**. L'aperçu de PR peut précéder la fusion dans `main` ; le rapport Power BI demeure local.

## Vie privée et limites

Aucun suivi utilisateur, cookie, compte, API propriétaire ou base SQL publique. Pas de fausse prédiction de churn ni d'affirmation causale sur la satisfaction. Les chiffres étudiés correspondent à **2017–2018**, en **BRL**, au prix des articles **hors fret** et non à une marge. Les segments clients sont exclusifs et construits avec un cutoff fixe au **01/09/2018**. Voir [bilan E8](../docs/e8-bilan.md) et [recette E7](../docs/e7-validation.md).

**E3 / Clients — exploration des cohortes :** le bouton « Cohortes » du mode Clients ouvre le classement interactif des 20 mois de premier achat livré observé. Les montants et réachats de chaque cohorte couvrent les achats ultérieurs jusqu'au 31 août 2018 ; ils ne représentent ni les ventes du seul mois initial ni une prédiction de fidélité. Le graphique et l'inspecteur utilisent les agrégats E2 du JSON public.
