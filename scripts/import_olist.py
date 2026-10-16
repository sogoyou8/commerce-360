"""Import reproductible E2 dans PostgreSQL 16+ (9 CSV Olist, 1 transaction).

Usage : python scripts/import_olist.py --zip /chemin/vers/archive.zip
Exige DATABASE_URL ou --dsn ; remet à zéro uniquement les neuf tables 'source'.
"""
from __future__ import annotations

import argparse
import csv
import io
import os
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]

# CSV -> table / colonnes dans l'ordre du fichier d'origine.
IMPORTS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("olist_customers_dataset.csv", "olist_customers", (
        "customer_id", "customer_unique_id", "customer_zip_code_prefix", "customer_city", "customer_state")),
    ("olist_products_dataset.csv", "olist_products", (
        "product_id", "product_category_name", "product_name_lenght", "product_description_lenght",
        "product_photos_qty", "product_weight_g", "product_length_cm", "product_height_cm", "product_width_cm")),
    ("olist_sellers_dataset.csv", "olist_sellers", (
        "seller_id", "seller_zip_code_prefix", "seller_city", "seller_state")),
    ("product_category_name_translation.csv", "product_category_name_translation", (
        "product_category_name", "product_category_name_english")),
    ("olist_orders_dataset.csv", "olist_orders", (
        "order_id", "customer_id", "order_status", "order_purchase_timestamp", "order_approved_at",
        "order_delivered_carrier_date", "order_delivered_customer_date", "order_estimated_delivery_date")),
    ("olist_order_items_dataset.csv", "olist_order_items", (
        "order_id", "order_item_id", "product_id", "seller_id", "shipping_limit_date",
        "price", "freight_value")),
    ("olist_order_payments_dataset.csv", "olist_order_payments", (
        "order_id", "payment_sequential", "payment_type", "payment_installments", "payment_value")),
    ("olist_order_reviews_dataset.csv", "olist_order_reviews", (
        "review_id", "order_id", "review_score", "review_comment_title", "review_comment_message",
        "review_creation_date", "review_answer_timestamp")),
    ("olist_geolocation_dataset.csv", "olist_geolocation", (
        "geolocation_zip_code_prefix", "geolocation_lat", "geolocation_lng",
        "geolocation_city", "geolocation_state")),
)


def check_zip_headers(path: Path) -> None:
    """Refuser d'importer des CSV d'un autre jeu ou à colonnes déplacées."""
    with ZipFile(path) as archive:
        found = set(archive.namelist())
        wanted = {name for name, _, _ in IMPORTS}
        if found != wanted:
            raise ValueError(f"Archive attendue : 9 CSV Olist. Manquants: {wanted - found}; inattendus: {found - wanted}")
        for file_name, _, columns in IMPORTS:
            with archive.open(file_name) as f:
                header_line = f.readline().decode("utf-8-sig")
            header = tuple(next(csv.reader(io.StringIO(header_line))))
            if header != columns:
                raise ValueError(f"Colonnes incorrectes dans {file_name}: {header} != {columns}")


def resolve_dsn(explicit: str | None) -> str:
    if explicit:
        return explicit
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env_file = ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"')
    raise ValueError("Passer --dsn ou définir DATABASE_URL dans .env ou l'environnement")


def load(archive_path: Path, dsn: str) -> None:
    import psycopg  # Optional au moment de lancer l'import, pas pour la vérification archive

    check_zip_headers(archive_path)
    # Tout est transactionnel : une erreur de COPY/FK/recette annule l'import complet.
    with psycopg.connect(dsn) as conn:
        conn.execute((ROOT / "sql/01_source.sql").read_text(encoding="utf-8"))
        tables = ", ".join(f"source.{name}" for _, name, _ in IMPORTS)
        conn.execute(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE")
        with ZipFile(archive_path) as archive:
            for file_name, table, columns in IMPORTS:
                cols = ", ".join(columns)
                sql = f"COPY source.{table} ({cols}) FROM STDIN WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"
                with conn.cursor() as cursor:
                    with cursor.copy(sql) as copy:
                        with archive.open(file_name, "r") as source:
                            while chunk := source.read(1024 * 1024):
                                copy.write(chunk)
                    count = cursor.execute(f"SELECT count(*) FROM source.{table}").fetchone()[0]
                    print(f"  ✓ {table}: {count:,} lignes")
        print("Reconstruction des vues analytiques et des coordonnées postales…")
        conn.execute((ROOT / "sql/02_mart.sql").read_text(encoding="utf-8"))
        conn.execute((ROOT / "sql/03_quality.sql").read_text(encoding="utf-8"))
        result = conn.execute("SELECT * FROM mart.v_kpi_global").fetchone()
        print("KPI globaux E2 (résultat DB) :", result)
        # Pas de COMMIT anticipé ; le context manager commit seulement si tout réussit.
    print("E2 PostgreSQL : import, contrôles et vues validés. Transaction confirmée.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Commerce 360 — Import PostgreSQL du dataset Olist")
    parser.add_argument("--zip", type=Path, required=True, help="Archive ZIP originale à neuf CSV")
    parser.add_argument("--dsn", help="URL de connexion PostgreSQL, sinon DATABASE_URL / .env")
    args = parser.parse_args()
    if not args.zip.is_file():
        parser.error(f"Archive introuvable : {args.zip}")
    load(args.zip, resolve_dsn(args.dsn))


if __name__ == "__main__":
    main()
