-- Commerce 360 / E5 : segmentation RFM historique, sans retouche des sources.
-- Depend de mart.e3_customers : grain client unique, commandes livrees de
-- janvier 2017 (inclus) a septembre 2018 (exclu).
-- Date de reference fixe = 2018-09-01. Pas de "client perdu" affirme.
-- R et M : quintiles approximatifs avec CUME_DIST, ex aequo conserves.
-- F : barème EXPLICITE (1 achat=1, 2 achats=3, >=3 achats=5), car les
-- clients a achat unique dominent la distribution. Pas de faux quintile F.

CREATE OR REPLACE VIEW mart.e5_customer_rfm AS
WITH ranked AS (
 SELECT c.customer_unique_id,
        c.first_observed_purchase,
        c.last_observed_purchase,
        c.recency_days_at_cutoff::integer AS recency_days,
        c.delivered_orders::bigint AS frequency_orders,
        c.observed_item_sales_brl::numeric(18,2) AS monetary_brl,
        cume_dist() OVER (ORDER BY c.recency_days_at_cutoff DESC) AS r_percentile,
        cume_dist() OVER (ORDER BY c.observed_item_sales_brl ASC) AS m_percentile
 FROM mart.e3_customers c
), scored AS (
 SELECT customer_unique_id,
        first_observed_purchase, last_observed_purchase,
        recency_days, frequency_orders, monetary_brl,
        least(5, greatest(1, ceil(5.0 * r_percentile)::integer)) AS r_score,
        CASE WHEN frequency_orders >= 3 THEN 5
             WHEN frequency_orders = 2 THEN 3
             ELSE 1 END::integer AS f_score,
        least(5, greatest(1, ceil(5.0 * m_percentile)::integer)) AS m_score
 FROM ranked
)
SELECT *,
       (r_score * 100 + f_score * 10 + m_score)::integer AS rfm_score
FROM scored;

-- Segments MUTUELLEMENT EXCLUSIFS, ordre de priorite documente.
-- "ancien" et "moins recent" = mesures au cutoff, pas statut actuel.
CREATE OR REPLACE VIEW mart.e5_customer_segments AS
WITH segmented AS (
 SELECT c.*,
        CASE
         WHEN frequency_orders >= 2 AND r_score >= 4 AND m_score >= 4
           THEN 'champions_observed'
         WHEN frequency_orders >= 2 AND r_score >= 3
           THEN 'repeat_recent'
         WHEN m_score = 5 AND r_score >= 3
           THEN 'high_value_recent'
         WHEN frequency_orders = 1 AND r_score >= 4
           THEN 'single_recent'
         WHEN frequency_orders >= 2 AND r_score <= 2
           THEN 'repeat_less_recent'
         WHEN frequency_orders = 1 AND r_score <= 2
           THEN 'single_less_recent'
         ELSE 'other_observed'
        END AS segment_code
 FROM mart.e5_customer_rfm c
)
SELECT *,
       CASE segment_code
         WHEN 'champions_observed' THEN 'Champions observes'
         WHEN 'repeat_recent' THEN 'Reacheteurs recents observes'
         WHEN 'high_value_recent' THEN 'Forte valeur recente observee'
         WHEN 'single_recent' THEN 'Premier achat unique recent observe'
         WHEN 'repeat_less_recent' THEN 'Reacheteurs moins recents'
         WHEN 'single_less_recent' THEN 'Achat unique moins recent'
         ELSE 'Autres profils observes'
       END AS segment_label,
       CASE segment_code
         WHEN 'champions_observed' THEN 1
         WHEN 'repeat_recent' THEN 2
         WHEN 'high_value_recent' THEN 3
         WHEN 'single_recent' THEN 4
         WHEN 'repeat_less_recent' THEN 5
         WHEN 'single_less_recent' THEN 6
         ELSE 7 END::integer AS segment_priority
FROM segmented;

-- Seules les syntheses doivent etre exportees/publiables : pas d'ID client.
CREATE OR REPLACE VIEW mart.e5_segments_summary AS
SELECT segment_code, segment_label, segment_priority,
       count(*)::bigint AS customers,
       count(*) FILTER (WHERE frequency_orders >= 2)::bigint AS repeat_customers,
       sum(frequency_orders)::bigint AS delivered_orders,
       sum(monetary_brl)::numeric(18,2) AS item_sales_brl,
       round(avg(recency_days)::numeric,2) AS avg_recency_days,
       round(avg(frequency_orders)::numeric,3) AS avg_frequency,
       round(avg(monetary_brl)::numeric,2) AS avg_monetary_brl,
       round(100.0 * count(*) / NULLIF(sum(count(*)) OVER (),0),2) AS customer_share_pct,
       round(100.0 * sum(monetary_brl)
             / NULLIF(sum(sum(monetary_brl)) OVER (),0),2) AS sales_share_pct
FROM mart.e5_customer_segments
GROUP BY segment_code, segment_label, segment_priority;

-- Cohortes descriptives : premieres commandes LIVREES observees dans la fenetre.
-- IMPORTANT : les cohortes recentes ont moins de recul (censure a droite).
CREATE OR REPLACE VIEW mart.e5_cohort_segments AS
SELECT date_trunc('month', first_observed_purchase)::date AS first_observed_month,
       segment_code, segment_label, segment_priority,
       count(*)::bigint AS customers,
       count(*) FILTER (WHERE frequency_orders >= 2)::bigint AS repeat_customers,
       sum(frequency_orders)::bigint AS delivered_orders,
       sum(monetary_brl)::numeric(18,2) AS item_sales_brl,
       round(avg(recency_days)::numeric,2) AS avg_recency_days
FROM mart.e5_customer_segments
GROUP BY date_trunc('month', first_observed_purchase)::date,
         segment_code, segment_label, segment_priority;

-- Vue d'observabilite : audit de population et montants, non table source.
CREATE OR REPLACE VIEW mart.e5_quality_summary AS
SELECT count(*)::bigint AS customers,
       count(*) FILTER (WHERE frequency_orders >= 2)::bigint AS repeat_customers,
       count(*) FILTER (WHERE frequency_orders = 1)::bigint AS single_order_customers,
       sum(frequency_orders)::bigint AS delivered_orders,
       sum(monetary_brl)::numeric(18,2) AS item_sales_brl,
       min(recency_days)::integer AS min_recency_days,
       max(recency_days)::integer AS max_recency_days,
       count(*) FILTER (WHERE monetary_brl IS NULL OR monetary_brl < 0)::bigint
         AS invalid_monetary_customers,
       count(*) FILTER (WHERE recency_days IS NULL OR recency_days < 1)::bigint
         AS invalid_recency_customers,
       count(*) FILTER (WHERE frequency_orders IS NULL OR frequency_orders < 1)::bigint
         AS invalid_frequency_customers
FROM mart.e5_customer_segments;
