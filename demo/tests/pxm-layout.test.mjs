import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("E3 uses one workspace and five horizontally navigable modes", () => {
  assert.match(html, /data-layout="pxm-unified"/);
  assert.match(html, /class="mode-nav" aria-label="Choisir une analyse"/);
  assert.equal([...html.matchAll(/data-view="(overview|sales|delivery|quality|customers)"/g)].length,5);
  assert.equal([...html.matchAll(/<main\b/g)].length,1);
  assert.doesNotMatch(html,/class="side-nav"|class="intro-aside"|class="main-footer"/);
  assert.match(html, /id="metrics" class="metric-strip"/);
  assert.match(html,/id="viz-container" class="viz-container"/);
  assert.match(html,/class="story-panel" aria-label="Inspecteur contextuel"/);
  assert.match(html,/class="lower">\s*<summary id="lower-heading"/);
  assert.match(html, /id="method-dialog"/);
});

test("E3 desktop canvas is viewport-sized while mobile stays scrollable", () => {
  assert.match(css,/\.shell\s*\{[\s\S]*?height: calc\(100dvh - 64px\)/);
  assert.match(css,/@media \(min-width: 960px\) and \(min-height: 670px\)/);
  assert.match(css,/html, body \{ height: 100%; overflow: hidden; \}/);
  assert.match(css,/@media \(max-width: 700px\)/);
  assert.match(css,/\.analysis \{ grid-template-columns: 1fr; min-height: 0; margin-top: 0; \}/);
  assert.match(css, /\.story-panel \{[\s\S]*?overflow-y: auto/);
});

test("E3 keeps authentic interactions, explicit grains and method panel", () => {
  for(const mode of ["overview", "sales", "delivery", "quality", "customers"]) {
    assert.match(js, new RegExp(mode + ":\\s*render", "m"));
  }
  assert.match(js,/function setupModeNavigation\(\)/);
  assert.match(js,/\["ArrowLeft", "ArrowRight", "Home", "End"\]/);
  assert.doesNotMatch(js,/window\.scrollTo\(/);
  assert.match(js,/dataset\.meta\.coverage\.states/);
  assert.match(js,/dataset\.meta\.coverage\.categories/);
  assert.match(html,/id="method-data-coverage"/);
  assert.match(html, /Le PBIX|Power BI\/DAX/);
  assert.match(html, /aucun filtrage croisé fictif/);
});
