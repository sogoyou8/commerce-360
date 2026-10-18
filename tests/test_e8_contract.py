"""E8 : contrat de diffusion et integrite d'agregats (sans base ni PBIX)."""
from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from scripts.validate_e8 import (
    ROOT, pct, prohibited_path, tracked_files,
    validate_documentation, validate_metrics, validate_release,
)


class E8PublicationContractTests(unittest.TestCase):
    def test_sensitive_local_artifacts_are_not_allowed(self):
        forbidden = [
            ".env", "config/.env.production", ".data/e4/manifest.json",
            "exports/summary.json", "sources/olist_orders_dataset.csv",
            "Commerce_360_E6.pbix", "exports.xlsm", "archive.zip",
            "data/raw.sqlite", "report.pbip",
        ]
        for path in forbidden:
            with self.subTest(path=path):
                self.assertTrue(prohibited_path(path))

    def test_source_code_and_public_documents_can_be_tracked(self):
        allowed = [
            ".env.example", "README.md", "sql/08_e7_checks.sql",
            "docs/e8-bilan.md", "docs/e8-public-metrics.json",
            "powerbi/queries/fnLocalCSV.pq", "tests/test_e8_contract.py",
        ]
        for path in allowed:
            with self.subTest(path=path):
                self.assertFalse(prohibited_path(path))

    def test_public_metrics_and_denominators(self):
        data = json.loads(
            (ROOT / "docs/e8-public-metrics.json").read_text(encoding="utf-8")
        )
        self.assertEqual(validate_metrics(data), [])
        self.assertEqual(str(pct(7822, 96203)), "8.13")
        self.assertEqual(str(pct(2789, 93104)), "3.00")
        self.assertEqual(str(pct(4139, 7658)), "54.05")

    def test_wrong_public_metric_fails_closed(self):
        data = json.loads(
            (ROOT / "docs/e8-public-metrics.json").read_text(encoding="utf-8")
        )
        inconsistent = copy.deepcopy(data)
        inconsistent["totals"]["late_deliveries"] = 7823
        self.assertNotEqual(validate_metrics(inconsistent), [])

    def test_required_documentation_matches_actual_report(self):
        self.assertEqual(validate_documentation(), [])

    def test_git_has_no_tracked_data_files(self):
        self.assertTrue(len(tracked_files()) > 0)
        self.assertEqual(validate_release(), [])


if __name__ == "__main__":
    unittest.main()
