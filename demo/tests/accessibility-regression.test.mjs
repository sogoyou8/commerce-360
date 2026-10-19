import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../app.js",import.meta.url),"utf8");

test("Accessibilité — inspecteur et commandes ont des rôles ARIA valides",()=>{
  assert.match(html,/<section class="story-panel" aria-label="Inspecteur contextuel" aria-live="polite">/);
  assert.doesNotMatch(html,/<aside class="story-panel"/);
  assert.match(html,/id="story-navigation" class="story-navigation" role="group" aria-label="Changer la sélection"/);
  assert.match(html,/id="story-comparisons" class="story-comparisons" role="group" aria-label="Comparaisons vérifiées"/);
  assert.match(html,/<span class="period-chip"><span aria-hidden="true">◷<\/span>/);
  assert.match(html,/<dialog id="method-dialog"[^>]*aria-labelledby="method-title"/);
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
