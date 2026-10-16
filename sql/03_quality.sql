-- Exécuter après l'import ET la génération du mart. Toute dérive stoppe E2.
DO $audit$
DECLARE
  n bigint;
  metric record;
BEGIN
  SELECT count(*) INTO n FROM source.olist_orders;
  IF n <> 99441 THEN RAISE EXCEPTION 'E2 commandes attendues 99441, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.olist_customers;
  IF n <> 99441 THEN RAISE EXCEPTION 'E2 clients attendus 99441, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.olist_order_items;
  IF n <> 112650 THEN RAISE EXCEPTION 'E2 articles attendus 112650, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.olist_order_payments;
  IF n <> 103886 THEN RAISE EXCEPTION 'E2 paiements attendus 103886, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.olist_order_reviews;
  IF n <> 99224 THEN RAISE EXCEPTION 'E2 avis attendus 99224, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.olist_products;
  IF n <> 32951 THEN RAISE EXCEPTION 'E2 produits attendus 32951, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.olist_sellers;
  IF n <> 3095 THEN RAISE EXCEPTION 'E2 vendeurs attendus 3095, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.product_category_name_translation;
  IF n <> 71 THEN RAISE EXCEPTION 'E2 traductions attendues 71, obtenu %', n; END IF;
  SELECT count(*) INTO n FROM source.olist_geolocation;
  IF n <> 1000163 THEN RAISE EXCEPTION 'E2 geolocalisations attendues 1000163, obtenu %', n; END IF;

  SELECT count(*) INTO n FROM mart.v_orders;
  IF n <> 99441 THEN RAISE EXCEPTION 'E2 v_orders multiplicatrice: % lignes', n; END IF;
  SELECT count(*) INTO n FROM mart.v_items;
  IF n <> 112650 THEN RAISE EXCEPTION 'E2 v_items multiplicatrice: % lignes', n; END IF;
  SELECT * INTO metric FROM mart.v_kpi_global;
  IF metric.delivered_orders <> 96478 THEN RAISE EXCEPTION 'E2 delivered_orders = %', metric.delivered_orders; END IF;
  IF metric.item_revenue_brl <> 13221498.11 THEN RAISE EXCEPTION 'E2 item_revenue_brl = %', metric.item_revenue_brl; END IF;
  IF metric.average_basket_brl <> 137.04 THEN RAISE EXCEPTION 'E2 average_basket_brl = %', metric.average_basket_brl; END IF;
  IF metric.distinct_customers <> 93358 OR metric.repeat_customers <> 2801
  THEN RAISE EXCEPTION 'E2 clients/repeat = %/%', metric.distinct_customers,metric.repeat_customers; END IF;
  IF metric.late_deliveries <> 7826 OR metric.dated_deliveries <> 96470
  THEN RAISE EXCEPTION 'E2 livraisons en retard/datees = %/%', metric.late_deliveries,metric.dated_deliveries; END IF;
  IF metric.late_rate_pct <> 8.11 THEN RAISE EXCEPTION 'E2 late_rate_pct = %',metric.late_rate_pct; END IF;
  IF metric.scored_orders <> 95832 THEN RAISE EXCEPTION 'E2 scored_orders = %',metric.scored_orders; END IF;
  IF metric.average_review_score <> 4.16 THEN RAISE EXCEPTION 'E2 average_review_score = %',metric.average_review_score; END IF;
  IF abs(metric.average_delivery_days - 12.56) > 0.01
  THEN RAISE EXCEPTION 'E2 delivery_days = %',metric.average_delivery_days; END IF;

  RAISE NOTICE 'E2: 9 tables, grains, references et indicateurs verifiés';
END $audit$;

-- Résumé non bloquant des anomalies qu'on doit documenter (pas nettoyer en source).
SELECT 'categories manquantes' AS controle, count(*) AS lignes
FROM source.olist_products WHERE product_category_name IS NULL
UNION ALL
SELECT 'review_id dupliqués (lignes excédentaires)', coalesce(sum(n - 1), 0)
FROM (SELECT count(*) AS n FROM source.olist_order_reviews
      GROUP BY review_id HAVING count(*) > 1) d
UNION ALL
SELECT 'commandes livrées sans date réelle', count(*) FROM source.olist_orders
WHERE order_status='delivered' AND order_delivered_customer_date IS NULL
UNION ALL
SELECT 'carrier après livraison', count(*) FROM mart.v_orders
WHERE carrier_date_after_delivery;

SELECT * FROM mart.v_kpi_global;
