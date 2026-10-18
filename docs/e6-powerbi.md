# Commerce 360 — E6 Power BI Desktop · modèle et recette

**Statut actualisé le 18 octobre 2026 :** le rapport `Commerce_360_E6.pbix` existe sur le PC de l'utilisateur ; cinq pages et leurs indicateurs ont été montrés en captures Power BI Desktop. Le validateur E6 des 12 exports E4/E5 et leurs SHA-256 a affiché `E6 OK` ; 35 tests Python E2–E7 ont réussi ; les recoupements métier E7 avec PostgreSQL se sont terminés par `E7 SQL OK`. **Le PBIX reste local et n'a pas été ouvert ou audité depuis GitHub.** La recette des points non visibles sur les captures est distinguée ci-dessous de ces preuves, et la documentation/publication générale sera peaufinée en E8.

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
git switch main
git pull --ff-only origin main
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
8. Vue Modèle : établir la relation temporelle `DimDate[Date]` (1) → `fact_delivered_orders[purchase_date]` (*), si utilisée pour des visuels au grain commande. **Les captures du PBIX réel montrent également deux relations actives, à sens unique, validées dans la recette des filtres** : `delivery_states[customer_state]` (1) → `fact_delivered_orders[customer_state]` (*) et `delivery_satisfaction[delivery_group]` (1) → `fact_delivered_orders[delivery_group]` (*). Elles relient des dimensions descriptives à la table des commandes sur une clé cohérente ; ne pas ajouter de relations arbitraires aux agrégats catégorie, vendeur et RFM. Vérifier toute nouvelle relation au regard du grain et du contexte de filtre.
9. Modélisation > Nouvelle mesure : créer chaque mesure séparément depuis le fichier DAX ; appliquer les formats BRL, unités et pourcentages appropriés. Les mesures DAX Taux de retard, Réachat observé et Part des ventes segment produisent une fraction et se formatent en pourcentage. Les **colonnes CSV** avec suffixe _pct contiennent déjà une valeur sur 100 : ne pas leur appliquer directement un format % sans division par 100.

**Attention au grain :** fact_delivered_orders = 1 ligne par commande livrée ; category_sales = 1 ligne par catégorie, seller_sales = 1 ligne par vendeur, segments_summary = 1 ligne par segment historique, cohort_segments = 1 ligne par couple cohorte-segment. Le nombre de commandes par catégorie et par vendeur **n'est pas additif** car une même commande peut traverser plusieurs groupes. Les exports E5 sont des agrégats : les filtrer avec une colonne de la table de commandes provoquerait une fausse impression de relation. Les clients observés sur 20 mois ne sont pas les clients uniques actifs chaque mois.

## C — Les cinq pages réellement réalisées dans Power BI Desktop (16:9)

Le plan initial E6 a évolué au cours de l'assemblage et de la recette. **Voici la structure visible dans les captures utilisateur**, qui fait foi pour le rapport réalisé ; les tables de contrôle qualité restent disponibles dans le modèle mais ne sont pas une page autonome.

| Page visible dans Power BI Desktop | Contenu confirmé par les captures | Interaction et grain |
|---|---|---|
| **01_Vue d'ensemble** | 13,18 M BRL de ventes articles, 96 211 commandes, panier 137 BRL, retard 8,13 %, courbe de ventes mensuelles | 20 mois historiques ; comparaisons au niveau commande quand le visuel le permet |
| **02_Ventes** | Top 10 catégories, ventes par État vendeur | Agrégats descriptifs catégorie et État vendeur, ne pas prétendre qu'ils sont filtrables par chaque dimension du fait commandes |
| **03_Livraisons** | 7 822 retards, taux 8,13 %, délai moyen 12,5 j, taux de retard par État et délai par État | Test interactif CE : 196 retards, 15,40 %, délai 21,2 j ; relation `delivery_states` → `fact_delivered_orders` |
| **04_Qualité** | Note moyenne clients 4,16/5, taux d'avis négatifs 12,80 %, notes et avis négatifs selon ponctualité | Test interactif `late` : note 2,57/5, taux d'avis négatifs 54,05 % ; relation `delivery_satisfaction` → `fact_delivered_orders` |
| **05_Clients** | 93 104 clients observés, taux de réachat 3,00 %, répartition des clients RFM, ventes par segment RFM | Sept segments descriptifs calculés au 01/09/2018 ; sélection d'un segment « achat unique » : taux de réachat 0 % |

