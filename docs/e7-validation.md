# Commerce 360 — E7 · Validation croisée et recommandations métier

**Projet DATA 02 — Olist historique (Brésil).** Statut : **E7 validée localement sur captures Antigravity le 18 octobre 2026** : 35 tests Python réussis, `E7 SQL OK` sous PostgreSQL, comparaisons SQL et Power BI E6 cohérentes. **PR #4 (E6) et PR #5 (E7) fusionnées dans `main` le 18 octobre 2026** ; CI GitHub verte sur le commit `24cd2760`. Le PBIX reste local et n'a pas été inspecté ni publié depuis ce dépôt.

## 1. Contrat de comparaison

- **Période d'achat** : 2017-01-01 inclus à 2018-09-01 exclu (20 mois).
- **Périmètre** : commandes **livrées** pour commandes, ventes, clients, livraisons et satisfaction, sauf contrôles explicitement « tous statuts ».
- **Ventes** : somme des **prix des articles**, hors fret ; ni bénéfice ni chiffre d'affaires net d'Olist.
- **Panier** : montant des articles livrés / nombre de commandes livrées, pas nombre d'articles.
- **Client** : `customer_unique_id` ; réachat observé = au moins deux commandes livrées dans la fenêtre, **pas rétention actuelle**.
- **Retard** : livraison réelle strictement après estimation ; dénominateur = livraisons ayant les dates nécessaires.
- **Satisfaction** : moyenne des avis sélectionnés et taux d'avis ≤ 2 parmi les **commandes notées** ; les commandes non notées ne sont pas comptées.
- **Délai nettoyé** : achat → livraison réelle, hors anomalies où le transporteur reçoit le colis après la livraison ; les anomalies source sont conservées.
- **RFM** : segmentation strictement historique au cutoff du **2018-09-01** ; aucune prédiction de churn ni ciblage de personnes.

## 2. Tableau de rapprochement

Les références SQL/CSV de la colonne centrale sont documentées dans `docs/e3-reference-offline.md`, `docs/e3-analyses-sql.md`, `docs/e5-rfm.md`. Les chiffres « PBIX affiché » proviennent des **captures fournies en conversation** lors de la recette E6, pas d'un PBIX inspecté automatiquement.

| Contrôle | Référence E3/E5 | PBIX affiché lors d'E6 | Lecture |
|---|---:|---:|---|
| Commandes livrées | 96 211 | 96 211 | Conforme à l'unité |
| Ventes articles, BRL, hors fret | 13 181 027,13 | R$ 13,18 M | Conforme à l'arrondi ; valeur complète à vérifier dans une info-bulle ou table |
| Panier moyen | 137,00 BRL | R$ 137,00 | Conforme |
| Clients observés | 93 104 | 93 104 | Conforme |
| Réacheteurs observés | 2 789 | Carte taux : 3,00 % | Taux cohérent ; effectif à confirmer séparément |
| Livraisons tardives | 7 822 | 7 822 | Conforme |
| Livraisons avec dates valides | 96 203 | Non affiché en KPI | À confirmer dans le contrôle SQL |
| Taux de retard | 8,13 % | 8,13 % | Conforme |
| Délai moyen nettoyé | 12,54 j | 12,5 j | Conforme à l'arrondi |
| Note moyenne des commandes notées | 4,16/5 | 4,16 | Conforme |
| Taux global d'avis négatifs | 12,80 % | 12,80 % | Conforme |
| Référence CE : retards | 196 | 196 après sélection CE | Conforme |
| Référence CE : taux | 15,40 % | 15,40 % | Conforme |
| Référence CE : délai | ≈ 21,2 j | 21,2 j | Conforme à l'arrondi affiché |
| Groupe late : note | 2,57/5 | 2,57 après sélection late | Conforme |
| Groupe late : avis négatifs | 54,05 % | 54,05 % | Conforme |
| Catégorie 1 | health_beauty, 1 229 557,50 BRL | health_beauty, environ R$ 1,2 M | Conforme à l'ordre de grandeur |
| Segments RFM | 7 segments, 83 lignes cohorte-segment | 7 segments représentés | Cohortes à vérifier dans les exports |
| Population d'un segment | single_less_recent : 36 145 clients | 36 145 après sélection | Conforme |

