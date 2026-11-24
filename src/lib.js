// Small helpers shared by the storefront, the public API and the admin API.
// Amounts are euro cents everywhere (1690 = 16,90 €).

export const LANGS = ['de', 'en', 'ar'];
export const DEFAULT_LANG = 'de';
// German for Germany, Austria and Switzerland; English and Arabic open to everyone.
export const HREFLANG = { de: 'de', en: 'en', ar: 'ar' };
export const LOCALE = { de: 'de-DE', en: 'en-GB', ar: 'ar' };

// Cloudflare Turnstile (invisible anti-bot check): the public site key saved in the admin.
export function turnstileKey(settings) {
  const k = String(settings?.turnstile_site_key || '').trim();
  return /^[0-9A-Za-z_-]{10,80}$/.test(k) ? k : '';
}

// Checks a Turnstile token with Cloudflare. Only enforced when both the site key (admin) and the
// TURNSTILE_SECRET secret are set. If Cloudflare cannot be reached the request goes through.
export async function botCheck(env, settings, token, request) {
  if (!env.TURNSTILE_SECRET || !turnstileKey(settings)) return true;
  if (!token || String(token).length > 2048) return false;
  try {
    const body = new FormData();
    body.append('secret', env.TURNSTILE_SECRET);
    body.append('response', String(token));
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    if (!res.ok) return true;
    const out = await res.json();
    return out.success === true;
  } catch {
    return true;
  }
}

