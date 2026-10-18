# Commerce 360 — Démonstration web

Une expérience web **statique, sans serveur ni cookies**, pour explorer les données Olist historiques issues du pipeline E0–E8 : **Vue d'ensemble, Ventes, Livraisons, Qualité, Clients**.

La démo est un produit de **data storytelling interactif**, pas une duplication trompeuse du PBIX et pas un accès à la base PostgreSQL. Les cinq vues partagent les définitions, mais les interactions sont volontairement **limitées à leur grain** : mois, État client, groupe de satisfaction ou segment RFM.

## Prévisualisation Vercel

Une prévisualisation de la branche `feature/demo-web-interactive` a été déployée avec le statut **READY** : [Commerce 360 — démo web](https://commerce-360-explorer-git-featu-9178df-yoanns-projects-e74472b3.vercel.app/).

Cette URL est une **prévisualisation de branche**, pas une validation de publication définitive. Le statut READY et la CI réussie ne remplacent pas une recette visuelle et interactive dans le navigateur. Le jeu publié actuellement est volontairement partiel (3 États, 2 catégories) ; les exports du poste local peuvent étendre cette couverture de manière vérifiable.

## Démarrage local (Windows / Antigravity)

Depuis la racine du dépôt :

```powershell
git fetch origin
git switch --track origin/feature/demo-web-interactive
py -m http.server 8000 --directory demo
```

Ouvrir **http://localhost:8000**. Si la branche est déjà locale, utiliser `git switch feature/demo-web-interactive`. Fermer le serveur avec Ctrl+C.

La page nécessite JavaScript et un serveur HTTP statique : ouvrir directement le fichier `index.html` avec `file://` n'est pas pris en charge, car les agrégats sont chargés par `fetch`.

## Ce que la première version permet réellement

| Chapitre | Interaction | Grain et source |
|---|---|---|
| 01 Vue d'ensemble | Changer ventes/commandes et sélectionner chacun des 20 mois | `mart.e3_monthly_sales` / référence E3 |
| 02 Ventes | Choisir ventes/commandes et comparer janvier–août 2017 avec les mêmes mois de 2018 | Référence E3 ; **deux catégories** de tête seulement dans la version sans export |
| 03 Livraisons | Choisir un État et basculer entre taux de retard et délai | États **CE, RJ, SP** documentés dans la validation E7 |
| 04 Qualité | Choisir ponctuel/retard et basculer entre note et avis négatifs | `mart.e3_delivery_satisfaction` : un avis sélectionné par commande |
| 05 Clients | Trier les sept segments par clients, ventes ou réacheteurs ; cliquer sur un segment | `mart.e5_segments_summary` ; 93 104 clients et 2 789 réacheteurs |

**Les quatre KPI nationaux ne changent pas artificiellement quand on sélectionne un mois ou un État** : le jeu public initial ne fournit pas les tables de jointure nécessaires. Les fiches de détail indiquent explicitement le filtre appliqué.

## Compléter la démo avec les agrégats E4/E5 du PC

Le fichier `demo/data/public.json` est une **référence minimale vérifiée** (20 mois, sept segments, trois États et deux catégories), sans aucune ligne transactionnelle. Pour intégrer de vrais classements sur les 27 États, 12 catégories et cohortes mensuelles :

1. Sur le PC où `.data/e4/` et `.data/e5/` ont déjà été créés et contrôlés, exécuter d'abord :
   ```powershell
   .\.venv\Scripts\python.exe scripts\validate_e6.py
   ```
2. Puis exécuter l'exporteur, qui relit et contrôle les manifestes SHA-256 des **12 exports** et refuse toute incohérence de références :
   ```powershell
   .\.venv\Scripts\python.exe scripts\build_web_data.py
   ```
3. Contrôler le fichier **agrégé** `demo/data/public.json`, puis les tests :
   ```powershell
   node --test demo/tests/contracts.test.mjs
   python -m unittest discover -s tests -v
   ```
4. Ne committer que `demo/data/public.json`, après revue des agrégats et de la couverture. Les CSV locaux, le PBIX, les ZIP sources, les identifiants et les manifestes contenant des chemins locaux restent **exclus du dépôt**.

Ce processus ne se connecte ni à PostgreSQL ni à des API ; il ne publie rien automatiquement. Les données par État vendeur sont regroupées par État et supprimées si moins de cinq vendeurs, sans jamais révéler un identifiant ou une ville.

## Validation hors ligne

```powershell
node --check demo/app.js
node --test demo/tests/contracts.test.mjs
```

La CI de `.github/workflows/web-demo.yml` exécute ces contrôles et refuse la présence de CSV/PBIX/XLSX/ZIP sous `demo/`.

## Publier sur Vercel

Projet **statique**, sans build ni package npm. Configurer le projet connecté au dépôt GitHub `sogoyou8/commerce-360` avec :

- **Root Directory** : `demo`
- **Framework Preset** : `Other` (aucun framework)
- **Build Command** : aucune
- **Output Directory** : `.`
- **Install Command** : aucune

Une URL n'est considérée comme publiée **qu'après un déploiement Vercel confirmé comme Ready et testé**. L'aperçu de PR peut précéder la fusion dans `main` ; le rapport Power BI demeure local.

## Vie privée et limites

Aucun suivi utilisateur, cookie, compte, API propriétaire ou base SQL publique. Pas de fausse prédiction de churn ni d'affirmation causale sur la satisfaction. Les chiffres étudiés correspondent à **2017–2018**, en **BRL**, au prix des articles **hors fret** et non à une marge. Les segments clients sont exclusifs et construits avec un cutoff fixe au **01/09/2018**. Voir [bilan E8](../docs/e8-bilan.md) et [recette E7](../docs/e7-validation.md).
