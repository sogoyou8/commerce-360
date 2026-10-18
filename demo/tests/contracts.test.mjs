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

test("only three published regional baselines are shown in reference mode", () => {
  assert.equal(source.states.length, 3);
  assert.equal(source.meta.coverage.states, "3 États documentés parmi 27");
  assert.equal(source.sellerStates.length, 0);
  assert.equal(source.cohorts.length, 0);
});

test("comparable sales categories use article prices, not profit", () => {
  assert.equal(source.categories[0].label,"health_beauty");
  assert.equal(source.categories[0].salesBrl,1229557.50);
  assert.ok(source.meta.caveat.includes("historiques"));
});
