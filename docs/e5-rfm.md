# Commerce 360 — E5 · Segmentation client RFM historique

**Statut : recette E5 validée sur PostgreSQL Docker local le 17 octobre 2026 (captures de l'utilisateur). Fusion GitHub PR #3 autorisée, sous réserve de CI verte.**

E0–E4 restent inchangés. La PR E5 ne contient ni données clients, ni CSV, ni modification des tables PostgreSQL existantes. Les 5 vues `mart.e5_*` ont été appliquées sur la base locale déjà peuplée et validée en E3 ; aucune table source n'a été modifiée par le script E5.

## 1. Question métier

À partir des commandes Olist historiques, quels profils de clients **observés** se distinguent par leur récence, leur fréquence d'achat et leur contribution aux ventes d'articles ? Comment prioriser des analyses commerciales sans prétendre connaître la situation du client aujourd'hui ?

Trois sorties attendues :
- parts des clients et des ventes par segment ;
- répartition des segments selon le mois de première commande livrée observée ;
- pistes descriptives d'analyse, avec prudence sur les clients à achat unique et les cohortes récentes.

## 2. Périmètre et grain

| Propriété | Contrat |
|---|---|
| Archive | Olist, Brésil, historique |
| Fenêtre d'achat | **2017-01-01 inclus — 2018-09-01 exclu** |
| Cutoff pour R | **2018-09-01** (date fixe, jamais `CURRENT_DATE`) |
| Population | **93 104 clients** avec au moins une commande livrée dans la fenêtre |
| Commandes | **96 211 commandes livrées** (chaque commande compte une fois) |
| Monetary | **13 181 027,13 BRL** de prix d'articles livrés, hors frais de livraison |
| Identité SQL | `customer_unique_id` de `mart.e3_customers` ; pas `customer_id` |
| Grain | **Une ligne par client** dans `mart.e5_customer_rfm` et `mart.e5_customer_segments` |

La vue `mart.e3_customers` provient des vues E3 déjà validées, sans jointures d'articles, paiements ou avis susceptibles de multiplier les achats.

## 3. Scores RFM

**recency** : jours entre la dernière commande livrée achetée dans la fenêtre et le **2018-09-01**. Un petit nombre signifie un achat plus récent relativement à la fin de l'échantillon.

**frequency** : nombre de commandes **livrées** dans la fenêtre par client. La plupart des clients n'ont qu'un achat ; imposer des quintiles briserait artificiellement des ex æquo.

**monetary** : somme des prix des **articles** achetés au titre des commandes livrées par ce client ; pas un bénéfice ni la somme des paiements.

| Score | Récence | Fréquence | Montant |
|---|---|---|---|
| R = 1…5 | `CUME_DIST` sur la récence **décroissante**, x5 arrondi au-dessus : score 5 = plus récent | n/a | n/a |
| F | n/a | 1 commande → **1** ; 2 commandes → **3** ; ≥3 → **5** | n/a |
| M = 1…5 | n/a | n/a | `CUME_DIST` sur la valeur **croissante**, x5 arrondi au-dessus : score 5 = montant plus élevé |

Les **ex æquo** de R et M obtiennent toujours le même score. Les quintiles R/M peuvent donc avoir des tailles légèrement inégales. `rfm_score = 100*R + 10*F + M` est un code **ordinal descriptif**, pas une probabilité de rachat.

## 4. Règles de segmentation (ordre de priorité)

Les règles sont appliquées **de haut en bas**, chaque client appartient à un seul segment.

| Segment technique | Condition | Lecture métier |
|---|---|---|
| `champions_observed` | F ≥ 2, R ≥ 4 et M ≥ 4 | Réacheteurs récents et montants élevés observés |
| `repeat_recent` | F ≥ 2 et R ≥ 3 | Autres réacheteurs relativement récents |
| `high_value_recent` | M = 5 et R ≥ 3 | Forte valeur récente, y compris achat unique |
| `single_recent` | F = 1 et R ≥ 4 | Achat unique récent dans la fenêtre |
| `repeat_less_recent` | F ≥ 2 et R ≤ 2 | Réacheteurs historiquement moins récents |
| `single_less_recent` | F = 1 et R ≤ 2 | Achat unique historiquement moins récent |
| `other_observed` | Tous les autres | Reste de la population |

Règles exclusives par priorité (pas de double comptage) ; les libellés ne sont pas une prédiction de churn. Un client catégorisé « moins récent » en 2018 peut avoir acheté depuis. **Les achats non livrés ne comptent pas dans F/M** conformément au contrat métier E3 ; c'est un choix de périmètre, pas une affirmation qu'ils n'existent pas.

## 5. Livrables E5

| Objet | Fonction |
|---|---|
| `sql/06_e5_rfm.sql` | Crée 5 vues `mart.e5_*`, sans effacer/mettre à jour les données |
| `mart.e5_customer_rfm` | Scores détaillés **locaux**, avec identifiant client |
| `mart.e5_customer_segments` | Segment individuel **local**, règle exclusive |
| `mart.e5_segments_summary` | KPI agrégés : clients, commandes, ventes, poids de segment |
| `mart.e5_cohort_segments` | Agrégats mensuels croisant cohorte et segment |
| `mart.e5_quality_summary` | Qualité et réconciliation |
| `sql/07_e5_checks.sql` | Recette SQL bloquante E2/E3/E5 |
| `scripts/run_e5.ps1` | Tests + SQL + audit + exports, sans réimport Olist |
| `scripts/export_e5.py` | Exporte **3 CSV agrégés sans identifiants** + manifeste de SHA-256 |
| `tests/test_e5_contract.py` | Contrats statiques hors ligne, exécutables en CI |

Les CSV et le `manifest.json` sont exclusivement dans `.data/e5/`, ignoré par Git. **Ne pas publier `mart.e5_customer_rfm` ou `mart.e5_customer_segments` en CSV publics** : ils contiennent des identifiants individuels.

## 6. Exécution réelle — Windows (Antigravity / PowerShell)

Pré-requis : Docker Desktop démarré, conteneur PostgreSQL `commerce-360-postgres-1` sain, base `commerce360` déjà initialisée sur E3, et environnement `.venv` avec `requirements.txt` installé.

Depuis le dossier `commerce-360` :

~~~powershell
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
git switch --track origin/feature/e5-segmentation-rfm
docker compose ps
powershell -ExecutionPolicy Bypass -File .\scripts\run_e5.ps1
~~~

Si la branche E5 existe déjà localement, utiliser `git switch feature/e5-segmentation-rfm`. **Ne pas changer de branche avec des modifications locales non enregistrées.**

Le script effectue cinq opérations :
1. tests hors ligne de tous les contrats E2 à E5 ;
2. vérification Docker ;
3. création des cinq vues E5 dans le schéma `mart` ;
4. recette bloquante (grains, montants, scores, ex æquo, cohortes, segments) ;
5. exports locaux agrégés avec manifeste SHA-256.

À la fin, attendre le message **`E5 : tests, recette SQL et exports locaux termines.`**. Si la commande affiche une erreur, ne pas considérer E5 comme validée et fournir la sortie du terminal pour diagnostic. Aucune commande ne relance `import_olist.py`.

## 7. Recette de cohérence et données attendues

Ces chiffres sont les **références E3 préexistantes**, pas des résultats nouveaux attribués à E5.

| Contrôle | Référence |
|---|---:|
| Clients | 93 104 |
| Réacheteurs observés dans la fenêtre | 2 789 |
| Commandes livrées | 96 211 |
| Somme Monetary | 13 181 027,13 BRL |
| Cohortes de première commande observée | 20 mois |
| Commandes E2 sur archive complète | 96 478 |
| Ventes E2 sur archive complète | 13 221 498,11 BRL |
| Erreur d'identité / score / montant / ex æquo | 0 |
| Somme des segments et des cohortes | Égale aux KPI E3 |

### Résultats observés — recette du 17 octobre 2026

La commande SQL `SELECT segment_label, customers, delivered_orders, item_sales_brl, customer_share_pct, sales_share_pct FROM mart.e5_segments_summary ORDER BY segment_priority` a été exécutée localement, et sa sortie communiquée en capture d'écran. Les valeurs suivantes sont **observées**, et non simulées.

| Segment | Clients | Commandes livrées | Ventes articles (BRL) | Clients (%) | Ventes (%) |
|---|---:|---:|---:|---:|---:|
| Champions observés | 927 | 2 030 | 304 205,92 | 1,00 | 2,31 |
| Réacheteurs récents observés | 872 | 1 805 | 174 107,55 | 0,94 | 1,32 |
| Forte valeur récente observée | 10 257 | 10 257 | 4 044 067,98 | 11,02 | 30,68 |
| Premier achat unique récent observé | 29 166 | 29 166 | 2 243 672,51 | 31,33 | 17,02 |
| Réacheteurs moins récents | 990 | 2 061 | 247 041,57 | 1,06 | 1,87 |
| Achat unique moins récent | 36 145 | 36 145 | 5 041 879,93 | 38,82 | 38,25 |
| Autres profils observés | 14 747 | 14 747 | 1 126 051,67 | 15,84 | 8,54 |
| **Total** | **93 104** | **96 211** | **13 181 027,13** | **≈100** | **≈100** |

Les parts sont arrondies à deux décimales. **2 789 clients** ont au moins deux commandes livrées observées, soit environ **3,00 %** de la population. Les résultats regroupent des caractéristiques historiques, **pas des clients actuellement inactifs**.

**Preuves de recette :** sortie du script local `E5 : tests, recette SQL et exports locaux termines.` ; 3 CSV générés (`segments_summary.csv` : 7 lignes, `cohort_segments.csv` : 83 lignes, `quality_summary.csv` : 1 ligne) et capture SQL des sept segments. Le manifeste SHA-256 est généré par le script local, mais son contenu n'a pas été indépendamment relu. Pas de copie de la base ou des identifiants clients dans le dépôt.

## 8. Interprétation et limites

- **Censure à droite** : une cohorte entrée en août 2018 ne dispose que de peu de temps pour refaire un achat avant le cutoff. Comparer directement le réachat de janvier 2017 à août 2018 serait trompeur.
- **Troncature à gauche** : le premier achat observé en 2017 peut ne pas être le premier achat du client.
- **Données arrêtées en 2018** : ce n'est pas un statut client actuel, ni une base de prospection opérationnelle.
- **Pas de causalite** : aucune règle RFM ne prouve qu'une remise provoquera un réachat, ou qu'un retard en sera la cause.
- **Pas de modèle prédictif** : les scores ne sont pas des probabilités de fidélisation ou de churn.
- **Pas de bénéfice net** : Monetary somme les prix d'articles livrés, hors fret et charges.
- **Qualité/ex æquo** : `CUME_DIST` conserve les scores identiques aux clients de même valeur ; aucun forçage à cinq groupes exactement égaux.
- **Lecture seule** : les exports s'effectuent dans une transaction PostgreSQL `READ ONLY` et refusent un mauvais nom de base. La création des vues E5 ajoute des objets SQL `mart` mais ne modifie aucune donnée source.

## 9. Trois pistes de décision (à personnaliser après les vrais résultats)

1. Observer la part des ventes concentrée parmi les groupes de forte valeur, avant de définir une priorité de service.
2. Comparer les réacheteurs récents aux réacheteurs moins récents sans dire que les seconds sont perdus.
3. Mesurer l'effet de la censure des cohortes récentes **dans la présentation des résultats**, avant toute suggestion de campagne.

**Recette E5 validée** : tests Python, contrôles SQL et exports exécutés sur Windows ; résultats globaux et ventilation des segments examinés. Les contrôles CI GitHub doivent rester verts sur la dernière révision de PR #3. L'utilisateur a confirmé explicitement le 17 octobre 2026 son accord pour corriger l'avertissement Python et fusionner la PR. La revue indépendante du contenu du manifeste local ne peut pas être attestée ici.
