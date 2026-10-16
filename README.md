# Commerce 360 — E2 · Modèle relationnel PostgreSQL validé

**Projet DATA 02 · Olist (données e-commerce historiques, Brésil 2016–2018)**

## Statut réel

- ✅ **E0** : cadrage métier.
- ✅ **E1** : audit direct des 9 CSV (`docs/audit-e1.md`).
- ✅ **E2 — terminé le 16 octobre 2026** : neuf tables typées, import transactionnel, contraintes FK/PK, grains commande et article, vues analytiques, tests hors ligne et contrôle de qualité SQL.
- ✅ **E2 — intégration PostgreSQL locale confirmée par l'utilisateur** : conteneur Docker PostgreSQL 16 `healthy`, neuf CSV importés, contrôles SQL réussis (`E2 PostgreSQL : import, contrôles et vues validés. Transaction confirmée.`) et requête `mart.v_kpi_global` exécutée avec résultats conformes à E1. Preuves : sorties du terminal Antigravity fournies le 16 octobre 2026 ; ce n'est pas un déploiement cloud.
- ✅ **E2 — GitHub** : code publié sur `main` dans [sogoyou8/commerce-360](https://github.com/sogoyou8/commerce-360) ; commit initial [`656d5fa`](https://github.com/sogoyou8/commerce-360/commit/656d5fa1ad8c2218cd927b8dc466a684c7ac9ee1). `.env`, `.venv` et `archive.zip` ne sont pas versionnés.
- ⏭️ **E3 — à venir** : analyses SQL commerciales détaillées, découpages temporels et territoriaux, catégories, vendeurs, clients et qualité de livraison.

## Structure

```text
compose.yaml                   PostgreSQL 16 local (Docker, port 5433)
.env.example                   Connexion locale de démonstration (aucun secret réel)
requirements.txt               Pilote Python PostgreSQL (psycopg)
sql/01_source.sql              9 tables Olist, clés & contraintes
sql/02_mart.sql                Vues agrégées, commande/article, référentiel géo
sql/03_quality.sql             Contrôles de volumes, grains, KPI et anomalies
scripts/import_olist.py        Chargement des 9 CSV depuis le ZIP, en transaction
tests/test_e2_contract.py      Contrats structurels hors ligne
docs/audit-e1.md               Résultats mesurés de l'audit E1
docs/audit-e1-results.json     Références machine de l'audit E1
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
