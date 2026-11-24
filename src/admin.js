// Admin API (/api/admin/*), used by public/admin/. Protected by the ADMIN_PASSWORD secret:
// logging in sets a signed, HttpOnly session cookie that lasts 7 days.

import { sanitizeRich, isRich } from './rich.js';
import { writeDescription } from './ai.js';
import { sendEmail, sendStatusEmail, sendPaidEmail, emailConfig, confirmationEmail, validEmail, STATUS_EMAILS } from './email.js';
import { json, getSettings, turnstileKey, botCheck, slugify, STATUSES, RESTOCK_STATUSES, PAYMENT_STATUSES, randomToken, parseJSON, displayPhone, visitorId, recentHits, addHit, sameOrigin, looksLikeImage, looksLikeVideo, packOptions } from './lib.js';
import { validIban, cleanIban } from './girocode.js';

const SESSION_DAYS = 7;
// Password guessing: after 5 wrong passwords in 15 minutes, or 20 in a day, that visitor is locked out for a while.
const LOGIN_LIMITS = [[5, 15 * 60], [20, 24 * 3600]];
const COOKIE = 'admin_session';
const SETTING_KEYS = [
  'store_name', 'whatsapp', 'phone', 'contact_email', 'shipping_fee', 'shipping_rates', 'free_shipping_over', 'free_shipping_all', 'delivery_days',
  'pay_paypal', 'pay_bank', 'pay_cod', 'cod_fee', 'paypal_mode', 'bank_owner', 'bank_iban', 'bank_bic', 'bank_name', 'bank_days',
  'vat_mode', 'vat_rate', 'founder_photo',
  'announcement_de', 'announcement_en', 'announcement_ar',
  'hero_title_de', 'hero_title_en', 'hero_title_ar', 'hero_text_de', 'hero_text_en', 'hero_text_ar',
  'email_from', 'notify_email', 'email_status_updates',
  'instagram', 'facebook', 'tiktok', 'meta_pixel_id', 'tiktok_pixel_id', 'google_verify', 'turnstile_site_key',
  'legal_name', 'legal_company', 'legal_address', 'legal_vat_id', 'legal_register',
];

// Two-factor login (TOTP, RFC 6238): a 6-digit code from an authenticator app, on top of the password.
// Switched on by the ADMIN_TOTP_SECRET secret (base32). A code is accepted 30 s before and after its time.
function base32(text) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of String(text).toUpperCase().replace(/[^A-Z2-7]/g, '')) bits += abc.indexOf(ch).toString(2).padStart(5, '0');
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

export async function totpCode(secret, step) {
  const key = await crypto.subtle.importKey('raw', base32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new ArrayBuffer(8);
  new DataView(msg).setUint32(4, step);
  new DataView(msg).setUint32(0, Math.floor(step / 2 ** 32));
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1e6).padStart(6, '0');
}

