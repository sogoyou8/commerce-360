/**
 * Pure, dependency-free contracts for the public Olist aggregate snapshot.
 * No identifiers, order records, raw transactions or synthetic observations.
 */

const closeCents = (actual, expected) =>
  Math.abs(Math.round(Number(actual) * 100) - Math.round(Number(expected) * 100)) <= 1;

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
  if (!Array.isArray(data.states)||!data.states.length||
    new Set(data.states.map(x=>x.code)).size!==data.states.length)
    fail("États publiés absents ou doublonnés.");
  else for(const s of data.states){
    if (!/^[A-Z]{2}$/.test(s.code)||s.orders<1||s.late>s.dated||s.dated>s.orders||
        Math.abs(s.rate-observedShare(s.late,s.dated))>.02 || s.days<0)
      fail("Valeurs État invalides : "+s.code);
  }
  if (!Array.isArray(data.categories)||data.categories.length<2||
    data.categories.some(x=>!x.label||x.salesBrl<0)) fail("Catégories publiques invalides.");
  if (!Array.isArray(data.sellerStates)||!Array.isArray(data.cohorts))
    fail("Groupes optionnels non initialisés.");
  if (data.states?.length===27) {
    if (data.states.reduce((acc,x)=>acc+x.orders,0)!==t.orders ||
      data.states.reduce((acc,x)=>acc+x.late,0)!==t.late)
      fail("Les 27 États ne se réconcilient pas.");
  }
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
