"""Contrats E6 hors ligne : préparatifs Power BI (sans base et sans PBIX factice)."""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_e6 import EXPECTED, KPI_ORDERS, KPI_CUSTOMERS, KPI_SALES  # noqa: E402


class E6PowerBIContractTests(unittest.TestCase):
    def test_twelve_e4_e5_csv_inputs_expected(self):
        self.assertEqual(len(EXPECTED["e4"]), 9)
        self.assertEqual(len(EXPECTED["e5"]), 3)
        self.assertEqual(KPI_ORDERS, 96211)
        self.assertEqual(KPI_CUSTOMERS, 93104)
        self.assertEqual(str(KPI_SALES), "13181027.13")

    def test_queries_cover_all_exports_without_exposing_local_data(self):
        folder = ROOT / "powerbi/queries"
        self.assertEqual(
            {p.stem for p in folder.glob("*.pq")},
            set(EXPECTED["e4"]) | {"segments_summary", "cohort_segments",
                                   "quality_rfm", "fnLocalCSV"},
        )
        for path in folder.glob("*.pq"):
            text = path.read_text(encoding="utf-8")
            self.assertNotRegex(text, r"(?i)\b(?:postgresql\.database|customer_unique_id)\b")
            self.assertNotRegex(text, r"(?i)C:\\users\\")
            if path.stem != "fnLocalCSV":
                self.assertIn("fnLocalCSV(", text)
                self.assertIn('Table.TransformColumnTypes(', text)
                self.assertIn('"en-US"', text)

    def test_money_is_currency_and_dates_are_dates(self):
        for name in ("fact_delivered_orders", "monthly_sales",
                     "segments_summary", "cohort_segments"):
            text = (ROOT / "powerbi/queries" / f"{name}.pq").read_text(encoding="utf-8")
            self.assertIn("Currency.Type", text)
        self.assertIn(
            '{"purchase_date", type date}',
            (ROOT / "powerbi/queries/fact_delivered_orders.pq").read_text(encoding="utf-8"),
        )
        self.assertIn(
            '{"first_observed_month", type date}',
            (ROOT / "powerbi/queries/cohort_segments.pq").read_text(encoding="utf-8"),
        )

    def test_reconciliation_script_is_read_only_and_hashes_exports(self):
        code = (ROOT / "scripts/validate_e6.py").read_text(encoding="utf-8")
        self.assertIn("sha256_file(file_path)", code)
        self.assertIn("KPI_REPEATS = 2789", code)
        self.assertIn('month_start', code)
        self.assertIn('"e5/segments_summary"', code)
        self.assertIn("Decimal(", code)
        self.assertNotRegex(code, r"\b(?:psycopg|subprocess|os\.replace)\b")
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn(".data", ignored)

    def test_dax_grains_and_report_contract(self):
        dax = (ROOT / "powerbi/E6_Mesures_DAX.dax").read_text(encoding="utf-8")
        for key in ("DimDate", "Commandes livrées", "Ventes articles (BRL)",
                    "Taux de retard", "Réachat observé", "Ventes segments RFM",
                    "Contrôle commandes E3 - E5"):
            self.assertIn(key, dax)
        self.assertIn("REMOVEFILTERS()", dax)
        doc = (ROOT / "docs/e6-powerbi.md").read_text(encoding="utf-8")
        for token in ("01_Vue d'ensemble", "02_Ventes", "03_Livraisons",
                      "04_Qualité", "05_Clients", "Actualiser",
                      "pas automatiquement filtrées", "PBIX"):
            self.assertIn(token.lower(), doc.lower())
        self.assertIn("lecture seule", doc.lower())


if __name__ == "__main__":
    unittest.main()