**Point essentiel :** l'égalité d'un nombre arrondi sur une capture n'est pas une preuve de l'égalité à tous les décimales ni de la qualité des fichiers locaux. `scripts/validate_e6.py` et `sql/08_e7_checks.sql` constituent les preuves techniques reproductibles à exécuter.

## 3. Interactions Power BI observées

- **03_Livraisons** : après création de la relation active `delivery_states[customer_state]` **1 → *** `fact_delivered_orders[customer_state]`, filtrage à sens unique, sélectionner CE change les trois KPI (196 / 15,40 % / 21,2 j).
- **04_Qualité** : après relation active `delivery_satisfaction[delivery_group]` **1 → *** `fact_delivered_orders[delivery_group]`, filtrage à sens unique, sélectionner late change la note globale (4,16 → 2,57) et le taux d'avis négatifs (12,80 → 54,05 %).
- **05_Clients** : sélection « Achat unique moins récent » : 36 145 clients, taux de réachat observé 0 %. Sélection « Premier achat unique récent observé » : 29 166 clients, taux 0 %. Cohérent avec la définition « achat unique ».
- **01_Vue d'ensemble** : quatre KPI et 20 mois de courbe affichés. **02_Ventes** : top 10 catégories et États vendeurs affichés. Les captures confirment le rendu mais **pas** un test de filtrage croisé exhaustif.

**Attention au modèle :** les deux relations ajoutées l'ont été à la suite de tests concrets. Ne pas relier aveuglément les agrégats vendeurs, catégories, clients et RFM au fait commandes ; les grains diffèrent. Le cahier des charges E6 de la branche précédente décrivait initialement d'autres pages et ne reflète plus exactement la composition réelle à cinq pages ; cette mise à jour documentaire relève d'E8.

## 4. Recette E7 à exécuter sur le PostgreSQL local

Sans import, export ni mutation de données. À partir de la racine du projet sur Windows/PowerShell, avec Docker Desktop démarré et la base E2/E3/E5 existante :

```powershell
docker compose ps
docker compose cp .\sql\08_e7_checks.sql postgres:/tmp/08_e7_checks.sql
docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U commerce360 -d commerce360 -f /tmp/08_e7_checks.sql
```

