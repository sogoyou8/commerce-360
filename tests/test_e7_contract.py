"""Contrats statiques E7 : SQL reproductible, sans écriture et sans collision de noms."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / "sql" / "08_e7_checks.sql").read_text(encoding="utf-8")


class E7ValidationContractTests(unittest.TestCase):
    def test_declared_variables_cannot_shadow_aggregate_columns(self):
        # Sous PL/pgSQL, sum(customers) devient ambigu si DECLARE contient customers.
        declaration = SQL.split("DECLARE", 1)[1].split("BEGIN", 1)[0]
        declared = set(re.findall(
            r"(?m)^\s*([a-z][a-z_0-9]*)\s+(?:bigint|numeric|record)\s*;",
            declaration,
        ))
        aggregated_columns = set(re.findall(
            r"\b(?:sum|avg|count|min|max)\s*\(\s*([a-z][a-z_0-9]*)\s*\)",
            SQL,
            flags=re.IGNORECASE,
        ))
        self.assertFalse(declared & aggregated_columns,
                         f"Variables ambigues : {declared & aggregated_columns}")
        self.assertIn("v_customers bigint;", SQL)
        self.assertIn("sum(customers)", SQL)

    def test_sql_is_read_only(self):
        uncommented = re.sub(r"--[^\n]*", "", SQL)
        self.assertNotRegex(
            uncommented,
            r"(?i)\b(?:insert|update|delete|truncate|alter|drop|create)\b",
        )
        self.assertIn("RAISE NOTICE 'E7 SQL OK", uncommented)

    def test_sql_reconciles_business_baselines(self):
        for token in (
            "96211", "13181027.13", "93104", "2789", "7822", "96203",
            "15.40", "54.05", "36145", "1229557.50",
            "mart.e5_segments_summary", "mart.e3_delivery_satisfaction",
        ):
            with self.subTest(value=token):
                self.assertIn(token, SQL)


if __name__ == "__main__":
    unittest.main()
