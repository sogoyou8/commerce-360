# Commerce 360 — E0 à E5 intégrés · E6 Power BI validée localement, E7 contrôlée

**Projet DATA 02 · Olist (données e-commerce historiques, Brésil 2016–2018)**

## Statut réel

- ✅ **E0** : cadrage métier.
- ✅ **E1** : audit direct des 9 CSV (`docs/audit-e1.md`).
- ✅ **E2 — terminé le 16 octobre 2026** : neuf tables typées, import transactionnel, contraintes FK/PK, grains commande et article, vues analytiques, tests hors ligne et contrôle de qualité SQL.
- ✅ **E2 — intégration PostgreSQL locale confirmée par l'utilisateur** : conteneur Docker PostgreSQL 16 `healthy`, neuf CSV importés, contrôles SQL réussis (`E2 PostgreSQL : import, contrôles et vues validés. Transaction confirmée.`) et requête `mart.v_kpi_global` exécutée avec résultats conformes à E1. Preuves : sorties du terminal Antigravity fournies le 16 octobre 2026 ; ce n'est pas un déploiement cloud.
- ✅ **E2 — GitHub** : code publié sur `main` dans [sogoyou8/commerce-360](https://github.com/sogoyou8/commerce-360) ; commit initial [`656d5fa`](https://github.com/sogoyou8/commerce-360/commit/656d5fa1ad8c2218cd927b8dc466a684c7ac9ee1). `.env`, `.venv` et `archive.zip` ne sont pas versionnés.
- ✅ **E3 — clôturée le 16 octobre 2026** : 12 vues SQL appliquées sur PostgreSQL local, 13 tests Python réussis, rapprochement des commandes et ventes avec les CSV indépendants (96 211 commandes livrées ; 13 181 027,13 BRL d'articles sur janvier 2017–août 2018). [Recette E3](docs/e3-analyses-sql.md) ; [référence CSV indépendante](docs/e3-reference-offline.md). **[PR #1 fusionnée dans `main`](https://github.com/sogoyou8/commerce-360/pull/1)**, commit [`10117a9`](https://github.com/sogoyou8/commerce-360/commit/10117a96b950a73498c8b92d08c3e0de4af49858). Aucune modification de la base PostgreSQL lors de la fusion.
- ✅ **E4 — clôturée le 17 octobre 2026** : neuf CSV exportés depuis E3, classeur local réel de 18 feuilles, Power Query et modèle de données (96 211 commandes), deux TCD et un graphique croisé dynamique filtrés par le segment commun `customer_state`. L'utilisateur a confirmé une actualisation Excel sans erreur. **[PR #2 fusionnée dans `main`](https://github.com/sogoyou8/commerce-360/pull/2)**, commit [`861fd14`](https://github.com/sogoyou8/commerce-360/commit/861fd14d101f52bdcc955d2311b074b4940963f4). Le XLSX reste local, non distribué publiquement : [recette E4](docs/e4-excel-recette.md).
- ✅ **E5 — clôturée le 17 octobre 2026** : tests Python, recette SQL PostgreSQL locale, 7 segments, 83 lignes d'agrégats cohorte, 3 CSV locaux et réconciliation de **93 104 clients / 96 211 commandes / 13 181 027,13 BRL**. Sortie Docker et KPI attestés par les captures de l'utilisateur. **[PR #3 fusionnée dans `main`](https://github.com/sogoyou8/commerce-360/pull/3)**, commit [`e8964cc`](https://github.com/sogoyou8/commerce-360/commit/e8964cc1daa4e34e8d1a81dde33426ad29b802c1). [Méthode et recette E5](docs/e5-rfm.md).

## Structure

```text
compose.yaml                   PostgreSQL 16 local (Docker, port 5433)
.env.example                   Connexion locale de démonstration (aucun secret réel)
requirements.txt               Pilote Python PostgreSQL (psycopg)
sql/01_source.sql              9 tables Olist, clés & contraintes
sql/02_mart.sql                Vues agrégées, commande/article, référentiel géo
sql/03_quality.sql             Contrôles de volumes, grains, KPI et anomalies
sql/04_e3_analysis.sql          12 vues SQL métier sur janvier 2017-août 2018
sql/05_e3_checks.sql            Recette E3 : référentiels E2, grains, KPI et vues
sql/06_e5_rfm.sql               5 vues RFM et segments historiques, sans données modifiées
sql/07_e5_checks.sql            Recette E5 : grains, montants, ex æquo, cohortes
scripts/import_olist.py        Chargement des 9 CSV depuis le ZIP, en transaction
scripts/run_e3.ps1             Recette E3 Windows en une commande
scripts/export_e4.py           Exports PostgreSQL E3 -> CSV Excel (lecture seule)
scripts/run_e5.ps1              Recette RFM Windows E5 en 5 étapes
scripts/export_e5.py           3 CSV agrégés E5 sans identifiants clients
tests/test_e2_contract.py      Contrats structurels hors ligne
tests/test_e3_contract.py      Contrats structurels E3 hors ligne
tests/test_e4_preparation.py    Contrats des exports E4 hors ligne
tests/test_e5_contract.py       Contrats des scores et segmentations E5 hors ligne
docs/audit-e1.md               Résultats mesurés de l'audit E1
docs/audit-e1-results.json     Références machine de l'audit E1
docs/e3-analyses-sql.md         Règles et procédure E3 Windows / PostgreSQL
docs/e3-reference-offline.md    Référence E3 calculée indépendamment des vues SQL
docs/e4-excel-plan.md           Cahier des charges Excel, KPI et validation
docs/e4-excel-recette.md        Audit du classeur Excel, KPI, recette et limites de partage
docs/e5-rfm.md                 Cadrage, SQL, mode d'emploi et limites RFM E5
```

## Import local — Windows / Docker Desktop

Prérequis : **Python 3.10+**, **Docker Desktop démarré** et `archive.zip` Olist original (9 CSV). Le ZIP n'est pas conservé dans GitHub.

Dans PowerShell, depuis le dossier extrait de ce projet :

```powershell
docker compose up -d
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe scripts\import_olist.py --zip "C:\chemin\vers\archive.zip"
```

Le chargement passe par PostgreSQL sur `localhost:5433` (mot de passe **local de développement seulement**). Il charge **toutes** les données, reconstruit les vues et s'interrompt avec rollback si un contrôle échoue.

Vérifier les KPI en SQL :

```powershell
docker compose exec postgres psql -U commerce360 -d commerce360 -c "SELECT * FROM mart.v_kpi_global;"
```

**Référence attendue (fichier E1) :** 96 478 commandes livrées, ventes articles 13 221 498,11 BRL, panier 137,04 BRL, 93 358 clients, 2 801 réacheteurs, 7 826 livraisons tardives / 96 470 datées, satisfaction environ 4,16/5. Tout écart bloque E2.

Pour stopper PostgreSQL sans effacer les données : `docker compose down`. **Ne pas exécuter** `docker compose down -v` si vous souhaitez les conserver.

## E3 — analyses commerciales (terminée)

Les vues E3 couvrent ventes et paniers mensuels, comparaison janvier-août 2017/2018, catégories, vendeurs, réachat, cohortes, livraisons par État et satisfaction selon les retards.

Pour appliquer puis tester **sans réimporter les CSV**, suivre les commandes de [docs/e3-analyses-sql.md](docs/e3-analyses-sql.md). Le contrôle de données E3 doit reproduire, sur la période de janvier 2017 à août 2018, **96 211 commandes livrées** et **13 181 027,13 BRL de prix d'articles**, indépendamment recalculés depuis l'archive d'origine. Ces mesures ne remplacent pas les chiffres globaux E1/E2.

**Statut actualisé au 18 octobre 2026 :** E3, E4 et E5 intégrées à `main` ; rapport Power BI E6 à cinq pages réalisé et testé en captures sur le PC utilisateur ; 12 exports E4/E5 validés (`E6 OK`) ; rapprochement PostgreSQL E7 validé (`E7 SQL OK`) et 35 tests Python locaux réussis. **Les PR #4 (E6) et #5 (E7) ne sont pas encore fusionnées dans `main`**. Voir `docs/e6-powerbi.md` et `docs/e7-validation.md` (sur la branche E7).

## E4 — Excel (recette fonctionnelle validée)

Les neuf exports E4 issus de PostgreSQL E3 ont été générés localement en lecture seule avec `scripts/export_e4.py` le 16 octobre 2026. Le classeur **`Commerce_360_E4_Final.xlsx` a été fourni et audité le 17 octobre 2026** : 18 feuilles, 96 211 commandes dans le modèle de données, deux TCD, un graphique croisé dynamique mensuel et un segment géographique relié aux trois objets. Les KPI sont réconciliés avec E3 (96 211 commandes, 13 181 027,13 BRL de prix d'articles hors fret ; filtre SP : 40 406 commandes). **Actualiser tout** a été exécuté sans erreur, selon confirmation de l'utilisateur.

Procédure d'export depuis le dépôt :

```powershell
.\\.venv\\Scripts\\python.exe scripts\\export_e4.py
```

Les neuf fichiers CSV et le manifeste restent dans `.data/e4/` et **ne sont pas publiés**. Le classeur XLSX n'est **pas ajouté à cette PR** : il contient les lignes détaillées dans son modèle de données et conserve un chemin Windows absolu, à nettoyer ou à documenter avant toute distribution publique. Seule la requête `fact_delivered_orders` est alimentée par Power Query ; les huit feuilles de synthèse `D_*` ne disposent pas toutes d'une requête d'actualisation autonome.

- [Spécifications E4](docs/e4-excel-plan.md)
- [Recette et limites de publication du classeur E4](docs/e4-excel-recette.md)
- [PR #2 — E4 exports et documentation](https://github.com/sogoyou8/commerce-360/pull/2) : fusionnée ; le manifeste E4 séparé n'a pas été audité indépendamment.

## E5 — Segmentation client RFM (recette PostgreSQL validée)

E5 exploite **93 104 clients**, **96 211 commandes livrées** et **13 181 027,13 BRL** d'articles sur la fenêtre d'achat E3 de 20 mois. Les scores sont calculés à date fixe **2018-09-01**, pas à la date actuelle : récence et montants en groupes à ex æquo conservés, fréquence selon **1 / 2 / 3+ commandes**. Sept segments exclusifs décrivent des comportements **observés**, jamais une probabilité de churn ni le statut actuel d'un client.

**Recette Windows (une commande) :**

```powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\run_e5.ps1
```

Le script applique seulement cinq **vues `mart.e5_*`**, contrôle les agrégats contre E2/E3, puis exporte trois synthèses sans identifiants clients dans `.data/e5/` (non versionné). Il ne relance pas l'import Olist et ne modifie aucune table source. Les comptes réels par segment et la réussite de la recette SQL ont été constatés depuis les captures du Docker Windows de l'utilisateur, le 17 octobre 2026. **Ils se rapportent aux achats historiques Olist, pas au comportement actuel.** Le détail des 7 segments (dont 927 champions observés, 10 257 clients de forte valeur récente, 36 145 achats uniques moins récents) et les preuves sont dans la recette E5.

- [Spécifications, critères et limites E5](docs/e5-rfm.md)

## E6 — Restitution Power BI Desktop réalisée localement

Rapport `Commerce_360_E6.pbix` visible en captures utilisateur (pas publié dans le dépôt) : `01_Vue d'ensemble`, `02_Ventes`, `03_Livraisons`, `04_Qualité`, `05_Clients`. Données historiques E3/E5, mesures DAX, agrégats descriptifs et filtres validés sur CE, ponctualité et segments RFM. La référence technique complète et les points complémentaires de contrôle se trouvent dans `docs/e6-powerbi.md`. Le fichier PBIX, les exports `.data/` et les données clients individuelles **restent locaux**.

## E6 — Sources Power BI versionnées, recette Desktop observée

- Le validateur en lecture seule scripts/validate_e6.py vérifie les 12 CSV E4/E5, les 12 empreintes SHA-256 et les totaux.
- Le répertoire powerbi/queries contient 12 requêtes Power Query typées plus la fonction fnLocalCSV.
- powerbi/E6_Mesures_DAX.dax présente les mesures métier, le calendrier et les contrôles.
- docs/e6-powerbi.md décrit les 5 pages attendues et la recette locale Power BI Desktop.
- **Le PBIX est assemblé et a été utilisé dans les captures Windows** ; le validateur E6 et les KPI SQL E7 concordent. Il n'a pas été audité automatiquement par GitHub et reste exclu du dépôt. Quelques preuves complémentaires (rafraîchissement exhaustif, trois contrôles DAX à zéro, filtre SP, YoY) restent explicitement identifiées dans la recette, sans annuler les tests fonctionnels déjà montrés.

## Tests hors ligne

```powershell
py -m unittest discover -s tests -v
```

Ces tests vérifient les contrats sans connexion PostgreSQL. La **validation réelle** des vues SQL et du chargement nécessite `scripts/import_olist.py` contre PostgreSQL et la réussite de `sql/03_quality.sql`.

## Contrat métier

- **Grain commande** : `mart.v_orders` (1 ligne par commande, y compris annulée) ; `mart.v_kpi_global` restreint aux **livrées**.
- **Grain article** : `mart.v_items` (1 ligne par article). Ventes = `SUM(price)` des articles de commandes livrées, **hors frais de livraison** ; il ne s'agit pas du chiffre d'affaires net d'Olist.
- **Multi-paiements** : regroupés par commande avant jointure ; valeur de paiement séparée du montant des articles.
- **Multi-avis** : dernier avis selon la date de création, puis de réponse, puis clé technique ; `review_id` n'est pas unique. Avis source conservés.
- **Géolocalisation** : les coordonnées exactes répétées sont dédupliquées pour le résumé, puis médiane des coordonnées dans l'emprise approximative du Brésil ; lignes brutes conservées. Les clients sans ZIP géolocalisable ne sont pas éliminés.
- **Catégories** : libellé traduit si connu, sinon portugais source, sinon `non renseignée`. Pas de FK obligatoire vers traduction : 13 produits ne correspondent pas aux 71 traductions.
- **Livraison tardive** : réelle > estimée uniquement parmi les commandes livrées avec dates valides ; une livraison sans date ne compte pas au dénominateur.
- **Délai** : achat → livraison réelle en jours, sans supprimer les données source ; `carrier_date_after_delivery` signale les 23 cas suspects pour E3.
- **Période** : vues E2 sur **toute l'archive** pour permettre le rapprochement avec E1 ; E3 appliquera la fenêtre analytique principale janvier 2017 à août 2018.

## Limites et garde-fous

Cette étape prépare un socle **local**, pas une application en production. Aucun serveur cloud, déploiement, abonnement ou coût n'a été engagé. Le pilote Python contient une fonction de remise à zéro **uniquement des neuf tables du schéma `source`** de la base indiquée ; utilisez une base Commerce 360 dédiée. Les CSV bruts ne sont pas modifiés. Les vues peuvent être reconstruites sans double comptage.

À la fin de l'import PostgreSQL, confronter les résultats de `mart.v_kpi_global` aux métriques E1. **Contrôle E2 exécuté et confirmé le 16 octobre 2026 sur PostgreSQL local : résultats conformes aux références E1.** Pour toute nouvelle installation, cette vérification reste à rejouer avant de commencer E3.
