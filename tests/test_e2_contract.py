"""Tests hors ligne. Ne remplacent pas la validation SQL sur PostgreSQL."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from import_olist import IMPORTS, check_zip_headers  # noqa: E402


class E2ContractTests(unittest.TestCase):
    def test_expected_nine_sources(self):
        self.assertEqual(len(IMPORTS), 9)
        self.assertEqual(len({x[0] for x in IMPORTS}), 9)
        self.assertEqual(len({x[1] for x in IMPORTS}), 9)

    def test_headers_match_e1_reference(self):
        e1 = json.loads((ROOT / "docs/audit-e1-results.json").read_text(encoding="utf-8"))
        for filename, table, columns in IMPORTS:
            with self.subTest(table=table):
                self.assertEqual(list(columns), e1["files"][filename]["column_names"])

    def test_review_and_geo_without_false_natural_pk(self):
        schema = (ROOT / "sql/01_source.sql").read_text(encoding="utf-8")
        self.assertIn("review_row_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY", schema)
        self.assertIn("geolocation_row_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY", schema)
        self.assertNotIn("review_id text PRIMARY KEY", schema)
        self.assertNotIn("geolocation_zip_code_prefix text PRIMARY KEY", schema)

    def test_order_and_item_grains_and_quality(self):
        sql = (ROOT / "sql/02_mart.sql").read_text(encoding="utf-8")
        checks = (ROOT / "sql/03_quality.sql").read_text(encoding="utf-8")
        self.assertIn("CREATE OR REPLACE VIEW mart.v_orders", sql)
        self.assertIn("CREATE OR REPLACE VIEW mart.v_items", sql)
        self.assertIn("DISTINCT ON (order_id)", sql)
        self.assertIn("mv_geo_zip", sql)
        self.assertIn("13221498.11", checks)
        self.assertIn("96478", checks)
        self.assertIn("93358", checks)

    def test_original_archive_headers_if_available(self):
        local_zip = ROOT.parent / "archive.zip"
        if local_zip.is_file():
            check_zip_headers(local_zip)


if __name__ == "__main__":
    unittest.main()
