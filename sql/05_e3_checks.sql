-- Commerce 360 / E3 : recette de reconciliation. Lecture seule.
-- Pre-requis : sql/04_e3_analysis.sql applique apres E2.
-- Tout ecart declenche une exception et bloque l'acceptation d'E3.

DO $e3$
DECLARE
  baseline record;
  expected_orders bigint;
  expected_sales numeric(18,2);
  n bigint;
BEGIN
  -- L'E3 ne doit jamais changer les references E1/E2 (archive entiere).
  SELECT * INTO baseline FROM mart.v_kpi_global;
  IF baseline.delivered_orders <> 96478 OR
     baseline.item_revenue_brl <> 13221498.11 OR
     baseline.distinct_customers <> 93358 OR
     baseline.late_deliveries <> 7826 THEN
    RAISE EXCEPTION 'E3 : KPI globaux E2 modifies';
  END IF;

  -- Fenetre d'ACHAT, exclusive du 01/09/2018.
  SELECT count(*) INTO n FROM mart.e3_period_orders
   WHERE purchased_at < TIMESTAMP '2017-01-01'
      OR purchased_at >= TIMESTAMP '2018-09-01';
  IF n <> 0 THEN RAISE EXCEPTION 'E3 : % commandes hors fenetre', n; END IF;

  SELECT count(*) INTO n FROM mart.e3_delivered_orders WHERE NOT is_delivered;
  IF n <> 0 THEN RAISE EXCEPTION 'E3 : % commandes non livrees dans le fait livre', n; END IF;

  SELECT count(*), coalesce(sum(item_revenue_brl),0)
    INTO expected_orders, expected_sales
  FROM mart.e3_delivered_orders;
  IF expected_orders = 0 OR expected_sales <= 0 THEN
    RAISE EXCEPTION 'E3 : aucun fait livre dans la fenetre';
  END IF;
  -- Reference independante depuis les CSV (docs/e3-reference-offline.md).
  IF (SELECT count(*) FROM mart.e3_period_orders) <> 99092 OR
     expected_orders <> 96211 OR expected_sales <> 13181027.13 THEN
    RAISE EXCEPTION 'E3 : commandes/ventes differentes des CSV de reference (% / %)',
      expected_orders, expected_sales;
  END IF;

  -- Vues mensuelles : 20 mois reels, pas de multiplication.
  SELECT count(*) INTO n FROM mart.e3_monthly_sales;
  IF n <> 20 THEN RAISE EXCEPTION 'E3 : attendu 20 mois, obtenu %', n; END IF;
  IF (SELECT sum(delivered_orders) FROM mart.e3_monthly_sales) <> expected_orders OR
     (SELECT sum(item_sales_brl) FROM mart.e3_monthly_sales) <> expected_sales THEN
    RAISE EXCEPTION 'E3 : echec reconciliation mois -> commandes';
  END IF;

  IF (SELECT count(*) FROM mart.e3_yoy_jan_aug) <> 8 THEN
    RAISE EXCEPTION 'E3 : la comparaison Jan-Aout doit avoir 8 paires';
  END IF;
  IF (SELECT sum(sales_2017_brl) FROM mart.e3_yoy_jan_aug) <> 2993456.13 OR
     (SELECT sum(sales_2018_brl) FROM mart.e3_yoy_jan_aug) <> 7218125.12 THEN
    RAISE EXCEPTION 'E3 : comparaison Jan-Aout non conforme au CSV';
  END IF;

  -- Grain article ; sommer les lignes d'articles, pas les commandes par categorie/vendeur.
  IF (SELECT count(*) FROM mart.e3_delivered_items) <>
     (SELECT coalesce(sum(item_count),0) FROM mart.e3_delivered_orders) THEN
    RAISE EXCEPTION 'E3 : lignes articles livrees incoherentes';
  END IF;
  IF (SELECT coalesce(sum(item_price_brl),0) FROM mart.e3_delivered_items) <> expected_sales OR
     (SELECT coalesce(sum(item_sales_brl),0) FROM mart.e3_category_sales) <> expected_sales OR
     (SELECT coalesce(sum(item_sales_brl),0) FROM mart.e3_seller_sales) <> expected_sales THEN
    RAISE EXCEPTION 'E3 : ventes non reconciliees entre articles/categories/vendeurs';
  END IF;

  -- Grain client : toutes les commandes livrees attribuees une et une seule fois.
  IF (SELECT coalesce(sum(delivered_orders),0) FROM mart.e3_customers) <> expected_orders OR
     (SELECT count(*) FROM mart.e3_customers) <>
     (SELECT count(DISTINCT customer_unique_id) FROM mart.e3_delivered_orders) THEN
    RAISE EXCEPTION 'E3 : grain client ou commande multiplie';
  END IF;
  IF (SELECT coalesce(sum(observed_customers),0) FROM mart.e3_customer_cohorts) <>
     (SELECT count(*) FROM mart.e3_customers) OR
     (SELECT coalesce(sum(observed_sales_brl),0) FROM mart.e3_customer_cohorts) <> expected_sales THEN
    RAISE EXCEPTION 'E3 : cohortes non reconciliees';
  END IF;

  IF (SELECT count(*) FROM mart.e3_customers) <> 93104 OR
     (SELECT count(*) FROM mart.e3_customers WHERE repeated_in_window) <> 2789 THEN
    RAISE EXCEPTION 'E3 : clients uniques/reachats non conformes aux CSV';
  END IF;

  -- Repartition par etat / groupe de retard : aucun fait livre perdu.
  IF (SELECT coalesce(sum(delivered_orders),0) FROM mart.e3_delivery_states) <> expected_orders OR
     (SELECT coalesce(sum(delivered_orders),0) FROM mart.e3_delivery_satisfaction) <> expected_orders THEN
    RAISE EXCEPTION 'E3 : repartition livraisons incomplete';
  END IF;
  IF (SELECT coalesce(sum(late_deliveries),0) FROM mart.e3_delivery_states) <>
     (SELECT count(*) FROM mart.e3_delivered_orders WHERE is_late) OR
     (SELECT coalesce(sum(dated_deliveries),0) FROM mart.e3_delivery_states) <>
     (SELECT count(is_late) FROM mart.e3_delivered_orders) THEN
    RAISE EXCEPTION 'E3 : numerateur/denominateur retards incoherents';
  END IF;
  IF (SELECT count(*) FROM mart.e3_delivered_orders WHERE is_late) <> 7822 OR
     (SELECT count(is_late) FROM mart.e3_delivered_orders) <> 96203 OR
     (SELECT suspicious_carrier_dates FROM mart.e3_quality_summary) <> 19 THEN
    RAISE EXCEPTION 'E3 : retard/dates suspectes non conformes au CSV';
  END IF;
  IF (SELECT item_sales_brl FROM mart.e3_category_sales
      WHERE product_category = 'health_beauty') <> 1229557.50 THEN
    RAISE EXCEPTION 'E3 : categorie health_beauty non conforme au CSV';
  END IF;
  IF (SELECT delivered_orders FROM mart.e3_quality_summary) <> expected_orders OR
     (SELECT orders_in_window FROM mart.e3_quality_summary) <>
     (SELECT count(*) FROM mart.e3_period_orders) THEN
    RAISE EXCEPTION 'E3 : synthese qualite incoherente';
  END IF;

  RAISE NOTICE 'E3 OK : fenetre 20 mois, grains et KPI reconcilies (% commandes livrees, % BRL articles)',
    expected_orders, expected_sales;
END $e3$;

-- Resultats de recette a copier vers la documentation APRES execution locale.
SELECT count(*) AS months_in_period,
       sum(delivered_orders) AS delivered_orders_in_period,
       sum(item_sales_brl)::numeric(18,2) AS sales_brl_in_period
FROM mart.e3_monthly_sales;

SELECT * FROM mart.e3_yoy_jan_aug ORDER BY month_num;
SELECT product_category, sold_items, item_sales_brl, sales_share_pct, sales_rank
FROM mart.e3_category_sales ORDER BY item_sales_brl DESC LIMIT 10;
SELECT customer_state, delivered_orders, late_deliveries, dated_deliveries, late_rate_pct,
       avg_delivery_days_clean, avg_review_score
FROM mart.e3_delivery_states ORDER BY delivered_orders DESC LIMIT 10;
SELECT * FROM mart.e3_delivery_satisfaction ORDER BY delivery_group;
SELECT * FROM mart.e3_quality_summary;
