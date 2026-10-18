import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareSamePeriod, observedShare, validatePublicData } from "../data-contract.mjs";

const source = JSON.parse(readFileSync(new URL("../data/public.json", import.meta.url), "utf8"));
const clone = () => structuredClone(source);

test("the public snapshot reconciles with E3, E5 and E7", () => {
  assert.deepEqual(validatePublicData(source), []);
  assert.equal(source.totals.orders, 96211);
  assert.equal(source.totals.customers, 93104);
  assert.equal(source.totals.repeatCustomers, 2789);
  assert.equal(source.totals.late, 7822);
  assert.equal(source.monthly.length, 20);
  assert.equal(source.segments.length, 7);
});

test("year-over-year compares only January through August", () => {
  const result=compareSamePeriod(source.monthly);
  assert.equal(result.sales2017.toFixed(2), "2993456.13");
  assert.equal(result.sales2018.toFixed(2), "7218125.12");
  assert.equal(result.salesGrowth.toFixed(2), "141.13");
});

test("rates are based on the correct denominators", () => {
  assert.equal(observedShare(7822, 96203).toFixed(2), "8.13");
  assert.equal(observedShare(2789, 93104).toFixed(2), "3.00");
  assert.equal(observedShare(4139, 7658).toFixed(2), "54.05");
});

test("a tampered aggregate is rejected even when rounding hides the change", () => {
  const changed=clone();
  changed.states[0].late += 1;
  assert.notDeepEqual(validatePublicData(changed), []);
});

test("different client totals or a partial monthly series cannot pass", () => {
  const changed=clone();
  changed.segments[0].customers += 1;
  assert.notDeepEqual(validatePublicData(changed), []);
  const incomplete=clone();
  incomplete.monthly.pop();
  assert.notDeepEqual(validatePublicData(incomplete), []);
});

test("public data refuses raw identifiers and personal fields", () => {
  for (const key of ["customer_unique_id","order_id","seller_id","email"]) {
    const changed=clone();
    changed.satisfaction[0][key]="hidden-raw-data";
    assert.ok(validatePublicData(changed).some(x=>x.includes(key)));
  }
});

test("regional coverage is explicit in both reference and enriched modes", () => {
  assert.ok([3, 27].includes(source.states.length));
  if (source.states.length === 3) {
    assert.deepEqual(source.states.map((state) => state.code), ["CE", "RJ", "SP"]);
    assert.equal(source.meta.coverage.states, "3 États documentés parmi 27");
    assert.equal(source.sellerStates.length, 0);
    assert.equal(source.cohorts.length, 0);
  } else {
    assert.equal(source.meta.coverage.states, "27 États vérifiés");
    assert.equal(source.states.reduce((total, state) => total + state.orders, 0), source.totals.orders);
    assert.equal(source.states.reduce((total, state) => total + state.late, 0), source.totals.late);
    assert.equal(source.categories.length, 12);
    assert.ok(source.sellerStates.every((state) => /^[A-Z]{2}$/.test(state.code)));
    assert.ok(source.cohorts.every((cohort) => cohort.customers >= 20));
  }
});

test("comparable sales categories use article prices, not profit", () => {
  assert.equal(source.categories[0].label,"health_beauty");
  assert.equal(source.categories[0].salesBrl,1229557.50);
  assert.ok(source.meta.caveat.includes("historiques"));
});


test("E1 explains the independent Olist study in the UI without exposing raw data", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /À propos \/ Données/);
  assert.match(html, /aria-controls="method-dialog"/);
  assert.match(html, /aria-labelledby="method-title"/);
  assert.match(html, /ÉTUDE DE CAS INDÉPENDANTE/);
  assert.match(html, /neuf fichiers e-commerce historiques/);
  for (const metric of ["96 211", "13,18 M", "93 104", "7 822", "96 203"]) {
    assert.ok(html.includes(metric), `Chiffre historique non documenté : ${metric}`);
  }
  assert.match(html, /<summary>Données, méthodologie et limites/);
  assert.match(html, /aucun filtrage croisé fictif/);
  assert.match(html, /https:\/\/github.com\/sogoyou8\/commerce-360\/blob\/main\/docs\/e8-bilan.md/);
  assert.match(js, /Explorer le commerce/);
  assert.match(js, /aria-expanded", "false"/);
  assert.match(css, /\.method-dialog \{ position: fixed/);
});

test("E2 rejects misleading partial/full coverage, incorrect totals and fabricated regions", () => {
  const cases=[
    d=>{ d.meta.coverage.states=d.states.length===27 ? "3 États documentés parmi 27" : "27 États vérifiés"; },
    d=>{ d.states[0].orders+=1; },
    d=>{ d.states[0].code="ZZ"; },
    d=>{ d.states.push({...d.states[0],code:"BA"}); },
    d=>{ d.states[2].dated+=1; },
    d=>{ d.categories[0].salesBrl+=0.01; },
    d=>{ d.categories[1].label=d.categories[0].label; },
    d=>{ d.meta.coverage.categories=d.categories.length===12 ? "2 catégories documentées parmi le catalogue" : "12 catégories les plus vendues en prix d'articles"; },
    d=>{ d.sellerStates=[{code:"SP",salesBrl:1}]; },
    d=>{ d.cohorts=[{month:"2017-01",customers:1,repeats:0,salesBrl:1}]; },
    d=>{ d.cohorts=[{month:"2018-12",customers:25,repeats:0,salesBrl:1}]; },
  ];
  for(const [index, mutate] of cases.entries()) {
    const changed=clone();
    mutate(changed);
    assert.notDeepEqual(validatePublicData(changed), [], "Unsafe E2 fixture accepted: "+index);
  }
});

test("E2 coverage is explicit for both initial and fully checked exports", () => {
  assert.deepEqual(validatePublicData(source), []);
  if(source.states.length===3) {
    assert.equal(source.categories.length,2);
    assert.equal(source.sellerStates.length,0);
    assert.equal(source.cohorts.length,0);
    assert.equal(source.meta.coverage.states,"3 États documentés parmi 27");
  } else {
    assert.equal(source.states.length,27);
    assert.equal(source.categories.length,12);
    assert.equal(source.meta.coverage.states,"27 États vérifiés");
  }
});
