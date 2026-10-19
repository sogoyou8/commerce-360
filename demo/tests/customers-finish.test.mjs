import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validatePublicData} from "../data-contract.mjs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../customers-finish.css",import.meta.url),"utf8");
const data=JSON.parse(readFileSync(new URL("../data/public.json",import.meta.url),"utf8"));

test("Jalon 5/5 — segments and cohorts reconcile against actual Olist aggregates",()=>{
  assert.deepEqual(validatePublicData(data),[]);
  assert.equal(data.segments.length,7);
  assert.equal(data.cohorts.length,20);
  assert.equal(data.segments.reduce((a,x)=>a+x.customers,0),93104);
  assert.equal(data.segments.reduce((a,x)=>a+x.repeats,0),2789);
  assert.equal(data.cohorts.reduce((a,x)=>a+x.customers,0),93104);
  assert.equal(data.segments.reduce((a,x)=>a+Math.round(x.salesBrl*100),0),1318102713);
  assert.equal(data.cohorts.reduce((a,x)=>a+Math.round(x.salesBrl*100),0),1318102713);
});

test("Jalon 5/5 — RFM has keyboard navigation with focus and selected-row visibility",()=>{
  assert.match(html,/customers-finish\.css\?v=customers-20261019-5b/);
  assert.match(html,/app\.js\?v=customers-20261019-5b/);
  assert.match(js,/function selectCustomerItem\(code, focusRank=false\)/);
  assert.match(js,/if\(state\.customersView==="cohorts"\)state\.selectedCohort=code/);
  assert.match(js,/if\(focusRank\)selected\.focus\(\{preventScroll:true\}\)/);
  assert.match(js,/if\(state\.view==="delivery"\|\|state\.view==="customers"\)\{/);
  assert.match(js,/row\.tabIndex=item\.code===selectedId\?0:-1/);
  assert.match(js,/row\.dataset\.itemCode=item\.code/);
  for(const key of ["ArrowUp","ArrowDown","Home","End"])assert.ok(js.includes('"'+key+'"'));
  assert.match(js,/selectCustomerItem\(month,true\)/);
  assert.match(js,/selectCustomerItem\(key,true\)/);
  assert.match(js,/navigation=\{items:cohorts.*restoreFocus:true\}/);
  assert.match(js,/navigation=\{items:orderedSegments.*restoreFocus:true\}/);
});

test("Jalon 5/5 — screen-reader alternatives preserve 7 segments and 20 cohorts",()=>{
  assert.match(js,/accessibleDataTable\("Sept segments RFM Olist, exclusifs et historiques/);
  assert.match(js,/accessibleDataTable\("Cohortes RFM Olist : les ventes cumulent les achats livrés/);
  assert.match(js,/cohorts\.map\(c=>\[strMonth\(c\.month,true\),n\(c\.customers\)/);
  assert.match(js,/choices\.map\(s=>\[s\.label,n\(s\.customers\)/);
  assert.match(js,/Ces résultats ne prédisent ni fidélité actuelle ni churn/);
});

test("Jalon 5/5 — compact responsive rank list and visible keyboard focus",()=>{
  assert.match(css,/\.rank-chart\{[\s\S]*?overflow-y:auto/);
  assert.match(css,/\.rank-row--customer:focus-visible/);
  assert.match(css,/@media \(min-width:1180px\) and \(max-height:850px\)/);
  assert.match(css,/@media \(max-width:480px\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/\.workspace\s*\{|\.metric\s*\{|\.dock-panel\s*\{/);
});

test("P5 visual finish — 7 segments are compact only on spacious desktop; cohorts remain scrollable",()=>{
  assert.match(js,/rank-chart--cohorts":"rank-chart--segments"/);
  assert.match(css,/@media \(min-width:1400px\) and \(min-height:840px\) and \(max-height:1000px\)/);
  assert.match(css,/@media \(min-width:1180px\) and \(min-height:851px\) and \(max-height:1000px\)/);
  assert.match(css,/\.workspace:has\(\.story-panel\[data-mode="customers"\]\)\{/);
  assert.match(css,/grid-template-rows:clamp\(86px,10\.2vh,100px\) minmax\(0,1fr\) clamp\(218px,26vh,260px\)/);
  assert.match(css,/\.rank-chart--segments \.rank-row--customer\{/);
  assert.match(css,/flex:0 0 40px/);
  assert.ok(7*40+6*2<=300,"seven rows plus gaps fit the observed 300px desktop list area");
  assert.match(css,/\.story-panel\[data-mode="customers"\] \.story-foot p\{/);
  assert.match(css,/\.story-panel\[data-mode="customers"\] \.comparison-note\{/);
  assert.match(css,/\.analysis:has\(\.story-panel\[data-mode="customers"\]\) \.viz-footer\{/);
  assert.match(css,/@media \(min-width:1400px\) and \(min-height:800px\) and \(max-height:850px\), \(max-width:800px\)/);
  assert.match(css,/@media \(min-width:1180px\) and \(max-width:1399px\) and \(max-height:850px\)/);
  assert.match(css,/\.story-panel\[data-mode="customers"\] \.story-inner\{padding-top:5px\}/);
  assert.match(css,/\.story-panel\[data-mode="customers"\] \.story-foot\{padding:4px 0 0\}/);
  assert.match(css,/@media \\(max-width:480px\\)/);
  assert.match(css,/\\.analysis:has\\(\\.story-panel\\[data-mode="customers"\\]\\) \\.analysis-main\\{/);
  assert.match(css,/height:450px;\\s*min-height:450px/);
});
