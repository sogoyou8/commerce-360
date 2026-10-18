# Commerce 360 — E8 | Reproduction, contrôles et publication

Ce guide distingue **rejouer le code**, **vérifier les chiffres** et **examiner manuellement le PBIX**. Tout reste local ; aucune ligne transactionnelle ni rapport Power BI brut n'est publié sur GitHub.

## Prérequis

Windows PowerShell, Python **3.10+**, Git, Docker Desktop lancé, Power BI Desktop pour la partie graphique, et l'archive Olist originale **avec ses neuf CSV** stockée localement. Le jeu de données et le fichier PBIX ne font pas partie de ce dépôt. Le conteneur utilise PostgreSQL 16 sur `127.0.0.1:5433`, avec des identifiants de démonstration **réservés à la machine locale** (voir `compose.yaml`). Ne jamais déployer ce mot de passe sur un serveur public.

## Chemin A — poste déjà installé, sans réimporter

Depuis la racine du projet, sur une copie de travail **sans changements non enregistrés** :

```powershell
git switch main
git pull --ff-only origin main
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe scripts\validate_e6.py
.\.venv\Scripts\python.exe scripts\validate_e8.py

docker compose ps
docker compose cp .\sql\08_e7_checks.sql postgres:/tmp/08_e7_checks.sql
docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U commerce360 -d commerce360 -f /tmp/08_e7_checks.sql
```

Le validateur **E6** lit `.data/e4` et `.data/e5` sans les modifier ; si leurs 12 exports/manifeste ne sont pas présents sur ce PC, il échoue normalement. Le validateur **E8** lit uniquement les fichiers du dépôt Git et la documentation ; il ne dépend ni de Docker ni de l'archive Olist. Le script **E7** est en lecture seule ; la session désactive les workers parallèles pour éviter la saturation de `/dev/shm`.

**Succès déjà constatés sur captures le 18 octobre 2026** : `E6 OK`, `Ran 35 tests ... OK` (avant ajout des tests E8), puis `E7 SQL OK`. Ces résultats sont des preuves de **cette machine à cette date**, pas une garantie universelle sur une nouvelle installation.

## Chemin B — reconstruire dans une base locale dédiée

Cette opération est **distincte de la recette non destructive**. `scripts/import_olist.py` réinitialise les **neuf tables `source`** de la base ciblée avant de charger l'archive : ne l'utiliser que sur une **base dédiée** et **après sauvegarde** si elle contient des données à conserver. Ne pas refaire l'import pour simplement tester E7.

```powershell
docker compose up -d
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe scripts\import_olist.py --zip "C:\chemin\vers\archive.zip"
powershell -ExecutionPolicy Bypass -File .\scripts\run_e3.ps1
.\.venv\Scripts\python.exe scripts\export_e4.py
powershell -ExecutionPolicy Bypass -File .\scripts\run_e5.ps1
.\.venv\Scripts\python.exe scripts\validate_e6.py
```

Puis exécuter les contrôles **E7** et **E8** du chemin A (sans relancer l'import). Si le conteneur doit être arrêté, utiliser `docker compose down`, **jamais `down -v`** pour conserver le volume PostgreSQL.

## Vérification manuelle dans Power BI Desktop

1. Ouvrir le **PBIX local** de Commerce 360, qui n'est pas inclus dans Git. Vérifier le paramètre Power Query **`pDataRoot`**, pointant vers le dossier `.data` local.
2. Sur copie de travail de confiance, exécuter **Actualiser tout** ; confirmer qu'aucune requête Power Query n'échoue et que les 12 tables ont les types et grains attendus.
3. Contrôler les KPI sans filtre : **96 211** commandes, **13 181 027,13 BRL**, **93 104** clients, **7 822** retards. Les trois mesures DAX de rapprochement E3/E5 sont **0** dans leur contexte non filtré si toutes les tables sont cohérentes.
4. Sur **03_Livraisons**, sélectionner **CE** : **196** retards, **15,40 %** et **≈21,2 jours**. Sur **04_Qualité**, sélectionner **late** : **2,57/5** et **54,05 %**. Sur **05_Clients**, sélectionner le segment « achat unique moins récent » : **36 145** clients et **0 %** de réachat au sein de ce segment.
5. Pour les nouvelles captures, inclure, si pertinent, le test **SP → 40 406 commandes** au grain commande, et la comparaison YoY janvier–août **uniquement si elle est réellement montrée dans la version livrée**.
6. Réinitialiser les filtres pour la recette hors filtre. Vérifier que les tables de grain différent ne répondent pas à des sélections auxquelles elles ne sont pas reliées ; indiquer la **période historique** et les **unités BRL**.

Les points « Actualiser tout », trois DAX à zéro, SP et YoY sont **compléments documentaires non certifiés par les captures dont nous disposons**. Ne pas les marquer comme faits sans nouvelle preuve. Consigner une capture synthétique sans ligne transactionnelle ni identifiant.

## Checklist de diffusion (code et portfolio uniquement)

- [ ] Le dépôt et la PR E8 passent le validateur `scripts/validate_e8.py` et les tests hors ligne.
- [ ] Le statut GitHub/CI du commit courant est constaté, pas supposé.
- [ ] Les présentations ne contiennent que des **agrégats** sourcés ; aucune ligne commande/client, donnée de géolocalisation individuelle, archive ZIP, export CSV brut, XLSX détaillé, PBIX, `.env` ou chemin personnel.
- [ ] Chaque capture de rapport est **recadrée sur les graphiques**, sans barre système, dossier personnel, champs sensibles ou notification ; conserver un contexte de date et de périmètre.
- [ ] La page portfolio mentionne **données Olist 2017–2018**, étude descriptive et preuve de contrôles, sans promettre un tableau de bord en ligne.
- [ ] Aucun lien Power BI public, déploiement cloud ou fichier téléchargeable n'est annoncé tant qu'il n'existe pas effectivement.

**Politique de dépôt :** les requêtes SQL, Power Query, DAX, tests, agrégats métier explicitement documentés et méthodologie sont partageables. Le PBIX, les neuf sources Olist et les 12 exports E4/E5 restent locaux. Les fichiers `.csv` et le dossier `.data/` sont ignorés par Git ; le **validateur E8 contrôle en plus les fichiers effectivement suivis**.

## Échec et remédiation

- **`No space left on device` lors d'E7** : vérifier d'abord `docker compose exec -T postgres sh -c 'df -h /dev/shm; df -i /dev/shm'`, ne pas effacer le volume. Le script E7 désactive normalement les requêtes parallèles pour la session.
- **Erreur de contrat E8** : retirer du suivi Git le fichier local identifié, ou ajouter la section documentaire indiquée ; le validateur ne supprime rien.
- **Résultat métier incohérent** : revoir le grain (commande vs article vs client), la fenêtre d'achat et le dénominateur avant de modifier des mesures ou de republier une capture.

**Références :** [Bilan E8](e8-bilan.md), [E6 modèle et limites](e6-powerbi.md), [E7 rapprochement SQL](e7-validation.md), [présentation portfolio](e8-portfolio.md).