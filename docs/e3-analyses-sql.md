# Commerce 360 — E3 : analyses SQL commerciales

**Statut : développement proposé, à valider sur PostgreSQL local.**
Branche de travail : feature/e3-analyses-sql (sans modification des tables Olist d'origine).

## Objectif et périmètre

Etudier ventes d'articles, categories, vendeurs, clientele, livraisons et notes de satisfaction
sur les **achats entre le 1er janvier 2017 inclus et le 1er septembre 2018 exclu** :
**20 mois**, y compris janvier-aout 2018. Septembre-octobre 2018 et 2016 sont
ecartes des graphiques principaux, car incomplets ou peu representatifs.

**Contrat conserve depuis E2 :**
- 'mart.v_orders' : une seule ligne par commande, quel que soit son statut.
- 'mart.v_items' : une seule ligne par (order_id, order_item_id).
- 'mart.v_kpi_global' et les **96 478 commandes livrees / 13 221 498,11 BRL** correspondent
  a **l'archive ENTIERE** et ne doivent pas etre remplaces par les KPI E3.
- Les ventes sont les prix d'articles **sur les commandes livrees**,
  **hors transport** ; ce n'est pas le chiffre d'affaires net ni le benefice d'Olist.
- Les paiements multiples et les avis multiples restent agreges/selectionnes dans les vues E2,
  jamais joints tels quels aux lignes d'articles dans E3.
- Date de reference pour toutes les vues E3 : **date d'achat**, et non date de livraison.
  Une commande achetee en aout et livree en septembre reste attribuee a aout.

## Livrables SQL

| Vue | Grain / indicateur | Particularite |
|---|---|---|
| mart.e3_period_orders | 1 commande achetee en periode, tout statut | Perimetre de depart |
| mart.e3_delivered_orders | 1 commande livree achetee en periode | Denominateur paniers/clients |
| mart.e3_delivered_items | 1 article d'une commande livree | Source ventes categories/vendeurs |
| mart.e3_monthly_sales | 1 mois d'achat | 20 mois, commandes tous statuts et livrees distinctes |
| mart.e3_yoy_jan_aug | 1 mois (janvier-aout) | Montants 2017 et 2018, variation sur base 2017 |
| mart.e3_category_sales | 1 categorie de produit | Volume articles, ventes, rang et part |
| mart.e3_seller_sales | 1 vendeur | Etat/ville vendeur, ventes, rang |
| mart.e3_customers | 1 customer_unique_id livre | Achats repetes **observes dans la periode** |
| mart.e3_customer_cohorts | Mois du premier achat livre observe dans la periode | Censure a droite explicite |
| mart.e3_delivery_states | Etat de residence de l'acheteur | Taux de retard, delais, satisfaction |
| mart.e3_delivery_satisfaction | En retard / a l'heure / non date | Notes moyennes, part de notes <= 2 |
| mart.e3_quality_summary | 1 ligne d'audit | Commandes sans infos, geo absente, dates suspectes |

### Definitions a ne pas confondre

- **Panier moyen** = somme des prix d'articles livres / nombre de commandes livrees
  de la periode (la commande compte une fois meme avec plusieurs articles).
- **Categories / vendeurs** : les ventes s'additionnent correctement entre categories
  et entre vendeurs, mais **pas** les nombres orders_with_category ou orders_with_seller,
  car une commande peut contenir plusieurs categories ou vendeurs.
- **Reachat** : customer_unique_id avec au moins deux commandes livrees **dans la fenetre**.
  Il ne s'agit ni du taux de retention global, ni d'un modele RFM (reserve a E5).
- **Comparaison 2017-2018** : janvier-aout vs janvier-aout, par mois d'achat.
  Un taux de variation sur un historique observationnel ne prouve pas une causalite.
- **Retard** : date de livraison reelle strictement apres la date estimee.
  Denominateur = commandes livrees avec les deux dates renseignees (count(is_late)).
- **Satisfaction** : un dernier avis retenu par commande (regle E2), moyenne seulement
  sur les commandes ayant une note ; le nombre de commandes notees est affiche separement.
  Les differences entre groupes de retard ne demontrent pas de causalite.
- **Delai moyen nettoye** : achat -> livraison reelle (jours), sans les lignes
  carrier_date_after_delivery = true. Les 23 anomalies constatees dans l'archive
  sont **conservees en source**, et comptabilisees dans un compteur d'anomalies.
  Le taux de retard garde ses propres dates et sa definition E2.
- **Geographie** : la repartition de livraison se fait par customer_state ;
  la repartition vendeurs par seller_state. Les ZIP sans coordonnees ne sont pas
  ecartes des ventes ni des KPI nationaux.
- **Cohortes** : premiere commande livree **observee dans E3**, non premiere
  commande a vie. Les cohortes aout 2018 ont moins de recul que janvier 2017.

## Execution Windows / Antigravity IDE

**Pre-requis :** repertoire commerce-360, volume Docker E2 conserve, base locale
PostgreSQL 16 deja renseignee avec les neuf CSV de l'archive Olist.
Ne **pas** refaire l'import E2 pour E3.

Ouvrir Antigravity/PowerShell dans la racine de commerce-360 :

~~~powershell
git fetch origin
git switch --track origin/feature/e3-analyses-sql
docker compose ps
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
~~~

Si le depot local a deja une branche E3 creee, executer
git switch feature/e3-analyses-sql a la place de git switch --track ....

**Option la plus simple — une seule commande pour tests, vues et reconciliations :**

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_e3.ps1
~~~

**Alternative manuelle**, si tu veux voir chacune des operations separement.
Appliquer les vues **sans modifier les CSV ni E2** et verifier les reconciliations :

~~~powershell
docker compose cp .\sql\04_e3_analysis.sql postgres:/tmp/04_e3_analysis.sql
docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U commerce360 -d commerce360 -f /tmp/04_e3_analysis.sql

docker compose cp .\sql\05_e3_checks.sql postgres:/tmp/05_e3_checks.sql
docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U commerce360 -d commerce360 -f /tmp/05_e3_checks.sql
~~~

La recette doit afficher E3 OK : fenetre 20 mois, grains et KPI reconcilies,
et ensuite les resultats mensuels, categories, Etats et anomalies.
Si une commande echoue, **ne pas fusionner E3** et partager l'erreur exacte.
docker compose down arrete le conteneur **sans** supprimer le volume
(ne pas lancer docker compose down -v).

## Validation et chiffres a enregistrer

| Controle | Etat |
|---|---|
| Tables sources et KPI E2 deja verifiés | Oui, le 16/10/2026 |
| Scripts SQL E3 versionnes sur branche dediee | Oui |
| Tests statiques Python E3 sur la branche | A lancer |
| Execution reelle des vues E3 dans PostgreSQL Windows | A confirmer |
| Recette SQL des reconciliations E3 | A confirmer |
| Resultats E3 mensuels / regionaux / clients documentes | Apres execution |
| Relecture et fusion de la PR E3 vers main | Apres recette |

**Aucun chiffre metier E3 calcule sur la fenetre principale n'est pretendu
valide avant la sortie de 05_e3_checks.sql.** Les valeurs de 96 478 commandes
et 13 221 498,11 BRL proviennent exclusivement du benchmark E1/E2, sur
toute l'archive. La documentation et les tests statiques ne remplacent pas
une execution PostgreSQL reelle.

## Sorties pour E4–E6

Les vues E3 serviront de reference commune pour le fichier Excel, l'analyse
Python et Power BI. On conservera exactement les memes grains et filtres pour
eviter de presenter des KPI incoherents entre outils.
