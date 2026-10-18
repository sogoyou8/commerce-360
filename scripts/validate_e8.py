"""E8 Commerce 360 : garde-fou de publication, 100 % hors ligne et en lecture seule.

Usage : python scripts/validate_e8.py
Ne touche ni PostgreSQL, ni CSV, ni PBIX, ni fichiers suivis par Git.
Controle uniquement les noms suivis, les documents de restitution et
les aggregats de reference admis a la publication.
"""
from __future__ import annotations

import json
import subprocess
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANNED_SUFFIXES = frozenset({
    ".csv", ".tsv", ".parquet", ".feather", ".arrow", ".xlsx", ".xls",
    ".xlsm", ".pbix", ".pbip", ".pbit", ".zip", ".7z", ".sqlite", ".db",
})
BANNED_DIRS = frozenset({".data", "raw_data", "raw_exports", "exports"})
REQUIRED_DOCS = (
    "docs/e8-bilan.md",
    "docs/e8-reproduction.md",
    "docs/e8-portfolio.md",
    "docs/e8-public-metrics.json",
    "docs/e6-powerbi.md",
    "docs/e7-validation.md",
    "README.md",
)
REPORT_PAGES = (
    "01_Vue d'ensemble",
    "02_Ventes",
    "03_Livraisons",
    "04_Qualité",
    "05_Clients",
)


def prohibited_path(filename: str) -> bool:
    """Filetypes and local outputs we cannot distribute through this repo."""
    normalized = filename.replace("\\", "/").lower().strip("/")
    parts = normalized.split("/")
    if any(p in BANNED_DIRS for p in parts[:-1]):
        return True
    name = parts[-1]
    if name == ".env" or (name.startswith(".env.") and name != ".env.example"):
        return True
    return Path(name).suffix in BANNED_SUFFIXES


def tracked_files(root: Path = ROOT) -> list[str]:
    """Inspect only versioned paths, including staged additions."""
    out = subprocess.check_output(
        ["git", "ls-files", "--cached", "-z"], cwd=root
    )
    return [s.decode("utf-8") for s in out.split(b"\x00") if s]


def pct(numerator: int, denominator: int) -> Decimal:
    if denominator <= 0:
        raise ValueError("Denominateur non positif")
    return (Decimal(numerator) * 100 / Decimal(denominator)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def validate_metrics(data: dict) -> list[str]:
    errors = []
    scope = data["scope"]
    t = data["totals"]
    groups = data["by_delivery_group"]
    ce = data["example_state"]
    if (
        scope["purchase_start_inclusive"],
        scope["purchase_end_exclusive"],
        scope["currency"],
    ) != ("2017-01-01", "2018-09-01", "BRL"):
        errors.append("Fenetre temporelle ou devise invalide")
    if not (t["orders_all_statuses"] >= t["delivered_orders"] == 96211):
        errors.append("Grain commandes incoherent")
    if (t["observed_customers"], t["repeat_customers"]) != (93104, 2789):
        errors.append("Effectifs clients non conformes")
    if (t["late_deliveries"], t["dated_deliveries"]) != (7822, 96203):
        errors.append("Effectifs de livraisons datees non conformes")
    if Decimal(t["item_sales_brl"]) != Decimal("13181027.13"):
        errors.append("Ventes de reference modifiees")
    if pct(t["repeat_customers"], t["observed_customers"]) != Decimal(t["repeat_rate_pct"]):
        errors.append("Taux de reachat errone")
    if pct(t["late_deliveries"], t["dated_deliveries"]) != Decimal(t["late_rate_pct"]):
        errors.append("Taux de retard errone")
    if (groups["late"]["delivered_orders"] + groups["on_time"]["delivered_orders"]
            != t["dated_deliveries"]):
        errors.append("Repartition des livraisons datees incoherente")
    for label in ("late", "on_time"):
        group = groups[label]
        if pct(group["low_review_orders"], group["scored_orders"]) != Decimal(group["low_review_rate_pct"]):
            errors.append(f"Taux d'avis negatifs incorrect : {label}")
        if not 0 <= group["low_review_orders"] <= group["scored_orders"] <= group["delivered_orders"]:
            errors.append(f"Effectifs avis incorrects : {label}")
    if pct(ce["late_deliveries"], ce["delivered_orders"]) != Decimal(ce["late_rate_pct"]):
        errors.append("Taux de retard CE incorrect")
    if t["rfm_segments"] != 7 or t["cohort_segment_rows"] != 83:
        errors.append("Contrat RFM modifie")
    if (
        Decimal(t["item_sales_brl"]) / Decimal(t["delivered_orders"])
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) != Decimal(t["average_basket_brl"]):
        errors.append("Panier moyen non reconcilie")
    return errors


def validate_documentation(root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    for p in REQUIRED_DOCS:
        if not (root / p).is_file():
            errors.append(f"Documentation manquante : {p}")
    if errors:
        return errors
    bilan = (root / "docs/e8-bilan.md").read_text(encoding="utf-8")
    portfolio = (root / "docs/e8-portfolio.md").read_text(encoding="utf-8")
    reproduce = (root / "docs/e8-reproduction.md").read_text(encoding="utf-8")
    readme = (root / "README.md").read_text(encoding="utf-8")
    e7 = (root / "docs/e7-validation.md").read_text(encoding="utf-8")
    for page in REPORT_PAGES:
        if page not in bilan:
            errors.append(f"Page PBIX absente du bilan : {page}")
    for token in (
        "96 211", "13 181 027,13", "93 104", "7 822",
        "12,54", "54,05", "historique", "causal",
    ):
        if token.lower() not in bilan.lower():
            errors.append(f"Information métier manquante du bilan : {token}")
    if "PBIX" not in portfolio or "non" not in portfolio.lower():
        errors.append("Statut public du PBIX absent du portfolio")
    for token in ("validate_e6.py", "validate_e8.py", "08_e7_checks.sql",
                  "down -v", "pDataRoot", "Actualiser tout"):
        if token not in reproduce:
            errors.append(f"Etape de recette ou securite manquante : {token}")
    for path in ("docs/e8-bilan.md", "docs/e8-reproduction.md", "docs/e8-portfolio.md"):
        if path not in readme:
            errors.append(f"README n'oriente pas vers {path}")
    if "fusionnée" not in e7 or "PR #5" not in e7:
        errors.append("Etat GitHub E7 non actualise apres fusion")
    try:
        data = json.loads((root / "docs/e8-public-metrics.json").read_text(encoding="utf-8"))
        errors.extend(validate_metrics(data))
    except (ValueError, KeyError, TypeError) as exc:
        errors.append(f"Referentiel E8 invalide : {exc}")
    return errors


def validate_release(root: Path = ROOT) -> list[str]:
    issues = validate_documentation(root)
    issues.extend(
        f"Fichier local / sensible suivi par Git : {path}"
        for path in tracked_files(root) if prohibited_path(path)
    )
    return issues


def main() -> None:
    try:
        errors = validate_release()
    except (subprocess.CalledProcessError, OSError) as exc:
        raise SystemExit(f"E8 ERREUR : Git indisponible ({exc})") from exc
    if errors:
        for error in errors:
            print(f"E8 ERREUR : {error}")
        raise SystemExit(1)
    print("E8 OK : documentation, ratios agreges et fichiers Git suivis conformes (lecture seule).")


if __name__ == "__main__":
    main()
