-- Commerce 360 / E2 — neuf tables typées (les lignes Olist sont conservées).
-- Les clés naturelles et les colonnes des CSV sont respectées.
CREATE SCHEMA IF NOT EXISTS source;
CREATE SCHEMA IF NOT EXISTS mart;

CREATE TABLE IF NOT EXISTS source.olist_customers (
    customer_id text PRIMARY KEY,
    customer_unique_id text NOT NULL,
    customer_zip_code_prefix text NOT NULL,
    customer_city text NOT NULL,
    customer_state text NOT NULL
);

CREATE TABLE IF NOT EXISTS source.olist_products (
    product_id text PRIMARY KEY,
    product_category_name text,
    product_name_lenght integer,
    product_description_lenght integer,
    product_photos_qty integer,
    product_weight_g integer,
    product_length_cm integer,
    product_height_cm integer,
    product_width_cm integer
);

CREATE TABLE IF NOT EXISTS source.olist_sellers (
    seller_id text PRIMARY KEY,
    seller_zip_code_prefix text NOT NULL,
    seller_city text NOT NULL,
    seller_state text NOT NULL
);

CREATE TABLE IF NOT EXISTS source.product_category_name_translation (
    product_category_name text PRIMARY KEY,
    product_category_name_english text NOT NULL
);

CREATE TABLE IF NOT EXISTS source.olist_orders (
    order_id text PRIMARY KEY,
    customer_id text NOT NULL REFERENCES source.olist_customers(customer_id),
    order_status text NOT NULL,
    order_purchase_timestamp timestamp NOT NULL,
    order_approved_at timestamp,
    order_delivered_carrier_date timestamp,
    order_delivered_customer_date timestamp,
    order_estimated_delivery_date timestamp
);

CREATE TABLE IF NOT EXISTS source.olist_order_items (
    order_id text NOT NULL REFERENCES source.olist_orders(order_id),
    order_item_id integer NOT NULL,
    product_id text NOT NULL REFERENCES source.olist_products(product_id),
    seller_id text NOT NULL REFERENCES source.olist_sellers(seller_id),
    shipping_limit_date timestamp NOT NULL,
    price numeric(14,2) NOT NULL,
    freight_value numeric(14,2) NOT NULL,
    PRIMARY KEY (order_id, order_item_id),
    CONSTRAINT order_item_price_nonnegative CHECK (price >= 0),
    CONSTRAINT order_item_freight_nonnegative CHECK (freight_value >= 0)
);

CREATE TABLE IF NOT EXISTS source.olist_order_payments (
    order_id text NOT NULL REFERENCES source.olist_orders(order_id),
    payment_sequential integer NOT NULL,
    payment_type text NOT NULL,
    payment_installments integer NOT NULL,
    payment_value numeric(14,2) NOT NULL,
    PRIMARY KEY (order_id, payment_sequential),
    CONSTRAINT payment_value_nonnegative CHECK (payment_value >= 0)
);

-- review_id n'est PAS unique dans Olist ; ne pas en faire la PK.
CREATE TABLE IF NOT EXISTS source.olist_order_reviews (
    review_row_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    review_id text NOT NULL,
    order_id text NOT NULL REFERENCES source.olist_orders(order_id),
    review_score integer NOT NULL CHECK (review_score BETWEEN 1 AND 5),
    review_comment_title text,
    review_comment_message text,
    review_creation_date timestamp NOT NULL,
    review_answer_timestamp timestamp
);

-- La géolocalisation contient plusieurs coordonnées par ZIP, sans PK naturelle.
-- Stocker le préfixe comme TEXTE préserve les zéros initiaux.
CREATE TABLE IF NOT EXISTS source.olist_geolocation (
    geolocation_row_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    geolocation_zip_code_prefix text NOT NULL,
    geolocation_lat double precision NOT NULL,
    geolocation_lng double precision NOT NULL,
    geolocation_city text NOT NULL,
    geolocation_state text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON source.olist_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_purchase ON source.olist_orders(order_purchase_timestamp);
CREATE INDEX IF NOT EXISTS idx_items_product ON source.olist_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_items_seller ON source.olist_order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON source.olist_order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_id ON source.olist_order_reviews(review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_dates ON source.olist_order_reviews(order_id, review_creation_date DESC, review_answer_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geo_zip ON source.olist_geolocation(geolocation_zip_code_prefix);
CREATE INDEX IF NOT EXISTS idx_customers_unique ON source.olist_customers(customer_unique_id);
