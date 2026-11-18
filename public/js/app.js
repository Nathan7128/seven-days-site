/* Seven Days · horaires, carte, personnalisation, panier et commande. La carte est lue dans /menu.json. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const euro = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const r2 = n => Math.round(n * 100) / 100;

/* ---------- Horaires (heure de Paris) ---------- */
const HOURS = { 0: [11, 24], 1: [11, 24], 2: [11, 24], 3: [11, 24], 4: [11, 24], 5: [15, 24], 6: [11, 24] };
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const PREP = 20, STEP = 15;
function paris() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = t => p.find(x => x.type === t).value;
  return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), mins: (+g('hour')) * 60 + (+g('minute')) };
}
const fmtH = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; return h + 'h' + String(mm).padStart(2, '0'); };
const hLabel = h => (h === 24 ? '00h' : h + 'h');
function openState() {
  const { dow, mins } = paris(); const [o, c] = HOURS[dow];
  if (mins >= o * 60 && mins < c * 60) return { open: true, text: "Ouvert · jusqu'à minuit" };
  if (mins < o * 60) return { open: false, text: `Fermé · ouvre à ${o}h` };
  return { open: false, text: `Fermé · ouvre demain à ${HOURS[(dow + 1) % 7][0]}h` };
}
function slots() {
  const { dow, mins } = paris(); const [o, c] = HOURS[dow]; const out = [];
  let start = Math.ceil(Math.max(mins + PREP, o * 60 + PREP) / STEP) * STEP; const end = c * 60 - STEP;
  if (start <= end) {
    if (mins >= o * 60) out.push({ v: 'asap', t: `Dès que possible (vers ${fmtH(Math.ceil((mins + PREP) / 5) * 5)})` });
    for (let m = start; m <= end; m += STEP) out.push({ v: 'j0-' + m, t: `Aujourd'hui · ${fmtH(m)}` });
  } else {
    const [o2, c2] = HOURS[(dow + 1) % 7];
    for (let m = o2 * 60 + PREP; m <= c2 * 60 - STEP; m += STEP) out.push({ v: 'j1-' + m, t: `Demain · ${fmtH(m)}` });
  }
  return out;
}
function renderHours() {
  const st = openState(); const el = $('#status');
  el.textContent = st.text; el.classList.toggle('open', st.open);
  const today = paris().dow;
  $('#hours tbody').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<tr class="${d === today ? 'today' : ''}"><td>${DAYS[d]}</td><td>${HOURS[d][0]}h – ${hLabel(HOURS[d][1])}</td></tr>`).join('');
}
renderHours(); setInterval(renderHours, 60000);

/* ---------- Carte ---------- */
let GROUPS = {}, CATS = [];
const ITEMS = new Map();
const norm = c => typeof c === 'string' ? { id: slug(c), label: c, price: 0 } : { id: c.id || slug(c.label), label: c.label, price: +c.price || 0 };
function resolve(o, i) {
  let g;
  if (typeof o === 'string') g = { ...GROUPS[o], key: o };
  else if (o.use) g = { ...GROUPS[o.use], ...o, key: o.key || o.use };
  else g = { ...o, key: o.key || slug(o.label) };
  g.key += '_' + i;
  g.choices = (g.choices || []).map(norm);
  if (g.choose) g.chooseList = (GROUPS[g.choose].choices || []).map(norm);
  return g;
}
function prepare(d) {
  GROUPS = d.groups; CATS = d.categories;
  CATS.forEach(c => c.items.forEach(it => {
    it.cat = c;
    it.g = [...(it.extraOpts || []), ...(it.opts ?? c.opts ?? [])].map(resolve);
    ITEMS.set(it.id, it);
  }));
}
const fromPrice = it => it.variants ? Math.min(...it.variants.choices.map(v => v.price)) : it.price;
const multiPrice = it => it.variants && new Set(it.variants.choices.map(v => v.price)).size > 1;
const priceTag = it => `<span class="price">${multiPrice(it) ? '<small>dès</small>' : ''}${euro(fromPrice(it))}</span>`;
const badge = it => it.badge ? `<span class="badge">${esc(it.badge)}</span>` : '';

function cardHTML(it) {
  const media = it.img ? `<img src="img/${it.img}.png" alt="" loading="lazy">` : `<span class="ph" aria-hidden="true">${esc(it.name)}</span>`;
  return `<button type="button" class="card" data-open="${it.id}" aria-label="${esc(it.name)}, ${multiPrice(it) ? 'à partir de ' : ''}${euro(fromPrice(it))}">
    ${media}
    <span class="c-body">
      <span class="c-name">${esc(it.name)}${badge(it)}</span>
      ${it.desc ? `<span class="c-desc">${esc(it.desc)}</span>` : '<span class="c-desc"></span>'}
      <span class="c-foot">${priceTag(it)}<span class="plus" aria-hidden="true">+</span></span>
    </span></button>`;
}
function rowHTML(it) {
  return `<button type="button" class="row" data-open="${it.id}" aria-label="${esc(it.name)}, ${euro(fromPrice(it))}">
    <span class="r-name">${esc(it.name)}${badge(it)}</span>
    ${priceTag(it)}<span class="plus" aria-hidden="true">+</span>
    ${it.desc ? `<span class="r-desc">${esc(it.desc)}</span>` : ''}</button>`;
}
function renderCarte() {
  $('#chips').innerHTML = CATS.map((c, i) => `<button type="button" class="chip${i ? '' : ' on'}" role="tab" aria-selected="${!i}" data-cat="${c.id}">${esc(c.name)}</button>`).join('');
  $('#list').innerHTML = CATS.map(c => {
    const counts = {}; c.items.forEach(i => { if (i.img) counts[i.img] = (counts[i.img] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const head = `<header class="cat-head"><h3>${esc(c.name)}</h3>${c.note ? `<p>${esc(c.note)}</p>` : ''}</header>`;
    if (top && top[1] >= 3) return `<section class="cat" id="cat-${c.id}">${head}<div class="cat-banner"><img src="img/${top[0]}.png" alt="" loading="lazy"></div><div class="rows">${c.items.map(rowHTML).join('')}</div></section>`;
    return `<section class="cat" id="cat-${c.id}">${head}<div class="cards${c.items.length === 1 ? ' solo' : ''}">${c.items.map(cardHTML).join('')}</div></section>`;
  }).join('') + `<p class="carte-foot">Photos d'illustration. Allergènes : demande la liste au comptoir. Prix TTC.</p>`;
}
const list = $('#list'), chipsEl = $('#chips');
chipsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  const sec = $('#cat-' + b.dataset.cat); if (!sec) return;
  list.scrollTo({ top: sec.offsetTop - 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  setChip(b.dataset.cat);
});
let curChip = null;
function setChip(id) {
  if (id === curChip) return; curChip = id;
  $$('.chip', chipsEl).forEach(c => { const on = c.dataset.cat === id; c.classList.toggle('on', on); c.setAttribute('aria-selected', on); if (on) chipsEl.scrollTo({ left: c.offsetLeft - 16, behavior: 'smooth' }); });
}
let ticking = false;
list.addEventListener('scroll', () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false; let id = CATS[0] && CATS[0].id;
    for (const s of $$('.cat', list)) { if (s.offsetTop - list.scrollTop <= 60) id = s.id.slice(4); else break; }
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 4 && CATS.length) id = CATS[CATS.length - 1].id;
    setChip(id);
  });
}, { passive: true });

