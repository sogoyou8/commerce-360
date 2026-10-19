import { validatePublicData, observedShare, compareSamePeriod } from "./data-contract.mjs";

const $ = (id) => document.getElementById(id);
const formatter = new Intl.NumberFormat("fr-FR");
const decimal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 2 });
const shortMonth = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const pages = ["overview", "sales", "delivery", "quality", "customers"];
const categoryLabels = {
  health_beauty: "Santé & beauté", watches_gifts: "Montres & cadeaux",
  bed_bath_table: "Maison & literie", sports_leisure: "Sports & loisirs",
  computers_accessories: "Informatique", furniture_decor: "Meubles & décoration",
  housewares: "Articles ménagers", cool_stuff: "Accessoires & gadgets",
  auto: "Automobile", garden_tools: "Jardinage", toys: "Jouets", baby: "Puériculture"
};
function labelCategory(code) { return categoryLabels[code] || code.replaceAll("_", " "); }
let brazilMapTemplate = null;
let brazilMapLoading = null;
let brazilMapObserver = null;
let brazilMapRenderId = 0;
const chapters = {
  overview: { n: "01", category: "VUE D'ENSEMBLE", kicker: "20 MOIS · 2017–2018", title: "Explorer le commerce <em>brésilien.</em>", desc: "Ventes d'articles et commandes livrées · étude indépendante sur neuf sources Olist." },
  sales: { n: "02", category: "VENTES", kicker: "VENTES D'ARTICLES · HORS FRET", title: "Ventes et <em>catégories.</em>", desc: "Comparer janvier–août 2017 et 2018, puis explorer les catégories réellement documentées." },
  delivery: { n: "03", category: "LIVRAISONS", kicker: "ÉTATS DES ACHETEURS", title: "Délais et <em>retards.</em>", desc: "Comparer les États documentés, en distinguant commandes livrées et livraisons datées." },
  quality: { n: "04", category: "QUALITÉ", kicker: "AVIS · PONCTUALITÉ", title: "Notes et <em>satisfaction.</em>", desc: "Observer l'association entre retard et avis, sans en déduire de causalité." },
  customers: { n: "05", category: "CLIENTS", kicker: "SEPT SEGMENTS RFM · 2018", title: "Profils <em>observés.</em>", desc: "Récence, fréquence et montants historiques ; aucune prédiction de fidélité actuelle." },
};

let data;
const state = {
  view: "overview",
  overviewMonth: "2018-08",
  salesMeasure: "salesBrl",
  salesMonth: 8,
  salesDetail: "categories",
  selectedCategory: null,
  deliveryMeasure: "rate",
  selectedState: "CE",
  qualityMeasure: "negativeRate",
  selectedQuality: "late",
  customersMeasure: "customers",
  customersView: "segments",
  selectedCohort: "2017-01",
  selectedSegment: "single_less_recent",
};

function n(v) { return formatter.format(v); }
function amount(v, cents = false) { return `${cents ? decimal.format(v) : n(Math.round(v))} BRL`; }
function smallAmount(v) { return `${compact.format(v)} BRL`; }
function percent(v, digits = 2) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v) + " %";
}
function strMonth(value, full = false) {
  const [year, month] = value.split("-").map(Number);
  return full ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))) : `${shortMonth[month-1]} ${year}`;
}