// Order statuses, in the order they usually happen. "cancelled" and "returned" put the stock back.
export const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
export const RESTOCK_STATUSES = ['cancelled', 'returned'];
export const PAYMENT_METHODS = ['paypal', 'bank', 'cod'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

// Countries the shop ships to: Germany always, the others when they have a rate in the settings.
export const COUNTRIES = {
  DE: { de: 'Deutschland', en: 'Germany', ar: 'ألمانيا', zip: /^\d{5}$/ },
  AT: { de: 'Österreich', en: 'Austria', ar: 'النمسا', zip: /^\d{4}$/ },
  CH: { de: 'Schweiz', en: 'Switzerland', ar: 'سويسرا', zip: /^\d{4}$/ },
  NL: { de: 'Niederlande', en: 'Netherlands', ar: 'هولندا', zip: /^\d{4}\s?[A-Za-z]{2}$/ },
  BE: { de: 'Belgien', en: 'Belgium', ar: 'بلجيكا', zip: /^\d{4}$/ },
  LU: { de: 'Luxemburg', en: 'Luxembourg', ar: 'لوكسمبورغ', zip: /^(L-)?\d{4}$/i },
  FR: { de: 'Frankreich', en: 'France', ar: 'فرنسا', zip: /^\d{5}$/ },
  DK: { de: 'Dänemark', en: 'Denmark', ar: 'الدنمارك', zip: /^\d{4}$/ },
  PL: { de: 'Polen', en: 'Poland', ar: 'بولندا', zip: /^\d{2}-?\d{3}$/ },
  CZ: { de: 'Tschechien', en: 'Czechia', ar: 'التشيك', zip: /^\d{3}\s?\d{2}$/ },
  IT: { de: 'Italien', en: 'Italy', ar: 'إيطاليا', zip: /^\d{5}$/ },
  ES: { de: 'Spanien', en: 'Spain', ar: 'إسبانيا', zip: /^\d{5}$/ },
};

export function shippingCountries(settings) {
  const rates = parseJSON(settings.shipping_rates || '{}', {});
  return ['DE', ...Object.keys(rates).filter((c) => c !== 'DE' && COUNTRIES[c])];
}

export function countryName(code, lang) {
  return COUNTRIES[code]?.[lang] || COUNTRIES[code]?.en || code;
}

export function validZip(zip, country) {
  const re = COUNTRIES[country]?.zip;
  return re ? re.test(String(zip || '').trim()) : String(zip || '').trim().length >= 3;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// 1690 → "16,90 €" (German, Arabic) or "€16.90" (English). Latin digits in every language, like German shops.
export function money(cents, lang = 'de') {
  const n = Math.round(Number(cents) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const euros = Math.floor(abs / 100);
  const c = String(abs % 100).padStart(2, '0');
  if (lang === 'en') return `${sign}€${String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${c}`;
  return `${sign}${String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c} €`;
}

// Euros typed in the admin ("16,90", "16.90", "16") → cents. null when empty or not a number.
export function toCents(value) {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) : null;
  const s = String(value).trim().replace(/\s|€/g, '');
  if (!s) return null;
  const norm = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(norm);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// Unit price required by the German price indication law (PAngV): per 1 litre or 1 kilogram.
// 1690 cents for 100 ml → "169,00 € / 1 l".
export function unitPrice(p, lang = 'de', price = p.price) {
  const amount = Number(p.unit_amount);
  if (!(amount > 0) || !['ml', 'g'].includes(p.unit_type)) return '';
  const perBase = Math.round((price / amount) * 1000);
  return `${money(perBase, lang)} / 1 ${p.unit_type === 'ml' ? 'l' : 'kg'}`;
}

// "100 ml" / "250 g", the content shown next to the price.
export function contentLabel(p) {
  const amount = Number(p.unit_amount);
  if (!(amount > 0) || !['ml', 'g'].includes(p.unit_type)) return '';
  return `${String(amount).replace('.', ',')} ${p.unit_type}`;
}

// The VAT contained in a gross amount ("included" mode), or 0 for a small business (§ 19 UStG).
export function vatOf(gross, settings) {
  if (settings.vat_mode !== 'included') return 0;
  const rate = Number(settings.vat_rate) || 19;
  return Math.round(gross - gross / (1 + rate / 100));
}

// Phone numbers are optional. Accepts German numbers (0176 80278899, +49 176…) and any international one;
// returns +49… style digits, or null when it isn't a phone number.
export function normalizePhone(input) {
  let d = String(input ?? '').replace(/[\s.\-()/]/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  if (d.startsWith('0')) d = `+49${d.slice(1)}`;
  if (!d.startsWith('+')) d = `+${d}`;
  return /^\+[1-9]\d{6,14}$/.test(d) ? d : null;
}

export function displayPhone(p) {
  const d = String(p || '');
  return d.startsWith('+49') ? `+49 ${d.slice(3, 6)} ${d.slice(6)}` : d;
}

export function slugify(text) {
  return String(text || '')
    .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function parseJSON(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
  });
}

// A short, salted hash of the visitor's IP address: enough to count their attempts, not to identify them.
export async function visitorId(request, salt = '') {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(d).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function recentHits(db, bucket, seconds) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM rate_hits WHERE bucket = ? AND at > ?').bind(bucket, Date.now() - seconds * 1000).first();
  return row?.n || 0;
}

export async function addHit(db, bucket) {
  await db.batch([
    db.prepare('INSERT INTO rate_hits (bucket, at) VALUES (?, ?)').bind(bucket, Date.now()),
    db.prepare('DELETE FROM rate_hits WHERE at < ?').bind(Date.now() - 2 * 864e5),
  ]);
}

// Browsers send Origin on cross-site writes; refuse any that does not come from this site.
export function sameOrigin(request, url) {
  const origin = request.headers.get('origin');
  return !origin || origin === url.origin;
}

// Checks the first bytes of an upload so a file can't pretend to be a photo.
export function looksLikeImage(bytes, type) {
  const b = new Uint8Array(bytes.slice ? bytes.slice(0, 16) : bytes);
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
  if (type === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === 'image/png') return b[0] === 0x89 && ascii(1, 4) === 'PNG';
  if (type === 'image/gif') return ascii(0, 4) === 'GIF8';
  if (type === 'image/webp') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  if (type === 'image/avif') return ascii(4, 8) === 'ftyp' && /avi[fs]/.test(ascii(8, 12));
  return false;
}

export function looksLikeVideo(bytes, type) {
  const b = new Uint8Array(bytes.slice ? bytes.slice(0, 16) : bytes);
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
  if (type === 'video/mp4' || type === 'video/quicktime') return ascii(4, 8) === 'ftyp';
  if (type === 'video/webm') return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  return false;
}

export function randomToken(bytes = 16) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Order numbers like KH-261124-7KQ3: the date plus 4 random characters, easy to read out and to use as a bank reference.
export function orderNumber(date = new Date()) {
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const r = crypto.getRandomValues(new Uint8Array(4));
  return `KH-${ymd}-${[...r].map((b) => alphabet[b % alphabet.length]).join('')}`;
}

// Shipping for a country: free above the threshold (Germany only unless free_shipping_all is set), else the rate.
export function shippingFor(country, subtotal, settings) {
  const c = country || 'DE';
  const free = Number(settings.free_shipping_over) || 0;
  if (free > 0 && subtotal >= free && (c === 'DE' || settings.free_shipping_all === '1')) return 0;
  if (c === 'DE') return Math.max(0, Math.round(Number(settings.shipping_fee) || 0));
  const rates = parseJSON(settings.shipping_rates || '{}', {});
  return rates[c] != null ? Math.max(0, Math.round(Number(rates[c]) || 0)) : null;
}

// Payment methods offered at checkout. Cash on delivery (DHL Nachnahme) is for Germany only;
// PayPal needs the PayPal keys (secrets) to be set.
export function paymentMethods(settings, env = {}, country = 'DE') {
  const list = [];
  if (settings.pay_paypal !== '0' && env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) list.push('paypal');
  if (settings.pay_bank !== '0') list.push('bank');
  if (settings.pay_cod !== '0' && country === 'DE') list.push('cod');
  return list;
}

export function paymentFee(method, settings) {
  return method === 'cod' ? Math.max(0, Math.round(Number(settings.cod_fee) || 0)) : 0;
}

export function productName(p, lang) {
  return p[`name_${lang}`] || p.name_de || p.name_en || p.name_ar || '';
}

export function productField(p, key, lang) {
  return p[`${key}_${lang}`] || p[`${key}_de`] || p[`${key}_en`] || p[`${key}_ar`] || '';
}

export function productDesc(p, lang) {
  return productField(p, 'desc', lang);
}

export function productImages(p) {
  const list = parseJSON(p.images || '[]', []);
  return Array.isArray(list) ? list.filter((u) => typeof u === 'string' && u) : [];
}

// Product options (variants): groups such as Colour or Size, each with values the customer picks one of.
// Stored as JSON in products.options:
//   [{ name: {de, en, ar}, type: 'text' | 'color', values: [{ label, color, price }] }]
// `price` is added to (or, when negative, taken from) the product price for that choice.
// Older products hold a plain comma list ("S, M, L"); it is read as one unnamed group.
const OPTION_SEP = ' / ';
const cleanLabel = (v) => String(v ?? '').replace(/\s*\/\s*/g, '/').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

// With quantity offers the column holds an object instead: { groups: [...], bundles: [...] } (see cleanBundles).
function optionsData(raw) {
  if (typeof raw !== 'string') return raw;
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith('[') || text.startsWith('{')) return parseJSON(text, []);
  return [{ values: text.split(',').map((label) => ({ label })) }];
}

export function cleanOptions(raw) {
  let list = optionsData(raw);
  if (list && !Array.isArray(list) && typeof list === 'object') list = list.groups;
  if (!Array.isArray(list)) return [];
  const groups = [];
  for (const g of list.slice(0, 6)) {
    if (!g || typeof g !== 'object') continue;
    const n = g.name && typeof g.name === 'object' ? g.name : { de: g.name };
    const name = Object.fromEntries(['de', 'en', 'ar'].map((l) => [l, String(n[l] ?? '').trim().slice(0, 40)]));
    const type = g.type === 'color' ? 'color' : 'text';
    const seen = new Set();
    const values = [];
    for (const v of Array.isArray(g.values) ? g.values.slice(0, 40) : []) {
      const label = cleanLabel(typeof v === 'object' && v ? v.label : v);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      const price = Math.max(-100000, Math.min(100000, Math.round(Number(v?.price) || 0)));
      const color = /^#[0-9a-f]{6}$/i.test(v?.color || '') ? v.color.toLowerCase() : '';
      values.push({ label, ...(type === 'color' ? { color: color || '#cccccc' } : {}), price });
    }
    if (values.length) groups.push({ name, type, values });
  }
  return groups;
}

export function productOptions(p) {
  return cleanOptions(p.options || '');
}

// Quantity offers ("2 for 30,00 €, 3 for 42,00 €"): each one is a number of pieces and the price for all of them
// at the product's base price, with an optional title per language and a "most popular" flag.
//   [{ qty, price, label: {de, en, ar}, hot }]
// One piece at the normal price is always offered first, so only offers from 2 pieces up are stored.
export function cleanBundles(raw) {
  const data = optionsData(raw);
  const list = Array.isArray(data) ? null : data?.bundles;
  if (!Array.isArray(list)) return [];
  const byQty = new Map();
  for (const b of list.slice(0, 8)) {
    const qty = Math.floor(Number(b?.qty));
    const price = Math.round(Number(b?.price));
    if (!(qty >= 2 && qty <= 20) || !(price > 0) || price > 10000000 || byQty.has(qty)) continue;
    const l = b.label && typeof b.label === 'object' ? b.label : {};
    const label = Object.fromEntries(['de', 'en', 'ar'].map((k) => [k, String(l[k] ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60)]));
    byQty.set(qty, { qty, price, label, hot: Boolean(b.hot) });
  }
  return [...byQty.values()].sort((a, b) => a.qty - b.qty).slice(0, 5);
}

export function productBundles(p) {
  return cleanBundles(p.options || '');
}

// "Only 7 pieces left in the offer": a number set per product in admin, counted down by each order.
// null when the product has none of its own (the store-wide number from the settings is then used).
export function cleanLeft(value) {
  if (value === '' || value == null) return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 9999) : null;
}

// The store-wide number from the settings: 7 until the owner saves another one (empty hides the line).
export const DEFAULT_OFFER_LEFT = 7;
export function storeLeft(settings) {
  return settings?.offer_left === undefined ? DEFAULT_OFFER_LEFT : cleanLeft(settings.offer_left);
}

export function productLeft(p) {
  const data = optionsData(p.options || '');
  return data && !Array.isArray(data) && typeof data === 'object' ? cleanLeft(data.left) : null;
}

// What goes in products.options: the plain list of groups, or an object when the product has offers
// or its own "pieces left" number.
export function packOptions(groups, bundles, left = null) {
  const g = cleanOptions(groups);
  const b = cleanBundles({ bundles });
  const l = cleanLeft(left);
  if (b.length || l != null) return JSON.stringify({ groups: g, bundles: b, ...(l != null ? { left: l } : {}) });
  return g.length ? JSON.stringify(g) : '';
}

// The offers that are real discounts for this product's current price (an offer typed before a price cut is dropped).
export function liveBundles(p) {
  return productBundles(p).filter((b) => b.price < p.price * b.qty);
}

// Price of `qty` pieces: the biggest offer that fits, then any extra pieces at the normal price.
// `extra` is the per-piece price change of the chosen colour/size, added to every piece.
export function bundleTotal(bundles, base, extra, qty) {
  const unit = Math.max(0, base + extra);
  const tier = [...bundles].reverse().find((b) => b.qty <= qty && b.price < base * b.qty) || null;
  if (!tier) return { total: unit * qty, tier: null, saved: 0 };
  const total = Math.max(0, tier.price + extra * tier.qty) + (qty - tier.qty) * unit;
  return { total, tier, saved: unit * qty - total };
}

export function bundleTitle(b, lang) {
  return b.label[lang] || '';
}

const OFFER_TEXT = {
  ar: (n) => `عرض ${n} ${n <= 10 ? 'قطع' : 'قطعة'}`,
  de: (n) => `${n}er-Set`,
  en: (n) => `${n}-piece offer`,
};

// What an order line shows next to the product name: the colour/size and, when it applied, the offer.
export function lineText(line, lang) {
  const parts = [choiceText(line.choice, lang)];
  if (line.bundle) parts.push(bundleTitle(line.bundle, lang) || (OFFER_TEXT[lang] || OFFER_TEXT.de)(line.bundle.qty));
  return parts.filter(Boolean).join(' · ');
}

// Order lines are stored with a whole-cent price per piece. When an offer doesn't divide evenly
// (3 for 50,00 €), the line is split into two rows (1 × 166 + 2 × 167) so the rows still add up exactly.
export function splitLine(total, qty) {
  const low = Math.floor(total / qty);
  const high = total - low * qty;
  return [
    { price: low, qty: qty - high },
    { price: low + 1, qty: high },
  ].filter((r) => r.qty > 0);
}

export function optionGroupName(g, lang) {
  return g.name[lang] || g.name.de || g.name.en || g.name.ar || '';
}

// The cart keeps a choice as the picked labels joined in group order ("Rouge / M").
// Returns the matching values and the price change, or null when it isn't a valid choice.
export function resolveChoice(groups, key) {
  if (!groups.length) return { key: '', picks: [], extra: 0 };
  const parts = String(key ?? '').split(OPTION_SEP);
  if (parts.length !== groups.length) return null;
  const picks = [];
  for (let i = 0; i < groups.length; i++) {
    const v = groups[i].values.find((x) => x.label === parts[i]);
    if (!v) return null;
    picks.push({ group: groups[i], value: v });
  }
  return { key: parts.join(OPTION_SEP), picks, extra: picks.reduce((s, x) => s + x.value.price, 0) };
}

// "Couleur : Rouge · Taille : M" for orders, emails and the cart.
export function choiceText(choice, lang) {
  if (!choice) return '';
  return choice.picks
    .map(({ group, value }) => {
      const n = optionGroupName(group, lang);
      return n ? `${n}: ${value.label}` : value.label;
    })
    .join(' · ');
}

export async function getSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

// Prices a cart against the database. Unknown, inactive or out-of-stock products are dropped,
// quantities are capped by stock, and an option must be one the product offers.
// Returns the lines, the subtotal, shipping for the country, the payment fee and the VAT contained.
export async function quote(db, rawItems, { country = 'DE', method = '' } = {}, settings) {
  const items = (Array.isArray(rawItems) ? rawItems : []).slice(0, 50);
  const ids = [...new Set(items.map((i) => Number(i?.id)).filter((n) => Number.isInteger(n) && n > 0))];
  const empty = { lines: [], subtotal: 0, shipping: 0, fee: 0, total: 0, vat: 0, issues: [], shipsTo: true };
  if (!ids.length) return empty;
  const { results } = await db
    .prepare(`SELECT * FROM products WHERE active = 1 AND id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids)
    .all();
  const byId = new Map(results.map((p) => [p.id, p]));
  const lines = [];
  const issues = [];
  const used = new Map();
  for (const item of items) {
    const p = byId.get(Number(item?.id));
    if (!p) {
      issues.push({ id: item?.id, issue: 'unavailable' });
      continue;
    }
    const choice = resolveChoice(productOptions(p), item.option);
    if (!choice) {
      issues.push({ id: p.id, issue: 'option' });
      continue;
    }
    const unit = Math.max(0, p.price + choice.extra);
    let qty = Math.min(20, Math.max(1, Math.floor(Number(item.qty) || 1)));
    if (p.stock != null) {
      const left = p.stock - (used.get(p.id) || 0);
      if (left <= 0) {
        issues.push({ id: p.id, issue: 'stock' });
        continue;
      }
      if (qty > left) {
        qty = left;
        issues.push({ id: p.id, issue: 'qty' });
      }
    }
    used.set(p.id, (used.get(p.id) || 0) + qty);
    const deal = bundleTotal(productBundles(p), p.price, choice.extra, qty);
    lines.push({ product: p, id: p.id, option: choice.key, choice, qty, price: unit, total: deal.total, bundle: deal.tier, saved: deal.saved });
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const ship = shippingFor(country, subtotal, settings);
  const shipping = ship == null ? 0 : ship;
  const fee = paymentFee(method, settings);
  const total = subtotal + shipping + fee;
  return { lines, subtotal, shipping, fee, total, vat: vatOf(total, settings), issues, shipsTo: ship != null };
}
