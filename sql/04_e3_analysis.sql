-- Commerce 360 / E3 : analyses commerciales sur la fenetre comparable.
-- Ne modifie JAMAIS les tables source, ni les vues E2.
-- Fenetre : achats >= 2017-01-01 et < 2018-09-01 (20 mois calendaires).
-- References E1/E2 : l'ensemble de l'archive reste dans mart.v_kpi_global.

-- 1 ligne par commande achetee dans la fenetre, tout statut.
CREATE OR REPLACE VIEW mart.e3_period_orders AS
SELECT *
FROM mart.v_orders
WHERE purchased_at >= TIMESTAMP '2017-01-01 00:00:00'
  AND purchased_at <  TIMESTAMP '2018-09-01 00:00:00';

-- Commandes livrees dans cette fenetre, classees a leur DATE D'ACHAT.
CREATE OR REPLACE VIEW mart.e3_delivered_orders AS
SELECT * FROM mart.e3_period_orders WHERE is_delivered;

-- 1 ligne par article livre : source fiable des ventes par produit et vendeur.
CREATE OR REPLACE VIEW mart.e3_delivered_items AS
SELECT i.*
FROM mart.v_items i
WHERE i.purchased_at >= TIMESTAMP '2017-01-01 00:00:00'
  AND i.purchased_at <  TIMESTAMP '2018-09-01 00:00:00'
  AND i.order_status = 'delivered';

-- Ventes et panier : calculs sur grain commande, jamais sur jointures articles/paiements.
CREATE OR REPLACE VIEW mart.e3_monthly_sales AS
SELECT date_trunc('month', purchased_at)::date AS month_start,
       count(*)::bigint AS orders_all_statuses,
       count(*) FILTER (WHERE is_delivered)::bigint AS delivered_orders,
       count(DISTINCT customer_unique_id) FILTER (WHERE is_delivered)::bigint AS delivered_customers,
       coalesce(sum(item_revenue_brl) FILTER (WHERE is_delivered), 0)::numeric(18,2) AS item_sales_brl,
       coalesce(sum(freight_brl) FILTER (WHERE is_delivered), 0)::numeric(18,2) AS freight_brl,
       round(
         coalesce(sum(item_revenue_brl) FILTER (WHERE is_delivered), 0)
         / NULLIF(count(*) FILTER (WHERE is_delivered), 0), 2
       ) AS average_basket_brl
FROM mart.e3_period_orders
GROUP BY date_trunc('month', purchased_at)::date;

-- Comparaison de mois equivalents uniquement (janvier-aout 2017 vs 2018).
-- Les valeurs 2017/2018 sont des montants observes, pas des taux de croissance
-- comparables a une activite a perimetre economique constant.
CREATE OR REPLACE VIEW mart.e3_yoy_jan_aug AS
WITH monthly AS (
 SELECT extract(month FROM month_start)::integer AS month_num,
        extract(year FROM month_start)::integer AS yr,
        delivered_orders, item_sales_brl
 FROM mart.e3_monthly_sales
 WHERE extract(month FROM month_start) BETWEEN 1 AND 8
), paired AS (
 SELECT m.month_num,
        coalesce(max(s.delivered_orders) FILTER (WHERE s.yr=2017), 0)::bigint AS orders_2017,
        coalesce(max(s.delivered_orders) FILTER (WHERE s.yr=2018), 0)::bigint AS orders_2018,
        coalesce(max(s.item_sales_brl) FILTER (WHERE s.yr=2017), 0)::numeric(18,2) AS sales_2017_brl,
        coalesce(max(s.item_sales_brl) FILTER (WHERE s.yr=2018), 0)::numeric(18,2) AS sales_2018_brl
 FROM generate_series(1,8) AS m(month_num)
 LEFT JOIN monthly s USING (month_num)
 GROUP BY m.month_num
)
SELECT *,
       round(100.0 * (sales_2018_brl-sales_2017_brl)
             / NULLIF(sales_2017_brl,0), 2) AS sales_change_pct
FROM paired;

-- Categorie : chaque article appartient a UNE categorie ; une commande peut
-- apparaître dans plusieurs categories. Ne jamais sommer orders_with_category.
CREATE OR REPLACE VIEW mart.e3_category_sales AS
WITH grouped AS (
 SELECT product_category,
        count(*)::bigint AS sold_items,
        count(DISTINCT order_id)::bigint AS orders_with_category,
        count(DISTINCT product_id)::bigint AS distinct_products,
        sum(item_price_brl)::numeric(18,2) AS item_sales_brl,
        sum(freight_brl)::numeric(18,2) AS freight_brl
 FROM mart.e3_delivered_items
 GROUP BY product_category
)
SELECT *,
       round(100.0 * item_sales_brl / NULLIF(sum(item_sales_brl) OVER (),0),2) AS sales_share_pct,
       dense_rank() OVER (ORDER BY item_sales_brl DESC) AS sales_rank
FROM grouped;

-- Vendeur : meme avertissement pour orders_with_seller (chevauchements possibles).
CREATE OR REPLACE VIEW mart.e3_seller_sales AS
WITH grouped AS (
 SELECT i.seller_id, s.seller_state, s.seller_city,
        count(*)::bigint AS sold_items,
        count(DISTINCT i.order_id)::bigint AS orders_with_seller,
        count(DISTINCT i.product_id)::bigint AS distinct_products,
        sum(i.item_price_brl)::numeric(18,2) AS item_sales_brl,
        sum(i.freight_brl)::numeric(18,2) AS freight_brl
 FROM mart.e3_delivered_items i
 JOIN source.olist_sellers s ON s.seller_id = i.seller_id
 GROUP BY i.seller_id, s.seller_state, s.seller_city
)
SELECT *,
       round(100.0 * item_sales_brl / NULLIF(sum(item_sales_brl) OVER (),0),2) AS sales_share_pct,
       dense_rank() OVER (ORDER BY item_sales_brl DESC) AS sales_rank
