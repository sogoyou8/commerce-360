import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validatePublicData} from "../data-contract.mjs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../quality-finish.css",import.meta.url),"utf8");
const publicData=JSON.parse(readFileSync(new URL("../data/public.json",import.meta.url),"utf8"));

test("Jalon 4/5 — notes and negative rates retain their observed denominators",()=>{
  assert.deepEqual(validatePublicData(publicData),[]);
  assert.equal(publicData.totals.orders,96211);
  assert.equal(publicData.totals.averageScore,4.16);
  assert.equal(publicData.totals.negativeRate,12.8);
  const byCode=Object.fromEntries(publicData.satisfaction.map(item=>[item.code,item]));
  assert.equal(byCode.on_time.scored,87902);
  assert.equal(byCode.on_time.negative,8089);
  assert.equal(byCode.on_time.negativeRate,9.2);
  assert.equal(byCode.on_time.score,4.29);
  assert.equal(byCode.late.scored,7658);
  assert.equal(byCode.late.negative,4139);
  assert.equal(byCode.late.negativeRate,54.05);
  assert.equal(byCode.late.score,2.57);
  assert.equal(byCode.undated.orders,8);
  assert.equal(byCode.undated.scored,8);
  assert.equal(byCode.late.negativeRate-byCode.on_time.negativeRate,44.849999999999994);
});

test("Jalon 4/5 — visual comparison has a structured accessible table and keyboard selection",()=>{
  assert.match(html,/quality-finish\.css\?v=quality-20261019-4b/);
  assert.match(html,/app\.js\?v=customers-20261019-5b/);
  assert.match(js,/function selectQualityGroup\(code, focus=false\)/);
  assert.match(js,/card\.dataset\.groupCode=group\.code/);
  assert.match(js,/card\.tabIndex=group\.code===selected\.code\?0:-1/);
  assert.match(js,/card\.setAttribute\("aria-pressed",String\(group\.code===selected\.code\)\)/);
  assert.match(js,/chart\.setAttribute\("role","group"\)/);
  for(const key of ["ArrowLeft","ArrowRight","Home","End"])assert.ok(js.includes('event.key==="'+key+'"'));
  assert.match(js,/card\.addEventListener\("click",\(\)=>selectQualityGroup\(group\.code,true\)\)/);
  assert.match(js,/qualityTable=accessibleDataTable\(/);
  assert.match(js,/data\.satisfaction\.map\(group=>\[/);
  assert.match(js,/group\.label,n\(group\.orders\),n\(group\.scored\),n\(group\.negative\)/);
  assert.match(js,/navigation=\{items:data\.satisfaction\.filter\(x=>x\.code!=="undated"\).*restoreFocus:true\}/);
  assert.match(js,/La comparaison reflète une association, pas un effet causal établi/);
});

test("Jalon 4/5 — Quality finish is scoped, focus-visible and responsive",()=>{
  assert.match(css,/\.story-panel\[data-mode="quality"\]/);
  assert.match(css,/\.group-card:focus-visible/);
  assert.match(css,/@media \(min-width:1180px\) and \(max-height:850px\)/);
  assert.match(css,/@media \(max-width:480px\)/);
  assert.match(css,/@media \(max-width:540px\)/);
  assert.match(css,/\.analysis:has\(\.story-panel\[data-mode="quality"\]\) \.analysis-main\{/);
  assert.match(css,/height:510px;\s*min-height:510px/);
  assert.match(css,/@media \(prefers-contrast:more\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/\.workspace\s*\{|\.metric\s*\{|\.dock-panel\s*\{/);
});
