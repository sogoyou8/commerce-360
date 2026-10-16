-- E2 : agrégation aux bons grains AVANT jointures pour éviter les multiplications.

-- Les doublons géographiques stricts ne sont pas supprimés de source.
-- Les coordonnées très éloignées de l'emprise brésilienne sont exclues du résumé.
CREATE MATERIALIZED VIEW IF NOT EXISTS mart.mv_geo_zip AS
WITH distinct_coordinates AS (
    SELECT DISTINCT geolocation_zip_code_prefix, geolocation_lat, geolocation_lng
    FROM source.olist_geolocation
    WHERE geolocation_lat BETWEEN -35 AND 6
      AND geolocation_lng BETWEEN -75 AND -30
)
SELECT geolocation_zip_code_prefix,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY geolocation_lat) AS latitude,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY geolocation_lng) AS longitude
FROM distinct_coordinates
GROUP BY geolocation_zip_code_prefix;

CREATE UNIQUE INDEX IF NOT EXISTS ux_geo_zip ON mart.mv_geo_zip(geolocation_zip_code_prefix);
REFRESH MATERIALIZED VIEW mart.mv_geo_zip;

CREATE OR REPLACE VIEW mart.v_items AS
SELECT i.order_id, i.order_item_id, o.order_purchase_timestamp AS purchased_at,
       o.order_status, i.product_id, i.seller_id, i.price AS item_price_brl,
       i.freight_value AS freight_brl,
       COALESCE(t.product_category_name_english, p.product_category_name,
                'non renseignée') AS product_category,
       p.product_category_name AS original_category
FROM source.olist_order_items i
JOIN source.olist_orders o USING (order_id)
JOIN source.olist_products p USING (product_id)
LEFT JOIN source.product_category_name_translation t
       ON t.product_category_name = p.product_category_name;

CREATE OR REPLACE VIEW mart.v_order_item_totals AS
SELECT order_id,
       count(*)::bigint AS item_count,
       sum(price)::numeric(18,2) AS item_revenue_brl,
       sum(freight_value)::numeric(18,2) AS freight_brl
FROM source.olist_order_items
GROUP BY order_id;

CREATE OR REPLACE VIEW mart.v_order_payment_totals AS
SELECT order_id,
       count(*)::bigint AS payment_count,
       sum(payment_value)::numeric(18,2) AS payment_total_brl
FROM source.olist_order_payments
GROUP BY order_id;

-- Contrat E2 : dernier avis par date de création, puis réponse, puis identifiant
-- technique de ligne pour trancher les égalités (sans écraser le CSV source).
CREATE OR REPLACE VIEW mart.v_latest_order_review AS
SELECT DISTINCT ON (order_id)
       order_id, review_id, review_score, review_creation_date,
       review_answer_timestamp, review_row_id
FROM source.olist_order_reviews
ORDER BY order_id, review_creation_date DESC NULLS LAST,
         review_answer_timestamp DESC NULLS LAST, review_row_id DESC;

-- Grain commande : exactement une ligne pour chaque order_id (y compris annulées).
CREATE OR REPLACE VIEW mart.v_orders AS
SELECT o.order_id, o.customer_id, c.customer_unique_id,
       c.customer_state, c.customer_city, c.customer_zip_code_prefix,
       g.latitude AS customer_lat, g.longitude AS customer_lng,
       o.order_status, o.order_purchase_timestamp AS purchased_at,
       o.order_approved_at AS approved_at,
       o.order_delivered_carrier_date AS shipped_at,
       o.order_delivered_customer_date AS delivered_at,
       o.order_estimated_delivery_date AS estimated_delivery_at,
       (o.order_status = 'delivered') AS is_delivered,
       s.item_count, s.item_revenue_brl, s.freight_brl,
       py.payment_count, py.payment_total_brl,
       rv.review_score, rv.review_id,
       CASE WHEN o.order_status = 'delivered'
                 AND o.order_delivered_customer_date IS NOT NULL
                 AND o.order_estimated_delivery_date IS NOT NULL
            THEN o.order_delivered_customer_date > o.order_estimated_delivery_date
       END AS is_late,
       CASE WHEN o.order_status = 'delivered'
                 AND o.order_delivered_customer_date >= o.order_purchase_timestamp
            THEN EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_purchase_timestamp)) / 86400.0
       END AS delivery_days,
       (o.order_status = 'delivered'
           AND o.order_delivered_carrier_date IS NOT NULL
           AND o.order_delivered_customer_date IS NOT NULL
           AND o.order_delivered_carrier_date > o.order_delivered_customer_date)
           AS carrier_date_after_delivery
FROM source.olist_orders o
JOIN source.olist_customers c USING (customer_id)
LEFT JOIN mart.v_order_item_totals s USING (order_id)
LEFT JOIN mart.v_order_payment_totals py USING (order_id)
LEFT JOIN mart.v_latest_order_review rv USING (order_id)
LEFT JOIN mart.mv_geo_zip g ON g.geolocation_zip_code_prefix = c.customer_zip_code_prefix;

-- Valeurs de référence E1 : chiffres sur l'ensemble de l'archive, sans restriction
-- de période. Les vues d'analyse E3 pourront appliquer les fenêtres temporelles.
CREATE OR REPLACE VIEW mart.v_kpi_global AS
WITH delivered AS (
    SELECT * FROM mart.v_orders WHERE is_delivered
), per_customer AS (
    SELECT customer_unique_id, count(*) AS orders_count
    FROM delivered GROUP BY customer_unique_id
), clients AS (
    SELECT count(*)::bigint AS distinct_customers,
           count(*) FILTER (WHERE orders_count >= 2)::bigint AS repeat_customers
    FROM per_customer
)
SELECT count(*)::bigint AS delivered_orders,
       sum(item_revenue_brl)::numeric(18,2) AS item_revenue_brl,
       round(sum(item_revenue_brl) / NULLIF(count(*), 0), 2) AS average_basket_brl,
       max(cl.distinct_customers) AS distinct_customers,
       max(cl.repeat_customers) AS repeat_customers,
       round(100.0 * max(cl.repeat_customers) / NULLIF(max(cl.distinct_customers), 0), 2) AS repeat_rate_pct,
       count(*) FILTER (WHERE is_late)::bigint AS late_deliveries,
       count(is_late)::bigint AS dated_deliveries,
       round(100.0 * count(*) FILTER (WHERE is_late) / NULLIF(count(is_late), 0), 2) AS late_rate_pct,
       round(avg(delivery_days), 2) AS average_delivery_days,
       round(avg(review_score)::numeric, 2) AS average_review_score,
       count(review_score)::bigint AS scored_orders
FROM delivered CROSS JOIN clients cl;
