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


def verify_manifest(directory: Path, expected: int) -> None:
    metadata = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    listed = metadata["files"]
    if len(listed) != expected:
        raise ValueError(f"Nombre d'exports incohérent dans {directory.name}.")
    for item in listed.values():
        filename = item["filename"]
        if Path(filename).name != filename or not filename.endswith(".csv"):
            raise ValueError("Nom d'export local non sûr.")
        content = (directory / filename).read_bytes()
        if hashlib.sha256(content).hexdigest() != item["sha256"]:
            raise ValueError(f"Empreinte SHA-256 invalide : {filename}")
        if len(rows(directory / filename)) != item["rows"]:
            raise ValueError(f"Nombre de lignes invalide : {filename}")


def build(e4: Path, e5: Path, snapshot: dict) -> dict:
    verify_manifest(e4, 9)
    verify_manifest(e5, 3)
    report = json.loads(json.dumps(snapshot))
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
    if len(states) != 27 or sum(x["orders"] for x in states)!=totals["orders"] or             sum(x["late"] for x in states)!=totals["late"]:
        raise ValueError("27 États : réconciliation nationale échouée.")
    states.sort(key=lambda x: -x["orders"])
    report["states"] = states

    # Catégories : classement de prix d'articles ; jamais d'identifiant produit.
    categories = [{
        "label": row["product_category"],
        "salesBrl": number(row["item_sales_brl"]),
    } for row in rows(e4 / "category_sales.csv")]
    categories.sort(key=lambda x: -x["salesBrl"])
    if len(categories)<12 or categories[0]["label"]!="health_beauty" or             dec(str(categories[0]["salesBrl"]))!=Decimal("1229557.50"):
        raise ValueError("Classement des catégories non conforme à E3.")
    report["categories"] = categories[:12]

    # États vendeurs : seller_sales est au grain vendeur. NE PUBLIER que des
    # montants par État, sans aucune ligne, identifiant ou ville de vendeur.
    states_sellers: dict[str, dict] = defaultdict(lambda:{"count":0,"sales":Decimal("0.00")})
    for row in rows(e4 / "seller_sales.csv"):
        code=row["seller_state"].strip().upper()
        if not re.fullmatch(r"[A-Z]{2}",code):
            continue
        states_sellers[code]["count"]+=1
        states_sellers[code]["sales"]+=dec(row["item_sales_brl"])
    report["sellerStates"] = [
        {"code":code,"salesBrl":float(v["sales"])}
        for code,v in states_sellers.items() if v["count"]>=5
    ]
    report["sellerStates"].sort(key=lambda x: -x["salesBrl"])

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
    if len(segments)!=7 or sum(x["customers"] for x in segments)!=totals["customers"] or             sum(x["repeats"] for x in segments)!=totals["repeatCustomers"] or             dec(str(sum(x["salesBrl"] for x in segments)))!=dec(str(totals["salesBrl"])):
        raise ValueError("RFM : réconciliation des clients ou des montants échouée.")
    report["segments"]=sorted(segments,key=lambda x:list(SEGMENT_LABELS).index(x["code"]))

    # Cohortes E3 : grains agrégés mensuels, uniquement si chaque groupe a
    # suffisamment de clients pour rester une donnée descriptive publique.
    cohorts=[]
    for row in rows(e4 / "customer_cohorts.csv"):
        customers=int(row["observed_customers"])
        if customers<20:
            continue
        cohorts.append({
            "month":row["first_observed_month"][:7],
            "customers":customers,
            "repeats":int(row["repeat_customers"]),
            "salesBrl":number(row["observed_sales_brl"]),
        })
    report["cohorts"]=sorted(cohorts,key=lambda x:x["month"])

    # Audit des groupes de satisfaction : on conserve uniquement les métriques
    # déjà publiées si les sources agrégées locales concordent.
    reference={x["code"]:x for x in report["satisfaction"]}
    for row in rows(e4 / "delivery_satisfaction.csv"):
        group=reference[row["delivery_group"]]
        if int(row["delivered_orders"])!=group["orders"] or            int(row["scored_orders"])!=group["scored"] or            int(row["low_score_orders"])!=group["negative"]:
            raise ValueError("Satisfaction E4 non conforme au référentiel E7.")

    report["meta"]["mode"]="Exports locaux agrégés validés"
    report["meta"]["coverage"]={
        "states":"27 États vérifiés",
        "categories":"12 catégories les plus vendues en prix d'articles",
        "sellerStates":f"{len(report['sellerStates'])} États vendeurs agrégés (≥ 5 vendeurs)",
        "cohorts":f"{len(report['cohorts'])} cohortes mensuelles agrégées",
    }
    # Whitelist stricte : tout résultat construit ci-dessus est un agrégat.
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Commerce 360 : produire un JSON public d'agrégats Olist")
    parser.add_argument("--e4", type=Path, default=DEFAULT_E4)
    parser.add_argument("--e5", type=Path, default=DEFAULT_E5)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    seed=json.loads(DEFAULT_OUT.read_text(encoding="utf-8"))
    result=build(args.e4,args.e5,seed)
    args.out.parent.mkdir(parents=True,exist_ok=True)
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
