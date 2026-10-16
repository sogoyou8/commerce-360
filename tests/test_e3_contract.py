"""Contrats statiques E3 (hors ligne). La recette PostgreSQL reste obligatoire.

Executer : py -m unittest discover -s tests -v
"""
from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANALYSIS = (ROOT / "sql/04_e3_analysis.sql").read_text(encoding="utf-8")
CHECKS = (ROOT / "sql/05_e3_checks.sql").read_text(encoding="utf-8")


class E3ContractTests(unittest.TestCase):
    def test_required_analytical_views(self):
        required = {
            "e3_period_orders",
            "e3_delivered_orders",
            "e3_delivered_items",
            "e3_monthly_sales",
            "e3_yoy_jan_aug",
            "e3_category_sales",
            "e3_seller_sales",
            "e3_customers",
            "e3_customer_cohorts",
            "e3_delivery_states",
            "e3_delivery_satisfaction",
            "e3_quality_summary",
        }
        found = set(
            re.findall(
                r"CREATE OR REPLACE VIEW mart\.(e3_\w+)\s+AS",
                ANALYSIS, flags=re.IGNORECASE,
            )
        )
        self.assertEqual(found, required)

    def test_analytics_leave_source_and_e2_unchanged(self):
        for statement in (ANALYSIS, CHECKS):
            clean = re.sub(r"--[^\n]*", "", statement)
            self.assertNotRegex(clean, r"\b(?:DROP|TRUNCATE|DELETE|INSERT|UPDATE|ALTER)\s+")
            self.assertNotRegex(
                clean, r"\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW)\s+source\."
            )
            self.assertNotRegex(
                clean, r"\bCREATE\s+OR\s+REPLACE\s+VIEW\s+mart\.v_"
            )

    def test_period_and_comparable_yoy(self):
        self.assertIn("2017-01-01", ANALYSIS)
        self.assertIn("2018-09-01", ANALYSIS)
        self.assertIn("purchased_at <", ANALYSIS)
        self.assertIn("generate_series(1,8)", ANALYSIS)
        self.assertIn("NULLIF(sales_2017_brl,0)", ANALYSIS)

    def test_order_and_item_grains(self):
        self.assertIn("FROM mart.v_orders", ANALYSIS)
        self.assertIn("FROM mart.v_items", ANALYSIS)
        self.assertIn("GROUP BY customer_unique_id", ANALYSIS)
        self.assertIn("count(DISTINCT order_id)", ANALYSIS)
        self.assertIn("count(DISTINCT i.order_id)", ANALYSIS)
        self.assertNotIn("JOIN source.olist_order_payments", ANALYSIS)
        self.assertNotIn("JOIN source.olist_order_reviews", ANALYSIS)

    def test_late_and_reviews_use_correct_denominators(self):
        self.assertIn("count(is_late)", ANALYSIS)
        self.assertIn("count(review_score)", ANALYSIS)
        self.assertIn("WHERE NOT carrier_date_after_delivery", ANALYSIS)
        self.assertIn("review_score <= 2", ANALYSIS)

    def test_checks_reconcile_both_grains(self):
        for token in (
            "13221498.11", "96478", "93358", "7826",
            "sum(item_sales_brl) FROM mart.e3_monthly_sales",
            "sum(item_sales_brl) FROM mart.e3_category_sales",
            "sum(item_sales_brl) FROM mart.e3_seller_sales",
            "sum(observed_sales_brl) FROM mart.e3_customer_cohorts",
            "sum(delivered_orders) FROM mart.e3_delivery_states",
        ):
            with self.subTest(token=token):
                self.assertIn(token, CHECKS)

    def test_e1_reference_kept_for_full_archive(self):
        audit = json.loads((ROOT / "docs/audit-e1-results.json").read_text(encoding="utf-8"))
        self.assertEqual(audit["kpi"]["delivered_order_count"], 96478)
        self.assertEqual(audit["kpi"]["delivered_item_price_sum_BRL"], 13221498.11)
        self.assertEqual(audit["kpi"]["delivered_unique_customers"], 93358)
        self.assertEqual(audit["orders"]["late_delivered_count"], 7826)

    def test_no_pretended_verified_business_results(self):
        doc = (ROOT / "docs/e3-analyses-sql.md").read_text(encoding="utf-8")
        self.assertIn("à valider sur PostgreSQL local", doc)
        self.assertIn("2017", doc)
        self.assertIn("2018", doc)
        self.assertIn("E2", doc)


if __name__ == "__main__":
    unittest.main()
