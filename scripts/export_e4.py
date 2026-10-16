r"""E4 Commerce 360 : export en lecture seule des vues PostgreSQL E3 vers CSV pour Excel.

Depuis commerce-360 :
  .\.venv\Scripts\python.exe scripts\export_e4.py

Sortie locale ignoree par Git : .data/e4/*.csv + manifest.json.
Aucun export des neuf tables sources ni du mot de passe DB.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from import_olist import resolve_dsn

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / ".data" / "e4"

# Une requete SELECT par export ; les grains et le filtre temporel sont ceux
# des vues E3, deja controles dans sql/05_e3_checks.sql.
EXPORTS: dict[str, str] = {
    "fact_delivered_orders": """
        SELECT order_id,
               purchased_at::date AS purchase_date,
               date_trunc('month', purchased_at)::date AS purchase_month,
               customer_state,
               item_count, item_revenue_brl, freight_brl,
               CASE WHEN is_late IS TRUE THEN 'late'
                    WHEN is_late IS FALSE THEN 'on_time'
                    ELSE 'undated' END AS delivery_group,
               delivery_days,
               CASE WHEN NOT carrier_date_after_delivery
                    THEN delivery_days END AS delivery_days_clean,
               review_score,
               CASE WHEN review_score IS NULL THEN NULL
                    ELSE review_score <= 2 END AS low_review_score
        FROM mart.e3_delivered_orders
        ORDER BY purchased_at, order_id
    """,
    "monthly_sales": """
        SELECT month_start, orders_all_statuses, delivered_orders,
               delivered_customers, item_sales_brl, freight_brl, average_basket_brl
        FROM mart.e3_monthly_sales ORDER BY month_start
    """,
    "yoy_jan_aug": """
        SELECT month_num, orders_2017, orders_2018,
               sales_2017_brl, sales_2018_brl, sales_change_pct
        FROM mart.e3_yoy_jan_aug ORDER BY month_num
    """,
    "category_sales": """
        SELECT product_category, sold_items, orders_with_category, distinct_products,
               item_sales_brl, freight_brl, sales_share_pct, sales_rank
        FROM mart.e3_category_sales ORDER BY item_sales_brl DESC, product_category
    """,
    "seller_sales": """
        SELECT seller_id, seller_state, seller_city, sold_items, orders_with_seller,
               distinct_products, item_sales_brl, freight_brl, sales_share_pct, sales_rank
        FROM mart.e3_seller_sales ORDER BY item_sales_brl DESC, seller_id
    """,
    "customer_cohorts": """
        SELECT first_observed_month, observed_customers, repeat_customers,
               observed_repeat_rate_pct, observed_sales_brl
        FROM mart.e3_customer_cohorts ORDER BY first_observed_month
    """,
    "delivery_states": """
        SELECT customer_state, delivered_orders, dated_deliveries, late_deliveries,
               late_rate_pct, suspicious_carrier_dates,
               avg_delivery_days_clean, scored_orders, avg_review_score
        FROM mart.e3_delivery_states ORDER BY delivered_orders DESC, customer_state
    """,
    "delivery_satisfaction": """
        SELECT delivery_group, delivered_orders, scored_orders, avg_review_score,
               low_score_orders, low_score_rate_pct, avg_delivery_days_clean
        FROM mart.e3_delivery_satisfaction ORDER BY delivery_group
    """,
    "quality_summary": """
        SELECT orders_in_window, delivered_orders, orders_without_items,
               orders_without_payments, orders_without_selected_review,
               orders_without_geo, delivered_missing_actual_date,
               suspicious_carrier_dates, sold_items_without_category
        FROM mart.e3_quality_summary
    """,
}

EXPECTED_ROW_COUNTS = {
    "fact_delivered_orders": 96211,
    "monthly_sales": 20,
    "yoy_jan_aug": 8,
    "customer_cohorts": 20,
    "delivery_satisfaction": 3,
    "quality_summary": 1,
}


def _count_csv_rows(file_path: Path) -> int:
    with file_path.open("r", encoding="utf-8", newline="") as f:
        count = sum(1 for _ in csv.reader(f)) - 1
    return max(count, 0)


def export(destination: Path, dsn: str) -> dict:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("Installer requirements.txt dans .venv") from exc

    destination.mkdir(parents=True, exist_ok=True)
    files: dict[str, dict] = {}

    # Construire TOUS les exports dans un repertoire temporaire avant publication.
    with TemporaryDirectory(prefix=".e4_staging_", dir=destination.parent) as staging_dir:
        staging = Path(staging_dir)
        with psycopg.connect(dsn) as conn:
            # Aucun UPDATE/INSERT/DELETE/TRUNCATE/DDL autorise par la transaction.
            conn.execute("SET TRANSACTION READ ONLY")
            name = conn.execute("SELECT current_database()").fetchone()[0]
            if name != "commerce360":
                raise RuntimeError(f"Base inattendue : {name!r} (commerce360 requis)")

            # Reconciliation E3 avant toute sortie Excel.
            row = conn.execute("""
                SELECT count(*)::bigint,
                       sum(item_revenue_brl)::numeric(18,2),
                       count(DISTINCT customer_unique_id)::bigint
                FROM mart.e3_delivered_orders
            """).fetchone()
            if row is None or int(row[0]) != 96211 or str(row[1]) != "13181027.13" or int(row[2]) != 93104:
                raise RuntimeError(f"KPI E3 inattendus : {row!r}; exports refuses")

            for key, query in EXPORTS.items():
                dst = staging / (key + ".csv")
                # COPY TO STDOUT en streaming : faible consommation memoire meme pour 96k lignes.
                with conn.cursor() as cur, dst.open("wb") as f:
                    with cur.copy(
                        f"COPY ({query.strip()}) TO STDOUT WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"
                    ) as cp:
                        for block in cp:
                            f.write(block)

                rows = _count_csv_rows(dst)
                if key in EXPECTED_ROW_COUNTS and rows != EXPECTED_ROW_COUNTS[key]:
                    raise RuntimeError(
                        f"Nombre de lignes invalide pour {key} : "
                        f"{rows} vs {EXPECTED_ROW_COUNTS[key]}"
                    )
                files[key] = {
                    "filename": dst.name,
                    "rows": rows,
                    "sha256": hashlib.sha256(dst.read_bytes()).hexdigest(),
                }
                print(f"  ✓ {dst.name}: {rows:,} lignes")

        manifest = {
            "project": "Commerce 360 / E4 Excel",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "period_purchase_start_inclusive": "2017-01-01",
            "period_purchase_end_exclusive": "2018-09-01",
            "amount_currency": "BRL",
            "e3_delivered_orders": 96211,
            "e3_item_sales_brl": "13181027.13",
            "files": files,
            "note": "Exports locaux de vues E3. CSV et manifest non versionnes sur GitHub.",
        }
        (staging / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        # Publication seulement apres lecture SQL + verification des 9 exports.
        for filepath in staging.iterdir():
            os.replace(filepath, destination / filepath.name)

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Commerce 360 — exports E4 pour Excel")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT,
                        help="Sortie locale pour les CSV, defaut .data/e4/")
    parser.add_argument("--dsn", help="Connexion PostgreSQL, sinon .env / DATABASE_URL")
    args = parser.parse_args()
    result = export(args.out, resolve_dsn(args.dsn))
    print(f"E4 exports prepares : {len(result['files'])} CSV, {args.out.resolve()}")


if __name__ == "__main__":
    main()