export async function validTotp(secret, code, now = Date.now()) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const step = Math.floor(now / 30000);
  for (const d of [-1, 0, 1]) if ((await totpCode(secret, step + d)) === c) return true;
  return false;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`admin-session:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function makeSession(secret) {
  const payload = `${Date.now() + SESSION_DAYS * 864e5}.${randomToken(8)}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${b64(sig)}`;
}

async function validSession(cookieValue, secret) {
  const parts = String(cookieValue || '').split('.');
  if (parts.length !== 3 || Number(parts[0]) < Date.now()) return false;
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return false;
  }
}

async function samePassword(a, b) {
  // Compare digests so the comparison takes the same time whatever the input.
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const ax = new Uint8Array(x);
  const ay = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ ay[i];
  return diff === 0;
}

function getCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : '';
}

async function body(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const int = (v, fallback = null) => (v === '' || v == null || Number.isNaN(Number(v)) ? fallback : Math.round(Number(v)));

export async function handleAdmin(request, env, url, ctx) {
  const path = url.pathname.slice('/api/admin'.length);
  const method = request.method;
  const secret = env.ADMIN_PASSWORD;
  if (!secret) return json({ error: 'ADMIN_PASSWORD is not set. Run: npx wrangler secret put ADMIN_PASSWORD' }, 503);

  if (method !== 'GET' && !sameOrigin(request, url)) return json({ error: 'bad_origin' }, 403);

  // The login page asks which anti-bot check to show (the public Turnstile key, or none).
  if (path === '/login-config' && method === 'GET') {
    const settings = await getSettings(env.DB);
    return json({ turnstile: env.TURNSTILE_SECRET ? turnstileKey(settings) : '', totp: Boolean(env.ADMIN_TOTP_SECRET) });
  }
  if (path === '/login' && method === 'POST') {
    const bucket = `login:${await visitorId(request, secret)}`;
    for (const [max, seconds] of LOGIN_LIMITS) {
      if ((await recentHits(env.DB, bucket, seconds)) >= max) return json({ error: 'locked', minutes: Math.ceil(seconds / 60) }, 429);
    }
    const b = await body(request);
    if (!b || !(await botCheck(env, await getSettings(env.DB), b.cf_token, request))) {
      await addHit(env.DB, bucket);
      return json({ error: 'bot' }, 403);
    }
    // Wrong password or wrong 2FA code get the same answer, so a guesser can't tell which one failed.
    const passOk = await samePassword(String(b.password || '').slice(0, 200), secret);
    const codeOk = !env.ADMIN_TOTP_SECRET || (await validTotp(env.ADMIN_TOTP_SECRET, b.code));
    if (!passOk || !codeOk) {
      await addHit(env.DB, bucket);
      await new Promise((r) => setTimeout(r, 800));
      return json({ error: 'wrong_password' }, 401);
    }
    const token = await makeSession(secret + (env.ADMIN_TOTP_SECRET || ''));
    await env.DB.prepare('DELETE FROM rate_hits WHERE bucket = ?').bind(bucket).run();
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}` });
  }
  if (path === '/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }
  if (!(await validSession(getCookie(request, COOKIE), secret + (env.ADMIN_TOTP_SECRET || '')))) return json({ error: 'unauthorized' }, 401);
  // Writes must be JSON (or an image upload), which a cross-site form cannot send; the cookie is SameSite=Strict too.
  if (method !== 'GET' && path !== '/images' && !(request.headers.get('content-type') || '').includes('application/json')) {
    return json({ error: 'bad_request' }, 400);
  }

  const db = env.DB;
  let m;

  if (path === '/me') return json({ ok: true, images: true, r2: Boolean(env.IMAGES), emails: Boolean(env.BREVO_API_KEY), ai: Boolean(env.ANTHROPIC_API_KEY), turnstile: Boolean(env.TURNSTILE_SECRET), paypal: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET), totp: Boolean(env.ADMIN_TOTP_SECRET), weak_password: secret.length < 12 });

  // AI description writer: the seller reviews the text before saving it.
  if (path === '/ai/describe' && method === 'POST') {
    const b = await body(request);
    if (!b) return json({ error: 'bad_request' }, 400);
    const r = await writeDescription(env, url.origin, b);
    return json(r.body, r.status);
  }

  if (path === '/stats' && method === 'GET') {
    // Dashboard numbers. Days are counted in German winter time (UTC+1).
    const day = "date(created_at, '+1 hour')";
    const live = "status NOT IN ('cancelled', 'returned')";
    const [kpi, daily, byStatus, top, cities, recent, low] = await db.batch([
      db.prepare(
        `SELECT
          SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_orders,
          SUM(CASE WHEN payment_method = 'bank' AND payment_status = 'pending' AND status NOT IN ('cancelled', 'returned') THEN 1 ELSE 0 END) AS awaiting_transfer,
          SUM(CASE WHEN payment_method = 'paypal' AND payment_status = 'pending' AND status NOT IN ('cancelled', 'returned') THEN 1 ELSE 0 END) AS awaiting_paypal,
          SUM(CASE WHEN ${day} = date('now', '+1 hour') THEN 1 ELSE 0 END) AS today,
          SUM(CASE WHEN ${day} = date('now', '+1 hour') AND ${live} THEN total ELSE 0 END) AS today_sales,
          SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 ELSE 0 END) AS orders_30d,
          SUM(CASE WHEN created_at > datetime('now', '-30 days') AND ${live} THEN total ELSE 0 END) AS sales_30d,
          SUM(CASE WHEN created_at > datetime('now', '-30 days') AND status = 'delivered' THEN total ELSE 0 END) AS revenue_30d,
          SUM(CASE WHEN created_at > datetime('now', '-30 days') AND status = 'delivered' THEN 1 ELSE 0 END) AS delivered_30d,
          SUM(CASE WHEN created_at > datetime('now', '-30 days') AND status IN ('cancelled', 'returned') THEN 1 ELSE 0 END) AS failed_30d,
          SUM(CASE WHEN created_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days') THEN 1 ELSE 0 END) AS orders_prev,
          SUM(CASE WHEN created_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days') AND ${live} THEN total ELSE 0 END) AS sales_prev
        FROM orders`,
      ),
      db.prepare(`SELECT ${day} AS d, COUNT(*) AS orders, SUM(CASE WHEN ${live} THEN total ELSE 0 END) AS sales FROM orders WHERE created_at > datetime('now', '-30 days') GROUP BY d ORDER BY d`),
      db.prepare("SELECT status, COUNT(*) AS n FROM orders WHERE created_at > datetime('now', '-30 days') GROUP BY status"),
      db.prepare(
        `SELECT i.product_id, i.name, SUM(i.qty) AS qty, SUM(i.qty * i.price) AS sales, (SELECT json_extract(p.images, '$[0]') FROM products p WHERE p.id = i.product_id) AS image, (SELECT p.name_ar FROM products p WHERE p.id = i.product_id) AS name_ar, (SELECT p.name_en FROM products p WHERE p.id = i.product_id) AS name_en
         FROM order_items i JOIN orders o ON o.id = i.order_id
         WHERE o.created_at > datetime('now', '-30 days') AND o.${live}
         GROUP BY i.product_id, i.name ORDER BY qty DESC, sales DESC LIMIT 5`,
      ),
      db.prepare(`SELECT city, COUNT(*) AS n, SUM(total) AS sales FROM orders WHERE created_at > datetime('now', '-30 days') AND ${live} GROUP BY city ORDER BY n DESC LIMIT 5`),
      db.prepare("SELECT id, number, status, payment_method, payment_status, first_name || ' ' || last_name AS name, city, total, created_at FROM orders ORDER BY id DESC LIMIT 6"),
      db.prepare('SELECT id, name_de, name_ar, name_en, stock, images FROM products WHERE active = 1 AND stock IS NOT NULL AND stock <= 3 ORDER BY stock LIMIT 10'),
    ]);
    return json({
      ...kpi.results[0],
      daily: daily.results,
      by_status: Object.fromEntries(byStatus.results.map((r) => [r.status, r.n])),
      top_products: top.results,
      top_cities: cities.results,
      recent: recent.results,
      low_stock: low.results,
    });
  }

  // Sends a sample order confirmation to the notification address, to check the email setup.
  if (path === '/test-email' && method === 'POST') {
    const settings = await getSettings(db);
    const cfg = emailConfig(env, settings);
    if (!env.BREVO_API_KEY) return json({ error: 'no_email_key' }, 400);
    if (!validEmail(cfg.from)) return json({ error: 'no_email_from' }, 400);
    if (!validEmail(cfg.notify)) return json({ error: 'no_notify_email' }, 400);
    const order = { id: 0, number: 'KH-TEST-0000', token: 'test', lang: 'de', first_name: 'Test', last_name: 'Kundin', phone: '', email: cfg.notify, street: 'Musterstraße 1', address2: '', zip: '20095', city: 'Hamburg', country: 'DE', note: '', payment_method: 'bank', payment_status: 'pending', subtotal: 1690, shipping: 490, payment_fee: 0, total: 2180, vat: 0 };
    const m = confirmationEmail({ order, items: [{ name: 'Testprodukt', option: '', price: 1690, qty: 1 }], origin: url.origin, cfg, settings });
    try {
      await sendEmail(env, cfg, { to: cfg.notify, ...m, subject: `[Test] ${m.subject}` });
    } catch (err) {
      return json({ error: 'email_failed', detail: String(err.message).slice(0, 300) }, 502);
    }
    return json({ ok: true, to: cfg.notify });
  }

  // Orders
  if (path === '/orders' && method === 'GET') {
    const status = url.searchParams.get('status');
    const q = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, int(url.searchParams.get('page'), 1));
    const where = [];
    const args = [];
    if (STATUSES.includes(status)) {
      where.push('status = ?');
      args.push(status);
    }
    if (q) {
      where.push("(number LIKE ? OR (first_name || ' ' || last_name) LIKE ? OR email LIKE ? OR city LIKE ? OR zip LIKE ?)");
      const like = `%${q}%`;
      args.push(like, like, like, like, like);
    }
    const pay = url.searchParams.get('payment');
    if (pay === 'open') where.push("payment_status = 'pending' AND payment_method IN ('bank', 'paypal')");
    const sql = `SELECT id, number, status, payment_method, payment_status, first_name || ' ' || last_name AS name, phone, email, zip, city, country, total, created_at FROM orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 50 OFFSET ?`;
    const rows = await db.prepare(sql).bind(...args, (page - 1) * 50).all();
    const counts = await db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();
    return json({ orders: rows.results.map((o) => ({ ...o, phone_display: displayPhone(o.phone) })), page, counts: Object.fromEntries(counts.results.map((r) => [r.status, r.n])) });
  }

  if (path === '/orders.csv' && method === 'GET') {
    const status = url.searchParams.get('status');
    const rows = await db
      .prepare(`SELECT o.*, (SELECT group_concat(name || CASE WHEN option != '' THEN ' (' || option || ')' ELSE '' END || ' x' || qty, ' + ') FROM order_items WHERE order_id = o.id) AS items FROM orders o ${STATUSES.includes(status) ? 'WHERE status = ?' : ''} ORDER BY id DESC LIMIT 5000`)
      .bind(...(STATUSES.includes(status) ? [status] : []))
      .all();
    const cols = ['number', 'created_at', 'status', 'payment_method', 'payment_status', 'first_name', 'last_name', 'street', 'address2', 'zip', 'city', 'country', 'email', 'phone', 'items', 'subtotal', 'shipping', 'payment_fee', 'total', 'vat', 'carrier', 'tracking', 'note', 'admin_note'];
    const euro = (c) => (Number(c || 0) / 100).toFixed(2).replace('.', ',');
    const money = new Set(['subtotal', 'shipping', 'payment_fee', 'total', 'vat']);
    const cell = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // stop spreadsheets from running a cell as a formula
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + [cols.join(';'), ...rows.results.map((r) => cols.map((c) => cell(money.has(c) ? euro(r[c]) : c === 'phone' ? displayPhone(r.phone) : r[c])).join(';'))].join('\n');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="bestellungen-${new Date().toISOString().slice(0, 10)}.csv"` } });
  }

  if ((m = path.match(/^\/orders\/(\d+)$/))) {
    const id = Number(m[1]);
    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!order) return json({ error: 'not_found' }, 404);
    if (method === 'GET') {
      const [items, events] = await Promise.all([
        db.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(id).all(),
        db.prepare('SELECT kind, value, created_at FROM order_events WHERE order_id = ? ORDER BY id').bind(id).all(),
      ]);
      return json({ order: { ...order, name: `${order.first_name} ${order.last_name}`, phone_display: displayPhone(order.phone) }, items: items.results, events: events.results });
    }
    if (method === 'PATCH') {
      const b = await body(request);
      if (!b) return json({ error: 'bad_request' }, 400);
      const statements = [];
      const next = b.status ?? order.status;
      if (!STATUSES.includes(next)) return json({ error: 'bad_status' }, 400);
      const wasOut = RESTOCK_STATUSES.includes(order.status);
      const isOut = RESTOCK_STATUSES.includes(next);
      if (wasOut !== isOut) {
        // Cancelling or returning puts the items back in stock; reopening takes them out again.
        const items = await db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').bind(id).all();
        for (const it of items.results) {
          if (it.product_id) statements.push(db.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL').bind(isOut ? it.qty : -it.qty, it.product_id));
        }
      }
      const payNext = b.payment_status ?? order.payment_status;
      if (!PAYMENT_STATUSES.includes(payNext)) return json({ error: 'bad_status' }, 400);
      const carrier = b.carrier != null ? String(b.carrier).slice(0, 40) : order.carrier;
      const tracking = b.tracking != null ? String(b.tracking).replace(/\s+/g, '').slice(0, 60) : order.tracking;
      statements.push(
        db
          .prepare("UPDATE orders SET status = ?, payment_status = ?, paid_at = CASE WHEN ? = 'paid' AND paid_at IS NULL THEN datetime('now') ELSE paid_at END, carrier = ?, tracking = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(next, payNext, payNext, carrier, tracking, b.admin_note != null ? String(b.admin_note).slice(0, 1000) : order.admin_note, id),
      );
      const event = (kind, value) => db.prepare('INSERT INTO order_events (order_id, kind, value) VALUES (?, ?, ?)').bind(id, kind, value);
      if (next !== order.status) statements.push(event('status', next));
      if (payNext !== order.payment_status) statements.push(event('payment', payNext));
      if (tracking !== order.tracking && tracking) statements.push(event('tracking', `${carrier || 'DHL'} ${tracking}`));
      try {
        await db.batch(statements);
      } catch (err) {
        if (String(err).includes('CHECK')) return json({ error: 'not_enough_stock' }, 409);
        throw err;
      }
      let emailed = false;
      const updated = { ...order, status: next, payment_status: payNext, carrier, tracking };
      if (order.email && b.notify !== false && (next !== order.status || (payNext === 'paid' && order.payment_status !== 'paid'))) {
        const settings = await getSettings(db);
        const items = await db.prepare('SELECT name, option, price, qty FROM order_items WHERE order_id = ?').bind(id).all();
        const on = emailConfig(env, settings).on && settings.email_status_updates !== '0';
        if (next !== order.status && STATUS_EMAILS.includes(next)) {
          emailed = on;
          ctx.waitUntil(sendStatusEmail(env, settings, url.origin, updated, items.results));
        } else if (payNext === 'paid' && order.payment_status !== 'paid') {
          emailed = on;
          ctx.waitUntil(sendPaidEmail(env, settings, url.origin, updated, items.results));
        }
      }
      return json({ ok: true, emailed });
    }
  }

  // Newsletter sign-ups, as a CSV to import into an email tool (Brevo, Mailchimp…).
  if (path === '/subscribers.csv' && method === 'GET') {
    const rows = await db.prepare('SELECT email, lang, created_at FROM subscribers ORDER BY created_at DESC').all();
    const csv = '\ufeff' + ['email;lang;created_at', ...rows.results.map((r) => `${r.email};${r.lang};${r.created_at}`)].join('\n');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"` } });
  }
  if (path === '/subscribers' && method === 'GET') {
    const row = await db.prepare('SELECT COUNT(*) AS n FROM subscribers').first();
    return json({ count: row?.n || 0 });
  }

  // Products
  if (path === '/products' && method === 'GET') {
    const rows = await db.prepare('SELECT * FROM products ORDER BY sort, id DESC').all();
    return json({ products: rows.results });
  }
  if (path === '/products' && method === 'POST') return saveProduct(db, null, await body(request));
  if ((m = path.match(/^\/products\/(\d+)$/))) {
    const id = Number(m[1]);
    if (method === 'PUT') return saveProduct(db, id, await body(request));
    if (method === 'DELETE') {
      const old = await db.prepare('SELECT p.slug, c.slug AS cat FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?').bind(id).first();
      const stmts = [db.prepare('DELETE FROM products WHERE id = ?').bind(id)];
      if (old) stmts.push(saveRedirect(db, `/p/${old.slug}`, old.cat ? `/c/${old.cat}` : '/shop'));
      await db.batch(stmts);
      return json({ ok: true });
    }
  }

  // Blog posts
  if (path === '/posts' && method === 'GET') {
    const rows = await db.prepare('SELECT * FROM posts ORDER BY created_at DESC, id DESC').all();
    return json({ posts: rows.results });
  }
  if (path === '/posts' && method === 'POST') return savePost(db, null, await body(request));
  if ((m = path.match(/^\/posts\/(\d+)$/))) {
    const id = Number(m[1]);
    if (method === 'PUT') return savePost(db, id, await body(request));
    if (method === 'DELETE') {
      await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // Categories
  if (path === '/categories' && method === 'GET') {
    const rows = await db.prepare('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS products FROM categories c ORDER BY sort, id').all();
    return json({ categories: rows.results });
  }
  if (path === '/categories' && method === 'POST') return saveCategory(db, null, await body(request));
  if ((m = path.match(/^\/categories\/(\d+)$/))) {
    const id = Number(m[1]);
    if (method === 'PUT') return saveCategory(db, id, await body(request));
    if (method === 'DELETE') {
      await db.batch([db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').bind(id), db.prepare('DELETE FROM categories WHERE id = ?').bind(id)]);
      return json({ ok: true });
    }
  }

  // Settings
  if (path === '/settings' && method === 'GET') return json({ settings: await getSettings(db) });
  if (path === '/settings' && method === 'PUT') {
    const b = await body(request);
    if (!b) return json({ error: 'bad_request' }, 400);
    if (b.shipping_rates != null && typeof parseJSON(b.shipping_rates, null) !== 'object') return json({ error: 'bad_shipping_rates' }, 400);
    if (b.bank_iban) {
      if (!validIban(b.bank_iban)) return json({ error: 'bad_iban' }, 400);
      b.bank_iban = cleanIban(b.bank_iban);
    }
    const statements = SETTING_KEYS.filter((k) => k in b).map((k) =>
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, String(b[k] ?? '').slice(0, 2000)),
    );
    if (statements.length) await db.batch(statements);
    return json({ ok: true });
  }

  // Image upload: raw file body → R2 when it is set up, otherwise the images table in D1 → /img/<key>
  if (path === '/images' && method === 'POST') {
    const type = (request.headers.get('content-type') || '').split(';')[0];
    if (VIDEO_EXT[type]) return uploadVideo(env, request, type);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' }[type];
    if (!ext) return json({ error: 'bad_type' }, 415);
    const data = await request.arrayBuffer();
    if (data.byteLength > (env.IMAGES ? 5 : 1.8) * 1024 * 1024) return json({ error: 'too_large' }, 413);
    if (!looksLikeImage(data, type)) return json({ error: 'bad_type' }, 415);
    const key = `p/${Date.now().toString(36)}-${randomToken(6)}.${ext}`;
    if (env.IMAGES) await env.IMAGES.put(key, data, { httpMetadata: { contentType: type } });
    else await db.prepare('INSERT INTO images (key, type, data, size) VALUES (?, ?, ?, ?)').bind(key, type, data, data.byteLength).run();
    return json({ url: `/img/${key}` }, 201);
  }


  return json({ error: 'not_found' }, 404);
}

// Videos for product descriptions (5 MB max). Without R2 they go to D1 in 1.5 MB pieces,
// because a single D1 value can't be larger than 2 MB.
const VIDEO_EXT = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
export const VIDEO_MAX = 5 * 1024 * 1024;
export const CHUNK = 1.5 * 1024 * 1024;

async function uploadVideo(env, request, type) {
  const data = await request.arrayBuffer();
  if (data.byteLength > VIDEO_MAX) return json({ error: 'video_too_large' }, 413);
  if (!looksLikeVideo(data, type)) return json({ error: 'bad_type' }, 415);
  const key = `v/${Date.now().toString(36)}-${randomToken(6)}.${VIDEO_EXT[type]}`;
  if (env.IMAGES) {
    await env.IMAGES.put(key, data, { httpMetadata: { contentType: type } });
  } else {
    for (let i = 0, off = 0; off < data.byteLength; i++, off += CHUNK) {
      await env.DB.prepare('INSERT INTO media_chunks (key, idx, data) VALUES (?, ?, ?)').bind(key, i, data.slice(off, off + CHUNK)).run();
    }
    await env.DB.prepare('INSERT INTO images (key, type, data, size) VALUES (?, ?, ?, ?)').bind(key, type, new ArrayBuffer(0), data.byteLength).run();
  }
  return json({ url: `/img/${key}` }, 201);
}

// Photos and videos shown in the description: [{ type: 'image' | 'video', url }], our own uploads or https links.
function descMedia(v) {
  let arr = v;
  if (typeof v === 'string') {
    try {
      arr = JSON.parse(v || '[]');
    } catch {
      arr = [];
    }
  }
  return (Array.isArray(arr) ? arr : [])
    .map((m) => ({ type: m && m.type === 'video' ? 'video' : 'image', url: String((m && m.url) || '').trim() }))
    .filter((m) => m.url.startsWith('/img/') || m.url.startsWith('https://'))
    .slice(0, 20);
}

function saveRedirect(db, path, target) {
  return db.prepare('INSERT INTO redirects (path, target) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET target = excluded.target').bind(path, target);
}

// Blog posts: title, short summary (used as the search description), body from the rich editor, cover photo.
async function savePost(db, id, b) {
  if (!b) return json({ error: 'bad_request' }, 400);
  const L3 = ['de', 'en', 'ar'];
  const title = Object.fromEntries(L3.map((l) => [l, String(b[`title_${l}`] || '').trim().slice(0, 200)]));
  if (!title.de && !title.ar && !title.en) return json({ error: 'title_required' }, 422);
  const slug = slugify(b.slug || title.de || title.en) || `artikel-${Date.now().toString(36)}`;
  const cover = String(b.cover || '').trim();
  const values = [
    slug,
    ...L3.map((l) => title[l]),
    ...L3.map((l) => String(b[`excerpt_${l}`] || '').trim().slice(0, 300)),
    ...L3.map((l) => {
      const d = String(b[`body_${l}`] || '');
      return isRich(d) ? sanitizeRich(d) : d.slice(0, 50000);
    }),
    cover.startsWith('/') || cover.startsWith('https://') ? cover.slice(0, 500) : '',
    b.published === false || b.published === 0 ? 0 : 1,
  ];
  try {
    if (id) {
      await db
        .prepare("UPDATE posts SET slug=?, title_de=?, title_en=?, title_ar=?, excerpt_de=?, excerpt_en=?, excerpt_ar=?, body_de=?, body_en=?, body_ar=?, cover=?, published=?, updated_at=datetime('now') WHERE id=?")
        .bind(...values, id)
        .run();
      return json({ ok: true, id });
    }
    const row = await db
      .prepare('INSERT INTO posts (slug, title_de, title_en, title_ar, excerpt_de, excerpt_en, excerpt_ar, body_de, body_en, body_ar, cover, published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id')
      .bind(...values)
      .first();
    return json({ ok: true, id: row.id }, 201);
  } catch (err) {
    if (String(err).includes('UNIQUE')) return json({ error: 'slug_taken' }, 409);
    throw err;
  }
}

async function saveProduct(db, id, b) {
  if (!b) return json({ error: 'bad_request' }, 400);
  const L3 = ['de', 'en', 'ar'];
  const txt = (k, max) => L3.map((l) => String(b[`${k}_${l}`] || '').trim().slice(0, max));
  const names = Object.fromEntries(L3.map((l) => [l, String(b[`name_${l}`] || '').trim().slice(0, 200)]));
  if (!names.de && !names.ar && !names.en) return json({ error: 'name_required' }, 422);
  const price = int(b.price);
  if (price == null || price < 0) return json({ error: 'price_required' }, 422);
  const slug = slugify(b.slug || names.de || names.en) || `produkt-${Date.now().toString(36)}`;
  const images = (Array.isArray(b.images) ? b.images : String(b.images || '').split('\n'))
    .map((s) => String(s).trim())
    .filter((s) => s.startsWith('/') || s.startsWith('https://'))
    .slice(0, 10);
  const stock = int(b.stock);
  const rich = (d, max) => (isRich(d) ? sanitizeRich(d) : String(d || '').slice(0, max));
  const unitAmount = Number(String(b.unit_amount ?? '').replace(',', '.'));
  const values = [
    slug, int(b.category_id), ...L3.map((l) => names[l]),
    ...txt('subtitle', 160),
    ...L3.map((l) => rich(b[`desc_${l}`], 20000)),
    String(b.ingredients || '').trim().slice(0, 4000),
    ...L3.map((l) => rich(b[`usage_${l}`], 6000)),
    price, int(b.compare_price),
    unitAmount > 0 ? Math.round(unitAmount * 100) / 100 : null, ['ml', 'g'].includes(b.unit_type) ? b.unit_type : '',
    stock == null ? null : Math.max(0, stock),
    packOptions(b.options, b.bundles, null),
    JSON.stringify(images), b.featured ? 1 : 0, b.active === false || b.active === 0 ? 0 : 1, int(b.sort, 0),
    JSON.stringify(descMedia(b.desc_media)),
  ];
  const COLS = 'slug, category_id, name_de, name_en, name_ar, subtitle_de, subtitle_en, subtitle_ar, desc_de, desc_en, desc_ar, ingredients, usage_de, usage_en, usage_ar, price, compare_price, unit_amount, unit_type, stock, options, images, featured, active, sort, desc_media';
  try {
    const live = db.prepare('DELETE FROM redirects WHERE path = ?').bind(`/p/${slug}`);
    if (id) {
      const before = await db.prepare('SELECT slug FROM products WHERE id = ?').bind(id).first();
      const stmts = [db.prepare(`UPDATE products SET ${COLS.split(', ').map((c) => `${c}=?`).join(', ')} WHERE id=?`).bind(...values, id), live];
      if (before && before.slug !== slug) stmts.push(saveRedirect(db, `/p/${before.slug}`, `/p/${slug}`));
      await db.batch(stmts);
      return json({ ok: true, id });
    }
    await live.run();
    const row = await db.prepare(`INSERT INTO products (${COLS}) VALUES (${COLS.split(', ').map(() => '?').join(',')}) RETURNING id`).bind(...values).first();
    return json({ ok: true, id: row.id }, 201);
  } catch (err) {
    if (String(err).includes('UNIQUE')) return json({ error: 'slug_taken' }, 409);
    throw err;
  }
}

async function saveCategory(db, id, b) {
  if (!b) return json({ error: 'bad_request' }, 400);
  const name_de = String(b.name_de || '').trim();
  const name_ar = String(b.name_ar || '').trim();
  const name_en = String(b.name_en || '').trim();
  if (!name_de && !name_ar && !name_en) return json({ error: 'name_required' }, 422);
  const slug = slugify(b.slug || name_de || name_en) || `kategorie-${Date.now().toString(36)}`;
  const image = String(b.image || '').trim();
  const imageOk = image === '' || image.startsWith('/') || image.startsWith('https://') ? image.slice(0, 500) : '';
  try {
    if (id) {
      await db.prepare('UPDATE categories SET slug=?, name_de=?, name_en=?, name_ar=?, sort=?, image=? WHERE id=?').bind(slug, name_de, name_en, name_ar, int(b.sort, 0), imageOk, id).run();
      return json({ ok: true, id });
    }
    const row = await db.prepare('INSERT INTO categories (slug, name_de, name_en, name_ar, sort, image) VALUES (?,?,?,?,?,?) RETURNING id').bind(slug, name_de, name_en, name_ar, int(b.sort, 0), imageOk).first();
    return json({ ok: true, id: row.id }, 201);
  } catch (err) {
    if (String(err).includes('UNIQUE')) return json({ error: 'slug_taken' }, 409);
    throw err;
  }
}
