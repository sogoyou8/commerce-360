import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);

test("all JavaScript-referenced DOM IDs exist exactly once", () => {
  const references = [
    ...[...js.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]),
    ...[...js.matchAll(/renderText\("([^"]+)"/g)].map((match) => match[1]),
  ];
  assert.ok(references.length > 20, "Expected the five-view DOM contract.");
  for (const id of new Set(references)) {
    assert.equal(ids.filter((present) => present === id).length, 1, `Invalid DOM id ${id}`);
  }
});

test("all five navigation destinations correspond to real chapters", () => {
  const pages = ["overview", "sales", "delivery", "quality", "customers"];
  for (const page of pages) {
    assert.ok(html.includes(`href="#${page}" data-view="${page}"`), page);
    assert.ok(js.includes(`${page}:`), page);
  }
});

test("the web shell contains no embedded private transactions", () => {
  assert.ok(!html.includes("customer_unique_id"));
  assert.ok(!html.includes("DATABASE_URL"));
  assert.ok(!js.includes("postgres://"));
  assert.ok(html.includes("data/public.json") === false, "The asset path stays in app.js.");
});
