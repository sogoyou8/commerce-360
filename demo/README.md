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