FROM grouped;

-- Clients uniques : "premier achat" = premier achat LIVRE vu DANS LA FENETRE,
-- et pas date de premiere commande a vie ni retention generalisable.
CREATE OR REPLACE VIEW mart.e3_customers AS
SELECT customer_unique_id,
       count(*)::bigint AS delivered_orders,
       min(purchased_at)::date AS first_observed_purchase,
       max(purchased_at)::date AS last_observed_purchase,
       (DATE '2018-09-01' - max(purchased_at)::date)::integer AS recency_days_at_cutoff,
       coalesce(sum(item_revenue_brl),0)::numeric(18,2) AS observed_item_sales_brl,
       (count(*) >= 2) AS repeated_in_window
FROM mart.e3_delivered_orders
GROUP BY customer_unique_id;

-- Synthese de cohortes descriptives : premieres commandes livrees observees
-- entre 2017-01 et 2018-08. Les cohortes recentes sont censurees a droite.
CREATE OR REPLACE VIEW mart.e3_customer_cohorts AS
SELECT date_trunc('month', first_observed_purchase)::date AS first_observed_month,
       count(*)::bigint AS observed_customers,
       count(*) FILTER (WHERE repeated_in_window)::bigint AS repeat_customers,
       round(100.0 * count(*) FILTER (WHERE repeated_in_window)
             / NULLIF(count(*),0),2) AS observed_repeat_rate_pct,
       sum(observed_item_sales_brl)::numeric(18,2) AS observed_sales_brl
FROM mart.e3_customers
GROUP BY date_trunc('month', first_observed_purchase)::date;

-- Qualite de livraison : territoire de l'ACHETEUR, pas du vendeur.
-- Les 23 incoherences "remise au transporteur apres livraison" sont signalees.
-- Elles sont exclues UNIQUEMENT de la moyenne de delai dite 'clean'.
-- Retard = livraison reelle > date estimee, seulement dates connues.
CREATE OR REPLACE VIEW mart.e3_delivery_states AS
SELECT customer_state,
       count(*)::bigint AS delivered_orders,
       count(is_late)::bigint AS dated_deliveries,
       count(*) FILTER (WHERE is_late)::bigint AS late_deliveries,
       round(100.0 * count(*) FILTER (WHERE is_late)
             / NULLIF(count(is_late),0),2) AS late_rate_pct,
       count(*) FILTER (WHERE carrier_date_after_delivery)::bigint AS suspicious_carrier_dates,
       round(avg(delivery_days) FILTER (
          WHERE NOT carrier_date_after_delivery
       )::numeric,2) AS avg_delivery_days_clean,
       count(review_score)::bigint AS scored_orders,
       round(avg(review_score)::numeric,2) AS avg_review_score
FROM mart.e3_delivered_orders
GROUP BY customer_state;

-- Comparaison descriptive notes et retards, sans inférence de causalite.
CREATE OR REPLACE VIEW mart.e3_delivery_satisfaction AS
SELECT CASE WHEN is_late IS TRUE THEN 'late'
            WHEN is_late IS FALSE THEN 'on_time'
            ELSE 'undated' END AS delivery_group,
       count(*)::bigint AS delivered_orders,
       count(review_score)::bigint AS scored_orders,
       round(avg(review_score)::numeric,2) AS avg_review_score,
       count(*) FILTER (WHERE review_score <= 2)::bigint AS low_score_orders,
       round(100.0 * count(*) FILTER (WHERE review_score <= 2)
             / NULLIF(count(review_score),0),2) AS low_score_rate_pct,
       round(avg(delivery_days) FILTER (
         WHERE NOT carrier_date_after_delivery
       )::numeric,2) AS avg_delivery_days_clean
FROM mart.e3_delivered_orders
GROUP BY CASE WHEN is_late IS TRUE THEN 'late'
              WHEN is_late IS FALSE THEN 'on_time'
              ELSE 'undated' END;

-- Observabilite des anomalies : jamais d'effacement des lignes sources.
CREATE OR REPLACE VIEW mart.e3_quality_summary AS
SELECT count(*)::bigint AS orders_in_window,
       count(*) FILTER (WHERE is_delivered)::bigint AS delivered_orders,
       count(*) FILTER (WHERE item_count IS NULL)::bigint AS orders_without_items,
       count(*) FILTER (WHERE payment_count IS NULL)::bigint AS orders_without_payments,
       count(*) FILTER (WHERE review_score IS NULL)::bigint AS orders_without_selected_review,
       count(*) FILTER (WHERE customer_lat IS NULL OR customer_lng IS NULL)::bigint AS orders_without_geo,
       count(*) FILTER (WHERE is_delivered AND delivered_at IS NULL)::bigint AS delivered_missing_actual_date,
       count(*) FILTER (WHERE carrier_date_after_delivery)::bigint AS suspicious_carrier_dates,
       (SELECT count(*)::bigint FROM mart.e3_delivered_items
        WHERE product_category = 'non renseignée') AS sold_items_without_category
FROM mart.e3_period_orders;