function node(tag, className = "", value) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (value !== undefined) result.textContent = String(value);
  return result;
}
function append(parent, ...children) { parent.append(...children); return parent; }
function renderText(id, value) { $(id).textContent = value; }
function focusView(key) {
  state.view = key;
  for (const item of document.querySelectorAll(".nav-items [data-view]")) {
    if (item.dataset.view === key) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  const info = chapters[key];
  renderText("chapter-number", `${info.n} / 05`);
  renderText("chapter-category", info.category);
  renderText("story-count", `${info.n} / 05`);
  renderText("page-description", info.desc);
  renderText("intro-eyebrow", `OLIST  ●  ${info.kicker}`);
  // Static controlled headline snippets; never accept HTML from data files.
  $("page-title").replaceChildren();
  const [first, rest] = info.title.split("<em>");
  const lead = node("span", "", first);
  const highlight = node("em", "", rest.replace("</em>", ""));
  append($("page-title"), lead, highlight);
  document.title = `${info.category} — Commerce 360`;
}

function setScope(scope, coverage) {
  renderText("scope-label", scope);
  renderText("coverage-label", coverage);
}

function setMetrics(items) {
  $("metrics").replaceChildren(...items.map((item, i) => {
    const box = node("div", "metric");
    const label = node("span", "metric-label", item.label);
    const val = node("strong", "metric-value", item.value);
    if (i===0) val.dataset.variant = "accent";
    const note = node("span", "metric-note", item.note);
    return append(box, label, val, note);
  }));
}

function setViz(eyebrow, title, caption, note) {
  renderText("viz-eyebrow", eyebrow);
  renderText("viz-title", title);
  renderText("viz-caption", caption);
  renderText("viz-note", note);
}

function setOptions(options, selected, onSelect) {
  const wrap = $("view-options");
  wrap.hidden = options.length === 0;
  wrap.replaceChildren(...options.map((item) => {
    const button = node("button", "", item.title);
    button.type = "button";
    button.setAttribute("aria-pressed", String(selected===item.key));
    button.addEventListener("click", () => onSelect(item.key));
    return button;
  }));
  wrap.setAttribute("aria-label", "Choisir une mesure du graphique");
}

function setStory({ kicker, title, description, label, value, sub, caveat }) {
  renderText("story-kicker", kicker);
  renderText("story-title", title);
  renderText("story-description", description);
  renderText("story-stat-label", label);
  renderText("story-stat-value", value);
  renderText("story-stat-sub", sub);
  renderText("story-caveat", caveat);
}

function setLower(label, heading, items) {
  $("lower-content").classList.remove("lower-content--wide");
  renderText("lower-kicker", label);
  renderText("lower-heading", heading);
  $("lower-content").replaceChildren(...items.map(({label, value, description})=>{
    const section = node("article", "lower-item");
    return append(section, node("span", "eyebrow", label), node("strong", "", value), node("p", "", description));
  }));
}

function heading(value, subtitle) {
  const el = node("div", "chart-lead");
  append(el, node("strong", "", value), node("small", "", subtitle));
  return el;
}


function setSelectionNavigation(items, selectedId, getId, onSelect) {
  const nav = $("story-navigation");
  const index = items.findIndex(item => getId(item) === selectedId);
  nav.replaceChildren();
  if (index < 0 || items.length < 2) return;
  for (const [direction, symbol, name] of [[-1,"‹","Précédent"],[1,"›","Suivant"]]) {
    const btn = node("button","inspector-arrow",symbol);
    btn.type = "button";
    btn.disabled = index+direction<0 || index+direction>=items.length;
    btn.setAttribute("aria-label",name+" : "+(items[index+direction]?getId(items[index+direction]):""));
    btn.addEventListener("click",()=>onSelect(getId(items[index+direction])));
    nav.append(btn);
  }
}
function renderComparisonRows(items) {
  $("story-comparisons").replaceChildren(...items.filter(x=>x.value!==null).map(({label,value,note,kind})=>{
    const row=node("div","comparison-row"+(kind?" comparison-row--"+kind:""));
    const valueNode=node("strong","comparison-value",value);
    if(kind==="delta")valueNode.dataset.trend=value.trim().startsWith("+")?"up":value.trim().startsWith("-")?"down":"even";
    append(row,node("span","comparison-label",label),valueNode);
    if(note) row.append(node("small","comparison-note",note));
    return row;
  }));
}
function changePercent(now, before) {
  if (!Number.isFinite(now) || !Number.isFinite(before) || before<=0) return null;
  const value=100*(now/before-1);
  return (value>0?"+":"")+percent(value);
}
// Round axes upward to legible domains without altering the underlying observations.
function niceAxisCeil(max) {
  if (!(max > 0)) return 1;
  const magnitude=10**Math.floor(Math.log10(max));
  return [1,1.25,1.5,2,2.5,4,5,8,10].find(x=>x*magnitude>=max-1e-9)*magnitude;
}
function briefAxisNumber(v) {
  if (v===0) return "0";
  return new Intl.NumberFormat("fr-FR",{notation:"compact",maximumFractionDigits:2}).format(v);
}
function selectOverviewMonth(month, focus = false) {
  state.overviewMonth = month;
  render();
  if (focus) {
    const button = [...document.querySelectorAll(".combo-month")].find(x => x.dataset.month === month);
    if (button) {
      button.focus({ preventScroll: true });
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }
}
function renderMonthBars() {
  const items=data.monthly;
  const chosen=items.find(x=>x.month===state.overviewMonth)||items.at(-1);
  const index=items.indexOf(chosen);
  const maxSales=Math.max(...items.map(x=>x.salesBrl));
  const maxOrders=Math.max(...items.map(x=>x.orders));
  const salesCeil=niceAxisCeil(maxSales);
  const ordersCeil=niceAxisCeil(maxOrders);
  const root=$("viz-container");
  const shell=node("div","combo-graph"),axisLeft=node("div","combo-axis combo-axis-left");
  const axisRight=node("div","combo-axis combo-axis-right"),scroll=node("div","combo-scroll");
  const plot=node("div","combo-plot"),bars=node("div","combo-bars");
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("class","combo-line");
  svg.setAttribute("viewBox","0 0 1000 300");
  svg.setAttribute("preserveAspectRatio","none");
  svg.setAttribute("aria-hidden","true");
  const xy=items.map((entry,i)=>[((i+.5)/items.length)*1000,286-(entry.orders/ordersCeil)*255]);
  const rule=document.createElementNS("http://www.w3.org/2000/svg","line");
  for(const [key,value] of Object.entries({
    x1:xy[index][0],x2:xy[index][0],y1:16,y2:286,
    stroke:"#9ac5ff","stroke-width":"1.5","stroke-dasharray":"4 5","vector-effect":"non-scaling-stroke"
  }))rule.setAttribute(key,String(value));
  rule.setAttribute("class","combo-selection-rule");
  svg.append(rule);
  const path=document.createElementNS("http://www.w3.org/2000/svg","polyline");
  path.setAttribute("points",xy.map(p=>p.join(",")).join(" "));
  path.setAttribute("fill","none");
  path.setAttribute("stroke","#bad4ff");
  path.setAttribute("stroke-width","1.9");
  path.setAttribute("stroke-linejoin","round");
  path.setAttribute("vector-effect","non-scaling-stroke");
  svg.append(path);
  items.forEach((entry,i)=>{
    const active=entry.month===chosen.month;
    const button=node("button","combo-month");
    button.type="button";
    button.dataset.month=entry.month;
    button.tabIndex=active?0:-1;
    button.setAttribute("aria-pressed",String(active));
    button.setAttribute("aria-label",strMonth(entry.month,true)+" : "+amount(entry.salesBrl,true)+", "+n(entry.orders)+" commandes");
    button.title=button.getAttribute("aria-label");
    button.style.setProperty("--h",Math.max(1,100*entry.salesBrl/salesCeil)+"%");
    button.addEventListener("click",()=>selectOverviewMonth(entry.month));
    button.addEventListener("keydown",event=>{
      if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
      event.preventDefault();
      const next=event.key==="Home"?0:event.key==="End"?items.length-1:
        Math.max(0,Math.min(items.length-1,i+(event.key==="ArrowRight"?1:-1)));
      selectOverviewMonth(items[next].month,true);
    });
    append(button,node("span","combo-value",smallAmount(entry.salesBrl)),
      node("span","combo-column"),
      node("span","combo-month-label",i%2===0||i===items.length-1?strMonth(entry.month):""));
    bars.append(button);
    const circle=document.createElementNS("http://www.w3.org/2000/svg","circle");
    circle.setAttribute("cx",String(xy[i][0]));
    circle.setAttribute("cy",String(xy[i][1]));
    circle.setAttribute("r",active?"5.2":"2.6");
    circle.setAttribute("fill",active?"#ffffff":"#d1e1ff");
    circle.setAttribute("stroke",active?"#367de2":"#17335c");
    circle.setAttribute("stroke-width",active?"3":"2");
    circle.setAttribute("vector-effect","non-scaling-stroke");
    svg.append(circle);
  });
  for(let tick=4;tick>=0;tick--){
    axisLeft.append(node("span","",briefAxisNumber(salesCeil*tick/4)));
    axisRight.append(node("span","",n(Math.round(ordersCeil*tick/4))));
  }
  append(plot,bars,svg);scroll.append(plot);append(shell,axisLeft,scroll,axisRight);
  const legend=append(node("div","combo-legend"),
    append(node("span",""),node("i","legend-sales"),node("span","","Ventes (BRL) · colonnes")),
    append(node("span",""),node("i","legend-orders"),node("span","","Commandes · courbe")));
  root.replaceChildren(legend,shell);
  const previous=index>0?items[index-1]:null;
  const previousYear=items.find(x=>x.month===String(Number(chosen.month.slice(0,4))-1)+chosen.month.slice(4));
  const compare=[
    {label:"Commandes livrées",value:n(chosen.orders),kind:"support"},
    {label:"Panier moyen",value:amount(chosen.salesBrl/chosen.orders,true),kind:"support"},
  ];
  if(previous)compare.push({label:"vs "+strMonth(previous.month,true),value:changePercent(chosen.salesBrl,previous.salesBrl),kind:"delta"});
  if(previousYear)compare.push({label:"vs "+strMonth(previousYear.month,true),value:changePercent(chosen.salesBrl,previousYear.salesBrl),kind:"delta"});
  setStory({
    kicker:"MOIS SÉLECTIONNÉ",title:strMonth(chosen.month,true),
    description:"Commandes livrées et ventes d'articles du mois sélectionné ; les indicateurs nationaux restent indépendants.",
    label:"VENTES DU MOIS",
    value:smallAmount(chosen.salesBrl),
    sub:"Prix des articles hors fret",
    caveat:"Les taux de retard et les avis nationaux ne sont pas filtrés par mois.",
  });
  renderComparisonRows(compare);
  setSelectionNavigation(items,chosen.month,x=>x.month,month=>selectOverviewMonth(month));
}

function renderOverview() {
  const t=data.totals;
  setScope("PÉRIMÈTRE — COMMANDES LIVRÉES / ACHATS 2017–2018", "20 MOIS · AGRÉGATS VÉRIFIÉS");
  setMetrics([
    {label:"Ventes d’articles",value:smallAmount(t.salesBrl),note:"BRL · hors frais de livraison"},
    {label:"Commandes livrées",value:n(t.orders),note:"Une ligne par commande"},
    {label:"Panier moyen",value:amount(t.averageBasket,true),note:"Articles / commandes livrées"},
    {label:"Retards de livraison",value:percent(t.lateRate),note:`${n(t.late)} sur ${n(t.dated)} datées`},
  ]);
  setViz("01 · ÉVOLUTION HISTORIQUE","Évolution des ventes et des commandes","Colonnes : BRL hors fret · courbe : commandes livrées.", "Chaque mois est sélectionnable. Les KPI nationaux ne sont pas filtrés par cette sélection.");
  setOptions([],null,()=>{});
  renderMonthBars();
  const yoy=compareSamePeriod(data.monthly);
  setLower("REPÈRES DU PROJET","Trois signaux pour commencer.",[
    {label:"JAN–AOÛT 2017 VS 2018",value:`+${percent(yoy.salesGrowth)}`,description:"Variation arithmétique à période comparable. Pas une conclusion causale."},
    {label:"DÉLAI MOYEN NETTOYÉ",value:`${decimal.format(t.deliveryDays)} jours`,description:"Délai achat → livraison, hors anomalies définies dans la méthode E3."},
    {label:"SATISFACTION",value:`${decimal.format(t.averageScore)} / 5`,description:"Moyenne des avis retenus sur les commandes livrées notées."}
  ]);
}

function yearPairs() {
  const result=[];
  for(let month=1;month<=8;month++){
    const part=String(month).padStart(2,"0");
    result.push({
      month,
      previous:data.monthly.find(x=>x.month===`2017-${part}`),
      current:data.monthly.find(x=>x.month===`2018-${part}`)
    });
  }
  return result;
}

function renderYearBars() {
  const pairs=yearPairs(), measure=state.salesMeasure;
  const max=Math.max(...pairs.flatMap(x=>[x.previous[measure],x.current[measure]]));
  const chosen=pairs.find(x=>x.month===state.salesMonth)||pairs[7];
  const plot=node("div","year-plot");
  const legend=append(node("div","year-legend"),
    append(node("span"),node("i"),node("span","", "2017")),
    append(node("span"),node("i","this-year"),node("span","", "2018"))
  );
  const yearLabel=measure==="salesBrl"?"BRL":"commandes";
  for(const pair of pairs){
    const button=node("button","year-pair");button.type="button";
    button.setAttribute("aria-pressed",String(pair.month===chosen.month));
    button.setAttribute("aria-label",`${shortMonth[pair.month-1]} : 2017 ${measure==="salesBrl"?amount(pair.previous.salesBrl):n(pair.previous.orders)}, 2018 ${measure==="salesBrl"?amount(pair.current.salesBrl):n(pair.current.orders)}`);
    button.title=button.getAttribute("aria-label");
    const towers=node("div","year-towers");
    for(const val of [pair.previous[measure],pair.current[measure]]) {
      const bar=node("i");bar.style.setProperty("--h",Math.max(1,100*val/max)+"%");towers.append(bar);
    }
    append(button,towers,node("span","year-month-label",shortMonth[pair.month-1]));
    button.addEventListener("click",()=>{state.salesMonth=pair.month;render();});
    plot.append(button);
  }
  const year2017=pairs.reduce((sum,p)=>sum+p.previous[measure],0);
  const year2018=pairs.reduce((sum,p)=>sum+p.current[measure],0);
  const growth=changePercent(year2018,year2017);
  const yearlyLabel=measure==="salesBrl"?"Ventes d'articles":"Commandes livrées";
  const yearlyValue=v=>measure==="salesBrl"?smallAmount(v):n(v);
  $("viz-container").replaceChildren(
    heading(growth,`${yearlyLabel} · jan–août 2017 vs jan–août 2018`),
    append(node("div","year-chart"),legend,plot,append(node("div","year-caption"),node("span","",`2017 · ${yearlyValue(year2017)}`),node("span","",`2018 · ${yearlyValue(year2018)}`)))
  );
  const selectedDiff=(chosen.current[measure]/chosen.previous[measure]-1)*100;
  setStory({
    kicker:"COMPARAISON À MOIS ÉQUIVALENT",
    title:`${shortMonth[chosen.month-1]}. 2017 face à 2018.`,
    description:`Pour ${shortMonth[chosen.month-1]}, la mesure « ${yearLabel} » passe de ${measure==="salesBrl"?amount(chosen.previous.salesBrl):n(chosen.previous.orders)} à ${measure==="salesBrl"?amount(chosen.current.salesBrl):n(chosen.current.orders)}. Cette comparaison ne mélange pas les mois incomplets de fin 2018.`,
    label:"VARIATION OBSERVÉE",
    value:`${selectedDiff>=0?"+":""}${percent(selectedDiff)}`,
    sub:`Janvier–août : ${growth} · ${yearlyLabel.toLowerCase()}`,
    caveat:"La croissance observée ne démontre pas les causes commerciales d'une variation.",
  });
}

function renderSalesBreakdown() {
  renderText("lower-kicker","RÉPARTITION COMMERCIALE");
  renderText("lower-heading","Les catégories et les territoires vendeurs.");
  const zone=$("lower-content");
  zone.classList.add("lower-content--wide");
  const hasSellerStates=data.sellerStates.length>0;
  if(!hasSellerStates)state.salesDetail="categories";
  const selected=state.salesDetail;
  const controls=node("div","breakdown-tabs");
  for(const item of [{key:"categories",label:"Catégories"},{key:"sellerStates",label:"États vendeurs"}]){
    const button=node("button","",item.label);
    button.type="button";
    button.disabled=item.key==="sellerStates"&&!hasSellerStates;
    button.title=button.disabled?"Données agrégées vendeurs à importer depuis E4":"Explorer ce classement";
    button.setAttribute("aria-pressed",String(selected===item.key));
    button.addEventListener("click",()=>{state.salesDetail=item.key;render();});
    controls.append(button);
  }
  const rows=(selected==="categories"?data.categories.map(x=>({name:labelCategory(x.label),code:x.label,sales:x.salesBrl})):data.sellerStates.map(x=>({name:x.code,sales:x.salesBrl}))).sort((a,b)=>b.sales-a.sales);
  const list=node("div","breakdown-list");
  const max=Math.max(1,...rows.map(x=>x.sales));
  for(const [index,x] of rows.entries()){
    const line=node(selected==="categories"?"button":"div","breakdown-row");
    if(selected==="categories"){
      line.type="button";
      line.setAttribute("aria-pressed",String(state.selectedCategory===x.code));
      line.addEventListener("click",()=>{state.selectedCategory=x.code;renderSalesBreakdown();});
    }
    const title=append(node("span",""),node("small","",String(index+1).padStart(2,"0")),node("span","",x.name));
    const track=append(node("span","rank-track"),node("i"));
    track.firstChild.style.setProperty("--w",100*x.sales/max+"%");
    append(line,title,track,node("strong","",smallAmount(x.sales)));
    list.append(line);
  }
  const info=selected==="categories"?
    data.meta.coverage.categories+" · Catégories classées par ventes d’articles, pas par nombre de commandes.":
    data.meta.coverage.sellerStates+" · États vendeurs ; pas les États des acheteurs.";
  const head=append(node("div","breakdown-head"),node("p","",info),controls);
  zone.replaceChildren(head,list);
}

function renderSales() {
  const t=data.totals;
  const yoy=compareSamePeriod(data.monthly);
  setScope("PÉRIMÈTRE — VENTES D'ARTICLES HORS FRET", data.meta.coverage.categories.toUpperCase());
  setMetrics([
    {label:"Ventes d’articles",value:smallAmount(t.salesBrl),note:"20 mois · commandes livrées"},
    {label:"Jan–août 2017",value:smallAmount(yoy.sales2017),note:"Période comparable"},
    {label:"Jan–août 2018",value:smallAmount(yoy.sales2018),note:"Période comparable"},
    {label:"Variation observée",value:`+${percent(yoy.salesGrowth)}`,note:"Jan–août à année différente"},
  ]);
  setViz("02 · COMPARAISON TEMPORELLE","Deux années. Même fenêtre.","Comparer mois à mois uniquement janvier à août, pour les deux années.","Chaque groupe de deux barres représente le même mois en 2017 puis en 2018.");
  setOptions([{key:"salesBrl",title:"Ventes BRL"},{key:"orders",title:"Commandes"}],state.salesMeasure,key=>{state.salesMeasure=key;render();});
  renderYearBars();
  renderSalesBreakdown();
}

function renderRankRows(items, getLabel, getValue, selectedId, onSelect, formatterFn, getSubtitle) {
  const max=Math.max(1,...items.map(getValue));
  const wrap=node("div","rank-chart");
  for(const item of items) {
    const row=node("button","rank-row");
    row.type="button";
    row.setAttribute("aria-pressed",String(item.code===selectedId));
    if(state.view==="customers")row.classList.add("rank-row--customer");
    const name=append(node("span","rank-name"),node("span","",getLabel(item)));
    if(getSubtitle)name.append(node("small","",getSubtitle(item)));
    const track=append(node("span","rank-track"),node("i"));
    track.firstChild.style.setProperty("--w",Math.max(1,(getValue(item)/max*100))+"%");
    append(row,name,track,node("strong","rank-value",formatterFn(getValue(item))));
    row.setAttribute("aria-label",`${getLabel(item)} : ${formatterFn(getValue(item))}`);
    row.addEventListener("click",()=>onSelect(item.code));
    wrap.append(row);
  }
  return wrap;
}

function renderDelivery() {
  const t=data.totals;
  const measure=state.deliveryMeasure;
  const choices=[...data.states].sort((a,b)=>b[measure]-a[measure]);
  const stateChoice=data.states.find(s=>s.code===state.selectedState)||choices[0];
  setScope("PÉRIMÈTRE — ÉTAT DE L'ACHETEUR",data.meta.coverage.states.toUpperCase());
  setMetrics([
    {label:"Livraisons en retard",value:n(t.late),note:"National · parmi les livraisons datées"},
    {label:"Taux de retard",value:percent(t.lateRate),note:`${n(t.dated)} livraisons datées`},
    {label:"Délai moyen",value:`${decimal.format(t.deliveryDays)} j`,note:"National · délai nettoyé"},
    {label:"État sélectionné",value:stateChoice.code,note:`${n(stateChoice.orders)} commandes livrées`},
  ]);
  setViz("03 · ANALYSE TERRITORIALE","Des territoires contrastés.",data.meta.coverage.states+" · taux calculés sur les livraisons datées de chaque État.","Sélectionner un État pour consulter ses effectifs et son délai ; les KPI nationaux restent nationaux.");
  setOptions([{key:"rate",title:"Retard (%)"},{key:"days",title:"Délai (jours)"}],measure,key=>{state.deliveryMeasure=key;render();});
  const mapStage=append(node("div","delivery-map-visual"),renderBrazilMap(),
    node("p","delivery-map-explainer","27 États · carte colorée par taux de retard"));
  const ranked=append(node("div","delivery-rankings"),
    node("span","delivery-rankings-caption","LES 27 ÉTATS · "+(measure==="rate"?"TAUX DE RETARD":"DÉLAI MOYEN")),
    renderRankRows(choices,s=>s.code,s=>s[measure],stateChoice.code,
      code=>{state.selectedState=code;render();},
      v=>measure==="rate"?percent(v):decimal.format(v)+" j",
      s=>n(s.orders)+" commandes livrées"));
  $("viz-container").replaceChildren(
    heading(measure==="rate"?percent(stateChoice.rate):decimal.format(stateChoice.days)+" jours",
      "État "+stateChoice.code+" · "+(measure==="rate"?"retards":"délai moyen nettoyé")),
    append(node("div","delivery-atlas"),mapStage,ranked),
    append(node("div","rank-legend"),node("span","","ÉTAT SÉLECTIONNABLE SUR CARTE ET CLASSEMENT"),
      node("span","","KPI NATIONAUX INCHANGÉS"))
  );
  setStory({
    kicker:"ÉTAT SÉLECTIONNÉ · "+stateChoice.code,
    title:`Le territoire ${stateChoice.code}.`,
    description:`${n(stateChoice.late)} livraisons tardives parmi ${n(stateChoice.dated)} datées (${percent(stateChoice.rate)}). Le délai moyen nettoyé atteint ${decimal.format(stateChoice.days)} jours, contre ${decimal.format(t.deliveryDays)} jours sur le périmètre national.`,
    label:"TAUX DE RETARD",
    value:percent(stateChoice.rate),
    sub:`${n(stateChoice.late)} retards · ${n(stateChoice.orders)} commandes livrées`,
    caveat:data.states.length===27?"Couverture des 27 États : attention aux petits effectifs régionaux. Le taux utilise les livraisons datées et le délai est descriptif.":`Données de ${data.meta.coverage.states.toLowerCase()} seulement. Les autres États ne sont pas assimilés à zéro.`,
  });
  setLower("RÉFÉRENCE NATIONALE","Les dénominateurs comptent.",[
    {label:"COMMANDES LIVRÉES",value:n(t.orders),description:"Population totale pour les analyses de ventes."},
    {label:"LIVRAISONS DATÉES",value:n(t.dated),description:"Dénominateur du taux de retard. Huit livraisons ne sont pas datées."},
    {label:"PART DU RETARD",value:percent(t.lateRate),description:"Retard strictement après la date estimée ; pas un défaut imputé à un acteur."}
  ]);
}

function renderQuality() {
  const t=data.totals,measure=state.qualityMeasure;
  const groups=data.satisfaction.filter(x=>x.code!=="undated");
  const selected=groups.find(x=>x.code===state.selectedQuality)||groups[0];
  setScope("PÉRIMÈTRE — COMMANDES LIVRÉES NOTÉES", "DEUX GROUPES · PONCTUALITÉ");
  setMetrics([
    {label:"Note moyenne",value:`${decimal.format(t.averageScore)} / 5`,note:"National · commandes notées"},
    {label:"Avis négatifs",value:percent(t.negativeRate),note:"National · score ≤ 2"},
    {label:"En retard",value:n(data.satisfaction.find(x=>x.code==="late").orders),note:"Commandes livrées tardivement"},
    {label:"À l’heure",value:n(data.satisfaction.find(x=>x.code==="on_time").orders),note:"Commandes livrées ponctuellement"},
  ]);
  setViz("04 · SATISFACTION CLIENT","Deux expériences de livraison.","Note moyenne ou proportion d'avis ≤ 2 parmi les commandes notées.","Cliquez sur un groupe : seules ses propres mesures sont détaillées. Huit commandes non datées sont exclues du comparatif.");
  setOptions([{key:"negativeRate",title:"Avis ≤ 2"},{key:"score",title:"Note / 5"}],measure,key=>{state.qualityMeasure=key;render();});
  const chart=node("div","group-chart");
  for(const group of groups) {
    const value=group[measure], max=measure==="score"?5:100;
    const card=node("button","group-card"); card.type="button";
    card.setAttribute("aria-pressed",String(group.code===selected.code));
    card.setAttribute("aria-label",`${group.label} : ${measure==="score"?decimal.format(value)+" sur 5":percent(value)}`);
    const track=append(node("span","group-track"),node("i"));
    track.firstChild.style.setProperty("--w",100*value/max+"%");
    const gauge=node("span","group-gauge");
    gauge.style.setProperty("--gauge-pct",100*value/max+"%");
    gauge.append(append(node("span","group-gauge-core"),
      node("strong","group-gauge-value",measure==="score"?decimal.format(value)+" / 5":percent(value)),
      node("span","group-gauge-caption",measure==="score"?"NOTE MOYENNE":"AVIS ≤ 2")));
    append(card,node("small","",group.label.toUpperCase()),gauge,
      node("span","group-secondary",measure==="score"?`${percent(group.negativeRate)} d'avis ≤ 2`:`Note moyenne : ${decimal.format(group.score)} / 5`),
      track,node("em","",`${n(group.scored)} commandes notées`));
    card.addEventListener("click",()=>{state.selectedQuality=group.code;render();});
    chart.append(card);
  }
  $("viz-container").replaceChildren(heading(measure==="score"?"ÉCHELLE : 0 À 5":"ÉCHELLE : 0 À 100 %",`Groupe actif · ${selected.label}`),chart);
  setStory({
    kicker:"PONCTUALITÉ · "+selected.label.toUpperCase(),
    title:selected.code==="late"?"Quand la livraison tarde.":"Quand la livraison est ponctuelle.",
    description:`Sur ${n(selected.scored)} commandes notées, la note moyenne est de ${decimal.format(selected.score)}/5 et la part de notes inférieures ou égales à 2 est de ${percent(selected.negativeRate)}. La comparaison reflète une association, pas un effet causal établi.`,
    label:"AVIS NÉGATIFS",
    value:percent(selected.negativeRate),
    sub:`${n(selected.negative)} avis ≤ 2 sur ${n(selected.scored)} notés`,
    caveat:"La qualité est décrite parmi les commandes notées : les commandes sans avis ne sont pas comptées dans le taux.",
  });
  setLower("POINTS DE MÉTHODE","Ce que la comparaison ne dit pas.",[
    {label:"NOTES POSITIVES OU NÉGATIVES",value:"1 à 5",description:"Le taux négatif correspond uniquement aux notes 1 et 2."},
    {label:"DATES INEXPLOITABLES",value:"8",description:"Commandes livrées dont la ponctualité ne peut pas être catégorisée."},
    {label:"INTERPRÉTATION",value:"Association",description:"La ponctualité et la satisfaction sont liées dans cet historique, sans preuve de causalité."}
  ]);
}


function renderCustomerCohorts() {
  // Each cohort groups unique customers by first observed delivered purchase month.
  // Cumulative sales include later purchases through 2018-08, not only the first month.
  const t=data.totals;
  const cohorts=[...data.cohorts].sort((a,b)=>a.month.localeCompare(b.month));
  const selected=cohorts.find(c=>c.month===state.selectedCohort)||cohorts[0];
  const measure=state.customersMeasure;
  const rows=cohorts.map(c=>({...c,code:c.month}));
  setScope("PÉRIMÈTRE — PREMIER ACHAT LIVRÉ OBSERVÉ",data.meta.coverage.cohorts.toUpperCase());
  setViz("05 · COHORTES HISTORIQUES","Les premières dates d'achat observées.",
    "20 cohortes mensuelles. Clients, réacheteurs et ventes cumulées jusqu'au 31 août 2018.",
    "Les ventes d'une cohorte comprennent les achats ultérieurs de ses clients, et non uniquement ceux du mois initial.");
  $("viz-container").replaceChildren(
    heading(measure==="salesBrl"?smallAmount(selected.salesBrl):n(selected[measure]),
      strMonth(selected.month,true)+" · "+(measure==="salesBrl"?"ventes des clients":measure==="repeats"?"réacheteurs":"clients observés")),
    renderRankRows(rows,c=>strMonth(c.month),c=>c[measure],selected.month,
      month=>{state.selectedCohort=month;render();},
      v=>measure==="salesBrl"?smallAmount(v):n(v),
      c=>percent(observedShare(c.customers,t.customers))+" des clients")
  );
  setStory({
    kicker:"COHORTE · PREMIER ACHAT OBSERVÉ",
    title:strMonth(selected.month,true)+".",
    description:n(selected.customers)+" clients ont leur premier achat livré observé en "+strMonth(selected.month,true)+". Ils représentent "+percent(observedShare(selected.customers,t.customers))+" des clients ; leurs achats livrés cumulés jusqu'au 31 août 2018 représentent "+amount(selected.salesBrl,true)+".",
    label:"CLIENTS DE LA COHORTE",
    value:n(selected.customers),
    sub:n(selected.repeats)+" réacheteurs observés · "+percent(observedShare(selected.repeats,selected.customers))+" au sein de la cohorte",
    caveat:"Cohortes historiques observées sur une fenêtre fixe : les cohortes récentes ont moins de temps pour réacheter. Ces résultats ne prédisent ni fidélité actuelle ni churn.",
  });
  setLower("COHORTES · MÉTHODOLOGIE","Une population, plusieurs périodes.",[
    {label:"COHORTES",value:n(cohorts.length),description:"Mois du premier achat livré observé, sans doublon entre cohortes."},
    {label:"RÉACHETEURS OBSERVÉS",value:n(t.repeatCustomers),description:"Au moins deux commandes livrées avant la fin de la période étudiée."},
    {label:"FIN D'OBSERVATION",value:"31 AOÛT 2018",description:"Montants cumulés des clients de chaque cohorte, non limités au mois initial."}
  ]);
}

function renderCustomers() {
  const t=data.totals, measure=state.customersMeasure;
  const choices=[...data.segments].sort((a,b)=>b[measure]-a[measure]);
  const selected=data.segments.find(s=>s.code===state.selectedSegment)||choices[0];
  setScope("PÉRIMÈTRE — CUSTOMER_UNIQUE_ID · ACHATS LIVRÉS","7 SEGMENTS EXCLUSIFS · CUTOFF 01/09/2018");
  setMetrics([
    {label:"Clients observés",value:n(t.customers),note:"Identifiants uniques de client"},
    {label:"Réacheteurs",value:n(t.repeatCustomers),note:"≥ 2 commandes livrées observées"},
    {label:"Réachat observé",value:percent(observedShare(t.repeatCustomers,t.customers)),note:"Fenêtre historique uniquement"},
    {label:"Segments RFM",value:n(data.segments.length),note:"Catégories mutuellement exclusives"},
  ]);
  setViz("05 · SEGMENTATION RFM","Sept profils. Une même population.","Trier les profils selon le volume de clients ou la contribution en prix d'articles.","Sélectionner un segment pour voir son poids. Les ventes des segments s'additionnent, car les clients sont exclusifs.");
  const customerOptions=[{key:"customers",title:"Clients"},{key:"salesBrl",title:"Ventes BRL"},{key:"repeats",title:"Réacheteurs"}];
  if(data.cohorts.length)customerOptions.push({key:"cohorts",title:"Cohortes"});
  setOptions(customerOptions,state.customersView==="cohorts"?"cohorts":measure,key=>{
    if(key==="cohorts")state.customersView="cohorts";
    else {state.customersView="segments";state.customersMeasure=key;}
    render();
  });
  if(state.customersView==="cohorts"&&data.cohorts.length){renderCustomerCohorts();return;}
  $("viz-container").replaceChildren(
    heading(measure==="salesBrl"?smallAmount(selected.salesBrl):n(selected[measure]),`Segment sélectionné · ${selected.label}`),
    renderRankRows(choices,s=>s.label,s=>s[measure],selected.code,key=>{state.selectedSegment=key;render();},
      v=>measure==="salesBrl"?smallAmount(v):n(v),
      s=>`${percent(observedShare(s.customers,t.customers))} des clients`),
  );
  const share=observedShare(selected.salesBrl,t.salesBrl),repeatShare=observedShare(selected.repeats,selected.customers);
  setStory({
    kicker:"SEGMENT RFM SÉLECTIONNÉ",
    title:selected.label+".",
    description:`Ce segment réunit ${n(selected.customers)} clients observés et ${amount(selected.salesBrl,true)} de prix d'articles, soit ${percent(share)} des ventes du périmètre. ${n(selected.repeats)} clients y ont au moins deux achats livrés observés.`,
    label:"POIDS DES VENTES",
    value:percent(share),
    sub:`${percent(repeatShare)} de réacheteurs au sein du segment`,
    caveat:"Récence et fréquence sont mesurées à la date fixe du 1er septembre 2018, pas aujourd'hui. La catégorie d'un client n'est pas une prédiction de churn.",
  });
  setLower("POPULATION RFM","Des segments qui se réconcilient.",[
    {label:"TOTAL SEGMENTS",value:n(data.segments.reduce((t,s)=>t+s.customers,0)),description:"Chaque client apparaît dans un unique segment."},
    {label:"PART DU SEGMENT ACTIF",value:percent(observedShare(selected.customers,t.customers)),description:"Part dans les 93 104 clients ayant au moins un achat livré observé."},
    {label:"FIN D'OBSERVATION",value:"01 SEP 2018",description:"Date de référence RFM fixe : pas un état de fidélité actuel."}
  ]);
}

function dockRow(label,value,ratio,subtitle="") {
  const row=node("div","dock-row");
  const line=append(node("div","dock-row-line"),node("span","dock-item-label",label),node("strong","dock-item-value",value));
  const track=append(node("div","dock-track"),node("i"));
  track.firstChild.style.setProperty("--w",Math.max(0,Math.min(100,ratio))+"%");
  track.setAttribute("aria-hidden","true");
  row.append(line,track);
  if(subtitle)row.append(node("small","dock-row-note",subtitle));
  return row;
}
function openDeliveryState(code) {
  state.selectedState=code;
  if(location.hash==="#delivery")render();
  else location.hash="#delivery";
}
function loadBrazilMap() {
  if(brazilMapTemplate||brazilMapLoading)return;
  brazilMapLoading=fetch(new URL("./assets/br-states.svg",import.meta.url))
    .then(response=>{if(!response.ok)throw new Error("Carte SVG indisponible");return response.text();})
    .then(xml=>{
      const documentSvg=new DOMParser().parseFromString(xml,"image/svg+xml");
      if(documentSvg.querySelector("parsererror")||documentSvg.querySelectorAll("path[id]").length!==27)
        throw new Error("La carte doit comporter les 27 unités fédératives.");
      brazilMapTemplate=documentSvg.documentElement;
      if(data)render();
    })
    .catch(error=>{console.warn("Commerce 360 — carte indisponible :",error);});
}
// A 65 KB vector map is needed immediately on desktop, but sits below
// the first mobile screen: defer network work until the dock approaches view.
// IntersectionObserver has an eager fallback, preserving older browsers.
function queueBrazilMap(holder) {
  if(brazilMapTemplate||brazilMapLoading)return;
  if(!("IntersectionObserver" in window)||!window.matchMedia("(max-width:1179px)").matches) {
    loadBrazilMap();
    return;
  }
  brazilMapObserver?.disconnect();
  brazilMapObserver=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    brazilMapObserver?.disconnect();
    brazilMapObserver=null;
    loadBrazilMap();
  },{rootMargin:"400px 0px"});
  brazilMapObserver.observe(holder);
}
function renderBrazilMap(withMobilePicker=false) {
  const holder=node("div","dock-map-shell");
  if(!brazilMapTemplate){
    holder.append(node("span","map-placeholder","Carte des 27 États — chargement à l’affichage…"));
    queueBrazilMap(holder);
    return holder;
  }
  const svg=document.importNode(brazilMapTemplate,true);
  // The map is a keyboard-operable group: role="img" would hide its
  // interaction semantics. Title and description describe real Olist data.
  const svgNs="http://www.w3.org/2000/svg";
  const mapId=++brazilMapRenderId;
  const mapTitle=document.createElementNS(svgNs,"title");
  mapTitle.id="brazil-map-"+mapId+"-title";
  mapTitle.textContent="Brésil : taux de retard des livraisons par État";
  const mapDesc=document.createElementNS(svgNs,"desc");
  mapDesc.id="brazil-map-"+mapId+"-desc";
  svg.insertBefore(mapDesc,svg.firstChild);
  svg.insertBefore(mapTitle,svg.firstChild);
  svg.removeAttribute("aria-label");
  svg.setAttribute("role","group");
  svg.setAttribute("aria-labelledby",mapTitle.id);
  svg.setAttribute("aria-describedby",mapDesc.id);
  svg.setAttribute("tabindex","0");
  svg.setAttribute("class","brazil-map");
  const regionsByCode=new Map(data.states.map(item=>[item.code,item]));
  const codes=data.states.map(item=>item.code).sort();
  const maxRate=Math.max(...data.states.map(item=>item.rate));
  let activeCode=state.selectedState;
  const updateActive=()=>{
    for(const path of svg.querySelectorAll("path[id]"))
      path.classList.toggle("is-map-active",path.id.toUpperCase()===activeCode);
    const item=regionsByCode.get(activeCode);
    mapDesc.textContent="Carte interactive des 27 États du Brésil. Les nuances bleues indiquent le taux de retard des livraisons datées, pas le volume. État sélectionné : "+activeCode+", "+percent(item.rate)+" de retard parmi "+n(item.dated)+" livraisons datées. Toucher un État ou utiliser les flèches, puis Entrée, pour explorer les données.";
  };
  for(const path of svg.querySelectorAll("path[id]")){
    const code=path.id.toUpperCase();
    const item=regionsByCode.get(code);
    if(!item)continue;
    const alpha=.22+.72*(item.rate/maxRate);
    path.setAttribute("fill",`rgba(65, 145, 255, ${alpha.toFixed(3)})`);
    path.setAttribute("aria-label",code+" : "+percent(item.rate)+" de retard");
    path.dataset.uf=code;
    path.addEventListener("click",()=>openDeliveryState(code));
  }
  svg.addEventListener("keydown",event=>{
    if(event.key==="Enter"||event.key===" "){event.preventDefault();openDeliveryState(activeCode);return;}
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key))return;
    event.preventDefault();
    const i=codes.indexOf(activeCode);
    activeCode=event.key==="Home"?codes[0]:event.key==="End"?codes.at(-1):
      codes[(i+(["ArrowRight","ArrowDown"].includes(event.key)?1:-1)+codes.length)%codes.length];
    updateActive();
  });
  updateActive();
  // Tiny SVG regions cannot all be 44px touch targets. Offer all 27 states
  // in a native, labelled control on narrow viewports without resizing paths.
  if(withMobilePicker){
    const statePicker=node("label","dock-state-picker");
    const statePickerSelect=node("select","dock-state-picker-select");
    statePickerSelect.setAttribute("aria-label","Choisir un État du Brésil à explorer");
    for(const item of [...data.states].sort((a,b)=>a.code.localeCompare(b.code))){
      const option=node("option","",item.code+" — "+percent(item.rate,1)+" de retard");
      option.value=item.code;
      statePickerSelect.append(option);
    }
    statePickerSelect.value=activeCode;
    statePickerSelect.addEventListener("change",()=>openDeliveryState(statePickerSelect.value));
    append(statePicker,node("span","","Choisir un État"),statePickerSelect);
    holder.append(svg,statePicker);
  }else{
    holder.append(svg);
  }
  holder.append(node("span","map-legend","Carte : taux de retard"));
  return holder;
}
function renderDock() {
  const categories=[...data.categories].sort((a,b)=>b.salesBrl-a.salesBrl);
  const categoryMax=categories[0]?.salesBrl||1;
  renderText("dock-category-coverage",data.meta.coverage.categories+" · part des ventes nationales");
  const categoryRows=categories.slice(0,6).map(item=>{
    const row=node("button","dock-category-row");
    row.type="button";
    row.title="Explorer "+labelCategory(item.label)+" dans Ventes";
    row.setAttribute("aria-label","Explorer la catégorie "+labelCategory(item.label)+" : "+amount(item.salesBrl,true)+", "+percent(observedShare(item.salesBrl,data.totals.salesBrl),1)+" des ventes nationales");
    const label=node("span","dock-item-label",labelCategory(item.label));
    const track=append(node("span","dock-track"),node("i"));
    track.firstChild.style.setProperty("--w",100*item.salesBrl/categoryMax+"%");
    track.setAttribute("aria-hidden","true");
    const value=node("span","dock-item-value",smallAmount(item.salesBrl)+" · "+percent(observedShare(item.salesBrl,data.totals.salesBrl),1));
    append(row,label,track,value);
    row.addEventListener("click",()=>{
      state.selectedCategory=item.label;
      state.salesDetail="categories";
      if(location.hash==="#sales")render();else location.hash="#sales";
    });
    return row;
  });
  // Residual from the verified national total: includes every category outside the six shown.
  const displayedSales=categories.slice(0,6).reduce((sum,x)=>sum+x.salesBrl,0);
  const remainingSales=Math.max(0,Math.round((data.totals.salesBrl-displayedSales)*100)/100);
  const otherCategory=append(node("div","dock-category-row dock-category-row--other"),
    node("span","dock-item-label","Autres ventes"),
    node("span","dock-row-note","Hors top 6"),
    node("span","dock-item-value",smallAmount(remainingSales)+" · "+percent(observedShare(remainingSales,data.totals.salesBrl),1)));
  otherCategory.title="Complément du total national : autres catégories, y compris catégories non détaillées.";
  $("dock-categories").replaceChildren(...categoryRows,otherCategory);
  const regions=[...data.states].sort((a,b)=>b.orders-a.orders);
  renderText("dock-state-coverage",data.meta.coverage.states+" · top volumes ; carte colorée par taux de retard");
  const stateLayout=node("div","dock-state-layout");
  const stateRank=node("div","dock-state-ranks");
  const maxVolume=regions[0]?.orders||1;
  regions.slice(0,5).forEach((item,i)=>{
    const row=node("button","dock-state-row");
    row.type="button";
    row.title=item.code+" : "+n(item.late)+" retards sur "+n(item.dated)+" livraisons datées";
    row.setAttribute("aria-label","Explorer "+item.code+" : "+n(item.orders)+" commandes livrées, "+percent(item.rate,1)+" de retard parmi "+n(item.dated)+" livraisons datées");
    const track=append(node("span","dock-track"),node("i"));
    track.firstChild.style.setProperty("--w",100*item.orders/maxVolume+"%");
    track.setAttribute("aria-hidden","true");
    const label=append(node("span","state-rank-metrics"),node("strong","",n(item.orders)),node("small","",percent(item.rate,1)+" ret."));
    append(row,node("span","state-rank-index",String(i+1)),node("span","state-rank-code",item.code),track,label);
    row.addEventListener("click",()=>openDeliveryState(item.code));
    stateRank.append(row);
  });
  const volumeTop5=regions.slice(0,5).reduce((sum,x)=>sum+x.orders,0);
  const otherOrders=data.totals.orders-volumeTop5;
  const otherStates=append(node("div","dock-state-row dock-state-row--other"),
    node("span","state-rank-index",""),
    node("span","state-rank-code","Autres"),
    node("span","dock-row-note","22 États"),
    append(node("span","state-rank-metrics"),node("strong","",n(otherOrders)),
      node("small","",percent(observedShare(otherOrders,data.totals.orders),1)+" du total")));
  stateRank.append(otherStates);
  append(stateLayout,renderBrazilMap(true),stateRank);
  $("dock-states").replaceChildren(stateLayout);
  const onTime=data.satisfaction.find(x=>x.code==="on_time");
  const late=data.satisfaction.find(x=>x.code==="late");
  const quality=node("div","dock-quality-layout");
  const top=node("div","dock-quality-overview");
  const ring=node("div","score-ring");
  ring.setAttribute("role","img");
  ring.setAttribute("aria-label","Note moyenne des commandes notées : "+decimal.format(data.totals.averageScore)+" sur 5");
  ring.style.setProperty("--score-pct",100*data.totals.averageScore/5+"%");
  append(ring,append(node("div","score-ring-center"),
    node("strong","",new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1,minimumFractionDigits:1}).format(data.totals.averageScore)+" / 5"),node("span","","Note moyenne")));
  const negative=append(node("div","quality-negative"),
    node("span","","Avis négatifs · notes ≤ 2"),
    node("strong","",percent(data.totals.negativeRate)),
    node("small","","Parmi les commandes notées"));
  append(top,ring,negative);
  append(quality,top,
    dockRow("Livraisons à l’heure",decimal.format(onTime.score)+" / 5",20*onTime.score),
    dockRow("Livraisons en retard",decimal.format(late.score)+" / 5",20*late.score));
  $("dock-quality").replaceChildren(quality);
}

