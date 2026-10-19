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
  assert.match(html,/customers-finish\.css\?v=customers-20261019-5/);
  assert.match(html,/app\.js\?v=customers-20261019-5/);
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
