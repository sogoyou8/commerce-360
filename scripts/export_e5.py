r"""E5 Commerce 360 : exports locaux agregés RFM, sans identifiant client.

Depuis commerce-360 (apres run_e5.ps1) :
  .\.venv\Scripts\python.exe scripts\export_e5.py

Sortie : .data/e5/segments_summary.csv, cohort_segments.csv,
quality_summary.csv et manifest.json ; tous exclus de Git.
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
DEFAULT_OUT = ROOT / ".data" / "e5"

# Pas de customer_unique_id dans les exports agreges publics.
EXPORTS: dict[str, str] = {
    "segments_summary": """
        SELECT segment_code, segment_label, segment_priority,
               customers, repeat_customers, delivered_orders, item_sales_brl,
               avg_recency_days, avg_frequency, avg_monetary_brl,
               customer_share_pct, sales_share_pct
        FROM mart.e5_segments_summary ORDER BY segment_priority
    """,
    "cohort_segments": """
        SELECT first_observed_month, segment_code, segment_label,
               segment_priority, customers, repeat_customers,
               delivered_orders, item_sales_brl, avg_recency_days
        FROM mart.e5_cohort_segments ORDER BY first_observed_month, segment_priority
    """,
    "quality_summary": """
        SELECT * FROM mart.e5_quality_summary
    """,
}


def _row_count(path: Path) -> int:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return max(sum(1 for _ in csv.reader(handle)) - 1, 0)


def export(destination: Path, dsn: str) -> dict:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("Installer requirements.txt dans .venv") from exc

    destination.mkdir(parents=True, exist_ok=True)
    files: dict[str, dict] = {}
    with TemporaryDirectory(prefix=".e5_staging_", dir=destination.parent) as temp:
        staging = Path(temp)
        with psycopg.connect(dsn) as conn:
            conn.execute("SET TRANSACTION READ ONLY")
            dbname = conn.execute("SELECT current_database()").fetchone()[0]
            if dbname != "commerce360":
                raise RuntimeError(f"Base inattendue : {dbname!r}")

            quality = conn.execute("SELECT * FROM mart.e5_quality_summary").fetchone()
            # Ordre de la vue : clients, repeats, single, orders, sales, etc.
            if quality is None or int(quality[0]) != 93104 or \
               int(quality[1]) != 2789 or int(quality[3]) != 96211 or \
               str(quality[4]) != "13181027.13" or any(int(x) for x in quality[7:10]):
                raise RuntimeError(f"Recette E5 incorrecte : {quality!r}")

            for name, query in EXPORTS.items():
                output = staging / f"{name}.csv"
                with conn.cursor() as cur, output.open("wb") as target:
                    with cur.copy(
                        f"COPY ({query.strip()}) TO STDOUT WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"
                    ) as cp:
                        for block in cp:
                            target.write(block)

                n = _row_count(output)
                if (name == "quality_summary" and n != 1) or \
                   (name == "segments_summary" and not 1 <= n <= 7) or \
                   (name == "cohort_segments" and not 20 <= n <= 140):
                    raise RuntimeError(f"Volume inattendu pour {name}: {n}")
                files[name] = {
                    "filename": output.name,
                    "rows": n,
                    "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
                }
                print(f"  OK {name}.csv : {n} lignes")

        manifest = {
            "project": "Commerce 360 / E5 RFM historique",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "cutoff_exclusive": "2018-09-01",
            "currency": "BRL",
            "customer_grain": 93104,
            "delivered_order_grain": 96211,
            "files": files,
            "note": "Agregats sans identifiant client, source PostgreSQL locale.",
        }
        (staging / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        for item in staging.iterdir():
            os.replace(item, destination / item.name)

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Commerce 360 : exports RFM E5")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--dsn", help="Connexion PostgreSQL, sinon .env")
    args = parser.parse_args()
    result = export(args.out, resolve_dsn(args.dsn))
    print(f"E5 exports prepares : {len(result['files'])} CSV, {args.out.resolve()}")


if __name__ == "__main__":
    main()
