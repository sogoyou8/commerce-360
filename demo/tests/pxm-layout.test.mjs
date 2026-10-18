import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const js=readFileSync(new URL("../app.js",import.meta.url),"utf8");

test("E3 has a single header, five modes, one workspace, an inspector and three explorations",()=>{
  assert.match(html,/data-layout="pxm-unified"/);
  assert.match(html,/<header class="masthead">[\s\S]*?<nav class="mode-nav" aria-label="Choisir une analyse">/);
  assert.equal([...html.matchAll(/data-view="(overview|sales|delivery|quality|customers)"/g)].length,5);
  assert.equal([...html.matchAll(/<main\b/g)].length,1);
  assert.doesNotMatch(html,/class="side-nav"|class="intro-aside"|class="main-footer"/);
  assert.match(html,/id="metrics" class="metric-strip"/);
  assert.match(html,/id="viz-container" class="viz-container"/);
  assert.match(html,/class="story-panel" aria-label="Inspecteur contextuel"/);
  assert.match(html,/id="story-comparisons"/);
  assert.match(html,/id="story-navigation"/);
  for (const id of ["dock-categories","dock-states","dock-quality"]) assert.ok(html.includes('id="'+id+'"'));
  assert.match(html,/class="lower"><summary id="lower-heading"/);
  assert.match(html,/id="method-dialog"/);
});

test("E3 desktop uses one viewport and mobile preserves accessible natural scrolling",()=>{
  assert.match(css,/height:calc\(100dvh - 76px\)/);
  assert.match(css,/@media \(min-width:1180px\) and \(min-height:750px\)/);
  assert.match(css,/html,body\{height:100%;overflow:hidden\}/);
  assert.match(css,/@media \(max-width:800px\)/);
  assert.match(css,/\.exploration-dock\{grid-template-columns:1fr/);
  assert.match(css,/\.story-panel\{[\s\S]*?overflow-y:auto/);
});

test("E3 chart combines actual monthly sales and orders with distinct visual encodings",()=>{
  assert.match(js,/function renderMonthBars\(\)/);
  assert.match(js,/const maxSales=Math\.max/);
  assert.match(js,/const maxOrders=Math\.max/);
  assert.match(js,/entry\.salesBrl\/maxSales/);
  assert.match(js,/entry\.orders\/maxOrders/);
  assert.match(js,/document\.createElementNS\("http:\/\/www\.w3\.org\/2000\/svg","polyline"\)/);
  assert.match(js,/setAttribute\("aria-label",strMonth/);
  assert.match(js,/function changePercent/);
  assert.match(js,/if\(previous\)/);
  assert.match(js,/if\(previousYear\)/);
});

test("E3 complementary panels show only real partial-coverage Olist aggregates",()=>{
  assert.match(js,/data\.meta\.coverage\.categories/);
  assert.match(js,/data\.meta\.coverage\.states/);
  assert.match(js,/data\.categories/);
  assert.match(js,/data\.states/);
  assert.match(js,/data\.satisfaction/);
  assert.match(js,/data\.totals\.averageScore/);
  assert.match(js,/renderInspectorDetails\(\)/);
  assert.match(js,/renderDock\(\)/);
  assert.match(js,/function setupModeNavigation\(\)/);
  assert.match(js,/\["ArrowLeft", "ArrowRight", "Home", "End"\]/);
  assert.doesNotMatch(js,/window\.scrollTo\(/);
  assert.match(html,/id="method-data-coverage"/);
  assert.match(html,/Power BI\/DAX/);
  assert.match(html,/aucun filtrage croisé fictif/);
});

test("E3 Clients exposes E2 cohorts with distinct population and time-grain caveats",()=>{
  assert.match(js,/function renderCustomerCohorts\(\)/);
  assert.match(js,/data\.cohorts/);
  assert.match(js,/state\.customersView==="cohorts"/);
  assert.match(js,/selectedCohort/);
  assert.match(js,/20 cohortes mensuelles/);
  assert.match(js,/ne prédisent ni fidélité actuelle ni churn/);
  assert.match(js,/Premi[eè]r achat|PREMIER ACHAT LIVRÉ OBSERVÉ/);
});

test("E3 states label delivered orders correctly and never pretend 27 states are partial",()=>{
  assert.match(js,/commandes livrées\x60\)/);
  assert.match(js,/data\.states\.length===27/);
  assert.match(js,/data\.meta\.coverage\.states/);
});

test("E3 inspector content does not flex-shrink into overlapping sections",()=>{
  assert.match(css,/\.story-inner\{[^}]*flex:0 0 auto/);
  assert.match(css,/\.story-foot\{[^}]*flex:0 0 auto/);
  assert.match(css,/\.lower\{[^}]*flex:0 0 auto/);
  assert.match(css,/\.story-panel\{[^}]*overflow-y:auto/);
});
