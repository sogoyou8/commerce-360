"""Commerce 360 E2: defensive tests for the local-to-public aggregate exporter.

No PostgreSQL, raw Olist dataset, or local E4/E5 exports needed in CI.
"""
from __future__ import annotations

import csv
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import build_web_data as exporter

ROOT = Path(__file__).resolve().parents[1]


class WebDataBuilderSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.seed = json.loads((ROOT / "demo/data/public.json").read_text(encoding="utf-8"))

    def test_historical_baseline_must_match(self):
        exporter.check_reference(self.seed)
        for field, value in [
            ("orders", 96212), ("customers", 93105),
            ("salesBrl", 13181027.14), ("dated", 96211),
        ]:
            with self.subTest(field=field):
                wrong = json.loads(json.dumps(self.seed))
                wrong["totals"][field] = value
                with self.assertRaises(ValueError):
                    exporter.check_reference(wrong)

    def test_historical_period_must_match(self):
        wrong = json.loads(json.dumps(self.seed))
        wrong["meta"]["endExclusive"] = "2018-10-01"
        with self.assertRaises(ValueError):
            exporter.check_reference(wrong)

    def test_amounts_use_exact_cents(self):
        self.assertEqual(
            exporter.checked_amounts([1229557.50, 1163465.91]),
            exporter.Decimal("2393023.41"),
        )

    def test_manifest_rejects_wrong_name_rows_or_sha(self):
        # Tiny test-only fixture: the real exporter still requires all 12 exports.
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            content = "month,orders\n2017-01,1\n"
            data = content.encode("utf-8")
            (root / "monthly_sales.csv").write_bytes(data)
            metadata = {"files": {"monthly_sales": {
                "filename": "monthly_sales.csv",
                "rows": 1,
                "sha256": hashlib.sha256(data).hexdigest(),
            }}}
            manifest = root / "manifest.json"
            with patch.dict(exporter.EXPECTED, {"e4": {"monthly_sales": 1}}, clear=True):
                manifest.write_text(json.dumps(metadata), encoding="utf-8")
                exporter.verify_manifest(root, "e4")
                for key, invalid in [
                    ("filename", "../monthly_sales.csv"),
                    ("rows", 2),
                    ("sha256", "0" * 64),
                ]:
                    with self.subTest(key=key):
                        malformed = json.loads(json.dumps(metadata))
                        malformed["files"]["monthly_sales"][key] = invalid
                        manifest.write_text(json.dumps(malformed), encoding="utf-8")
                        with self.assertRaises((ValueError, OSError)):
                            exporter.verify_manifest(root, "e4")
                malformed = {"files": {"unexpected": metadata["files"]["monthly_sales"]}}
                manifest.write_text(json.dumps(malformed), encoding="utf-8")
                with self.assertRaises(ValueError):
                    exporter.verify_manifest(root, "e4")

    def test_export_refuses_unvalidated_local_input(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            (base / "e4").mkdir()
            (base / "e5").mkdir()
            with patch.object(
                exporter, "validate_local_exports",
                side_effect=ValueError("missing exports"),
            ) as gate:
                with self.assertRaisesRegex(ValueError, "missing exports"):
                    exporter.build(base / "e4", base / "e5", self.seed)
                gate.assert_called_once()


if __name__ == "__main__":
    unittest.main()
