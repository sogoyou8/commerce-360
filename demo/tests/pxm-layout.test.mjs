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
  assert.match(js,/n\(s\.orders\)\+" commandes livrées"/);
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
  assert.match(js,/function renderBrazilMap\(withMobilePicker=false\)/);
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

test("E3 Ventes annual bar wrapper cannot inherit month label positioning",()=>{
  assert.match(js,/node\("div","year-towers"\)/);
  assert.doesNotMatch(js,/node\("span","year-towers"\)/);
  assert.match(css,/\.year-pair > \.year-month-label/);
  assert.doesNotMatch(css,/\.year-pair span\s*\{/);
  assert.match(js,/yearlyLabel=measure==="salesBrl"/);
  assert.match(js,/year2017=pairs\.reduce/);
});
test("E3 reference-compliant detail remains grounded in national aggregates",()=>{
  assert.match(js,/remainingSales=Math\.max\(0,Math\.round\(\(data\.totals\.salesBrl-displayedSales\)/);
  assert.match(js,/otherOrders=data\.totals\.orders-volumeTop5/);
  assert.match(js,/group-secondary/);
  assert.match(html,/Visuel terrestre généré pour Commerce 360/);
  assert.doesNotMatch(css,/city_lights_namerica_8k\.jpg/);
});

test("E3 compact satisfaction dock avoids subpixel row clipping",()=>{
  assert.match(css,/#dock-quality>\.dock-quality-layout\{grid-template-rows:minmax\(62px,1fr\) 22px 22px/);
  assert.match(css,/#dock-quality>\.dock-quality-layout>\.dock-row\{height:22px;min-height:0;overflow:hidden\}/);
});

test("E3 finish: main delivery atlas and accessible source map",()=>{
 assert.match(js,/delivery-map-visual/);
 assert.match(js,/renderBrazilMap\(\)/);
 assert.match(js,/if\(data\)render\(\)/);
 assert.match(css,/\.delivery-atlas\{flex:1;min-height:0;display:grid/);
});
test("E3 finish: two radial visualisations computed from verified satisfaction",()=>{
 assert.match(js,/gauge\.style\.setProperty\("--gauge-pct",100\*value\/max\+"%"\)/);
 assert.match(css,/\.group-gauge\{/);
 assert.match(js,/group\.scored/);
 assert.match(js,/rank-row--customer/);
});

test("F0 allows reflow at 320px including browser scrollbar, without forcing page overflow",()=>{
  assert.match(css,/html,body\{margin:0;min-width:0;min-height:100%/);
  assert.doesNotMatch(css,/html,body\{margin:0;min-width:320px/);
  assert.match(css,/\.mode-nav\{order:3;flex-basis:100%;justify-content:flex-start;overflow-x:auto/);
  assert.match(html,/styles\.css\?v=f6-20261019-legacy-clean/);
});

test("F1/F2 isolates independent desktop panels and grows the lower exploration row",()=>{
  const layer=readFileSync(new URL("../layout-f1f2.css",import.meta.url),"utf8");
  assert.match(html,/layout-f1f2\.css\?v=e3-f1f2-20261018/);
  assert.match(layer,/@media \(min-width:1180px\)/);
  assert.match(layer,/\.analysis \{[\s\S]*?column-gap:clamp\(12px,1\.4vw,20px\)/);
  assert.match(layer,/\.analysis-main \{[\s\S]*?border:1px solid/);
  assert.match(layer,/\.story-panel \{[\s\S]*?border:1px solid/);
  assert.match(layer,/grid-template-rows:clamp\(86px,10\.2vh,100px\) minmax\(0,1fr\) clamp\(240px,31vh,306px\)/);
  assert.match(layer,/grid-template-rows:82px minmax\(0,1fr\) 180px/);
  assert.match(layer,/@media \(max-width:1179px\)/);
});

test("F3 builds a generated Earth atmosphere without altering layout or analytical data",()=>{
  const f3=readFileSync(new URL("../ambience-f3.css",import.meta.url),"utf8");
  assert.match(html,/ambience-f3\.css\?v=e3-f3-20261019-seamless/);
  assert.match(f3,/illustration originale/);
  assert.match(f3,/assets\/earth-f3-native\.webp/);
  assert.match(f3,/\.ambient::after \{/);
  assert.match(f3,/\.ambient::before \{/);
  assert.match(f3,/\.metric:last-child \{/);
  assert.match(f3,/\.story-panel \{/);
  assert.match(f3,/max-height:850px/);
  assert.match(f3,/max-width:1179px/);
  assert.match(f3,/prefers-reduced-data:reduce/);
  assert.match(f3,/forced-colors:active/);
  assert.doesNotMatch(f3,/\.workspace\s*\{|\.analysis\s*\{|grid-template-rows/);
});

test("F3 framing: smaller spherical photo, protected KPI and complete layout isolation",()=>{
  const f3=readFileSync(new URL("../ambience-f3.css",import.meta.url),"utf8");
  assert.match(f3,/width:clamp\(450px,35vw,565px\)/);
  assert.match(f3,/right:clamp\(16px,1\.8vw,34px\)/);
  assert.match(f3,/mask-image:none/);
  assert.match(f3,/\.metric:last-child \{\s*background:transparent/);
  assert.match(f3,/\.story-panel \{/);
  assert.doesNotMatch(f3,/grid-template|\.workspace\s*\{|\.analysis-main\s*\{|\.analysis\s*\{/);
});

test("F3 globe is a real, lightweight transparent WebP asset, not an image mask",()=>{
  const asset=readFileSync(new URL("../assets/earth-f3-native.webp",import.meta.url));
  const f3=readFileSync(new URL("../ambience-f3.css",import.meta.url),"utf8");
  assert.ok(asset.length > 300000 && asset.length < 550000);
  assert.equal(asset.subarray(0,4).toString("ascii"),"RIFF");
  assert.equal(asset.subarray(8,12).toString("ascii"),"WEBP");
  assert.match(f3,/background:url\("\.\/assets\/earth-f3-native\.webp"\) center \/ contain no-repeat/);
  assert.doesNotMatch(f3,/city_lights_namerica_8k|mask-image:radial-gradient/);
});

test("F4 uses shared visual tokens for all five navigation modes",()=>{
  const f4=readFileSync(new URL("../design-system-f4.css",import.meta.url),"utf8");
  assert.match(html,/design-system-f4\.css\?v=e3-f4-20261019-unified/);
  for(const name of ["--ui-text","--ui-secondary","--ui-accent","--ui-positive","--ui-line","--ui-radius"])
    assert.ok(f4.includes(name),"missing "+name);
  assert.match(f4,/\.mode-nav a\[aria-current="page"\]/);
  assert.match(f4,/\.view-options button\[aria-pressed="true"\]/);
  assert.match(f4,/\.rank-row\[aria-pressed="true"\]/);
  assert.match(f4,/\.group-card\[aria-pressed="true"\]/);
  assert.match(f4,/\.dock-category-row:hover/);
  assert.match(f4,/\.brazil-map:focus-visible/);
  assert.match(f4,/prefers-reduced-motion:reduce/);
  assert.match(f4,/forced-colors:active/);
  assert.doesNotMatch(f4,/\.workspace\s*\{|\.analysis\s*\{|grid-template-rows/);
});

test("F3 HD asset dimensions and native alpha are validated",()=>{
  const asset=readFileSync(new URL("../assets/earth-f3-native.webp",import.meta.url));
  const f3=readFileSync(new URL("../ambience-f3.css",import.meta.url),"utf8");
  assert.equal(asset.subarray(12,16).toString("ascii"),"VP8X");
  const w=asset.readUIntLE(24,3)+1,h=asset.readUIntLE(27,3)+1;
  assert.equal(w,1254,"Expected source-native globe width, not artificial upscale");
  assert.equal(h,1254,"Expected source-native globe height, not artificial upscale");
  assert.ok((asset[20]&0x10)!==0,"Transparent alpha flag required");
  assert.match(f3,/earth-f3-native\.webp/);
  assert.doesNotMatch(f3,/url\("\.\/assets\/earth-f3\.webp"\)/);
});

test("F5 upgrades all three exploration cards without altering the cockpit or data",()=>{
  const f5=readFileSync(new URL("../dock-f5.css",import.meta.url),"utf8");
  assert.match(html,/dock-f5\.css\?v=e3-f5-20261019-a11y5/);
  assert.match(html,/app\.js\?v=customers-20261019-5/);
  assert.match(f5,/#dock-categories \.dock-category-row/);
  assert.match(f5,/#dock-states \.dock-state-layout/);
  assert.match(f5,/#dock-quality \.score-ring/);
  assert.match(f5,/#dock-categories \.dock-category-row--other\{display:grid/);
  assert.match(f5,/#dock-states \.dock-state-row--other\{display:grid/);
  assert.match(f5,/@media \(max-width:460px\)/);
  assert.match(f5,/flex:0 0 19px;height:19px;min-height:0;overflow:hidden/);
  assert.match(f5,/display:grid;padding-top:0;border-top:0/);
  assert.match(f5, /forced-colors:active/);
  assert.doesNotMatch(f5,/\.workspace\s*\{|\.analysis\s*\{|\.metric\s*\{/);
  assert.match(js,/row\.setAttribute\("aria-label","Explorer la catégorie "/);
  assert.match(js,/row\.setAttribute\("aria-label","Explorer "\+item\.code/);
  assert.match(js,/ring\.setAttribute\("role","img"\)/);
});

test("F3 globe is fully within viewport and does not redefine F5",()=>{
  const f3=readFileSync(new URL("../ambience-f3.css",import.meta.url),"utf8");
  assert.match(f3,/right:clamp\(16px,1\.8vw,34px\)/);
  assert.match(f3,/width:clamp\(450px,35vw,565px\)/);
  assert.match(f3,/max-width:1179px/);
  assert.match(f3,/\.metric:last-child\s*\{\s*background:transparent/);
  assert.match(f3,/\.story-panel\s*\{\s*background:linear-gradient/);
  assert.doesNotMatch(f3,/\.dock-panel|\.exploration-dock|\.workspace\s*\{|\.analysis\s*\{/);
});

test("F3 seamless globe never ends a KPI overlay in the right gutter",()=>{
 const f3=readFileSync(new URL("../ambience-f3.css",import.meta.url),"utf8");
 assert.match(f3,/\.metric:last-child\s*\{\s*background:transparent/);
 assert.match(f3,/\.metric:last-child :is\(\.metric-label,\.metric-value,\.metric-note\)/);
 assert.match(f3,/text-shadow:0 1px 7px/);
 assert.doesNotMatch(f3,/\.metric:last-child\s*\{\s*background:linear-gradient/);
 assert.match(f3,/background:url\("\.\/assets\/earth-f3-native\.webp"\) center \/ contain no-repeat/);
 assert.doesNotMatch(f3,/\.workspace\s*\{|\.analysis\s*\{|\.dock-panel\s*\{/);
});

test("F6 removes redundant remote Earth and preserves layer ordering",()=>{
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 const f3=readFileSync(new URL("../ambience-f3.css",import.meta.url),"utf8");
 assert.doesNotMatch(css,/city_lights_namerica_8k|nasa\.gov|mask-image:radial-gradient/);
 assert.match(f3,/earth-f3-native\.webp/);
 assert.match(f3,/\.metric:last-child\s*\{\s*background:transparent/);
 const order=["styles.css","layout-f1f2.css","ambience-f3.css","design-system-f4.css","dock-f5.css"];
 const positions=order.map(name=>html.indexOf('href="./'+name+'?'));
 assert.ok(positions.every(x=>x>=0)&&positions.every((x,i)=>i===0||x>positions[i-1]));
 assert.doesNotMatch(f3,/\.workspace\s*\{|\.analysis\s*\{|\.dock-panel\s*\{/);
});

test("F5.2 legible dock rows and mobile map layout stay isolated",()=>{
 const f5=readFileSync(new URL("../dock-f5.css",import.meta.url),"utf8");
 assert.match(f5,/#dock-states \.dock-state-layout\s*\{\s*display:flex;\s*flex-direction:column/);
 assert.match(f5,/@media \(max-width:420px\)/);
 assert.match(f5,/\.dock-panel:has\(#dock-states\)/);
 assert.match(f5,/#dock-categories \.dock-category-row \.dock-track\{height:9px\}/);
 assert.match(f5,/#dock-states \.brazil-map path\.is-map-active/);
 assert.match(f5,/\.dock-state-row:focus-visible/);
 assert.match(f5,/#dock-states \.dock-state-row\{padding:1px 2px\}/);
 assert.match(f5,/@media \(forced-colors:active\)/);
 assert.doesNotMatch(f5,/\.workspace\s*\{|\.analysis\s*\{|\.metric\s*\{/);
});

function relativeLuminance(hex) {
 const rgba=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*rgba[0]+.7152*rgba[1]+.0722*rgba[2];
}
function contrastRatio(a,b){
 const v=[relativeLuminance(a),relativeLuminance(b)].sort((x,y)=>y-x);
 return (v[0]+.05)/(v[1]+.05);
}
test("F5.3 contrast palette and touch zones preserve data without chart libraries",()=>{
 const f5=readFileSync(new URL("../dock-f5.css",import.meta.url),"utf8");
 assert.ok(contrastRatio("#b8d3f4","#223d60")>=4.5,"Supplemental labels must remain readable");
 assert.ok(contrastRatio("#dceaff","#223d60")>=4.5,"Main dock text must remain readable");
 assert.ok(contrastRatio("#4389ef","#223d60")>=3,"Bar marks need contrast against a bright dock surface");
 assert.match(f5,/@media \(max-width:480px\)/);
 assert.match(f5,/#dock-categories \.dock-category-row\s*\{\s*min-height:40px/);
 assert.match(f5,/#dock-states \.dock-state-row\s*\{\s*min-height:40px/);
 assert.match(f5,/#dock-states \.dock-state-layout\s*\{\s*display:flex;\s*flex-direction:column/);
 assert.match(f5,/@media \(prefers-contrast:more\)/);
 assert.match(js,/new IntersectionObserver\(entries=>/);
 assert.match(js,/rootMargin:"400px 0px"/);
 assert.match(js,/queueBrazilMap\(holder\)/);
 assert.match(js,/Toucher un État ou utiliser les flèches/);
 assert.doesNotMatch(js,/Chart\.js|Recharts|chart\.js/);
 assert.doesNotMatch(f5,/\.workspace\s*\{|\.analysis\s*\{|\.metric\s*\{/);
});

test("F5.4 interactive SVG has real descriptive title/desc without invented statistics",()=>{
 const f5=readFileSync(new URL("../dock-f5.css",import.meta.url),"utf8");
 assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1"/);
 assert.match(js,/mapTitle\.textContent="Brésil : taux de retard des livraisons par État"/);
 assert.match(js,/mapDesc\.textContent="Carte interactive des 27 États du Brésil/);
 assert.match(js,/mapDesc\.textContent=[^;]*\+percent\(item\.rate\)[^;]*\+n\(item\.dated\)/);
 assert.match(js,/svg\.setAttribute\("aria-labelledby",mapTitle\.id\)/);
 assert.match(js,/svg\.setAttribute\("aria-describedby",mapDesc\.id\)/);
 assert.match(js,/svg\.setAttribute\("role","group"\)/);
 assert.match(js,/svg\.addEventListener\("keydown",event=>/);
 assert.doesNotMatch(js,/svg\.setAttribute\("role","img"\)/);
 assert.match(f5,/#dock-categories \.dock-category-row\{min-height:44px\}/);
 assert.match(f5,/#dock-states \.dock-state-row,\s*#dock-states \.dock-state-row--other\{min-height:44px\}/);
 assert.match(f5,/\.dock-heading a\{\s*min-height:44px/);
 assert.doesNotMatch(f5,/\.workspace\s*\{|\.analysis\s*\{|\.metric\s*\{/);
});

test("F5.5 native picker provides all 27 data-backed state touch alternatives",()=>{
 const f5=readFileSync(new URL("../dock-f5.css",import.meta.url),"utf8");
 assert.match(js,/const statePicker=node\("label","dock-state-picker"\)/);
 assert.match(js,/const statePickerSelect=node\("select","dock-state-picker-select"\)/);
 assert.match(js,/for\(const item of \[\.\.\.data\.states\]\.sort/);
 assert.match(js,/statePickerSelect\.addEventListener\("change",\(\)=>openDeliveryState\(statePickerSelect\.value\)\)/);
 assert.match(f5,/#dock-states \.dock-state-picker-select\s*\{/);
 assert.match(f5,/height:44px;\s*min-height:44px/);
 assert.match(f5,/@media \(max-width:480px\)/);
 assert.match(f5,/\.dock-state-picker-select:focus-visible/);
 assert.doesNotMatch(js,/const option=node\("option","",.*?\+ [0-9]+/);
});

test("F5.6 map picker is dock-only and SVG labels are unique in delivery view",()=>{
 assert.match(js,/let brazilMapRenderId = 0/);
 assert.match(js,/const mapId=\+\+brazilMapRenderId/);
 assert.match(js,/mapTitle\.id="brazil-map-"\+mapId\+"-title"/);
 assert.match(js,/mapDesc\.id="brazil-map-"\+mapId\+"-desc"/);
 assert.match(js,/append\(stateLayout,renderBrazilMap\(true\),stateRank\)/);
 assert.match(js,/const mapStage=append\(node\("div","delivery-map-visual"\),renderBrazilMap\(\)/);
 assert.match(js,/if\(withMobilePicker\)\{/);
});

test("F5.7 the 27-state SVG has a complete screen-reader data table",()=>{
 assert.match(js,/const table=node\("table","sr-only"\)/);
 assert.match(js,/table\.setAttribute\("aria-label","Données Olist des 27 États du Brésil"\)/);
 assert.match(js,/for\(const item of \[\.\.\.data\.states\]\.sort\(\(a,b\)=>a\.code\.localeCompare\(b\.code\)\)\)/);
 assert.match(js,/node\("td","",n\(item\.orders\)\)/);
 assert.match(js,/node\("td","",n\(item\.dated\)\)/);
 assert.match(js,/node\("td","",n\(item\.late\)\)/);
 assert.match(js,/node\("td","",percent\(item\.rate,1\)\)/);
 assert.match(js,/holder\.append\(table\)/);
 assert.match(css,/\.sr-only\{position:absolute!important/);
 assert.match(html,/app\.js\?v=customers-20261019-5/);
});

test("E3.P overview timeline keeps month focused and accessible",()=>{
 const p1=readFileSync(new URL("../overview-e3p.css",import.meta.url),"utf8");
 assert.match(html,/overview-e3p\.css\?v=e3p-20261019-p1/);
 assert.match(html,/app\.js\?v=customers-20261019-5/);
 assert.match(js,/bars\.setAttribute\("role","group"\)/);
 assert.match(js,/button\.addEventListener\("click",\(\)=>selectOverviewMonth\(entry\.month,true\)\)/);
 assert.match(js,/scroll\.scrollLeft=Math\.max\(0,activeButton\.offsetLeft\+activeButton\.offsetWidth\/2-scroll\.clientWidth\/2\)/);
 assert.match(js,/setSelectionNavigation\(items,chosen\.month,x=>x\.month,month=>selectOverviewMonth\(month\),true\)/);
 assert.match(js,/next\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(p1,/\.combo-plot\{min-width:880px\}/);
 assert.match(p1,/\.combo-month:last-child \.combo-month-label/);
 assert.match(p1,/\.combo-month:first-child \.combo-month-label/);
 assert.match(p1,/\.inspector-arrow\{\s*width:44px/);
 assert.doesNotMatch(p1,/\.workspace\s*\{|\.analysis\s*\{|\.metric\s*\{|\.dock-panel\s*\{/);
});

test("Jalon 1/5 — overview visual finish and complete data alternatives",()=>{
 const finish=readFileSync(new URL("../overview-finish.css",import.meta.url),"utf8");
 assert.match(html,/overview-finish\.css\?v=finish-20261019-1/);
 assert.match(html,/app\.js\?v=customers-20261019-5/);
 assert.match(js,/function accessibleDataTable\(label, columns, rows\)/);
 assert.match(js,/items\.map\(entry=>\[strMonth\(entry\.month,true\),amount\(entry\.salesBrl,true\),n\(entry\.orders\)\]\)/);
 assert.match(js,/categories\.map\(item=>\[labelCategory\(item\.label\),amount\(item\.salesBrl,true\),percent\(observedShare/);
 assert.match(js,/accessibleDataTable\("Satisfaction Olist des commandes notées/);
 assert.match(js,/\["Avis négatifs \(notes ≤ 2\)",percent\(data\.totals\.negativeRate\)\]/);
 assert.match(finish,/\.story-panel\[data-mode="overview"\] \.story-inner/);
 assert.match(finish,/#dock-states \.brazil-map\{max-height:clamp\(175px,24vh,236px\)\}/);
 assert.match(finish,/#dock-quality \.score-ring\{width:clamp\(112px,9vw,144px\)/);
 assert.match(finish,/@media \(max-width:480px\)/);
 assert.doesNotMatch(finish,/\.workspace\s*\{|\.metric\s*\{|\.analysis\s*\{|\.combo-column\s*\{/);
});

test("Jalon 2/5 — sales comparisons are keyboard accessible and truthful",()=>{
 const sales=readFileSync(new URL("../sales-finish.css",import.meta.url),"utf8");
 assert.match(html,/sales-finish\.css\?v=sales-20261019-2/);
 assert.match(html,/app\.js\?v=customers-20261019-5/);
 assert.match(js,/function selectSalesMonth\(month, focus=false\)/);
 assert.match(js,/button\.dataset\.month=String\(pair\.month\)/);
 assert.match(js,/button\.tabIndex=pair\.month===chosen\.month\?0:-1/);
 assert.match(js,/selectSalesMonth\(pair\.month,true\)/);
 assert.match(js,/event\.key==="End"\?8/);
 assert.match(js,/pairs\.map\(pair=>\[shortMonth\[pair\.month-1\],amount\(pair\.previous\.salesBrl,true\),amount\(pair\.current\.salesBrl,true\),n\(pair\.previous\.orders\),n\(pair\.current\.orders\)\]\)/);
 assert.match(js,/change:month=>selectSalesMonth\(month\),restoreFocus:true/);
 assert.match(js,/button\.dataset\.measure=item\.key/);
 assert.match(sales,/\.year-plot\{min-width:416px;position:relative\}/);
 assert.match(js,/requestAnimationFrame\(\(\)=>\{/);
 assert.match(js,/const observer=new ResizeObserver/);
 assert.match(js,/yearScroll\.scrollLeft=Math\.max\(0,active\.offsetLeft\+active\.offsetWidth\/2-yearScroll\.clientWidth\/2\)/);
 assert.match(sales,/\.year-pair:focus-visible/);
 assert.doesNotMatch(sales,/\.workspace\s*\{|\.metric\s*\{|\.combo-column\s*\{/);
});

test("Jalon 2/5 audit — state rankings fit compact desktop without hiding metrics",()=>{
 const audit=readFileSync(new URL("../sales-audit.css",import.meta.url),"utf8");
 assert.match(html,/sales-audit\.css\?v=sales-audit-20261019-a/);
 assert.match(audit,/\.workspace\{grid-template-rows:82px minmax\(0,1fr\) 210px\}/);
 assert.match(audit,/#dock-states \.dock-state-row--other\{[\s\S]*?min-height:22px/);
 assert.match(audit,/#dock-states \.state-rank-metrics small\{font-size:9px;line-height:1\.15\}/);
 assert.doesNotMatch(audit,/\.dock-state-row[^\n]*\{display:none/);
 assert.match(audit,/\.story-panel\[data-mode="sales"\] \.comparison-note/);
 assert.match(js,/accessibleDataTable\("Comparaison Olist à mois identique/);
 assert.match(js,/plot\.setAttribute\("role","group"\)/);
 assert.ok(js.includes('button.setAttribute("aria-label",`${shortMonth[pair.month-1]}'));
});

test("Jalon 3/5 — regional ranking focus, visible selection and map semantics",()=>{
 const delivery=readFileSync(new URL("../delivery-finish.css",import.meta.url),"utf8");
 assert.match(html,/delivery-finish\.css\?v=delivery-20261019-3/);
 assert.match(js,/function selectDeliveryState\(code, focusRank=false\)/);
 assert.match(js,/row\.dataset\.itemCode=item\.code/);
 assert.match(js,/row\.tabIndex=item\.code===selectedId\?0:-1/);
 assert.match(js,/\["ArrowUp","ArrowDown","Home","End"\]/);
 assert.match(js,/onSelect\(items\[target\]\.code,true\)/);
 assert.match(js,/\(code,focusRank\)=>selectDeliveryState\(code,focusRank\)/);
 assert.match(js,/scrollList\.scrollTop\+=itemBounds\.top-listBounds\.top\+itemBounds\.height\/2-listBounds\.height\/2/);
 assert.match(js,/change:code=>selectDeliveryState\(code\),restoreFocus:true/);
 assert.match(js,/const focusedOnMap=document\.activeElement\?\.classList\?\.contains\("brazil-map"\)/);
 assert.match(delivery,/\.delivery-rankings \.rank-row\{\s*min-height:44px/);
 assert.match(delivery,/\.delivery-rankings-caption/);
 assert.match(delivery,/\.delivery-map-explainer/);
 assert.doesNotMatch(delivery,/\.workspace\s*\{|\.metric\s*\{|\.dock-panel\s*\{/);
});

test("Jalon 3/5 — resized regional ranking retains the chosen state in view",()=>{
 assert.match(js,/let deliveryRankObserver = null/);
 assert.match(js,/const centerSelected=\(\)=>\{/);
 assert.match(js,/deliveryRankObserver=new ResizeObserver\(centerSelected\)/);
 assert.match(js,/deliveryRankObserver\.observe\(scrollList\)/);
 assert.match(js,/deliveryRankObserver\?\.disconnect\(\)/);
 assert.match(js,/scrollList\.scrollTop\+=itemBounds\.top-listBounds\.top\+itemBounds\.height\/2-listBounds\.height\/2/);
});
