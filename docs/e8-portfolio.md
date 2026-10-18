# Commerce 360 — E8 | Kit portfolio et candidature

**Usage :** texte prêt à adapter pour une page « Projet » d'Abyss Showcase et pour un CV Data Analyst. Il s'agit d'un **livrable rédactionnel**, pas d'une page web déjà publiée ni d'un lien Power BI accessible en ligne.

## Fiche projet

- **Nom :** Commerce 360
- **Sous-titre :** Des transactions historiques aux décisions commerciales
- **Domaine :** E-commerce · ventes, livraison, satisfaction et segmentation client
- **Rôle :** Construction du pipeline de données, analyse SQL, restitution Excel/Power BI et contrôles de cohérence
- **Stack effectivement employée :** PostgreSQL · SQL · Python · Docker · Excel · Power Query · Power BI Desktop · DAX · Git/GitHub
- **Jeu étudié :** Olist, Brésil ; achats observés entre janvier 2017 et août 2018
- **Preuve de travail public :** [dépôt Commerce 360](https://github.com/sogoyou8/commerce-360)
- **Démonstration Power BI publique :** non disponible (PBIX local, non distribué)

## Texte court pour l'aperçu portfolio

J'ai transformé des données e-commerce historiques en une chaîne analytique vérifiable : neuf sources structurées dans PostgreSQL, des agrégats métier contrôlés, une segmentation RFM au grain client, puis un rapport Power BI de cinq pages. Le résultat réconcilie **96 211 commandes livrées**, **13,18 M BRL** de ventes d'articles hors livraison, et **93 104 clients observés**. L'analyse met notamment en relation descriptive les retards de livraison et les avis clients, sans prétendre démontrer une causalité.

## Version détaillée pour une page projet

### Le défi
Partir de neuf fichiers d'e-commerce pour proposer une lecture cohérente de la performance commerciale **sans double comptage**, malgré la multiplicité des articles, paiements, avis et statuts de commande.

### La construction
L'audit et les vues PostgreSQL ont défini les bons grains (commande, article, client). Python a servi aux imports, contrôles et exports reproductibles ; Excel/Power Query puis Power BI/DAX ont donné des vues opérationnelles des ventes, livraisons, avis et segments RFM. Les rapprochements SQL finaux portent sur les effectifs et montants de référence.

### Ce que l'analyse révèle
Le taux de retard sur les livraisons datées est de **8,13 %**. Les commandes livrées tardivement et notées affichent **2,57/5** en moyenne, contre **4,29/5** pour les commandes à l'heure et notées : un signal utile pour investiguer l'expérience de livraison, **pas une preuve d'impact causal**. La part des clients ayant réalisé au moins deux achats livrés pendant la fenêtre historique est **3,00 %** ; aucune mesure de churn actuel n'en est déduite.

### La preuve technique
Validation des 12 exports E4/E5 avec manifestes SHA-256, **35 tests Python locaux** avant E8, confrontation des tableaux PostgreSQL au Power BI présenté en captures et CI GitHub verte après intégration E7. Le **PBIX n'a pas été audité automatiquement par GitHub** et n'est pas publié.

## Version CV (prête à adapter)

**Commerce 360 — Projet Data Analyst | PostgreSQL, SQL, Python, Power BI, DAX, Power Query**

- Conception d'un pipeline analytique e-commerce sur **9 sources**, du contrôle de qualité à la restitution de **96 211 commandes** et **13,18 M BRL** de ventes d'articles historiques.
- Construction d'un modèle SQL à grains maîtrisés et d'une segmentation RFM de **93 104 clients**, restitués dans **5 pages Power BI**.
- Automatisation des contrôles de cohérence SQL/Python et rapprochement des indicateurs Power BI avec des références vérifiées.

**Important :** la précision « ventes d'articles historiques hors fret » peut être développée à l'oral, mais ne pas remplacer ces montants par « chiffre d'affaires net ».

## Proposition de visuels publics

1. **Couverture** : capture recadrée de **01_Vue d'ensemble** avec les quatre KPI et la courbe, sans menus Power BI ni contenu système.
2. **Exploration** : capture recadrée de **03_Livraisons** ou **04_Qualité** pour rendre tangible la question métier.
3. **Clients** : extrait graphique anonymisé de **05_Clients**, avec la légende « comportements observés 2017–2018 ».

Ces visuels restent à sélectionner et vérifier manuellement depuis le PBIX local ; **aucune image n'est ajoutée automatiquement** par E8.

## Restrictions de publication

Les captures doivent montrer uniquement des **agrégats** ; aucune ligne de commande, identifiant de client, fichier `PBIX`, export `CSV`, classeur `XLSX` détaillé, chemin local, notification privée ou mot de passe. Les résultats ne sont **pas** un diagnostic de performance actuelle d'Olist.

Voir [bilan analytique et niveau de preuve](e8-bilan.md) et [guide de reproduction](e8-reproduction.md) pour toute vérification avant publication.