**Succès obtenu le 18 octobre 2026 (captures terminal fournies par l'utilisateur) :** `SET`, puis `NOTICE: E7 SQL OK : 96211 commandes, 13181027.13 BRL, 93104 clients, 7822 retards, 2789 reacheteurs`, puis `DO` et les cinq sorties de contrôle SQL sans message d'erreur. Les sorties vérifiées indiquent : ventes 13 181 027,13 BRL, panier 137,00 BRL, note 4,16/5, délai 12,54 j ; CE 1 273 livraisons dont 196 retards (15,40 %, 21,24 j) ; groupe `late` 7 822 livraisons, 7 658 notées, 2,57/5, avis négatifs 54,05 % ; 93 104 clients dont 2 789 réacheteurs ; 7 segments. Exécution locale visible, **non reproduite depuis GitHub**. Ne pas utiliser `docker compose down -v`.

**Ressources du conteneur PostgreSQL :** le script applique `SET max_parallel_workers_per_gather = 0;` dans sa propre session afin d'éviter que les scans parallèles ne saturent la mémoire partagée Docker (`/dev/shm`). Cela n'affecte pas les données et ne nécessite ni redémarrage ni suppression de volume.

En cas de persistance de `could not resize shared memory segment ... No space left on device`, examiner d'abord l'occupation de `/dev/shm` :

```powershell
docker compose exec -T postgres sh -c 'df -h /dev/shm; df -i /dev/shm'
```

Ne pas vider manuellement `/dev/shm` ni recréer les volumes de données. Si le segment reste saturé, une augmentation contrôlée de `shm_size` sur le service PostgreSQL (`compose.yaml`) sera examinée séparément, avec arrêt/redémarrage planifié et sauvegarde préalable du volume.

Exécuter ensuite **sur les exports locaux E4/E5** le contrôle de fichiers :

```powershell
.\.venv\Scripts\python.exe scripts\validate_e6.py
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Ce validateur E6 est intégré à `main` depuis la fusion de la PR #4 et fonctionne si les exports locaux E4/E5 et leurs manifestes sont présents. Il vérifie les 12 CSV locaux et leurs manifestes SHA-256. **Résultats locaux confirmés par captures** : `E6 OK : exports E4/E5, SHA-256, grains et montants reconciles` (9 exports E4, 3 E5) ; `Ran 35 tests ... OK` pour les contrats Python E2–E7. Un workflow GitHub vert **ne remplace pas** ces contrôles ni l'ouverture du PBIX. Les captures de la conversation constituent les preuves visibles de recette ; ne publier ni secrets ni données ligne à ligne.

## 5. Constat métier et recommandations raisonnées

1. **Fiabiliser la livraison dans les territoires atypiques.** En CE, le retard observé est de **15,40 %**, contre **8,13 %** sur l'ensemble, et le délai affiché est de **21,2 j**, contre **12,5 j**. Priorité d'investigation : délais de transport, itinéraires et transporteurs, avec contrôle des effectifs et de la comparabilité. **Ce n'est pas la preuve qu'un transporteur déterminé est responsable.**
2. **Étudier l'expérience après retard.** Les commandes tardives notées présentent **2,57/5** et **54,05 %** d'avis ≤ 2, contre **4,29/5** et **9,20 %** chez les commandes ponctuelles notées. Priorité : examiner les commentaires et le suivi des retards ; **association descriptive, non preuve de causalité**.
3. **Analyser les achats uniques sans prétendre prédire la fidélité.** **2 789 / 93 104** clients ont au moins deux achats livrés observés (3,00 %) ; **36 145** sont dans le segment historique « achat unique moins récent ». Recommandation : examiner les cohortes à recul comparable avant toute conclusion de churn.
4. **Concentrer l'analyse produit sur les catégories à poids élevé.** `health_beauty` représente **1 229 557,50 BRL**, environ **9,33 %** du montant d'articles livrés de la fenêtre. Priorité : analyser marges et saisonnalité **seulement si les données nécessaires existent** ; ce montant seul ne mesure pas la rentabilité.

## 6. Verdict et passage E8

**E7 — VALIDÉE localement (18 octobre 2026)** sur les éléments fournis : 35 tests Python `OK`, exports E4/E5 vérifiés avec `E6 OK`, rapprochement PostgreSQL `E7 SQL OK` et cinq tableaux SQL produits, interactions Power BI vérifiées lors d'E6. Les captures ne constituent pas un audit automatisé du PBIX mais attestent de la recette utilisateur.

**État GitHub (18 octobre 2026)** : [PR #4 — E6](https://github.com/sogoyou8/commerce-360/pull/4) et [PR #5 — E7](https://github.com/sogoyou8/commerce-360/pull/5) ont été **fusionnées dans `main`**, dans cet ordre. Le dernier commit de fusion E7 est `24cd2760` ; la CI E2–E7 associée à ce commit est verte. Ces validations portent sur les sources et contrôles du dépôt, pas sur une analyse automatisée du PBIX.

**E8 — restitution préparée** : [bilan public, chiffres, limites et preuves](e8-bilan.md) ; [procédure de reproduction et revue de confidentialité](e8-reproduction.md) ; [texte portfolio/CV](e8-portfolio.md). Les cinq pages réelles sont documentées dans `docs/e6-powerbi.md`. Aucune publication du PBIX ni des CSV détaillés en l'état.
