-- Commerce 360 / E7 : rapprochement transversal SQL ↔ Power BI.
-- Toutes les requetes sont en lecture seule (SELECT et assertions DO).
-- Prerequis : PostgreSQL local initialise E2/E3/E5 ; aucun import ni mutation.
-- Perimetre : achats >= 2017-01-01 et < 2018-09-01, commandes livrees.
-- Les valeurs attendues proviennent de docs/e3-reference-offline.md,
-- docs/e3-analyses-sql.md, docs/e5-rfm.md et des captures de recette Power BI E6.
-- Une execution PostgreSQL locale reste obligatoire avant de marquer E7 "reussi".

DO $e7$
DECLARE
  delivered bigint;
  sales numeric;
  v_customers bigint;
  late_n bigint;
  dated_n bigint;
  avg_review numeric;
  avg_days numeric;
  negative_rate numeric;
  e5 record;
  state_ce record;
  late_group record;
  on_time_group record;
BEGIN
  SELECT count(*),
         coalesce(sum(item_revenue_brl),0),
         count(DISTINCT customer_unique_id),
         count(*) FILTER (WHERE is_late IS TRUE),
         count(is_late),
         round(avg(review_score)::numeric,2),
         round(avg(delivery_days) FILTER
           (WHERE NOT carrier_date_after_delivery)::numeric,2)
    INTO delivered, sales, v_customers, late_n, dated_n, avg_review, avg_days
  FROM mart.e3_delivered_orders;

  IF delivered <> 96211 OR sales <> 13181027.13 OR v_customers <> 93104 THEN
    RAISE EXCEPTION 'E7: KPI ventes/commandes/clients differents des references (% / % / %)',
      delivered, sales, v_customers;
  END IF;
  IF late_n <> 7822 OR dated_n <> 96203 OR
     round(100.0 * late_n / nullif(dated_n,0),2) <> 8.13 THEN
    RAISE EXCEPTION 'E7: volumes ou taux de retard non reconcilies (% / %)',
      late_n, dated_n;
  END IF;
  IF avg_review <> 4.16 OR avg_days NOT BETWEEN 12.4 AND 12.7 THEN
    RAISE EXCEPTION 'E7: note moyenne ou delai moyen non conforme (% / %)',
      avg_review, avg_days;
  END IF;

  SELECT round(100.0 * sum(low_score_orders) / nullif(sum(scored_orders),0),2)
    INTO negative_rate
  FROM mart.e3_delivery_satisfaction;
  IF negative_rate <> 12.80 THEN
    RAISE EXCEPTION 'E7: taux global des avis negatifs inattendu (%)',
      negative_rate;
  END IF;

  SELECT * INTO late_group
  FROM mart.e3_delivery_satisfaction WHERE delivery_group = 'late';
  SELECT * INTO on_time_group
  FROM mart.e3_delivery_satisfaction WHERE delivery_group = 'on_time';
  IF NOT FOUND OR late_group.delivered_orders <> 7822 OR
     late_group.scored_orders <> 7658 OR
     late_group.avg_review_score <> 2.57 OR
     late_group.low_score_rate_pct <> 54.05 OR
     on_time_group.delivered_orders <> 88381 OR
     on_time_group.scored_orders <> 87902 OR
     on_time_group.avg_review_score <> 4.29 OR
     on_time_group.low_score_rate_pct <> 9.20 THEN
    RAISE EXCEPTION 'E7: satisfaction par ponctualite non conforme';
  END IF;

  SELECT * INTO state_ce
  FROM mart.e3_delivery_states WHERE customer_state = 'CE';
  IF NOT FOUND OR state_ce.late_deliveries <> 196 OR
     state_ce.late_rate_pct <> 15.40 OR
     state_ce.avg_delivery_days_clean NOT BETWEEN 21.0 AND 21.4 THEN
    RAISE EXCEPTION 'E7: reference CE non conforme (retards/taux/delai)';
  END IF;

  SELECT * INTO e5 FROM mart.e5_quality_summary;
  IF e5.customers <> 93104 OR e5.repeat_customers <> 2789 OR
     e5.delivered_orders <> 96211 OR e5.item_sales_brl <> 13181027.13 OR
     round(100.0 * e5.repeat_customers / nullif(e5.customers,0),2) <> 3.00 THEN
    RAISE EXCEPTION 'E7: la population ou le reachat RFM ne se reconcilie pas';
  END IF;

  IF (SELECT count(*) FROM mart.e3_monthly_sales) <> 20 OR
     (SELECT count(*) FROM mart.e3_delivery_states) <> 27 OR
     (SELECT count(*) FROM mart.e3_delivery_satisfaction) <> 3 OR
     (SELECT count(*) FROM mart.e5_segments_summary) <> 7 OR
     (SELECT count(*) FROM mart.e5_cohort_segments) <> 83 OR
     (SELECT sum(customers) FROM mart.e5_segments_summary) <> 93104 OR
     (SELECT sum(item_sales_brl) FROM mart.e5_segments_summary) <> 13181027.13 OR
     (SELECT customers FROM mart.e5_segments_summary
       WHERE segment_code='single_less_recent') <> 36145 OR
     (SELECT item_sales_brl FROM mart.e3_category_sales
       WHERE product_category='health_beauty') <> 1229557.50 THEN
    RAISE EXCEPTION 'E7: grains E3/E5 ou categorie dominante non conformes';
  END IF;

  RAISE NOTICE 'E7 SQL OK : 96211 commandes, 13181027.13 BRL, 93104 clients, 7822 retards, 2789 reacheteurs';
END $e7$;

-- Sorties descriptives lisibles pour comparer avec les cinq pages Power BI.
SELECT count(*) AS commandes_livrees,
       sum(item_revenue_brl)::numeric(18,2) AS ventes_articles_brl,
       round(sum(item_revenue_brl) / nullif(count(*),0),2) AS panier_moyen_brl,
       round(avg(review_score)::numeric,2) AS note_moyenne,
       round(avg(delivery_days) FILTER
         (WHERE NOT carrier_date_after_delivery)::numeric,2) AS delai_moyen_jours
FROM mart.e3_delivered_orders;

SELECT customer_state, delivered_orders, late_deliveries,
       dated_deliveries, late_rate_pct, avg_delivery_days_clean
FROM mart.e3_delivery_states
WHERE customer_state IN ('CE','SP','RJ')
ORDER BY customer_state;

SELECT delivery_group, delivered_orders, scored_orders, avg_review_score,
       low_score_orders, low_score_rate_pct
FROM mart.e3_delivery_satisfaction
ORDER BY delivery_group;

SELECT customers, repeat_customers, delivered_orders, item_sales_brl
FROM mart.e5_quality_summary;

SELECT segment_code, segment_label, customers, repeat_customers,
       item_sales_brl, customer_share_pct, sales_share_pct
FROM mart.e5_segments_summary ORDER BY segment_priority;
