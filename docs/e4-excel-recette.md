# Commerce 360 — E4 · Recette Excel Windows (17 octobre 2026)

## Statut et périmètre

**Recette fonctionnelle E4.4 validée par l'utilisateur sur Excel Desktop Windows.**
Cette pièce documente la vérification du livrable local `Commerce_360_E4_Final.xlsx`.
Elle **ne signifie pas que le fichier binaire a été publié sur GitHub**, ni que les neuf vues de synthèse sont toutes actualisées par Power Query.

- Source : jeu historique Olist (Brésil), janvier 2017–août 2018, vue analytique PostgreSQL E3.
- Exports locaux E4 : neuf CSV générés par `scripts/export_e4.py` en lecture seule.
- Le classeur transmis a été ouvert dans Excel Desktop, actualisé par l'utilisateur sans erreur et inspecté structurellement à partir du fichier XLSX fourni.
- Empreinte SHA-256 du fichier XLSX reçu : `6f65d360150981a28197317cedb848d806b6ea57a40df019870ada49031d87be`.

## Inventaire du livrable audité

- **18 feuilles** : `00_Guide`, `01_Pilotage`, `02_Ventes`, `03_Clients`, `04_Livraisons`, `05_Qualite` ; huit tables `D_*` de synthèse ; `D_Extrait` de 500 commandes ; `TCD_Livraisons`, `TCD_Ventes`, `TCD_GraphiqueVentes`.
- **1 requête Power Query** `fact_delivered_orders` et un modèle de données incorporant les **96 211 commandes livrées** de la fenêtre E3.
- **3 objets croisés** : TCD livraisons, TCD ventes et graphique croisé dynamique de ventes mensuelles.
- **1 segment `customer_state`** partagé avec les trois objets (y compris la table associée au graphique).
- Graphiques natifs et formules de synthèse conservés ; aucune erreur de cellule Excel enregistrée lors de l'inspection.
- Les contrôles `05_Qualite` (10 rapprochements) affichent `OK` pour les références E3.

## Recette métier et valeurs de référence

| Contrôle | Résultat vérifié |
|---|---:|
| Commandes livrées | 96 211 |
| Ventes d'articles livrés, hors fret | 13 181 027,13 BRL |
| Ventes 2017 (12 mois) | 5 962 902,01 BRL |
| Ventes 2018 (janvier–août) | 7 218 125,12 BRL |
| Livraisons tardives | 7 822 |
| Livraisons à l'heure | 88 381 |
| Livraisons sans date exploitable | 8 |
| Livraisons datées | 96 203 |
| Clients uniques livrés | 93 104 |
| Réacheteurs observés | 2 789 |
| Filtre segment SP : commandes | 40 406 |
| Filtre segment SP : ventes | 5 055 587,13 BRL |

Contrôles attestés par les captures utilisateur d'Excel Desktop et les valeurs sauvegardées dans le XLSX ; l'utilisateur a confirmé explicitement **« Actualiser tout » sans erreur** après réinitialisation du segment.

## Trois constats descriptifs à présenter

1. **Évolution commerciale** : le comparable janvier–août passe de 2 993 456,13 BRL en 2017 à 7 218 125,12 BRL en 2018 (variation d'environ **+141,13 %**). Il s'agit d'une observation historique, pas d'un effet causal ni d'une prévision ; éviter de comparer 12 mois de 2017 à seulement 8 mois de 2018.
2. **Concentration des catégories** : les dix premières catégories représentent **8 233 585,75 BRL**, soit **62,47 %** des ventes d'articles de la fenêtre. Les comptages de commandes par catégorie/vendeur ne doivent pas être additionnés.
3. **Qualité de livraison et satisfaction** : **8,13 %** de retards parmi les livraisons datées. Note moyenne de **2,57/5** pour les livraisons tardives contre **4,29/5** à l'heure. Association descriptive, sans causalité démontrée.

## Reproductibilité et limites

- **Actualisation réelle** : `fact_delivered_orders` est la requête Power Query connectée au modèle de données et aux objets croisés. Les huit feuilles de synthèse `D_*` sont des tables Excel présentes dans le classeur : **elles ne sont pas toutes reliées à huit requêtes Power Query distinctes**. Après génération de nouvelles données E3, il faut réactualiser/reconstruire ces synthèses si leur contenu change.
- **Chemin local** : la requête M utilise actuellement `File.Contents(...)` avec un **chemin absolu vers le CSV local de l'auteur**. Sur une autre machine, modifier l'étape **Source** dans l'éditeur Power Query pour pointer vers `fact_delivered_orders.csv` généré par `scripts/export_e4.py`, puis `Données > Actualiser tout`.
- **Confidentialité et publication** : le XLSX contient les **lignes détaillées dans son modèle de données** et des chemins Windows enregistrés dans ses métadonnées / sa requête. **Ne pas publier ce binaire en l'état dans le dépôt public**, sans vérifier la licence des données dérivées et nettoyer ces chemins, ou sans consentement explicite à cette publication.
- **Manifeste** : le guide du classeur fait référence à un `manifest.json` et à neuf empreintes SHA-256 ; le `manifest.json` séparé **n'était pas joint au fichier transmis**. Sa vérification indépendante reste à effectuer si la traçabilité complète des exports est exigée.
- Le classeur représente des analyses de données historiques ; aucune donnée temps réel, aucune industrialisation cloud et aucune causalité revendiquées.
- Des indications d'aide de `00_Guide` rédigées avant la configuration native Power Query/TCD peuvent devoir être mises à jour avant diffusion : elles décrivent encore ces éléments comme « à finaliser ».

## Checklist de clôture GitHub E4.5

- [x] Exports locaux réussis et contrôlés par le script sur PostgreSQL dédié, sans modification des données.
- [x] Classeur Excel réel ouvert, types Power Query vérifiés, TCD et segment testés sur Windows.
- [x] Recette nationale et test SP rapprochés des références SQL E3.
- [x] « Actualiser tout » sans erreur, confirmation utilisateur.
- [x] Documentation du livrable et des limites d'actualisation.
- [ ] Vérification indépendante du fichier `manifest.json` séparé.
- [ ] Décision sur la distribution du fichier XLSX après examen des données embarquées et des chemins locaux ; **aucun binaire ajouté à la PR à ce stade**.
- [ ] Contrôles GitHub finaux et accord explicite de fusion de la PR E4.