fetch('menu.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => { prepare(d); renderCarte(); curChip = CATS[0].id; refreshCartPrices(); })
  .catch(() => { list.innerHTML = '<div class="err-box"><p><b>La carte n\'a pas pu se charger.</b></p><p>Recharge la page, ou commande par téléphone au <span class="tel-num">04 73 93 84 80</span>.</p></div>'; });

/* ---------- Panier ---------- */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('sd-cart') || '[]'); if (!Array.isArray(cart)) cart = []; } catch (e) { cart = []; }
const save = () => { try { localStorage.setItem('sd-cart', JSON.stringify(cart)); } catch (e) {} };
const cartCount = () => cart.reduce((s, l) => s + l.qty, 0);
const cartTotal = () => r2(cart.reduce((s, l) => s + l.unit * l.qty, 0));
function refreshCartPrices() { cart = cart.filter(l => ITEMS.has(l.id)); save(); updateCartUI(); }
function updateCartUI() {
  const n = cartCount();
  $('#cartCount').textContent = n;
  $('#mbarLabel').textContent = n ? `Voir le panier · ${n} article${n > 1 ? 's' : ''}` : 'Commander';
  const t = $('#mbarTot'); t.hidden = !n; t.textContent = euro(cartTotal());
}
function bump() { const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

/* ---------- Fenêtres ---------- */
const dlgItem = $('#dlgItem'), dlgCart = $('#dlgCart');
function openDlg(d) { document.documentElement.classList.add('locked'); if (!d.open) d.showModal(); }
[dlgItem, dlgCart].forEach(d => d.addEventListener('close', () => { if (!dlgItem.open && !dlgCart.open) document.documentElement.classList.remove('locked'); }));
[dlgItem, dlgCart].forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

/* ---------- Personnalisation produit ---------- */
let cur = null;
const lim = (x, cfg) => (x && typeof x === 'object') ? (x[cfg.variant] ?? 0) : (x ?? 0);
const togPrice = (g, cfg) => g.priceBy ? (g.priceBy[cfg.variant] ?? null) : (g.price || 0);
const G = key => cur.it.g.find(g => g.key === key);
function newCfg(it, preset) {
  const cfg = { variant: preset.variant || (it.variants ? it.variants.choices[0].id : null), picks: {}, counts: {}, toggles: {}, sub: {}, note: '', qty: 1 };
  it.g.forEach(g => {
    if (g.type === 'pick') cfg.picks[g.key] = g.preselect ? [g.choices[0].id] : [];
    if (g.type === 'count') cfg.counts[g.key] = {};
    if (g.type === 'toggle') { cfg.toggles[g.key] = false; if (g.chooseList) cfg.sub[g.key] = g.chooseList[0].id; }
  });
  return cfg;
}
function fixVariant(it, cfg) {
  it.g.forEach(g => {
    if (g.type === 'toggle' && togPrice(g, cfg) === null) cfg.toggles[g.key] = false;
    if (g.type === 'count') { const tot = lim(g.total, cfg); const sum = Object.values(cfg.counts[g.key]).reduce((a, b) => a + b, 0); if (sum > tot) cfg.counts[g.key] = {}; }
    if (g.type === 'pick') { const mx = lim(g.max, cfg); if (cfg.picks[g.key].length > mx) cfg.picks[g.key].length = mx; }
  });
}
function priceOf(it, cfg) {
  let p = it.variants ? it.variants.choices.find(v => v.id === cfg.variant).price : it.price;
  it.g.forEach(g => {
    if (g.type === 'pick') cfg.picks[g.key].forEach(id => { p += (g.choices.find(c => c.id === id) || {}).price || 0; });
    if (g.type === 'toggle' && cfg.toggles[g.key]) p += togPrice(g, cfg) || 0;
  });
  return r2(p);
}
function check(it, cfg) {
  for (const g of it.g) {
    if (g.type === 'pick') { const mn = lim(g.min, cfg); const n = cfg.picks[g.key].length; if (n < mn) return { key: g.key, msg: mn === 1 ? `Choisis : ${(g.short || g.label).toLowerCase()}` : `${g.short || g.label} : encore ${mn - n} à choisir` }; }
    if (g.type === 'count') { const tot = lim(g.total, cfg); const sum = Object.values(cfg.counts[g.key]).reduce((a, b) => a + b, 0); if (sum < tot) return { key: g.key, msg: tot === 1 ? `Choisis : ${(g.short || g.label).toLowerCase().replace(/s$/, '')}` : `${g.short || g.label} : encore ${tot - sum} à choisir` }; }
  }
  return null;
}
function summary(it, cfg) {
  const out = [];
  if (it.variants) out.push(it.variants.choices.find(v => v.id === cfg.variant).label);
  it.g.forEach(g => {
    const lbl = g.short || g.label;
    if (g.type === 'pick' && cfg.picks[g.key].length) out.push(`${lbl} : ${cfg.picks[g.key].map(id => g.choices.find(c => c.id === id).label).join(', ')}`);
    if (g.type === 'count') { const e = Object.entries(cfg.counts[g.key]).filter(([, n]) => n > 0); if (e.length) out.push(`${lbl} : ${e.map(([id, n]) => g.choices.find(c => c.id === id).label + (lim(g.total, cfg) > 1 ? ' ×' + n : '')).join(', ')}`); }
    if (g.type === 'toggle' && cfg.toggles[g.key]) out.push(g.chooseList ? `${lbl} : ${g.chooseList.find(c => c.id === cfg.sub[g.key]).label}` : lbl);
  });
  if (cfg.note.trim()) out.push('Note : ' + cfg.note.trim());
  return out;
}

function openItem(id, preset = {}) {
  const it = ITEMS.get(id); if (!it) return;
  const cfg = newCfg(it, preset);
  if (preset.direct && !it.g.length) { addToCart(it, cfg); return; }
  cur = { it, cfg, bad: null };
  renderItem(); openDlg(dlgItem);
  const sc = $('.sheet-scroll', dlgItem); if (sc) sc.scrollTop = 0;
}
function chip(act, g, c, on, extra = '') {
  return `<button type="button" class="opt${on ? ' on' : ''}" aria-pressed="${on}" data-act="${act}" data-g="${g}" data-c="${c.id}" data-k="${act}-${g}-${c.id}" ${extra}><span>${esc(c.label)}</span>${c.price ? `<small>+${euro(c.price)}</small>` : ''}</button>`;
}
function groupHTML(g, cfg) {
  const bad = cur.bad === g.key ? ' bad' : '';
  const tid = 'gt-' + g.key;
  if (g.type === 'pick') {
    const mn = lim(g.min, cfg), mx = lim(g.max, cfg), sel = cfg.picks[g.key];
    const hint = mn >= 1 && mn === mx ? (mn > 1 ? `Choisis-en ${mn}` : 'Obligatoire') : (g.hint || (mx < 9 ? `Jusqu'à ${mx}` : 'Facultatif'));
    return `<div class="grp${bad}" role="group" aria-labelledby="${tid}" data-gk="${g.key}"><div class="grp-title" id="${tid}">${esc(g.label)} <span class="req">${esc(hint)}</span>${mx > 1 && mx < 9 ? `<span class="cnt">${sel.length}/${mx}</span>` : ''}</div>
      <div class="opts">${g.choices.map(c => { const on = sel.includes(c.id); const full = !on && mx > 1 && sel.length >= mx; return chip('pick', g.key, c, on, full ? 'aria-disabled="true"' : ''); }).join('')}</div></div>`;
  }
  if (g.type === 'count') {
    const tot = lim(g.total, cfg), cnt = cfg.counts[g.key], sum = Object.values(cnt).reduce((a, b) => a + b, 0);
    const title = `<div class="grp-title" id="${tid}">${esc(g.label)} <span class="req">${tot === 1 ? 'Obligatoire' : 'Choisis-en ' + tot}</span>${tot > 1 ? `<span class="cnt">${sum}/${tot}</span>` : ''}</div>`;
    if (tot === 1) return `<div class="grp${bad}" role="group" aria-labelledby="${tid}" data-gk="${g.key}">${title}<div class="opts">${g.choices.map(c => chip('cone', g.key, c, (cnt[c.id] || 0) > 0)).join('')}</div></div>`;
    return `<div class="grp${bad}" role="group" aria-labelledby="${tid}" data-gk="${g.key}">${title}<div class="stp-list">${g.choices.map(c => { const n = cnt[c.id] || 0; return `<div class="stp${n ? ' on' : ''}"><span>${esc(c.label)}</span><div class="qty sm"><button type="button" data-act="cminus" data-g="${g.key}" data-c="${c.id}" data-k="cm-${g.key}-${c.id}" ${n ? '' : 'disabled'} aria-label="Retirer ${esc(c.label)}">−</button><output>${n}</output><button type="button" data-act="cplus" data-g="${g.key}" data-c="${c.id}" data-k="cp-${g.key}-${c.id}" ${sum >= tot ? 'disabled' : ''} aria-label="Ajouter ${esc(c.label)}">+</button></div></div>`; }).join('')}</div></div>`;
  }
  if (g.type === 'toggle') {
    const p = togPrice(g, cfg), on = cfg.toggles[g.key];
    return `<div class="grp" data-gk="${g.key}"><button type="button" class="tgl${on ? ' on' : ''}" role="switch" aria-checked="${on}" data-act="toggle" data-g="${g.key}" data-k="t-${g.key}" ${p === null ? 'aria-disabled="true"' : ''}><span class="tgl-l">${esc(g.label)}</span><span class="tgl-p">${p === null ? esc(g.off || 'Indisponible') : '+' + euro(p)}</span><span class="tgl-sw" aria-hidden="true"></span></button>
      ${on && g.chooseList ? `<div class="opts sub" role="group" aria-label="Boisson">${g.chooseList.map(c => chip('sub', g.key, c, cfg.sub[g.key] === c.id)).join('')}</div>` : ''}</div>`;
  }
  return '';
}
function renderItem() {
  const { it, cfg } = cur;
  const sc = $('.sheet-scroll', dlgItem); const top = sc ? sc.scrollTop : 0;
  const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
  const err = check(it, cfg); const total = priceOf(it, cfg) * cfg.qty;
  const v = it.variants ? `<div class="grp" role="group" aria-labelledby="gt-v"><div class="grp-title" id="gt-v">${esc(it.variants.label)} <span class="req">Obligatoire</span></div><div class="opts">${it.variants.choices.map(c => `<button type="button" class="opt${cfg.variant === c.id ? ' on' : ''}" aria-pressed="${cfg.variant === c.id}" data-act="variant" data-c="${c.id}" data-k="v-${c.id}"><span>${esc(c.label)}</span><small>${euro(c.price)}</small></button>`).join('')}</div></div>` : '';
  dlgItem.innerHTML = `<div class="sheet">
    <div class="sheet-scroll">
      <button type="button" class="x" data-act="close" aria-label="Fermer">×</button>
      ${it.img ? `<img class="sheet-img" src="img/${it.img}.png" alt="">` : ''}
      <div class="sheet-head${it.img ? '' : ' noimg'}"><h3>${esc(it.name)}</h3>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}${it.cat.note ? `<p class="note">${esc(it.cat.note)}</p>` : ''}</div>
      ${v}${it.g.map(g => groupHTML(g, cfg)).join('')}
      <div class="grp"><label class="fld" style="margin:0"><span>Une précision ?</span><textarea id="itemNote" rows="2" maxlength="140" placeholder="Sans oignons, bien cuit…">${esc(cfg.note)}</textarea></label></div>
    </div>
    <div class="sheet-foot">
      <div class="qty"><button type="button" data-act="qminus" data-k="qm" aria-label="Un de moins" ${cfg.qty > 1 ? '' : 'disabled'}>−</button><output aria-live="polite">${cfg.qty}</output><button type="button" data-act="qplus" data-k="qp" aria-label="Un de plus">+</button></div>
      <button type="button" class="btn btn-red add-btn" data-act="add" data-k="add" ${err ? 'aria-disabled="true"' : ''}>${err ? esc(err.msg) : 'Ajouter · ' + euro(r2(total))}</button>
    </div></div>`;
  const sc2 = $('.sheet-scroll', dlgItem); sc2.scrollTop = top;
  if (fk) { const el = dlgItem.querySelector(`[data-k="${fk}"]`); if (el) el.focus({ preventScroll: true }); }
}
dlgItem.addEventListener('input', e => { if (e.target.id === 'itemNote' && cur) cur.cfg.note = e.target.value; });
dlgItem.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || !cur) return;
  const { it, cfg } = cur; const a = b.dataset.act;
  if (a === 'close') { dlgItem.close(); return; }
  if (b.getAttribute('aria-disabled') === 'true' && a !== 'add') return;
  cur.bad = null;
  if (a === 'variant') { cfg.variant = b.dataset.c; fixVariant(it, cfg); }
  else if (a === 'pick') {
    const g = G(b.dataset.g), arr = cfg.picks[g.key], id = b.dataset.c, mx = lim(g.max, cfg), mn = lim(g.min, cfg), i = arr.indexOf(id);
    if (i > -1) { if (!(mx === 1 && mn === 1)) arr.splice(i, 1); }
    else if (mx === 1) arr.splice(0, arr.length, id);
    else if (arr.length < mx) arr.push(id);
  }
  else if (a === 'cone') { cfg.counts[b.dataset.g] = { [b.dataset.c]: 1 }; }
  else if (a === 'cplus' || a === 'cminus') {
    const g = G(b.dataset.g), cnt = cfg.counts[g.key], tot = lim(g.total, cfg), sum = Object.values(cnt).reduce((x, y) => x + y, 0), id = b.dataset.c;
    if (a === 'cplus' && sum < tot) cnt[id] = (cnt[id] || 0) + 1;
    if (a === 'cminus' && cnt[id]) cnt[id]--;
  }
  else if (a === 'toggle') { cfg.toggles[b.dataset.g] = !cfg.toggles[b.dataset.g]; }
  else if (a === 'sub') { cfg.sub[b.dataset.g] = b.dataset.c; }
  else if (a === 'qminus') { cfg.qty = Math.max(1, cfg.qty - 1); }
  else if (a === 'qplus') { cfg.qty = Math.min(20, cfg.qty + 1); }
  else if (a === 'add') {
    const err = check(it, cfg);
    if (err) {
      cur.bad = err.key; renderItem();
      const el = dlgItem.querySelector(`[data-gk="${err.key}"]`); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    addToCart(it, cfg); dlgItem.close(); return;
  }
  renderItem();
});
function addToCart(it, cfg) {
  const unit = priceOf(it, cfg), lines = summary(it, cfg);
  const key = it.id + '|' + lines.join('|');
  const ex = cart.find(l => l.key === key);
  if (ex) ex.qty = Math.min(50, ex.qty + cfg.qty); else cart.push({ key, id: it.id, name: it.name, unit, qty: cfg.qty, lines });
  save(); updateCartUI(); bump();
  toast(`${cfg.qty > 1 ? cfg.qty + ' × ' : ''}${it.name} ajouté au panier`);
}