function renderInspectorDetails() {
  if(state.view==="overview") return;
  let items=[],navigation=null;
  if(state.view==="sales") {
    const pairs=yearPairs();
    const pair=pairs.find(x=>x.month===state.salesMonth)||pairs.at(-1);
    const chosenMetric=state.salesMeasure;
    items=[
      {label:"Même mois 2017",value:chosenMetric==="salesBrl"?smallAmount(pair.previous.salesBrl):n(pair.previous.orders),note:"Période comparable"},
      {label:"Même mois 2018",value:chosenMetric==="salesBrl"?smallAmount(pair.current.salesBrl):n(pair.current.orders),note:"Période comparable"}
    ];
    navigation={items:pairs,id:pair.month,getId:x=>x.month,change:month=>{state.salesMonth=month;render();}};
  } else if(state.view==="delivery") {
    const measure=state.deliveryMeasure;
    const regions=[...data.states].sort((a,b)=>b[measure]-a[measure]);
    const region=regions.find(x=>x.code===state.selectedState)||regions[0];
    items=[
      {label:"Livraisons datées",value:n(region.dated),note:"État acheteur "+region.code},
      {label:"Livraisons tardives",value:n(region.late),note:"Numérateur du taux de retard"},
      {label:"Délai moyen",value:decimal.format(region.days)+" j",note:"Délai nettoyé, périmètre régional"}
    ];
    navigation={items:regions,id:region.code,getId:x=>x.code,change:code=>{state.selectedState=code;render();}};
  } else if(state.view==="quality") {
    const chosen=data.satisfaction.find(x=>x.code===state.selectedQuality)||data.satisfaction[0];
    const other=data.satisfaction.find(x=>x.code===(chosen.code==="late"?"on_time":"late"));
    items=[
      {label:"Avis négatifs observés",value:n(chosen.negative),note:n(chosen.scored)+" commandes notées"},
      {label:"Note moyenne du groupe",value:decimal.format(chosen.score)+" / 5",note:"Moyenne parmi les commandes notées"},
      {label:"Écart d’avis ≤ 2",value:(chosen.negativeRate-other.negativeRate>0?"+":"")+decimal.format(chosen.negativeRate-other.negativeRate)+" pts",note:"Versus autre groupe de ponctualité · descriptif"}
    ];
    navigation={items:data.satisfaction.filter(x=>x.code!=="undated"),id:chosen.code,getId:x=>x.code,change:code=>{state.selectedQuality=code;render();}};
  } else if(state.view==="customers" && state.customersView==="cohorts" && data.cohorts.length) {
    const cohorts=[...data.cohorts].sort((a,b)=>a.month.localeCompare(b.month));
    const cohort=cohorts.find(c=>c.month===state.selectedCohort)||cohorts[0];
    items=[
      {label:"Part des clients",value:percent(observedShare(cohort.customers,data.totals.customers)),note:"Une cohorte par premier achat livré observé"},
      {label:"Réacheteurs de la cohorte",value:n(cohort.repeats),note:percent(observedShare(cohort.repeats,cohort.customers))+" des clients de la cohorte"},
      {label:"Ventes cumulées de la cohorte",value:smallAmount(cohort.salesBrl),note:"Achats livrés historiques des clients de cette cohorte"}
    ];
    navigation={items:cohorts,id:cohort.month,getId:x=>x.month,change:month=>{state.selectedCohort=month;render();}};
  } else if(state.view==="customers") {
    const segment=data.segments.find(x=>x.code===state.selectedSegment)||data.segments[0];
    items=[
      {label:"Clients du segment",value:n(segment.customers),note:percent(observedShare(segment.customers,data.totals.customers))+" de la population"},
      {label:"Réacheteurs observés",value:n(segment.repeats),note:"Au moins deux commandes livrées"},
      {label:"Ventes d’articles",value:smallAmount(segment.salesBrl),note:"Hors frais de livraison"}
    ];
  }
  renderComparisonRows(items);
  if(navigation) setSelectionNavigation(navigation.items,navigation.id,navigation.getId,navigation.change);
  else $("story-navigation").replaceChildren();
}

