# Commerce 360 — E4 · Reporting Excel (cadrage de réalisation)

**Statut : neuf exports E4 générés avec succès sur Windows le 16 octobre 2026 ; classeur Excel validé fonctionnellement le 17 octobre 2026. Le fichier `manifest.json` séparé et la publication du binaire restent à traiter.**
**Source :** vues PostgreSQL E3 fusionnées dans main après recette utilisateur Windows.
**Aucun réimport des CSV Olist, aucune modification des tables source.**

## 1. Objectif métier

Construire un classeur Excel professionnel, actualisable avec Power Query,
qui démontre la maîtrise des tableaux structurés, tableaux croisés dynamiques
(TCD), segments (slicers), formules Excel, contrôles de cohérence et graphiques.

Le classeur doit permettre à un responsable commercial de :
- suivre le volume de commandes, les ventes d'articles et le panier moyen ;
- comparer janvier–août 2017 à janvier–août 2018 à périodes comparables ;
- identifier catégories et vendeurs contributeurs ;
- observer les clients réacheteurs par mois de première commande observé ;
- comparer ponctualité des livraisons et satisfaction ;
- présenter au minimum trois pistes d'action avec limites.

**Ne pas construire une seconde application React.**

## 2. Contrat des données Excel (E3 -> CSV -> Power Query)

La préparation s'appuie sur neuf exports CSV **issus des vues E3 existantes**.
L'export est lu depuis la base Commerce 360 locale, en lecture seule. Il ne
modifie ni les sources Olist ni le schéma analytique.

| Fichier CSV | Grain / volume de référence | Utilisation |
|---|---|---|
| fact_delivered_orders.csv | 1 commande livrée ; 96 211 lignes | TCD mensuels, par État, notes, montant par commande |
| monthly_sales.csv | 1 mois, 20 lignes | Ventes, volumes, panier moyen, évolution |
| yoy_jan_aug.csv | 1 mois de janvier–août, 8 lignes | Comparaison 2017/2018 |
| category_sales.csv | 1 catégorie | Classement, contribution, frais de livraison |
| seller_sales.csv | 1 vendeur | Répartition des ventes et concentration |
| customer_cohorts.csv | 1 cohorte mensuelle, 20 lignes | Réachat observé et censure à droite |
| delivery_states.csv | 1 État acheteur | Retard, satisfaction, délai nettoyé |
| delivery_satisfaction.csv | 1 groupe de ponctualité, 3 lignes | Retard vs satisfaction, descriptif |
| quality_summary.csv | 1 rapport d'anomalies, 1 ligne | Contrôles de transparence |

**Période :** date d'achat >= 01/01/2017 et < 01/09/2018 ;
montants en réals brésiliens (BRL), hors fret pour le KPI « ventes ».
Les références E1/E2 sur toute l'archive (96 478 commandes) ne doivent
pas être confondues avec les références E3 sur 20 mois (96 211).

