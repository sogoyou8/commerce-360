# Commerce 360 — Audit E1 des données Olist

**Date de recette :** 16 octobre 2026  
**Source auditée :** archive Olist `archive.zip` fournie dans la conversation (9 CSV)  
**SHA-256 de l’archive :** `967e41e04fc306fe604e2a693f488995a8b41e5047418f8a5c8e4abd6deca784`  
**Statut :** E1 terminé — GO E2 sous conditions ci-dessous

## Inventaire des sources

| Table | Lignes | Colonnes | Doublons stricts | Clé candidate et collisions |
|---|---:|---:|---:|---|
| Commandes (`olist_orders_dataset.csv`) | 99 441 | 8 | 0 | `order_id` : 0 collision(s) |
| Clients (`olist_customers_dataset.csv`) | 99 441 | 5 | 0 | `customer_id` : 0 collision(s) |
| Articles (`olist_order_items_dataset.csv`) | 112 650 | 7 | 0 | `order_id+order_item_id` : 0 collision(s) |
| Paiements (`olist_order_payments_dataset.csv`) | 103 886 | 5 | 0 | `order_id+payment_sequential` : 0 collision(s) |
| Avis (`olist_order_reviews_dataset.csv`) | 99 224 | 7 | 0 | `review_id` : 814 collision(s) |
| Produits (`olist_products_dataset.csv`) | 32 951 | 9 | 0 | `product_id` : 0 collision(s) |
| Vendeurs (`olist_sellers_dataset.csv`) | 3 095 | 4 | 0 | `seller_id` : 0 collision(s) |
| Traductions catégories (`product_category_name_translation.csv`) | 71 | 2 | 0 | `product_category_name` : 0 collision(s) |
| Géolocalisation (`olist_geolocation_dataset.csv`) | 1 000 163 | 5 | 261 831 | `geolocation_zip_code_prefix` : 981 148 collision(s) |

**Note :** `geolocation_zip_code_prefix` n’est pas une clé primaire. Le fichier géographique comporte plusieurs coordonnées par préfixe postal. `review_id` n’est pas unique ; il ne doit pas être utilisé seul comme clé primaire.

## Manquants et cas particuliers

| Source | Champ / contrôle | Résultat |
|---|---|---:|
| Commandes | `order_approved_at` manquant | 160 |
| Commandes | `order_delivered_carrier_date` manquant | 1 783 |
| Commandes | `order_delivered_customer_date` manquant | 2 965 |
| Avis | `review_comment_title` manquant | 87 656 |
| Avis | `review_comment_message` manquant | 58 247 |
| Produits | `product_category_name` manquant | 610 |
| Produits | `product_name_lenght` manquant | 610 |
| Produits | `product_description_lenght` manquant | 610 |
| Produits | `product_photos_qty` manquant | 610 |
| Produits | `product_weight_g` manquant | 2 |
| Produits | `product_length_cm` manquant | 2 |
| Produits | `product_height_cm` manquant | 2 |
| Produits | `product_width_cm` manquant | 2 |

## Relations et granularité

| Relation | Orphelins |
|---|---:|
| `orders.customer_id -> customers.customer_id` | 0 |
| `items.order_id -> orders.order_id` | 0 |
| `items.product_id -> products.product_id` | 0 |
| `items.seller_id -> sellers.seller_id` | 0 |
| `payments.order_id -> orders.order_id` | 0 |
| `reviews.order_id -> orders.order_id` | 0 |
| `products.product_category_name -> translations.product_category_name` | 13 |

**Règles :**

- Faits au niveau **commande** : une ligne par `order_id`.
- Faits au niveau **article** : une ligne par (`order_id`, `order_item_id`).
- Paiements : une commande peut avoir plusieurs paiements (`order_id`, `payment_sequential` unique).
- Avis : plusieurs lignes possibles par commande et certains `review_id` réutilisés pour plusieurs commandes ; agréger ou sélectionner au niveau commande.
- Clients : `customer_id` est unique par enregistrement, mais `customer_unique_id` identifie les acheteurs revenant dans l’historique.
- Géolocalisation : agréger/dédupliquer par préfixe postal avant jointure, contrôler les coordonnées hors emprise plausible.

## Qualité et anomalies quantifiées

