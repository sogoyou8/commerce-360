# Commerce 360 — E8 | Bilan analytique public

**Projet DATA 02 · analyse exploratoire d'un jeu de données e-commerce Olist historique (Brésil).** Cette synthèse agrégée est conçue pour un dépôt de code et un portfolio ; elle ne contient ni identifiant client ni ligne transactionnelle.

## Question et démarche

Que révèlent les ventes, les livraisons, la satisfaction et les comportements d'achat **observés** sur les 20 mois allant du **01/01/2017 inclus au 01/09/2018 exclu** ?

Pipeline effectivement réalisé : audit des neuf CSV Olist (E1) → ingestion et vues PostgreSQL (E2/E3) → restitution Excel/Power Query (E4) → segmentation RFM historique (E5) → rapport Power BI Desktop/Power Query/DAX (E6) → rapprochement SQL et revue métier (E7).

La source est **historique** ; le modèle de réachat est descriptif et utilise le cutoff fixe **01/09/2018**. Les montants sont en **BRL**, en prix d'articles de commandes livrées **hors frais de livraison**. Ils ne sont **ni** un chiffre d'affaires net, **ni** une marge.

## Chiffres de référence vérifiés sur les captures locales E6–E7

| Indicateur | Périmètre et valeur |
|---|---:|
| Commandes avec achat dans la période, tous statuts | 99 092 |
| Commandes livrées | 96 211 |
| Ventes d'articles livrés, hors fret | **13 181 027,13 BRL** |
| Panier moyen par commande livrée | **137,00 BRL** |
| Clients uniques observés, commandes livrées | **93 104** |
| Clients ayant au moins deux achats livrés observés | **2 789 (3,00 %)** |
| Livraisons en retard | **7 822 / 96 203 datées (8,13 %)** |
| Délai moyen nettoyé, achat → livraison | **12,54 jours** |
| Note moyenne des commandes livrées notées | **4,16 / 5** |
| Avis négatifs globaux (notes ≤ 2), commandes notées | **12,80 %** |
| Segments RFM exclusifs / lignes cohorte-segment | **7 / 83** |

**Traçabilité :** références indépendantes `docs/e3-reference-offline.md` et `docs/e5-rfm.md` ; tableaux PostgreSQL `sql/08_e7_checks.sql` exécutés localement avec `E7 SQL OK` ; rapprochement descriptif `docs/e7-validation.md`. Les KPI du PBIX ont été **observés sur captures utilisateur**, non extraits d'un PBIX par CI.

## Les cinq pages Power BI réellement construites

| Page | Ce qui est visible et utile |
|---|---|
| **01_Vue d'ensemble** | Quatre KPI de commerce/livraison et évolution mensuelle des ventes |
| **02_Ventes** | Top 10 des catégories et ventes par État des vendeurs |
| **03_Livraisons** | Volume et taux de retard, délai moyen, comparaison géographique par État |
| **04_Qualité** | Note moyenne, part d'avis négatifs et comparaisons selon la ponctualité |
| **05_Clients** | Population et réachat observés, répartition et ventes par segment RFM |

Le rapport est disponible **uniquement dans Power BI Desktop local** (`Commerce_360_E6.pbix`). Il n'est pas publiable tel quel : il peut embarquer des commandes détaillées et un chemin de fichier Windows. Les tables agrégées de grains différents ne filtrent pas magiquement toutes les autres tables.

## Quatre constats et pistes d'analyse

1. **Livraisons géographiquement hétérogènes.** L'État client **CE** a **196 retards parmi 1 273 livraisons (15,40 %)**, avec **21,24 jours** de délai moyen nettoyé, contre **8,13 %** et **12,54 jours** à l'échelle du périmètre. Priorité : examiner les volumes comparables, itinéraires et délais ; ne pas attribuer une cause à un transporteur sans étude dédiée.
2. **Ponctualité et satisfaction associées.** Parmi les commandes notées, les livraisons **tardives** ont une moyenne **2,57 / 5**, et **54,05 %** des notes sont ≤ 2 ; les livraisons **à l'heure** affichent **4,29 / 5** et **9,20 %** d'avis négatifs. Il s'agit d'une **association descriptive, pas d'un effet causal démontré**.
3. **Rachat observé peu fréquent dans la fenêtre.** **2 789 / 93 104** clients ont au moins deux commandes livrées ; **36 145** appartiennent au segment « achat unique moins récent ». Les cohortes récentes n'ont pas un recul équivalent : **3,00 % ne mesure ni le churn ni la fidélité actuelle**.
4. **Catégories concentrées.** `health_beauty` pèse **1 229 557,50 BRL** de prix d'articles livrés (environ **9,33 %** du total). Cela n'indique ni la marge, ni la rentabilité de la catégorie.

## Contraintes et limites

- **Données jusqu'en 2018**, sans actualisation temps réel, prédiction ou extrapolation actuelle.
- Le **périmètre des clients**, du fret, des commandes datées et des avis valides diffère selon la mesure ; un même dénominateur ne s'applique pas partout.
- **Biais de fenêtre / censure de cohortes** : une période observée courte ne permet pas une estimation de rétention sans protocole complémentaire.
- Les **vues agrégées** catégories/vendeurs/RFM sont des objets descriptifs de grains distincts ; ne pas les relier arbitrairement à la table de faits, ni additionner des comptes de commandes par catégorie.
- Les captures valident plusieurs filtres (CE, groupe `late`, segment « achat unique »), **pas** un audit exhaustif de toutes les interactions ou un test automatisé du PBIX.

## Niveau de preuve

| Contrôle | État |
|---|---|
| PostgreSQL E3/E5 et rapprochement E7 sur machine utilisateur | **E7 SQL OK** visible en captures (18/10/2026) |
| Exports E4/E5, 12 SHA-256 et montants | **E6 OK** visible en captures |
| Contrats Python E2–E7 sur machine utilisateur | **35 tests OK** visibles en captures |
| CI GitHub sur `main` après PR #5 | **Verte** sur le commit `24cd2760` |
| Cinq pages Power BI et interactions CE / ponctualité / RFM | **Captures Power BI observées** |
| PBIX ouvert et audité automatiquement / service Power BI public | **Non effectué** |
| `Actualiser tout` Power BI documenté, 3 mesures DAX à 0, filtre SP et YoY vérifiés exhaustivement | **Preuves complémentaires à recueillir** |

**Sources :** [E3 — référence indépendante](e3-reference-offline.md) · [E5 — méthodologie RFM](e5-rfm.md) · [E6 — pages réelles et recette](e6-powerbi.md) · [E7 — SQL et contrôles](e7-validation.md).