Les exports CSV et un manifest de contrôle restent dans \`.data/e4/\` ;
ce dossier et les CSV sont exclus de Git. Ne jamais versionner \`.env\`,
\`.venv\`, \`archive.zip\` ni les données extraites par mégarde.

## 3. Classeur réalisé : Commerce_360_E4_Final.xlsx (livrable local)

| Feuille | Rôle |
|---|---|
| 00_Guide | Description du dataset, période, définitions et méthode d'actualisation |
| 01_Pilotage | 4 KPI, tendance mensuelle et comparatif 2017 / 2018 |
| 02_Ventes | Tableau croisé mensuel et classements produits/vendeurs |
| 03_Clients | Clients observés, réacheteurs et cohortes (sans inférence causale) |
| 04_Livraisons | Ponctualité, délai moyen et notes par État |
| 05_Qualite | Comptes de contrôles et limites de source |
| D_* | Huit tableaux de synthèse structurés Excel (instantanés E3), non tous reliés directement à Power Query |
| D_Extrait | Extrait de 500 commandes, non exhaustif |
| TCD_Livraisons | Livraisons selon mois / ponctualité, segment `customer_state` |
| TCD_Ventes | Somme des ventes et nombre de commandes par mois |
| TCD_GraphiqueVentes | Courbe mensuelle en BRL, même segment géographique |

Approche Excel : chargement CSV via **Données > Obtenir des données > À partir
d'un dossier ou Texte/CSV**, typage dans Power Query (date, nombre décimal,
texte), création de tableaux structurés et de TCD, graphiques, segments pour
les dimensions pertinents, formules lisibles et valeurs de contrôle.

**Ne pas faire une moyenne simple de taux régionaux** :
- taux de retard global = SUM(late_deliveries) / SUM(dated_deliveries) ;
- panier moyen global = SUM(item_sales_brl) / SUM(delivered_orders) ;
- note globale = moyenne pondérée par scored_orders, ou moyenne sur
  fact_delivered_orders non filtrée de ses avis manquants.
- le nombre orders_with_seller et orders_with_category ne s'additionne pas
  entre les catégories / vendeurs.
- la segmentation RFM avancée reste prévue en E5, pas en E4.

## 4. Générer les neuf exports sur Windows

Depuis Antigravity / PowerShell, dans le dossier \`commerce-360\` :

~~~powershell
git switch main
git pull --ff-only origin main
git fetch origin
git switch --track origin/feature/e4-excel-preparation
docker compose ps
.\.venv\Scripts\python.exe scripts\export_e4.py
~~~

**Ne pas changer de branche si des fichiers locaux non committés sont présents :
vérifier \`git status\` d'abord.** Si la branche E4 existe déjà localement,
exécuter \`git switch feature/e4-excel-preparation\`.

Sortie attendue : \`.data/e4/\` contient neuf CSV et \`manifest.json\` avec
nombre de lignes et SHA-256. L'export a été **exécuté avec succès par l'utilisateur le 16 octobre 2026** sur son PostgreSQL Docker local. La capture du terminal Antigravity montre les neuf fichiers et le message `E4 exports prepares : 9 CSV`. La présence et le contenu de `manifest.json`, créé par le script, restent à vérifier indépendamment avant d'assembler le classeur.

L'export doit être **refusé** si la base n'est pas nommée \`commerce360\`,
si les résultats E3 diffèrent ou si les volumes des principaux exports ne
sont pas ceux attendus. Aucun script de modification de PostgreSQL n'est
appelé.

## 5. Références de contrôle E4

| KPI | Valeur attendue (E3, 20 mois) |
|---|---:|
| Commandes livrées | 96 211 |
| Prix d'articles, hors fret | 13 181 027,13 BRL |
| Panier moyen | 137,00 BRL |
| Clients uniques livrés | 93 104 |
| Réacheteurs observés | 2 789 |
| Livraisons tardives | 7 822 |
| Livraisons avec dates connues | 96 203 |
| Taux de retard | 8,13 % |
| Catégorie leader | health_beauty |
| Ventes health_beauty | 1 229 557,50 BRL |

Rapprocher chaque synthèse Excel avec E3, en conservant les mêmes définitions
et la période identique. Les valeurs exactes et arrondis se calculent par
formules/TCD, non en saisie manuelle.

## 6. Critères de réussite (pour déclarer E4 terminée)

- [x] Export PostgreSQL E3 -> **9 CSV locaux réussi** (capture du terminal, 16/10/2026).
- [ ] Fichier `manifest.json` local présent et contenu vérifié (nombres de lignes, SHA-256).
- [x] Vrai fichier XLSX reçu et inspecté, modèle de données Power Query natif,
      tables Excel, formules et objets croisés (pas une maquette).
- [x] TCD ventes et livraisons, graphique croisé de ventes et Power Query pour
      `fact_delivered_orders` actualisables. Les synthèses catégories/vendeurs `D_*`
      restent des tables statiques à reconstruire si les exports changent.
- [x] Segment `customer_state` partagé entre les trois objets croisés et navigation Excel testée.
- [x] KPI et dénominateurs cohérents entre Excel et PostgreSQL E3, 10 contrôles `OK`.
- [x] Trois constats métier descriptifs, documentés dans [la recette](e4-excel-recette.md), sans causalité revendiquée.
- [x] Recette Windows : ouverture, actualisation, filtres/TCD, aucune erreur (confirmation utilisateur).
- [ ] Documentation et version partageable nettoyées, sans secrets ni CSV bruts.

**Point d'arrêt E4 :** E4.4 est validée sur Excel Windows ; pour E4.5, rester transparent sur la vérification du manifeste séparé, les chemins locaux dans la requête et la distribution du XLSX avant la clôture GitHub.

## 7. Retour d'exécution E4 — Windows (16 octobre 2026)

L'utilisateur a exécuté \`.\.venv\Scripts\python.exe scripts\export_e4.py\`
dans le dossier \`commerce-360\` après passage sur la branche E4.
**Les neuf CSV ont été générés :**

| Export | Lignes mesurées |
|---|---:|
| fact_delivered_orders.csv | 96 211 |
| monthly_sales.csv | 20 |
| yoy_jan_aug.csv | 8 |
| category_sales.csv | 74 |
| seller_sales.csv | 2 945 |
| customer_cohorts.csv | 20 |
| delivery_states.csv | 27 |
| delivery_satisfaction.csv | 3 |
| quality_summary.csv | 1 |

Dossier signalé : \`.data/e4/\` (hors Git). Un avertissement Python
non bloquant \`SyntaxWarning: invalid escape sequence\` concernait
uniquement la chaîne de documentation contenant le chemin Windows.
Il a été corrigé en remplaçant la docstring par une chaîne brute ;
les exports précédents restent valides.

**Livrable reçu le 17 octobre 2026 :** `Commerce_360_E4_Final.xlsx`, 18 feuilles, modèle Power Query contenant 96 211 lignes, deux TCD et un graphique croisé, contrôles et recette Windows validés. Le `manifest.json` séparé n'a pas été joint ; ses neuf SHA-256 ne peuvent pas être revérifiés indépendamment depuis ce seul XLSX. Voir [docs/e4-excel-recette.md](e4-excel-recette.md).