function render() {
  if (!data) return;
  focusView(state.view);
  document.querySelector(".story-panel").dataset.mode=state.view;
  ({overview:renderOverview,sales:renderSales,delivery:renderDelivery,quality:renderQuality,customers:renderCustomers})[state.view]();
  renderInspectorDetails();
  renderDock();
}

function onHashChange() {
  const next=location.hash.slice(1);
  state.view=pages.includes(next)?next:"overview";
  render();
  // Modes share one workspace; never force a page scroll on navigation.
}

function setupModeNavigation() {
  const links = [...document.querySelectorAll(".mode-nav [data-view]")];
  const navbar = document.querySelector(".mode-nav");
  if (!navbar) return;
  navbar.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    if (!(event.target instanceof HTMLAnchorElement)) return;
    const current = links.indexOf(event.target);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 :
      (current + (event.key === "ArrowRight" ? 1 : -1) + links.length) % links.length;
    links[next].focus();
    location.hash = links[next].dataset.view;
  });
}

function setupDialog() {
  const dialog=$("method-dialog");
  const trigger=$("method-open");
  trigger.addEventListener("click",()=>{
    if (dialog.open) return;
    dialog.showModal();
    trigger.setAttribute("aria-expanded", "true");
  });
  $("method-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",(event)=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>{
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  });
}