/* ---------- Panier, commande, ticket ---------- */
let step = 'cart', lastOrder = null, coDraft = { name: '', tel: '', slot: '', pay: 'comptoir', note: '' };
const head = (title, back) => `<div class="d-head">${back ? `<button type="button" class="back" data-act="back">← Panier</button>` : ''}<h3>${title}</h3><button type="button" class="x" data-act="close" aria-label="Fermer">×</button></div>`;
function openCart() { if (step === 'done' && !lastOrder) step = 'cart'; renderCart(); openDlg(dlgCart); }
function renderCart() {
  if (step === 'done' && lastOrder) return renderDone();
  if (!cart.length) {
    step = 'cart';
    dlgCart.innerHTML = `<div class="drawer">${head('Ton panier')}<div class="d-body empty"><p class="empty-big">Panier vide</p><p>Un tacos, un crousty ? Tout est dans la carte.</p><button type="button" class="btn btn-red" data-act="tocarte">Voir la carte</button></div></div>`;
    return;
  }
  if (step === 'cart') {
    dlgCart.innerHTML = `<div class="drawer">${head('Ton panier')}
      <div class="d-body"><ul class="lines">${cart.map((l, i) => `<li class="line">
        <div><div class="l-name">${esc(l.name)}</div>${l.lines.length ? `<ul class="l-sub">${l.lines.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</div>
        <div class="l-side"><span class="l-price">${euro(r2(l.unit * l.qty))}</span>
          <div class="qty sm"><button type="button" data-act="lminus" data-i="${i}" aria-label="${l.qty > 1 ? 'Un de moins' : 'Retirer'} : ${esc(l.name)}">${l.qty > 1 ? '−' : '×'}</button><output>${l.qty}</output><button type="button" data-act="lplus" data-i="${i}" aria-label="Un de plus : ${esc(l.name)}">+</button></div></div></li>`).join('')}</ul></div>
      <div class="d-foot"><div class="total">Total <b>${euro(cartTotal())}</b></div><button type="button" class="btn btn-red" data-act="checkout">Passer commande</button></div></div>`;
    return;
  }
  // checkout
  const sl = slots(); if (!sl.some(s => s.v === coDraft.slot)) coDraft.slot = sl[0] ? sl[0].v : '';
  dlgCart.innerHTML = `<form class="drawer" id="coForm" novalidate>${head('Retrait', true)}
    <div class="d-body">
      <div class="pickup"><div><b>À récupérer au comptoir</b><span>Seven Days · 6 rue d'Assas, Clermont-Ferrand</span></div></div>
      <label class="fld"><span>Prénom</span><input type="text" id="coName" autocomplete="given-name" required value="${esc(coDraft.name)}"></label>
      <label class="fld"><span>Téléphone</span><input type="tel" id="coTel" autocomplete="tel" inputmode="tel" required placeholder="06 12 34 56 78" value="${esc(coDraft.tel)}"><small>Le resto t'appelle seulement en cas de souci.</small></label>
      <label class="fld"><span>Heure de retrait</span><select id="coSlot">${sl.map(s => `<option value="${s.v}"${s.v === coDraft.slot ? ' selected' : ''}>${esc(s.t)}</option>`).join('')}</select></label>
      <fieldset class="pay"><legend>Paiement</legend>
        <label><input type="radio" name="coPay" value="comptoir"${coDraft.pay === 'comptoir' ? ' checked' : ''}><span>Au comptoir, au retrait<small>Tu paies en récupérant ta commande.</small></span></label>
        <label><input type="radio" name="coPay" value="ligne"${coDraft.pay === 'ligne' ? ' checked' : ''}><span>En ligne par carte<small>Démo : aucun paiement n'est demandé.</small></span></label>
      </fieldset>
      <label class="fld"><span>Message pour la cuisine</span><textarea id="coNote" rows="2" maxlength="200" placeholder="Facultatif">${esc(coDraft.note)}</textarea></label>
      <p class="form-err" id="coErr" role="alert"></p>
    </div>
    <div class="d-foot"><div class="total">Total <b>${euro(cartTotal())}</b></div><button type="submit" class="btn btn-red">Valider la commande</button></div></form>`;
}
function readDraft() {
  const f = $('#coForm', dlgCart); if (!f) return;
  coDraft = { name: $('#coName', f).value, tel: $('#coTel', f).value, slot: $('#coSlot', f).value, pay: (f.querySelector('input[name=coPay]:checked') || {}).value || 'comptoir', note: $('#coNote', f).value };
}
dlgCart.addEventListener('input', readDraft);
dlgCart.addEventListener('change', readDraft);
dlgCart.addEventListener('submit', e => {
  e.preventDefault(); readDraft();
  const err = $('#coErr', dlgCart);
  if (!coDraft.name.trim()) { err.textContent = 'Indique ton prénom pour qu\'on t\'appelle au comptoir.'; $('#coName', dlgCart).focus(); return; }
  if (!/^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(coDraft.tel.trim())) { err.textContent = 'Numéro de téléphone invalide. Exemple : 06 12 34 56 78.'; $('#coTel', dlgCart).focus(); return; }
  if (!coDraft.slot) { err.textContent = 'Choisis une heure de retrait.'; return; }
  const sl = slots().find(s => s.v === coDraft.slot);
  lastOrder = {
    no: 'S7-' + String(Date.now()).slice(-4),
    at: new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
    name: coDraft.name.trim(), slot: sl ? sl.t : coDraft.slot, pay: coDraft.pay, note: coDraft.note.trim(),
    lines: cart.map(l => ({ ...l })), total: cartTotal()
  };
  cart = []; save(); updateCartUI(); step = 'done'; renderCart();
  const b = $('.d-body', dlgCart); if (b) b.scrollTop = 0;
});
function renderDone() {
  const o = lastOrder;
  dlgCart.innerHTML = `<div class="drawer">${head('Merci ' + esc(o.name) + ' !')}
    <div class="d-body">
      <p class="demo"><b>Démo :</b> cette commande n'a pas été transmise au restaurant.</p>
      <div class="ticket" role="document" aria-label="Ticket de commande">
        <img class="t-logo" src="img/logo.png" alt="" width="96" height="96">
        <div class="t-brand">Seven Days</div>
        <div class="t-c">6 rue d'Assas · 63000 Clermont-Ferrand<br>04 73 93 84 80</div>
        <hr>
        <div class="t-c">Commande à emporter</div>
        <div class="t-big">N° ${esc(o.no)}</div>
        <div class="t-row"><span>Passée le</span><span>${esc(o.at)}</span></div>
        <div class="t-row"><span>Retrait</span><span>${esc(o.slot)}</span></div>
        <div class="t-row"><span>Client</span><span>${esc(o.name)}</span></div>
        <hr>
        ${o.lines.map(l => `<div class="t-row"><span>${l.qty} × ${esc(l.name)}</span><span>${euro(r2(l.unit * l.qty))}</span></div>${l.lines.map(s => `<div class="t-sub">${esc(s)}</div>`).join('')}`).join('')}
        ${o.note ? `<hr><div>Cuisine : ${esc(o.note)}</div>` : ''}
        <hr>
        <div class="t-row t-total"><span>TOTAL TTC</span><span>${euro(o.total)}</span></div>
        <div class="t-row"><span>Paiement</span><span>${o.pay === 'ligne' ? 'En ligne (démo)' : 'Au comptoir'}</span></div>
        <hr>
        <div class="t-c">Présente ce numéro au comptoir.<br>Merci et à tout de suite !</div>
      </div>
    </div>
    <div class="d-foot"><button type="button" class="btn btn-ghost" data-act="again">Nouvelle commande</button></div></div>`;
}
dlgCart.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, i = +b.dataset.i;
  if (a === 'close') { dlgCart.close(); if (step === 'done') { step = 'cart'; lastOrder = null; } return; }
  if (a === 'tocarte') { dlgCart.close(); location.hash = 'carte'; $('#carte').scrollIntoView(); return; }
  if (a === 'lminus') { if (cart[i].qty > 1) cart[i].qty--; else cart.splice(i, 1); save(); updateCartUI(); }
  if (a === 'lplus') { cart[i].qty = Math.min(50, cart[i].qty + 1); save(); updateCartUI(); }
  if (a === 'checkout') step = 'checkout';
  if (a === 'back') { readDraft(); step = 'cart'; }
  if (a === 'again') { step = 'cart'; lastOrder = null; dlgCart.close(); $('#carte').scrollIntoView(); return; }
  renderCart();
});

/* ---------- Ouvertures ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-open]'); if (!b || b.closest('dialog')) return;
  openItem(b.dataset.open, { variant: b.dataset.variant, direct: !!b.dataset.direct });
});
$('#cartBtn').addEventListener('click', openCart);
$('#mbarBtn').addEventListener('click', () => { if (cartCount()) openCart(); else $('#carte').scrollIntoView(); });
updateCartUI();

/* ---------- Section active ---------- */
const navLinks = $$('[data-sec]');
const io = new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', a.dataset.sec === en.target.id ? 'true' : 'false'));
}), { threshold: 0.55 });
$$('main > section').forEach(s => io.observe(s));
})();
