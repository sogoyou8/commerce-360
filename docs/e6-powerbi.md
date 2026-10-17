# Commerce 360 — E6 Power BI Desktop · modèle et recette

**Statut : code, requêtes M, mesures DAX et contrôles préparés sur la branche E6. PBIX et recette Desktop encore à réaliser sous Windows.** Ne pas clôturer E6 sur la seule base de la CI.

## Objectif et périmètre

Restituer les données Olist historiques d'E3/E5 : achats entre le **01/01/2017 inclus** et le **01/09/2018 exclu** (20 mois), ventes de prix d'articles livrés en BRL hors fret, ni bénéfice ni chiffre d'affaires net. Le RFM E5 utilise un cutoff **fixe 01/09/2018** : ni churn actuel, ni prévision. Aucune modification de la base PostgreSQL ou des CSV sources pendant E6.

## Livrables GitHub

- scripts/validate_e6.py : 12 CSV E4/E5 et leurs manifestes SHA-256 contrôlés en **lecture seule**, sans connexion SQL.
- powerbi/queries/fnLocalCSV.pq : fonction M de lecture locale UTF-8.
- powerbi/queries/*.pq : 12 requêtes typées, sous les noms exacts des fichiers sans extension.
- powerbi/E6_Mesures_DAX.dax : calendrier, mesures métier et réconciliations.
- tests/test_e6_contract.py : validation structurelle en CI.

Aucun jeu de données, fichier PBIX ou identifiant individuel RFM n'est publié sur GitHub.

## A — Valider les fichiers locaux dans Antigravity / PowerShell

Dans la racine commerce-360, après avoir vérifié que la copie de travail est propre :

~~~powershell
git fetch origin
git switch --track origin/feature/e6-powerbi
# Si la branche existe déjà : git switch feature/e6-powerbi
.\.venv\Scripts\python.exe scripts\validate_e6.py
~~~

Le script requiert les 9 exports et manifest.json dans .data/e4, ainsi que les 3 exports et manifest.json dans .data/e5 déjà produits par E4/E5. Il **n'exporte rien**, ne touche pas PostgreSQL et ne retouche pas les CSV. Si les fichiers sont ailleurs, utiliser l'option --data-root avec le chemin absolu du dossier .data. En cas de succès : **E6 OK : exports E4/E5, SHA-256, grains et montants reconciles.** Sinon, corriger le fichier signalé avant d'ouvrir Power BI.

## B — Créer le modèle dans Power BI Desktop

1. Ouvrir Power BI Desktop puis un rapport vierge.
2. Transformer les données > Gérer les paramètres > Nouveau paramètre : nom **pDataRoot**, type **Texte**, valeur **chemin Windows absolu du dossier .data** local. Remplacer tout chemin d'exemple par votre vrai emplacement.
3. Nouvelle source > Requête vide > Éditeur avancé : copier powerbi/queries/fnLocalCSV.pq ; renommer exactement **fnLocalCSV**.
4. Créer 12 autres requêtes vides, une par fichier PQ. Copier le code dans leur éditeur avancé et les renommer respectivement :
   - **E4** : fact_delivered_orders, monthly_sales, yoy_jan_aug, category_sales, seller_sales, customer_cohorts, delivery_states, delivery_satisfaction, quality_summary ;
   - **E5** : segments_summary, cohort_segments, quality_rfm. Cette dernière lit .data/e5/quality_summary.csv pour éviter le conflit de nom.
5. Vérifier que les dates sont typées Date, que les montants sont en nombre décimal fixe (Currency) et les volumes entiers. La conversion des valeurs décimales exportées au format à point passe par la culture **en-US**, quelle que soit la langue d'Excel. La colonne low_review_score E4 reste en texte, car PostgreSQL produit t/f : calculer la satisfaction à partir de review_score plutôt que d'interpréter à tort le texte comme booléen.
6. Fermer et appliquer. Contrôler 96 211 lignes dans fact_delivered_orders, 7 dans segments_summary et 83 dans cohort_segments.
7. Modélisation > Nouvelle table : créer **DimDate** en copiant uniquement sa définition de powerbi/E6_Mesures_DAX.dax. Trier DimDate[AnneeMois] par DimDate[OrdreAnneeMois].
8. Vue Modèle : établir **une seule relation active 1 → plusieurs** de DimDate[Date] vers fact_delivered_orders[purchase_date]. Ne créer **aucune relation** vers les tables agrégées E3/E5 ni entre elles.
9. Modélisation > Nouvelle mesure : créer chaque mesure séparément depuis le fichier DAX ; appliquer les formats BRL, unités et pourcentages appropriés. Les mesures DAX Taux de retard, Réachat observé et Part des ventes segment produisent une fraction et se formatent en pourcentage. Les **colonnes CSV** avec suffixe _pct contiennent déjà une valeur sur 100 : ne pas leur appliquer directement un format % sans division par 100.

**Attention au grain :** fact_delivered_orders = 1 ligne par commande livrée ; category_sales = 1 ligne par catégorie, seller_sales = 1 ligne par vendeur, segments_summary = 1 ligne par segment historique, cohort_segments = 1 ligne par couple cohorte-segment. Le nombre de commandes par catégorie et par vendeur **n'est pas additif** car une même commande peut traverser plusieurs groupes. Les exports E5 sont des agrégats : les filtrer avec une colonne de la table de commandes provoquerait une fausse impression de relation. Les clients observés sur 20 mois ne sont pas les clients uniques actifs chaque mois.

## C — Cinq pages du rapport (16:9)

Garder une hiérarchie claire, de grands graphiques utiles, peu de rectangles et un affichage lisible à l'écran ; pas de décoration de « dashboard » générique. Les tableaux longs peuvent avoir leur défilement interne.

| Page | Contenu à construire | Interactions autorisées |
|---|---|---|
| **01 · Pilotage** | Commandes livrées, ventes articles, panier, taux de retard ; courbe mensuelle, volumes 2017/2018 | Mesures fact + DimDate ; segments mois et État acheteur (customer_state) |
| **02 · Ventes** | Top 10 catégories, top 10 vendeurs, parts et comparatif jan–août 2017/2018 | category_sales, seller_sales, yoy_jan_aug : agrégats **globaux fixes** |
| **03 · Clients et RFM** | 93 104 clients, 2 789 réacheteurs (3,00 %), sept segments, poids ventes et cohortes | segments_summary, cohort_segments, customer_cohorts ; cutoff fixe 2018 |
| **04 · Livraisons** | 7 822 retards parmi 96 203 livraisons datées, taux 8,13 %, délais, notes et cartes des États si pertinente | KPI calculés sur fact, analyses descriptives dans delivery_states et delivery_satisfaction |
| **05 · Qualité** | Trois contrôles DAX à zéro, 99 092 commandes tous statuts, 739 sans article, 762 sans avis, 279 sans géolocalisation, huit dates réelles manquantes | quality_summary et quality_rfm **non filtrées** ; ne jamais masquer ni « corriger » les anomalies sources |

**Avertissement visible sur pages 02, 03 et 05 :** données descriptives calculées sur la période entière. Ne pas faire croire que le segment d'État de page 01 s'applique aux analyses RFM. Désactiver les interactions automatiques susceptibles de suggérer un filtrage qu'aucune relation ne réalise.

## D — Recette E6 Power BI Desktop (obligatoire avant clôture)

- [ ] E6-01 : le script validate_e6.py affiche **E6 OK** ; les 12 empreintes SHA-256 correspondent à leurs manifestes.
- [ ] E6-02 : **Actualiser** dans Power BI Desktop fonctionne sans erreur. Les douze requêtes ont les types attendus.
- [ ] E6-03 : KPI globaux hors filtre : **96 211** commandes livrées, **13 181 027,13 BRL** d'articles, panier **environ 137,00 BRL**, **93 104** clients, **2 789** réacheteurs ; sept segments et 83 couples cohortes-segments.
- [ ] E6-04 : livraisons en retard = **7 822**, datées = **96 203**, taux arrondi = **8,13 %**.
- [ ] E6-05 : les trois contrôles DAX de réconciliation commandes, ventes et clients affichent **0**, sans filtre.
- [ ] E6-06 : sur un visuel fondé sur fact_delivered_orders, filtrer customer_state = SP doit donner **40 406** commandes ; les tableaux RFM demeurent fixes et identifiés comme tels.
- [ ] E6-07 : 20 mois dans les ventes, 8 mois jan–août appariés dans YoY, top catégories et vendeurs bien classés, pas de double comptage de commandes.
- [ ] E6-08 : les cinq pages sont exploitables à taille normale, sans données manquantes, relations ambiguës, mesures cassées ou affirmations causales/prédictives.
- [ ] E6-09 : enregistrer un vrai **Commerce_360_E6.pbix** dans le PC ; ne pas le publier dans ce dépôt (il contient des détails de commandes et des chemins locaux).

**La CI GitHub ne valide que le code source et les contrats.** L'E6 sera clôturable après recette locale Desktop sur ces 9 points et revue de PR, pas avant.

## E — Limites et suites

Les sources sont historiques et les cohortes récentes sont censurées à droite : aucune assertion de churn, de fidélité actuelle ou de causalité n'est justifiée. Les agrégats E5 n'exposent aucun ID client, donc pas de segmentation RFM par État, date ou produit dans ce modèle. Une telle exigence nécessiterait une nouvelle modélisation et des vérifications dédiées, et ne doit pas être simulée via des relations Power BI.

Le PBIX peut incorporer des données détaillées d'achats et un chemin Windows absolu ; il reste local. Power BI Service, passerelle et publication externe sont **hors périmètre E6**.
