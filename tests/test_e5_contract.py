"""Contrats E5 RFM hors ligne : l'execution PostgreSQL reste obligatoire."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / "sql/06_e5_rfm.sql").read_text(encoding="utf-8")
CHECKS = (ROOT / "sql/07_e5_checks.sql").read_text(encoding="utf-8")
EXPORT = (ROOT / "scripts/export_e5.py").read_text(encoding="utf-8")
RUN = (ROOT / "scripts/run_e5.ps1").read_text(encoding="utf-8")


class E5RfmContractTests(unittest.TestCase):
    def test_five_e5_views_only(self):
        found = set(re.findall(
            r"CREATE OR REPLACE VIEW mart\.(\w+)\s+AS", SQL,
            flags=re.IGNORECASE,
        ))
        self.assertEqual(found, {
            "e5_customer_rfm", "e5_customer_segments",
            "e5_segments_summary", "e5_cohort_segments",
            "e5_quality_summary",
        })

    def test_does_not_modify_source_or_earlier_marts(self):
        for script in (SQL, CHECKS):
            cleaned = re.sub(r"--[^\n]*", "", script)
            self.assertNotRegex(
                cleaned, r"\b(?:DROP|TRUNCATE|DELETE|INSERT|UPDATE|ALTER|MERGE)\s+"
            )
            self.assertNotRegex(cleaned, r"\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW)\s+source\.")
            self.assertNotRegex(cleaned, r"\bCREATE\s+OR\s+REPLACE\s+VIEW\s+mart\.(?:v_|e[234]_)")

    def test_fixed_e3_customer_grain_and_cutoff(self):
        self.assertIn("FROM mart.e3_customers", SQL)
        self.assertIn("recency_days_at_cutoff", SQL)
        self.assertIn("observed_item_sales_brl", SQL)
        self.assertIn("delivered_orders", SQL)
        self.assertIn("DATE '2018-09-01'", CHECKS)
        self.assertNotIn("JOIN source.", SQL)
        self.assertNotIn("JOIN mart.e3_delivered_items", SQL)

    def test_tie_aware_r_m_and_explicit_frequency_scoring(self):
        self.assertIn("cume_dist() OVER (ORDER BY c.recency_days_at_cutoff DESC)", SQL)
        self.assertIn("cume_dist() OVER (ORDER BY c.observed_item_sales_brl ASC)", SQL)
        self.assertIn("frequency_orders >= 3 THEN 5", SQL)
        self.assertIn("frequency_orders = 2 THEN 3", SQL)
        self.assertIn("ELSE 1 END", SQL)
        self.assertIn("HAVING min(r_score) <> max(r_score)", CHECKS)
        self.assertIn("HAVING min(m_score) <> max(m_score)", CHECKS)

    def test_seven_mutually_exclusive_segment_labels(self):
        for value in (
            "champions_observed", "repeat_recent", "high_value_recent",
            "single_recent", "repeat_less_recent", "single_less_recent",
            "other_observed",
        ):
            with self.subTest(value=value):
                self.assertIn(f"'{value}'", SQL)
        self.assertIn("ELSE 'other_observed'", SQL)
        self.assertIn("segment_priority", SQL)

    def test_reconciliation_and_cohorts(self):
        for token in (
            "93104", "2789", "96211", "13181027.13", "96478",
            "13221498.11", "93358", "7826",
            "mart.e5_segments_summary", "mart.e5_cohort_segments",
            "count(DISTINCT first_observed_month)", "20",
            "DATE '2018-09-01'",
        ):
            with self.subTest(token=token):
                self.assertIn(token, CHECKS)
        self.assertIn("RAISE EXCEPTION", CHECKS)

    def test_read_only_aggregated_exports(self):
        self.assertIn("SET TRANSACTION READ ONLY", EXPORT)
        self.assertIn('dbname != "commerce360"', EXPORT)
        self.assertIn("TemporaryDirectory(", EXPORT)
        self.assertIn("sha256", EXPORT)
        self.assertIn("manifest.json", EXPORT)
        self.assertIn("SELECT * FROM mart.e5_quality_summary", EXPORT)
        self.assertNotIn("customer_unique_id", EXPORT.split('EXPORTS: dict[str, str] = {', 1)[1].split('\n\n\ndef _row_count', 1)[0])
        self.assertIn('.data', (ROOT / ".gitignore").read_text(encoding="utf-8"))

    def test_windows_recipe_and_documented_limits(self):
        self.assertIn("unittest discover -s tests -v", RUN)
        self.assertIn("sql\\06_e5_rfm.sql", RUN)
        self.assertIn("sql\\07_e5_checks.sql", RUN)
        self.assertIn("export_e5.py", RUN)
        document = (ROOT / "docs/e5-rfm.md").read_text(encoding="utf-8")
        for term in ("censure", "2018-09-01", "lecture seule", "pas de causalite",
                     "93 104", "96 211", "recency", "frequency", "monetary"):
            with self.subTest(term=term):
                self.assertIn(term, document.lower())


if __name__ == "__main__":
    unittest.main()
