"""Contrats hors ligne pour la préparation Excel E4.

La recette PostgreSQL et l'actualisation Excel restent des étapes manuelles.
"""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from export_e4 import DEFAULT_OUT, EXPORTS, EXPECTED_ROW_COUNTS  # noqa: E402


class E4PreparationTests(unittest.TestCase):
    def test_nine_named_exports_and_expected_counts(self):
        self.assertEqual(set(EXPORTS), {
            "fact_delivered_orders", "monthly_sales", "yoy_jan_aug",
            "category_sales", "seller_sales", "customer_cohorts",
            "delivery_states", "delivery_satisfaction", "quality_summary",
        })
        self.assertEqual(EXPECTED_ROW_COUNTS["fact_delivered_orders"], 96211)
        self.assertEqual(EXPECTED_ROW_COUNTS["monthly_sales"], 20)
        self.assertEqual(EXPECTED_ROW_COUNTS["yoy_jan_aug"], 8)
        self.assertEqual(EXPECTED_ROW_COUNTS["delivery_satisfaction"], 3)

    def test_all_export_queries_are_read_only_mart_selects(self):
        for key, query in EXPORTS.items():
            with self.subTest(export=key):
                self.assertTrue(query.strip().upper().startswith("SELECT"))
                self.assertRegex(query, r"\bFROM\s+mart\.e3_")
                clean = re.sub(r"--[^\n]*", "", query)
                self.assertNotRegex(
                    clean,
                    r"\b(?:INSERT|DELETE|UPDATE|TRUNCATE|DROP|ALTER|CREATE|MERGE)\b",
                )
                self.assertNotRegex(clean, r"\bFROM\s+source\.")

    def test_delivered_order_grain_and_no_raw_identifiers_of_clients(self):
        query = EXPORTS["fact_delivered_orders"]
        self.assertIn("FROM mart.e3_delivered_orders", query)
        self.assertIn("purchased_at::date", query)
        self.assertIn("item_revenue_brl", query)
        self.assertIn("review_score", query)
        self.assertIn("delivery_days_clean", query)
        self.assertNotIn("customer_unique_id", query)
        self.assertNotIn("customer_city", query)

    def test_exporter_refuses_unexpected_database_and_metrics(self):
        code = (ROOT / "scripts/export_e4.py").read_text(encoding="utf-8")
        self.assertIn("SET TRANSACTION READ ONLY", code)
        self.assertIn('name != "commerce360"', code)
        self.assertIn("13181027.13", code)
        self.assertIn("TemporaryDirectory(", code)
        self.assertIn("os.replace(", code)
        self.assertIn("manifest.json", code)

    def test_output_excluded_from_git_and_doc_present(self):
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn(".data/", ignored)
        self.assertIn("*.csv", ignored)
        self.assertEqual(DEFAULT_OUT, ROOT / ".data" / "e4")
        doc = (ROOT / "docs/e4-excel-plan.md").read_text(encoding="utf-8")
        self.assertIn("13 181 027,13", doc)
        self.assertIn("96 211", doc)
        self.assertIn("Power Query", doc)
        self.assertIn("neuf exports e4 générés avec succès", doc.lower())
        self.assertIn("manifeste et classeur excel à vérifier", doc.lower())


if __name__ == "__main__":
    unittest.main()
