# Commerce 360 — E3 : reference independante sur les CSV Olist

**Statut : calculs independants sur l'archive fournie, a rapprocher de PostgreSQL.**
**Archive** : ZIP original Olist recu en E1, SHA-256
967e41e04fc306fe604e2a693f488995a8b41e5047418f8a5c8e4abd6deca784.

Ces resultats ont ete recalcules par analyse de fichiers CSV avec pandas le
16 octobre 2026. **Ils ne prouvent pas encore que les nouvelles vues SQL E3
s'executent dans le PostgreSQL local de l'utilisateur.**

## Perimetre et regles

- Achats du 01/01/2017 inclus au 01/09/2018 exclu (20 mois).
- Commandes livrees uniquement pour ventes, panier, clients et livraisons.
- Vente = prix des articles hors fret ; une commande compte une fois dans le panier.
- Clients via customer_unique_id, reachat = au moins deux commandes livrees observees
  dans cette fenetre.
- Retard = livraison reelle > estimee et uniquement dates exploitables.
- Avis : dernier par date de creation puis date de reponse, puis rang original du CSV
  pour les egalites ; un avis par commande.
- Delai 'clean' : exclusion des commandes dont le transporteur apparait avoir
  recu le colis apres la livraison reelle, sans suppression des lignes source.

## Chiffres de reference E3 a verifier avec sql/05_e3_checks.sql

| Indicateur | Resultat calculé depuis CSV |
|---|---:|
| Commandes achetees dans la fenetre, tous statuts | 99 092 |
| Commandes livrees dans la fenetre | 96 211 |
| Somme des prix des articles livres (hors fret) | 13 181 027,13 BRL |
| Panier moyen | 137,00 BRL |
| Clients distincts livres | 93 104 |
| Clients avec au moins 2 commandes livrees en fenetre | 2 789 |
| Taux de reachat observe dans la fenetre | 3,00 % |
| Livraisons tardives | 7 822 |
| Livraisons avec dates utilisables | 96 203 |
| Taux de retard | 8,13 % |
| Commandes avec date transporteur posterieure a livraison | 19 |
| Delai moyen 'clean' | 12,54 jours |
| Satisfaction moyenne des commandes livrees notees | 4,16 / 5 |

### Evolution mensuelle : commandes livrees et montant d'articles

| Mois d'achat | Commandes | Ventes articles BRL |
|---|---:|---:|
| 2017-01 | 750 | 111 798,36 |
| 2017-02 | 1 653 | 234 223,40 |
| 2017-03 | 2 546 | 359 198,85 |
| 2017-04 | 2 303 | 340 669,68 |
| 2017-05 | 3 546 | 489 338,25 |
| 2017-06 | 3 135 | 421 923,37 |
| 2017-07 | 3 872 | 481 604,52 |
| 2017-08 | 4 193 | 554 699,70 |
| 2017-09 | 4 150 | 607 399,67 |
| 2017-10 | 4 478 | 648 247,65 |
| 2017-11 | 7 289 | 987 765,37 |
| 2017-12 | 5 513 | 726 033,19 |
| 2018-01 | 7 069 | 924 645,00 |
| 2018-02 | 6 555 | 826 437,13 |
| 2018-03 | 7 003 | 953 356,25 |
| 2018-04 | 6 798 | 973 534,09 |
| 2018-05 | 6 749 | 977 544,69 |
| 2018-06 | 6 099 | 856 077,86 |
| 2018-07 | 6 159 | 867 953,46 |
| 2018-08 | 6 351 | 838 576,64 |

Ventes janvier-aout 2017 : **2 993 456,13 BRL**.
Ventes janvier-aout 2018 : **7 218 125,12 BRL**.
Variation arithmetique : **+141,13 %**. Il s'agit d'une evolution du jeu
observe, **pas** d'une progression attribuable a une cause commerciale precise.

### Premiers constats descriptifs (a confirmer par SQL)

- Categorie de tete en prix d'articles livres : **health_beauty**,
  **1 229 557,50 BRL** dans la fenetre E3.
- Livraisons datees **a l'heure** : moyenne des derniers avis **4,29/5**
  sur 87 902 commandes notees.
- Livraisons datees **en retard** : moyenne **2,57/5** sur 7 658 commandes notees.
  Cela montre une association descriptive et **n'etablit pas une causalite**.
- Pour l'etat client SP : 40 406 commandes livrees dont 2 384 tardives dans
  l'observation E3.

## Conditions avant validation E3

1. Executer sql/04_e3_analysis.sql contre le serveur PostgreSQL local renseigne en E2.
2. Executer sql/05_e3_checks.sql sans aucune exception.
3. Comparer les montants mensuels, la categorie dominante et les notes par retard
   a cette reference independante.
4. Documenter les differences eventuelles et corriger le code avant de fusionner
   la PR E3. Ne pas confondre ces mesures de fenetre et les KPI globaux E1/E2.
