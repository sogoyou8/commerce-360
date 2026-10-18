r"""Commerce 360 : exporter UNIQUEMENT les agrégats publics pour la démo.

Prérequis : scripts/validate_e6.py déjà passé, avec les 12 exports locaux
et manifests SHA-256 dans .data/e4 et .data/e5.

Usage Windows :
    .\.venv\Scripts\python.exe scripts\build_web_data.py

Ne lit pas la base ni les 9 sources brutes. Ne copie aucun order_id, seller_id,
customer_unique_id ou ligne de commande. Ne publie rien automatiquement.
Le fichier JSON de sortie peut être versionné après revue de la PR.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from tempfile import NamedTemporaryFile

try:
    from .validate_e6 import EXPECTED, validate as validate_local_exports
except ImportError:
    from validate_e6 import EXPECTED, validate as validate_local_exports

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_E4 = ROOT / ".data" / "e4"
DEFAULT_E5 = ROOT / ".data" / "e5"
DEFAULT_OUT = ROOT / "demo" / "data" / "public.json"
MONEY = Decimal("0.01")
SEGMENT_LABELS = {
    "champions_observed": "Champions observés",
    "repeat_recent": "Réacheteurs récents observés",
    "high_value_recent": "Forte valeur récente observée",
    "single_recent": "Premier achat unique récent observé",
    "repeat_less_recent": "Réacheteurs moins récents",
    "single_less_recent": "Achat unique moins récent",
    "other_observed": "Autres profils observés",
}


def rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def dec(value: str) -> Decimal:
    return Decimal(value).quantize(MONEY)


def number(value: str) -> float:
    return float(dec(value))


def verify_manifest(directory: Path, phase: str) -> None:
    """Require the exact E4/E5 inventory, SHA-256 and documented row counts."""
    metadata = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    listed = metadata["files"]
    if set(listed) != set(EXPECTED[phase]):
        raise ValueError(f"Liste des exports {phase} inattendue.")
    for name, expected_rows in EXPECTED[phase].items():
        item = listed[name]
        filename = item["filename"]
        if filename != name + ".csv":
            raise ValueError(f"Nom d'export incohérent : {phase}/{name}.")
        content = (directory / filename).read_bytes()
        if hashlib.sha256(content).hexdigest() != item["sha256"]:
            raise ValueError(f"Empreinte SHA-256 invalide : {phase}/{filename}")
        if len(rows(directory / filename)) != expected_rows or item["rows"] != expected_rows:
            raise ValueError(f"Nombre de lignes invalide : {phase}/{filename}.")


def checked_amounts(values: list[float]) -> Decimal:
    return sum((dec(str(value)) for value in values), Decimal("0.00"))


def check_reference(report: dict) -> None:
    """Do not accidentally use a different historical period or KPI baseline."""
    t = report["totals"]
    m = report["meta"]
    if (m["start"], m["endExclusive"], m["currency"]) != (
        "2017-01-01", "2018-09-01", "BRL"
    ):
        raise ValueError("Période ou devise du référentiel public incorrecte.")
    if (t["orders"], t["customers"], t["repeatCustomers"], t["late"], t["dated"]) != (
        96211, 93104, 2789, 7822, 96203
    ) or dec(str(t["salesBrl"])) != Decimal("13181027.13"):
        raise ValueError("Le référentiel public E3/E5/E7 a changé : export refusé.")

def build(e4: Path, e5: Path, snapshot: dict) -> dict:
    if e4.resolve().parent != e5.resolve().parent or (
        e4.name, e5.name
    ) != ("e4", "e5"):
        raise ValueError("Les dossiers E4 et E5 doivent partager la même racine .data.")
    # Run the existing E6 check across ALL 12 exports, including the local
    # 96k-row fact, before producing any public aggregate.
    validate_local_exports(e4.parent)
    verify_manifest(e4, "e4")
    verify_manifest(e5, "e5")
    report = json.loads(json.dumps(snapshot))
    check_reference(report)
    totals = report["totals"]

    # Mois : 20 agrégats mensuels, chaque commande livrée comptée une seule fois.
    months = [{
        "month": row["month_start"][:7],
        "orders": int(row["delivered_orders"]),
        "salesBrl": number(row["item_sales_brl"]),
    } for row in rows(e4 / "monthly_sales.csv")]
    if [(x["month"],x["orders"],round(x["salesBrl"]*100)) for x in months] != [
        (x["month"],x["orders"],round(x["salesBrl"]*100)) for x in report["monthly"]
    ]:
        raise ValueError("La série mensuelle locale ne correspond pas à la référence vérifiée.")
    report["monthly"] = months

    # États des clients : une ligne agrégée par État (aucune ville, aucun ZIP).
    states = []
    for row in rows(e4 / "delivery_states.csv"):
        code = row["customer_state"].strip().upper()
        if not re.fullmatch(r"[A-Z]{2}", code):
            raise ValueError(f"État invalide dans les agrégats E4 : {code!r}")
        states.append({
            "code": code, "orders": int(row["delivered_orders"]),
            "dated": int(row["dated_deliveries"]),
            "late": int(row["late_deliveries"]),
            "rate": number(row["late_rate_pct"]),
            "days": number(row["avg_delivery_days_clean"]),
        })
    if (len(states) != 27 or len({x["code"] for x in states}) != 27
        or sum(x["orders"] for x in states) != totals["orders"]
        or sum(x["dated"] for x in states) != totals["dated"]
        or sum(x["late"] for x in states) != totals["late"]
        or any(x["late"] < 0 or x["late"] > x["dated"] or x["dated"] > x["orders"]
               for x in states)):
        raise ValueError("27 États : dénominateurs ou volumes nationaux incohérents.")
    baseline_states = {x["code"]: x for x in snapshot["states"]}
    for item in states:
        if item["code"] in baseline_states:
            baseline = baseline_states[item["code"]]
            if any(item[k] != baseline[k] for k in ("orders", "dated", "late")) or any(
                abs(item[k] - baseline[k]) > .011 for k in ("rate", "days")
            ):
                raise ValueError(f"État {item['code']} différent du référentiel E7.")
    states.sort(key=lambda x: -x["orders"])
    report["states"] = states

    # Catégories : classement de prix d'articles ; jamais d'identifiant produit.
    categories = [{
        "label": row["product_category"],
        "salesBrl": number(row["item_sales_brl"]),
    } for row in rows(e4 / "category_sales.csv")]
    categories.sort(key=lambda x: (-x["salesBrl"], x["label"]))
    if (len(categories) != EXPECTED["e4"]["category_sales"]
        or len({x["label"] for x in categories}) != len(categories)
        or any(not x["label"] or x["salesBrl"] < 0 for x in categories)
        or checked_amounts([x["salesBrl"] for x in categories])
        != Decimal("13181027.13")
        or categories[0]["label"] != "health_beauty"
        or dec(str(categories[0]["salesBrl"])) != Decimal("1229557.50"):
        raise ValueError("Classement des catégories ou ventes globales non conformes à E3.")
    for known in snapshot["categories"]:
        match = next((x for x in categories if x["label"] == known["label"]), None)
        if match is None or dec(str(match["salesBrl"])) != dec(str(known["salesBrl"])):
            raise ValueError(f"Catégorie {known['label']} différente du référentiel E3.")
    report["categories"] = categories[:12]

    # États vendeurs : seller_sales est au grain vendeur. NE PUBLIER que des
    # montants par État, sans aucune ligne, identifiant ou ville de vendeur.
    states_sellers: dict[str, dict] = defaultdict(lambda:{"count":0,"sales":Decimal("0.00")})
    for row in rows(e4 / "seller_sales.csv"):
        code=row["seller_state"].strip().upper()
        if not re.fullmatch(r"[A-Z]{2}", code):
            raise ValueError(f"État vendeur invalide : {code!r}.")
        states_sellers[code]["count"]+=1
        states_sellers[code]["sales"]+=dec(row["item_sales_brl"])
    report["sellerStates"] = [
        {"code":code,"salesBrl":float(v["sales"])}
        for code,v in states_sellers.items() if v["count"]>=5
    ]
    report["sellerStates"].sort(key=lambda x: (-x["salesBrl"], x["code"]))
    if checked_amounts([x["salesBrl"] for x in report["sellerStates"]]) > dec(str(totals["salesBrl"])):
        raise ValueError("Ventes agrégées par États vendeurs supérieures aux ventes nationales.")

    # RFM : les sept segments sont mutuellement exclusifs ; aucune ligne client.
    segments = []
    for row in rows(e5 / "segments_summary.csv"):
        code=row["segment_code"]
        if code not in SEGMENT_LABELS:
            raise ValueError("Segment RFM inattendu.")
        segments.append({
            "code":code, "label":SEGMENT_LABELS[code],
            "customers":int(row["customers"]),
            "repeats":int(row["repeat_customers"]),
            "salesBrl":number(row["item_sales_brl"]),
        })
    if (len(segments) != 7 or len({x["code"] for x in segments}) != 7
        or sum(x["customers"] for x in segments) != totals["customers"]
        or sum(x["repeats"] for x in segments) != totals["repeatCustomers"]
        or checked_amounts([x["salesBrl"] for x in segments]) != dec(str(totals["salesBrl"]))):
        raise ValueError("RFM : réconciliation des clients ou des montants échouée.")
    known_segments = {x["code"]: x for x in snapshot["segments"]}
    for item in segments:
        ref = known_segments[item["code"]]
        if any(item[k] != ref[k] for k in ("customers", "repeats")) or (
            dec(str(item["salesBrl"])) != dec(str(ref["salesBrl"]))
        ):
            raise ValueError(f"Segment {item['code']} différent du référentiel E5.")
    report["segments"]=sorted(segments,key=lambda x:list(SEGMENT_LABELS).index(x["code"]))

    # Cohortes E3 : grains agrégés mensuels, uniquement si chaque groupe a
    # suffisamment de clients pour rester une donnée descriptive publique.
    all_cohorts = [{
        "month": row["first_observed_month"][:7],
        "customers": int(row["observed_customers"]),
        "repeats": int(row["repeat_customers"]),
        "salesBrl": number(row["observed_sales_brl"]),
    } for row in rows(e4 / "customer_cohorts.csv")]
    if (len(all_cohorts) != 20 or len({x["month"] for x in all_cohorts}) != 20
        or sum(x["customers"] for x in all_cohorts) != totals["customers"]
        or sum(x["repeats"] for x in all_cohorts) != totals["repeatCustomers"]
        or checked_amounts([x["salesBrl"] for x in all_cohorts])
        != dec(str(totals["salesBrl"]))
        or any(x["repeats"] > x["customers"] or x["customers"] < 1
               or x["salesBrl"] < 0 for x in all_cohorts)):
        raise ValueError("Cohortes E4 : totaux ou grains incompatibles.")
    report["cohorts"] = sorted(
        (x for x in all_cohorts if x["customers"] >= 20),
        key=lambda x: x["month"],
    )

    # Audit des groupes de satisfaction : on conserve uniquement les métriques
    # déjà publiées si les sources agrégées locales concordent.
    reference = {x["code"]: x for x in report["satisfaction"]}
    satisfaction = rows(e4 / "delivery_satisfaction.csv")
    if {x["delivery_group"] for x in satisfaction} != set(reference):
        raise ValueError("Groupes de satisfaction E4 incomplets.")
    for row in satisfaction:
        group = reference[row["delivery_group"]]
        if (int(row["delivered_orders"]) != group["orders"]
            or int(row["scored_orders"]) != group["scored"]
            or int(row["low_score_orders"]) != group["negative"]
            or abs(number(row["avg_review_score"]) - group["score"]) > .011
            or abs(number(row["low_score_rate_pct"]) - group["negativeRate"]) > .011):
            raise ValueError("Satisfaction E4 non conforme au référentiel E7.")

    report["meta"]["mode"]="Exports locaux agrégés validés"
    report["meta"]["coverage"]={
        "states":"27 États vérifiés",
        "categories":"12 catégories les plus vendues en prix d'articles",
        "sellerStates":f"{len(report['sellerStates'])} États vendeurs agrégés (≥ 5 vendeurs)",
        "cohorts":f"{len(report['cohorts'])} cohortes mensuelles agrégées",
    }
    # The public file contains only fixed aggregate keys, never source rows.
    allowed = {"meta", "totals", "monthly", "states", "categories",
               "sellerStates", "satisfaction", "segments", "cohorts"}
    if set(report) != allowed:
        raise ValueError("Champs inattendus dans le document public.")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Commerce 360 : produire un JSON public d'agrégats Olist")
    parser.add_argument("--e4", type=Path, default=DEFAULT_E4)
    parser.add_argument("--e5", type=Path, default=DEFAULT_E5)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--check-only", action="store_true",
                        help="Vérifier les 12 exports et le JSON sans modifier public.json")
    args = parser.parse_args()
    seed=json.loads(DEFAULT_OUT.read_text(encoding="utf-8"))
    result=build(args.e4,args.e5,seed)
    if args.check_only:
        print("E2 OK : 12 exports validés, JSON enrichi contrôlé (aucune écriture).")
        print(f"  États : {len(result['states'])}, catégories : {len(result['categories'])}, "
              f"segments : {len(result['segments'])}, cohortes : {len(result['cohorts'])}.")
        return
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile("w",encoding="utf-8",dir=args.out.parent,delete=False) as tmp:
        json.dump(result,tmp,ensure_ascii=False,indent=2)
        tmp.write("\n")
        temp=Path(tmp.name)
    os.replace(temp,args.out)
    print("Commerce 360 : JSON public agrégé construit et vérifié, aucun identifiant exporté.")
    print(f"  Mois : {len(result['monthly'])}, États : {len(result['states'])}, "
          f"catégories : {len(result['categories'])}, segments : {len(result['segments'])}.")


if __name__=="__main__":
    main()