**Limites du croisement :** la plupart des tables E3/E5 sont des agrégats à grains distincts ; elles ne sont pas automatiquement filtrées par tous les graphiques. Aucun indicateur client ne prédit la rétention actuelle. Les notes et avis sont calculés sur les commandes disposant d'un avis valide.

## D — Recette E6 : résultats observés et vérifications complémentaires

- [x] **E6-01** : `scripts/validate_e6.py` a affiché **E6 OK** ; 9 exports E4 + 3 exports E5, manifestes SHA-256, montants et grains cohérents (capture terminal du 18/10/2026).
- [x] **E6-03** : KPI globaux montrés par captures ou croisés en SQL : **96 211** commandes livrées, **13 181 027,13 BRL**, panier **137,00 BRL**, **93 104** clients, **2 789** réacheteurs, sept segments, 83 lignes de cohortes-segments.
- [x] **E6-04** : **7 822** retards, **96 203** livraisons datées, **8,13 %** — vérifiés par E7 SQL et affichage Power BI.
- [x] **E6-08 (périmètre visuel)** : les cinq pages sont visibles et les interactions ciblées CE / `late` / RFM ont été testées en captures utilisateur.
- [x] **E6-09** : un rapport `Commerce_360_E6` ouvert dans Power BI Desktop a été présenté en captures ; **le fichier PBIX n'est pas versé au dépôt**.
- [ ] **E6-02** : conserver si nécessaire une preuve séparée d'un **Actualiser tout** sans erreur dans Power BI Desktop ; les captures disponibles montrent les données chargées, pas la totalité du rafraîchissement.
- [ ] **E6-05** : capturer les trois mesures de contrôle DAX à **0** dans Power BI Desktop, si elles sont présentes ; leur égalité n'est pas directement montrée dans les captures.
- [ ] **E6-06** : vérifier explicitement `customer_state = SP` → **40 406** commandes dans le visuel commande et l'absence de faux filtrage des agrégats indépendants.
- [ ] **E6-07 (partie non vue)** : vérifier l'analyse YoY janvier–août appariée, si elle doit figurer dans la restitution finale ; le graphique mensuel et les top catégories/États vendeurs sont visibles.

**Le contrôle de recette fonctionnelle E6 a été déclaré validé dans la conversation et le rapprochement SQL E7 est passé.** Les réserves ci-dessus sont des preuves complémentaires de reproductibilité/périmètre, et non des écarts métier avérés. La CI GitHub ne peut pas ouvrir le PBIX local ; E8 devra documenter le rapport effectivement livré avant publication.

## E — Limites et suites

Les sources sont historiques et les cohortes récentes sont censurées à droite : aucune assertion de churn, de fidélité actuelle ou de causalité n'est justifiée. Les agrégats E5 n'exposent aucun ID client, donc pas de segmentation RFM par État, date ou produit dans ce modèle. Une telle exigence nécessiterait une nouvelle modélisation et des vérifications dédiées, et ne doit pas être simulée via des relations Power BI.

Le PBIX peut incorporer des données détaillées d'achats et un chemin Windows absolu ; il reste local. Power BI Service, passerelle et publication externe sont **hors périmètre E6**. La restitution et la confidentialité sont traitées dans [E8 — bilan](e8-bilan.md), [E8 — recette](e8-reproduction.md) et [E8 — portfolio](e8-portfolio.md).
