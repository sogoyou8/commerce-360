r"""E6 Commerce 360 : valide les exports E4/E5 existants, sans acces SQL ni ecriture.

Usage : py scripts/validate_e6.py [--data-root chemin\vers\.data]
Les fichiers et manifestes sont locaux, exclus de GitHub.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    "e4": {
        "fact_delivered_orders": 96211,
        "monthly_sales": 20,
        "yoy_jan_aug": 8,
        "category_sales": 74,
        "seller_sales": 2945,
        "customer_cohorts": 20,
        "delivery_states": 27,
        "delivery_satisfaction": 3,
        "quality_summary": 1,
    },
    "e5": {
        "segments_summary": 7,
        "cohort_segments": 83,
        "quality_summary": 1,
    },
}
KPI_ORDERS = 96211
KPI_CUSTOMERS = 93104
KPI_REPEATS = 2789
KPI_SALES = Decimal("13181027.13")


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        table = csv.DictReader(handle)
        require(bool(table.fieldnames), f"En-tete manquant : {path.name}")
        rows = list(table)
        require(all(None not in row for row in rows), f"CSV malforme : {path.name}")
        return rows


def amount(row: dict[str, str], field: str) -> Decimal:
    require(field in row and row[field] != "", f"Champ monetaire absent : {field}")
    return Decimal(row[field])


def validate(data_root: Path) -> dict[str, object]:
    """Verification hors ligne complete, sans creation ou mutation des fichiers."""
    data_root = data_root.resolve(strict=True)
    tables: dict[str, list[dict[str, str]]] = {}
    for phase, entries in EXPECTED.items():
        folder = data_root / phase
        manifest_path = folder / "manifest.json"
        require(manifest_path.is_file(), f"Manifeste absent : {manifest_path}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        require(set(manifest["files"]) == set(entries),
                f"Liste d'exports {phase} inattendue")
        require(manifest.get("files") is not None, f"Manifest {phase} incomplet")
        for name, expected_rows in entries.items():
            meta = manifest["files"][name]
            require(meta["filename"] == name + ".csv",
                    f"Nom incoherent {phase}/{name}")
            file_path = folder / meta["filename"]
            require(file_path.is_file(), f"Fichier absent : {file_path}")
            require(sha256_file(file_path) == meta["sha256"],
                    f"SHA256 incorrect : {phase}/{name}")
            rows = read_csv(file_path)
            require(len(rows) == expected_rows == meta["rows"],
                    f"Grain invalide : {phase}/{name}, {len(rows)} lignes")
            tables[f"{phase}/{name}"] = rows

    fact = tables["e4/fact_delivered_orders"]
    orders = {r["order_id"] for r in fact}
    require(len(orders) == KPI_ORDERS, "Order_id absent ou duplique en E4")
    require(all(r["purchase_month"][:7] >= "2017-01"
                and r["purchase_month"][:7] <= "2018-08" for r in fact),
            "Date d'achat en dehors de la fenetre E3")
    fact_sales = sum((Decimal(r["item_revenue_brl"] or "0") for r in fact), Decimal(0))
    require(fact_sales == KPI_SALES, f"Ventes fact E4 : {fact_sales}")

    monthly = tables["e4/monthly_sales"]
    require(len({r["month_start"] for r in monthly}) == 20,
            "Calendrier mensuel E4 non unique")
    require(sum(int(r["delivered_orders"]) for r in monthly) == KPI_ORDERS,
            "Commandes mensuelles E4 non reconciliees")
    require(sum((amount(r, "item_sales_brl") for r in monthly), Decimal(0))
            == KPI_SALES, "Ventes mensuelles E4 non reconciliees")

    customer_cohorts = tables["e4/customer_cohorts"]
    require(sum(int(r["observed_customers"]) for r in customer_cohorts)
            == KPI_CUSTOMERS, "Clients cohortes E4 non reconcilies")
    require(sum(int(r["repeat_customers"]) for r in customer_cohorts)
            == KPI_REPEATS, "Reacheteurs cohortes E4 non reconcilies")

    s = tables["e5/segments_summary"]
    require(len({r["segment_code"] for r in s}) == 7,
            "Segment RFM absent ou duplique")
    require(sum(int(r["customers"]) for r in s) == KPI_CUSTOMERS,
            "Population RFM non reconciliee")
    require(sum(int(r["repeat_customers"]) for r in s) == KPI_REPEATS,
            "Reacheteurs RFM non reconcilies")
    require(sum(int(r["delivered_orders"]) for r in s) == KPI_ORDERS,
            "Commandes RFM non reconciliees")
    require(sum((amount(r, "item_sales_brl") for r in s), Decimal(0))
            == KPI_SALES, "Ventes RFM non reconciliees")

    c = tables["e5/cohort_segments"]
    require(len({r["first_observed_month"] for r in c}) == 20,
            "Cohortes RFM : moins de 20 mois")
    require(sum(int(r["customers"]) for r in c) == KPI_CUSTOMERS,
            "Population cohortes RFM non reconciliee")
    require(sum((amount(r, "item_sales_brl") for r in c), Decimal(0))
            == KPI_SALES, "Ventes cohortes RFM non reconciliees")

    e4_quality = tables["e4/quality_summary"][0]
    require(int(e4_quality["orders_in_window"]) == 99092,
            "Nombre de commandes E3 (tous statuts) incorrect")
    require(int(e4_quality["delivered_orders"]) == KPI_ORDERS,
            "Qualite E4 commandes livrees non reconciliee")
    e5_quality = tables["e5/quality_summary"][0]
    require(int(e5_quality["customers"]) == KPI_CUSTOMERS
            and int(e5_quality["repeat_customers"]) == KPI_REPEATS
            and int(e5_quality["delivered_orders"]) == KPI_ORDERS,
            "Qualite E5: populations incorrectes")
    require(amount(e5_quality, "item_sales_brl") == KPI_SALES,
            "Qualite E5 : ventes incorrectes")
    for key in ("invalid_monetary_customers", "invalid_recency_customers",
                "invalid_frequency_customers"):
        require(int(e5_quality[key]) == 0, f"Anomalie RFM {key}")

    return {
        "e4_exports": len(EXPECTED["e4"]),
        "e5_exports": len(EXPECTED["e5"]),
        "orders": KPI_ORDERS,
        "customers": KPI_CUSTOMERS,
        "repeat_customers": KPI_REPEATS,
        "sales_brl": str(KPI_SALES),
        "rfm_segments": len(s),
        "cohort_segment_rows": len(c),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit E6 sans connexion PostgreSQL")
    parser.add_argument("--data-root", type=Path, default=ROOT / ".data")
    args = parser.parse_args()
    result = validate(args.data_root)
    print("E6 OK : exports E4/E5, SHA-256, grains et montants reconciles.")
    for k, v in result.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
