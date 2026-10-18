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
  assert.match(html,/class="method-insights"><summary id="lower-heading"/);
  assert.match(html,/id="method-dialog"/);
});

test("E3 desktop uses one viewport and mobile preserves accessible natural scrolling",()=>{
  assert.match(css,/height:calc\(100dvh - 72px\)/);
  assert.match(css,/@media \(min-width:1180px\) and \(min-height:750px\)/);
  assert.match(css,/html,body\{height:100%;overflow:hidden\}/);
  assert.match(css,/@media \(max-width:800px\)/);
  assert.match(css,/\.exploration-dock\{grid-template-columns:1fr/);
  assert.match(css,/\.story-panel\{[^}]*overflow:hidden/);
});

test("E3 chart combines actual monthly sales and orders with distinct visual encodings",()=>{
  assert.match(js,/function renderMonthBars\(\)/);
  assert.match(js,/const maxSales=Math\.max/);
  assert.match(js,/const maxOrders=Math\.max/);
  assert.match(js,/entry\.salesBrl\/salesCeil/);
  assert.match(js,/entry\.orders\/ordersCeil/);
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
  assert.match(html,/class="method-insights"/);
  assert.doesNotMatch(css,/\.story-panel\{[^}]*overflow-y:auto/);
  assert.match(css,/\.story-panel\{[^}]*overflow:hidden/);
});

test("E3 keeps an accessible heading without consuming a desktop grid row",()=>{
  assert.match(html,/<section class="intro sr-only" aria-labelledby="page-title">/);
  assert.match(css,/grid-template-rows:104px minmax\(0,1fr\) clamp\(188px,24vh,248px\)/);
});
test("E3 selection, map and satisfaction use real public aggregates",()=>{
  const svg=readFileSync(new URL("../assets/br-states.svg",import.meta.url),"utf8");
  assert.equal([...svg.matchAll(/<path\s+id="[a-z]{2}"/g)].length,27);
  assert.match(svg,/CC BY 4\.0/);
  assert.match(js,/tabIndex=active\?0:-1/);
  assert.match(js,/combo-selection-rule/);
  assert.match(js,/function renderBrazilMap\(\)/);
  assert.match(js,/data\.states\.map/);
  assert.match(js,/data\.totals\.negativeRate/);
  assert.match(js,/categories\.slice\(0,6\)/);
  assert.doesNotMatch(js,/925421|6421|8\.7/);
});

test("E3 polish uses rounded chart axes and does not replace observations",()=>{
  assert.match(js,/function niceAxisCeil\(max\)/);
  assert.match(js,/const salesCeil=niceAxisCeil\(maxSales\)/);
  assert.match(js,/const ordersCeil=niceAxisCeil\(maxOrders\)/);
  assert.match(js,/data\.monthly/);
  assert.match(css,/grid-template-rows:104px minmax\(0,1fr\) clamp\(236px,29vh,292px\)/);
});
test("E3 overview ranks states by order volume while colouring the map by late rate",()=>{
  assert.match(js,/\.sort\(\(a,b\)=>b\.orders-a\.orders\)/);
  assert.match(js,/100\*item\.orders\/maxVolume/);
  assert.match(js,/const alpha=\.22\+\.72\*\(item\.rate\/maxRate\)/);
  assert.match(js,/score-ring/);
  assert.match(css,/grid-template-rows:minmax\(70px,1fr\) 26px 26px/);
});

test("E3 satisfaction grid overrides dock-content ID specificity at compact desktop sizes",()=>{
  assert.match(css,/#dock-quality\.dock-quality-layout\{display:grid;grid-template-rows:minmax\(70px,1fr\) 26px 26px/);
  assert.match(css,/#dock-quality\.dock-quality-layout\{grid-template-rows:minmax\(62px,1fr\) 23px 23px/);
});

test("E3 compact satisfaction rows stay within their 23px grid tracks",()=>{
  assert.match(css,/#dock-quality>\.dock-quality-layout>\.dock-row\{min-height:0;height:23px\}/);
});
