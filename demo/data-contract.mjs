/**
 * Pure, dependency-free contracts for the public Olist aggregate snapshot.
 * No identifiers, order records, raw transactions or synthetic observations.
 */

const closeCents = (actual, expected) =>
  Number.isFinite(Number(actual)) && Math.round(Number(actual) * 100) === Math.round(Number(expected) * 100);

export function observedShare(numerator, denominator) {
  return denominator > 0 ? (100 * numerator) / denominator : 0;
}

export function compareSamePeriod(monthly) {
  const select = (year) => monthly.filter(
    (item) => item.month.startsWith(year + "-") && Number(item.month.slice(5)) <= 8,
  );
  const sum = (list, key) => list.reduce((acc, item) => acc + item[key], 0);
  const a = select("2017"), b = select("2018");
  if (a.length !== 8 || b.length !== 8) throw new Error("Les 8 mois appariés sont requis.");
  const sales2017 = sum(a,"salesBrl"), sales2018 = sum(b,"salesBrl");
  return {
    sales2017,sales2018,
    orders2017:sum(a,"orders"),orders2018:sum(b,"orders"),
    salesGrowth:observedShare(sales2018 - sales2017,sales2017),
  };
}

export function validatePublicData(data) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (!data || typeof data !== "object") return ["Jeu de données public manquant."];
  const t = data.totals;
  if (!t || !data.meta) return ["Métadonnées ou totaux manquants."];
  if (data.meta.start !== "2017-01-01" || data.meta.endExclusive !== "2018-09-01" ||
      data.meta.currency !== "BRL") fail("Période ou devise incohérente.");
  if (t.orders !== 96211 || t.customers !== 93104 || t.repeatCustomers !== 2789 ||
      t.late !== 7822 || t.dated !== 96203 || !closeCents(t.salesBrl,13181027.13))
    fail("Référentiel E3/E5/E7 modifié.");
  if (!closeCents(t.averageBasket,t.salesBrl/t.orders)) fail("Panier moyen incorrect.");
  if (Math.abs(t.lateRate - observedShare(t.late,t.dated)) > .02)
    fail("Taux de retard incompatible avec les effectifs.");
  const rows = data.monthly;
  if (!Array.isArray(rows) || rows.length !== 20) fail("20 mois attendus.");
  else {
    const seen = new Set(rows.map(x=>x.month));
    if (seen.size !== 20 || rows[0].month !== "2017-01" || rows.at(-1).month !== "2018-08")
      fail("Ordre, doublons ou période des ventes mensuelles invalides.");
    if (rows.some(x=>!/^20(17|18)-(0[1-9]|1[0-2])$/.test(x.month) ||
      !Number.isInteger(x.orders) || x.orders < 0 || !Number.isFinite(x.salesBrl) || x.salesBrl<0))
      fail("Ligne mensuelle corrompue.");
    if (rows.reduce((acc,x)=>acc+x.orders,0)!==t.orders ||
      !closeCents(rows.reduce((acc,x)=>acc+x.salesBrl,0),t.salesBrl))
      fail("Somme des mois différente du total national.");
    try {
      const y=compareSamePeriod(rows);
      if (!closeCents(y.sales2017,2993456.13) || !closeCents(y.sales2018,7218125.12))
        fail("Comparaison janvier–août invalide.");
    } catch (e) { fail(e.message); }
  }
  const rfm=data.segments;
  if (!Array.isArray(rfm) || rfm.length !== 7) fail("Sept segments RFM attendus.");
  else {
    if (new Set(rfm.map(x=>x.code)).size!==7 || rfm.some(x=>!Number.isInteger(x.customers) || !Number.isInteger(x.repeats) ||
      x.repeats<0 || x.customers<1 || x.repeats>x.customers || !(x.salesBrl>=0)))
      fail("Structure RFM invalide.");
    if (rfm.reduce((acc,x)=>acc+x.customers,0)!==t.customers ||
      rfm.reduce((acc,x)=>acc+x.repeats,0)!==t.repeatCustomers ||
      !closeCents(rfm.reduce((acc,x)=>acc+x.salesBrl,0),t.salesBrl))
      fail("Réconciliation RFM invalide.");
  }
  const groups=data.satisfaction;
  if (!Array.isArray(groups) || groups.length!==3) fail("Trois groupes de ponctualité attendus.");
  else {
    if (groups.reduce((acc,x)=>acc+x.orders,0)!==t.orders ||
      groups.reduce((acc,x)=>acc+x.negative,0)>groups.reduce((acc,x)=>acc+x.scored,0))
      fail("Volumes de ponctualité incohérents.");
    for(const g of groups) {
      if (g.scored>g.orders || g.negative>g.scored || g.negative<0 ||
          Math.abs(g.negativeRate - observedShare(g.negative,g.scored))>.02 || g.score<1 || g.score>5)
        fail("Groupe de satisfaction incohérent : "+g.code);
    }
  }
  // E2: published coverage must be explicit, never masquerading as a full nation.
  const brStates = new Set([
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
  ]);
  const states = Array.isArray(data.states) ? data.states : [];
  const fullStates = states.length === 27;
  const partialStates = states.length === 3;
  const coverage = data.meta.coverage ?? {};
  if (!fullStates && !partialStates) fail("Couverture des États : uniquement 3 documentés ou 27 vérifiés.");
  if (new Set(states.map(x => x.code)).size !== states.length ||
      states.some(x => !brStates.has(x.code) ||
        !Number.isInteger(x.orders) || x.orders < 1 ||
        !Number.isInteger(x.dated) || !Number.isInteger(x.late) ||
        x.late < 0 || x.late > x.dated || x.dated > x.orders ||
        !Number.isFinite(x.days) || x.days < 0 ||
        !Number.isFinite(x.rate) ||
        Math.abs(x.rate-observedShare(x.late,x.dated)) > .02))
    fail("États : codes, dénominateurs ou métriques invalides.");
  if (fullStates) {
    if (new Set(states.map(x=>x.code)).size !== brStates.size ||
        states.some(x=>!brStates.has(x.code)) ||
        states.reduce((n,x)=>n+x.orders,0)!==t.orders ||
        states.reduce((n,x)=>n+x.dated,0)!==t.dated ||
        states.reduce((n,x)=>n+x.late,0)!==t.late)
      fail("Les 27 États ne se réconcilient pas avec la référence nationale.");
    if (coverage.states !== "27 États vérifiés")
      fail("Libellé trompeur pour la couverture complète des États.");
  }
  if (partialStates) {
    if (states.map(x=>x.code).sort().join(",") !== "CE,RJ,SP" ||
        coverage.states !== "3 États documentés parmi 27")
      fail("Couverture partielle des États incohérente.");
    const examples = new Map([["CE",[1273,1273,196]],["RJ",[12310,12310,1664]],["SP",[40406,40399,2384]]]);
    for (const region of states) {
      const [orders, dated, late] = examples.get(region.code) ?? [];
      if (region.orders !== orders || region.dated !== dated || region.late !== late)
        fail("Un des trois États de référence a été modifié.");
    }
  }

  const categories = Array.isArray(data.categories) ? data.categories : [];
  if (![2,12].includes(categories.length) ||
      new Set(categories.map(x=>x.label)).size !== categories.length ||
      categories.some(x=>!x.label || !Number.isFinite(x.salesBrl) || x.salesBrl<0) ||
      categories.some((x,i)=>i>0 && x.salesBrl>categories[i-1].salesBrl) ||
      categories.reduce((n,x)=>n+x.salesBrl,0)>t.salesBrl+.02)
    fail("Catégories publiques : couverture, classement ou montants invalides.");
  if (!categories[0] || categories[0].label!=="health_beauty" ||
      !closeCents(categories[0].salesBrl,1229557.50) ||
      !categories[1] || categories[1].label!=="watches_gifts" ||
      !closeCents(categories[1].salesBrl,1163465.91))
    fail("Deux catégories vérifiées de tête absentes ou modifiées.");
  if (categories.length===12 &&
      coverage.categories!=="12 catégories les plus vendues en prix d'articles")
    fail("Couverture des 12 catégories mal documentée.");
  if (categories.length===2 &&
      coverage.categories!=="2 catégories documentées parmi le catalogue")
    fail("Couverture partielle des catégories mal documentée.");

  const sellers = Array.isArray(data.sellerStates) ? data.sellerStates : [];
  const cohorts = Array.isArray(data.cohorts) ? data.cohorts : [];
  if (!Array.isArray(data.sellerStates) || !Array.isArray(data.cohorts))
    fail("Groupes optionnels non initialisés.");
  if (sellers.length && !fullStates)
    fail("États vendeurs sans jeu public enrichi complet.");
  if (new Set(sellers.map(x=>x.code)).size!==sellers.length ||
      sellers.some(x=>!brStates.has(x.code) || !Number.isFinite(x.salesBrl) || x.salesBrl<0) ||
      sellers.some((x,i)=>i>0 && x.salesBrl>sellers[i-1].salesBrl) ||
      sellers.reduce((n,x)=>n+x.salesBrl,0)>t.salesBrl+.02)
    fail("Agrégats États vendeurs non conformes.");
  if (new Set(cohorts.map(x=>x.month)).size!==cohorts.length ||
      cohorts.length>20 || cohorts.some(x=>!/^20(17|18)-(0[1-9]|1[0-2])$/.test(x.month) ||
        x.month<"2017-01" || x.month>"2018-08" ||
        !Number.isInteger(x.customers) || x.customers<20 ||
        !Number.isInteger(x.repeats) || x.repeats<0 || x.repeats>x.customers ||
        !Number.isFinite(x.salesBrl) || x.salesBrl<0) ||
      cohorts.reduce((n,x)=>n+x.customers,0)>t.customers ||
      cohorts.reduce((n,x)=>n+x.repeats,0)>t.repeatCustomers ||
      cohorts.reduce((n,x)=>n+x.salesBrl,0)>t.salesBrl+.02)
    fail("Cohortes : agrégats, doublons ou seuil de publication invalides.");
  if ((sellers.length || cohorts.length) && !fullStates)
    fail("Couverture agrégée enrichie incohérente.");
  if (fullStates && (coverage.sellerStates!==sellers.length+" États vendeurs agrégés (≥ 5 vendeurs)" ||
      coverage.cohorts!==cohorts.length+" cohortes mensuelles agrégées"))
    fail("Métadonnées des groupes agrégés trompeuses.");
  if (partialStates && (sellers.length || cohorts.length ||
      coverage.sellerStates!=="Non disponible dans la référence publique" ||
      coverage.cohorts!=="Non disponible dans la référence publique"))
    fail("Couverture partielle des vendeurs/cohortes incohérente.");
  if (fullStates && data.meta.mode!=="Exports locaux agrégés validés")
    fail("Provenance enrichie non déclarée.");
  // Defense-in-depth: reject raw or identifying column names anywhere in the public JSON.
  const forbidden = /^(order_id|customer_id|customer_unique_id|seller_id|product_id|review_id|payment_id|zip_code|customer_zip_code_prefix|seller_city|customer_city|email|phone|first_name|last_name|latitude|longitude)$/i;
  const walk=(item,path="")=>{
    if (!item||typeof item!=="object")return;
    if (Array.isArray(item)) { for(const v of item)walk(v,path);return; }
    for(const [key,value] of Object.entries(item)){
      if(forbidden.test(key))fail("Colonne identifiante interdite : "+path+key);
      walk(value,path+key+".");
    }
  };
  walk(data);
  return errors;
}