- **Commandes :** 96 478 livrées  sur 99 441 au total.
- **Livrées sans date de livraison réelle :** 8.
- **Avis :** 547 commandes avec plusieurs lignes d’avis ; 789 identifiants d’avis réutilisés ; au total 814 lignes au-delà de la première occurrence d’un `review_id`.
- **Produits :** 610 sans catégorie ; 13 produits référencent 2 catégories non traduites (`pc_gamer` et `portateis_cozinha_e_preparadores_de_alimentos`).
- **Géolocalisation :** 261 831 doublons exacts ; 19 015 préfixes postaux distincts ; 278 clients et 7 vendeurs sans préfixe présent dans la table géographique.
- **Commandes sans articles :** 775 (aucune commande livrée dans ce cas) ; **sans paiement :** 1 ; **sans avis :** 768.
- **Dates incohérentes :** 23 commandes au statut livré ayant une date de remise au transporteur postérieure à la livraison réelle ; exclure ces anomalies des analyses de délai détaillées ou les qualifier explicitement.

## Indicateurs de référence sur l’ensemble de l’archive

Les métriques ci-dessous sont recalculées depuis les CSV fournis, sans jointure multiplicatrice. Elles constituent des références de recette pour E2–E7.

| Indicateur | Définition | Résultat |
|---|---|---:|
| Commandes livrées | `order_status = delivered` | 96 478 |
| Ventes d’articles livrés | Somme `price` des articles des commandes livrées  hors livraison | 13 221 498.11 BRL |
| Panier moyen sur commandes livrées | Ventes d’articles / commandes livrées | 137.04 BRL |
| Clients livrés uniques | Nombre distinct de `customer_unique_id` après filtre livrées | 93 358 |
| Clients ayant ≥ 2 commandes livrées | Nombre distinct de clients | 2 801 |
| Part de clients réacheteurs observés | Réacheteurs / clients livrés distincts | 3.00 % |
| Livraisons tardives | Livraison réelle > estimation parmi les livraisons renseignées | 7 826 / 96 470 = 8.11 % |
| Délai moyen de livraison | Livraison réelle – achat parmi les livrées datées | 12.56 jours |
| Satisfaction moyenne des livrées (provisoire) | Une note par commande, dernier avis par date de création/réponse | 4,16 / 5 (95 832 commandes notées) |
| Catégorie numéro 1 en ventes articles livrés | `health_beauty` (libellés traduits, périodes complètes de l’archive) | 1 233 131,72 BRL |

**Méthode satisfaction :** le dernier avis daté est une règle provisoire d’audit ; elle sera définie formellement en E2. Les 646 commandes livrées sans avis restent exclues de la moyenne, mais pas des autres KPI.

**Attention :** le montant des articles est une mesure de ventes brutes observées, pas la marge, le résultat comptable ni le revenu net d’Olist. Le taux de réachat mesuré est **observé dans la fenêtre du dataset** ; il n’est pas une probabilité de fidélisation générale.

## Périmètre temporel

- Première commande : `2016-09-04 21:15:19` ; dernière : `2018-10-17 17:30:18`.
- **Fenêtre principale recommandée : janvier 2017 → août 2018**, selon la date d’achat. Les mois de 2016 et septembre–octobre 2018 ont une couverture partielle ou très faible.
- Pour une comparaison « même période », utiliser janvier–août 2017 vs janvier–août 2018 et documenter le biais de croissance du périmètre historique.
- Pour RFM/cohortes, figer la date de référence, la période d’observation et la censure à droite ; distinguer nombre de commandes et nombre de clients.

## Contrat d’analyse et décisions pour E2

1. Charger les **9 tables sources** dans PostgreSQL en conservant les fichiers sans modification et les types contrôlés.
2. Tester les clés primaires candidates et les relations ; **pas de PK artificielle sur `review_id` ni sur `geolocation_zip_code_prefix`**.
3. Créer une table analytique **commande** séparée d’une table **article** ; agréger les paiements et avis avant leurs jointures avec commandes.
4. Règle de ventes : **prix d’articles des commandes livrées, hors fret**. Envisager un indicateur séparé du total des paiements, sans les confondre.
5. Définir la politique de satisfaction par commande pour les commandes avec plusieurs avis (p. ex. dernier avis daté après vérification ; garder les enregistrements sources).
6. Préserver les catégories absentes sous « non renseignée » et documenter les catégories sans traduction.
7. Agréger/dédupliquer la géolocalisation par préfixe, sans éliminer les clients non géolocalisables des KPI globaux.
8. Fixer un référentiel commun de définitions des KPI pour SQL, Python, Excel et Power BI.

## Verdict E1

**GO pour E2 — modélisation PostgreSQL.** Les données présentent des liens cohérents et permettent de calculer les neuf KPI proposés sous réserve d’expliciter la règle de satisfaction et le périmètre de livraison. Les anomalies identifiées sont gérables et ne nécessitent pas de supprimer les lignes sources. Aucun dépôt Commerce 360 ni table PostgreSQL n’a encore été créé durant E1.
