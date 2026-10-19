import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const data=JSON.parse(readFileSync(new URL("../data/public.json",import.meta.url),"utf8"));

function contrast(hexA,hexB){
  const lum=hex=>{
    const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
      .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
    return 0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
  };
  const a=lum(hexA),b=lum(hexB);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}

test("Accessibilité — étiquettes des mois contrastées sur fond opaque",()=>{
  const base=css.match(/\.combo-month-label\{color:(#[0-9a-f]{6});background:(#[0-9a-f]{6});padding:1px 2px/);
  const selected=css.match(/\.combo-month\[aria-pressed="true"\] \.combo-month-label\{color:(#[0-9a-f]{3,6});background:(#[0-9a-f]{6})\}/);
  assert.ok(base,"Fond opaque attendu pour les mois");
  assert.ok(selected,"Fond opaque attendu pour le mois sélectionné");
  assert.ok(contrast(base[1],base[2])>=4.5);
  assert.ok(contrast(selected[1]==="#fff"?"#ffffff":selected[1],selected[2])>=4.5);
});

test("Accessibilité — inspecteur et commandes ont des rôles ARIA valides",()=>{
  assert.match(html,/<section class="story-panel" aria-label="Inspecteur contextuel" aria-live="polite">/);
  assert.doesNotMatch(html,/<aside class="story-panel"/);
  assert.match(html,/id="story-navigation" class="story-navigation" role="group" aria-label="Changer la sélection"/);
  assert.match(html,/id="story-comparisons" class="story-comparisons" role="group" aria-label="Comparaisons vérifiées"/);
  assert.match(html,/<span class="period-chip"><span aria-hidden="true">◷<\/span>/);
  assert.match(html,/<dialog id="method-dialog"[^>]*aria-labelledby="method-title"/);
  assert.match(html,/<div class="method-facts" role="group" aria-label="Chiffres de référence historiques">/);
});

test("Accessibilité — carte : navigation clavier et alternative tabulaire sans attribut ARIA invalide sur les chemins",()=>{
  assert.match(js,/svg\.setAttribute\("role","group"\)/);
  assert.match(js,/svg\.setAttribute\("aria-labelledby",mapTitle\.id\)/);
  assert.match(js,/svg\.setAttribute\("aria-describedby",mapDesc\.id\)/);
  assert.match(js,/svg\.setAttribute\("tabindex","0"\)/);
  assert.match(js,/svg\.addEventListener\("keydown",event=>/);
  assert.match(js,/const table=node\("table","sr-only"\)/);
  assert.match(js,/table\.setAttribute\("aria-label","Données Olist des 27 États du Brésil"\)/);
  assert.doesNotMatch(js,/path\.setAttribute\("aria-label"/);
  assert.match(js,/path\.removeAttribute\("aria-label"\)/);
  assert.match(js,/path\.addEventListener\("click",\(\)=>openDeliveryState\(code\)\)/);
});

test("Accessibilité — les KPI 3 et 4 restent lisibles sur la Terre lumineuse",()=>{
  assert.match(css,/\.metric:nth-child\(n\+3\) \.metric-label,\s*\.metric:nth-child\(n\+3\) \.metric-note\{[\s\S]*?background:rgba\(4,11,24,\.94\)/);
  // Conservative case: white pixels from the globe, with the 94%-opaque caption background.
  const bg=[4,11,24].map(v=>Math.round(v*0.94+255*0.06));
  const hex="#"+bg.map(v=>v.toString(16).padStart(2,"0")).join("");
  assert.ok(contrast("#91aed5",hex)>=4.5);
  assert.ok(contrast("#94b0d6",hex)>=4.5);
});

test("À propos — géométrie équilibrée, défilement discret et mise en page mobile",()=>{
  assert.match(css,/\.method-dialog \{ --method-edge:clamp\(16px,4vh,40px\)/);
  assert.match(css,/width:min\(640px,calc\(100vw - var\(--method-side\) - var\(--method-side\)\)\)/);
  assert.match(css,/max-height:calc\(100dvh - var\(--method-edge\) - var\(--method-edge\)\)/);
  assert.match(css,/scrollbar-width:thin; scrollbar-color:/);
  assert.match(css,/\.method-dialog::-webkit-scrollbar-thumb/);
  assert.match(css,/--method-edge:14px;--method-side:14px/);
  assert.match(html,/<dialog id="method-dialog"[^>]*aria-labelledby="method-title"[^>]*aria-describedby="method-intro"/);
  assert.match(html,/<button id="method-close"[^>]*aria-label="Fermer À propos \/ Données"/);
});

test("À propos — enseignement chiffré exact et non causal",()=>{
  const onTime=data.satisfaction.find(x=>x.code==="on_time");
  const late=data.satisfaction.find(x=>x.code==="late");
  assert.equal(onTime.negativeRate,9.2);
  assert.equal(late.negativeRate,54.05);
  assert.match(html,/Ce que montrent les données/);
  assert.match(html,/9,20&nbsp;%/);
  assert.match(html,/54,05&nbsp;%/);
  assert.match(html,/ne démontre pas de causalité/);
});