async function start() {
  setupDialog();
  setupModeNavigation();
  window.addEventListener("hashchange",onHashChange);
  try {
    const response=await fetch(new URL("./data/public.json",import.meta.url),{cache:"no-cache"});
    if(!response.ok)throw new Error(`Impossible d'obtenir les agrégats : HTTP ${response.status}`);
    const dataset=await response.json();
    const errors=validatePublicData(dataset);
    if(errors.length)throw new Error("Contrat de données invalide : "+errors.join("; "));
    data=dataset;
    const aboutCoverage = $("method-data-coverage");
    if (aboutCoverage) {
      aboutCoverage.textContent = "Couverture publique : " +
        dataset.meta.coverage.states + " ; " +
        dataset.meta.coverage.categories.toLowerCase() +
        ". Les absences ne sont jamais assimilées à zéro.";
    }
    onHashChange();
  } catch(error) {
    const explanation=error instanceof Error?error.message:"Données indisponibles";
    $("viz-container").replaceChildren(append(node("div","loading"),node("strong","", "Données indisponibles. "),node("span","",explanation)));
    setScope("IMPOSSIBLE DE CHARGER LES AGRÉGATS", "VÉRIFIER LE FICHIER LOCAL");
    console.error("Commerce 360 — échec du chargement :",error);
  }
}
start();
