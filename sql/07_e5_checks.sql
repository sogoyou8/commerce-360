-- Commerce 360 / E5 : recette SQL RFM. Aucun changement de donnees.
-- Pre-requis : E2/E3 et sql/06_e5_rfm.sql appliques a commerce360.
-- Si une assertion echoue, ne pas declarer E5 validee.

DO $e5$
DECLARE
  k record;
  q record;
  n bigint;
BEGIN
  SELECT * INTO k FROM mart.v_kpi_global;
  IF k.delivered_orders <> 96478 OR
     k.item_revenue_brl <> 13221498.11 OR
     k.distinct_customers <> 93358 OR
     k.late_deliveries <> 7826 THEN
    RAISE EXCEPTION 'E5: KPI E2 archive totale modifies';
  END IF;

  SELECT * INTO q FROM mart.e5_quality_summary;
  IF q.customers <> 93104 OR q.repeat_customers <> 2789 OR
     q.delivered_orders <> 96211 OR q.item_sales_brl <> 13181027.13 THEN
    RAISE EXCEPTION 'E5: population / ventes non reconciliees avec E3 (% / % / % / %)',
      q.customers, q.repeat_customers, q.delivered_orders, q.item_sales_brl;
  END IF;

  IF q.invalid_monetary_customers <> 0 OR
     q.invalid_recency_customers <> 0 OR
     q.invalid_frequency_customers <> 0 THEN
    RAISE EXCEPTION 'E5: valeurs RFM invalides dans la population cliente';
  END IF;

  -- Client unique dans chaque vue detaillee.
  SELECT count(*) INTO n FROM mart.e5_customer_rfm;
  IF n <> q.customers OR
     (SELECT count(DISTINCT customer_unique_id) FROM mart.e5_customer_rfm) <> n OR
     (SELECT count(*) FROM mart.e5_customer_segments) <> n OR
     (SELECT count(DISTINCT customer_unique_id) FROM mart.e5_customer_segments) <> n THEN
    RAISE EXCEPTION 'E5: grain client non conserve';
  END IF;

  -- Formules f_score : on ne fabrique pas de quintiles arbitraires avec
  -- une population d'achats uniques majoritaire.
  IF EXISTS (
    SELECT 1 FROM mart.e5_customer_rfm
    WHERE r_score NOT BETWEEN 1 AND 5 OR
          m_score NOT BETWEEN 1 AND 5 OR
          f_score NOT IN (1,3,5) OR
          f_score <> CASE WHEN frequency_orders >= 3 THEN 5
                          WHEN frequency_orders = 2 THEN 3 ELSE 1 END OR
          recency_days <> (DATE '2018-09-01' - last_observed_purchase) OR
          first_observed_purchase > last_observed_purchase OR
          rfm_score <> (r_score * 100 + f_score * 10 + m_score)
  ) THEN
    RAISE EXCEPTION 'E5: scores, cutoff ou dates invalides';
  END IF;

  -- CUME_DIST prend en compte les ex aequo sans attribuer des scores
  -- differents a deux clients de meme recence / meme montant.
  IF EXISTS (
    SELECT 1 FROM mart.e5_customer_rfm GROUP BY recency_days
    HAVING min(r_score) <> max(r_score)
  ) OR EXISTS (
    SELECT 1 FROM mart.e5_customer_rfm GROUP BY monetary_brl
    HAVING min(m_score) <> max(m_score)
  ) THEN
    RAISE EXCEPTION 'E5: ex aequo R ou M scores differemment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM mart.e5_customer_segments
    WHERE segment_code NOT IN (
      'champions_observed', 'repeat_recent', 'high_value_recent',
      'single_recent', 'repeat_less_recent', 'single_less_recent',
      'other_observed'
    ) OR segment_label IS NULL OR segment_priority NOT BETWEEN 1 AND 7
  ) THEN
    RAISE EXCEPTION 'E5: segment inconnu ou valeur manquante';
  END IF;

  -- Les segments exclusifs couvrent 100 % des clients/commandes/ventes.
  IF (SELECT coalesce(sum(customers),0) FROM mart.e5_segments_summary) <> q.customers OR
     (SELECT coalesce(sum(repeat_customers),0) FROM mart.e5_segments_summary) <> q.repeat_customers OR
     (SELECT coalesce(sum(delivered_orders),0) FROM mart.e5_segments_summary) <> q.delivered_orders OR
     (SELECT coalesce(sum(item_sales_brl),0) FROM mart.e5_segments_summary) <> q.item_sales_brl THEN
    RAISE EXCEPTION 'E5: les syntheses de segments ne se reconcilient pas';
  END IF;

  IF (SELECT coalesce(sum(customers),0) FROM mart.e5_cohort_segments) <> q.customers OR
     (SELECT coalesce(sum(delivered_orders),0) FROM mart.e5_cohort_segments) <> q.delivered_orders OR
     (SELECT coalesce(sum(item_sales_brl),0) FROM mart.e5_cohort_segments) <> q.item_sales_brl OR
     (SELECT count(DISTINCT first_observed_month) FROM mart.e5_cohort_segments) <> 20 THEN
    RAISE EXCEPTION 'E5: cohortes non reconciliees ou fenetre temporelle incomplete';
  END IF;

  RAISE NOTICE 'E5 OK: % clients / % reacheteurs / % commandes / % BRL ; sources intactes',
    q.customers, q.repeat_customers, q.delivered_orders, q.item_sales_brl;
END $e5$;

-- Sorties descriptives a copier dans la recette apres execution locale.
SELECT * FROM mart.e5_quality_summary;
SELECT segment_code, segment_label, customers, repeat_customers,
       delivered_orders, item_sales_brl, customer_share_pct, sales_share_pct,
       avg_recency_days, avg_frequency, avg_monetary_brl
FROM mart.e5_segments_summary ORDER BY segment_priority;
SELECT first_observed_month, segment_code, customers, repeat_customers, item_sales_brl
FROM mart.e5_cohort_segments
ORDER BY first_observed_month, segment_priority;
