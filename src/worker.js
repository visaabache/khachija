// Store Worker: renders the storefront (/de, /en, /ar), serves the order API (/api/*), the PayPal return,
// the admin API (/api/admin/*), uploaded photos (/img/*) and static files (public/).

import { T } from './i18n.js';
import {
  LANGS, HREFLANG, DEFAULT_LANG, json, esc, getSettings, quote, normalizePhone, orderNumber, randomToken, productName, productDesc, productImages,
  turnstileKey, botCheck, visitorId, recentHits, addHit, sameOrigin, parseJSON, lineText, splitLine, shippingCountries, validZip, paymentMethods, money,
} from './lib.js';
import { homePage, listingPage, productPage, cartPage, checkoutPage, orderPage, notFoundPage, legalPage, aboutPage, contactPage, blogIndexPage, blogPostPage, catName } from './render.js';
import { LEGAL_PAGES } from './legal.js';
import { handleAdmin, CHUNK as VIDEO_CHUNK } from './admin.js';
import { pixelCsp } from './pixels.js';
import { richText } from './rich.js';
import { sendOrderEmails, validEmail } from './email.js';
import { createPaypalOrder, capturePaypalOrder } from './paypal.js';

const ORDER_BY = { price_asc: 'price ASC, id DESC', price_desc: 'price DESC, id DESC' };

// Photos used by the home and about pages (the product photos in public/assets/p).
const PHOTOS = {
  hero: ['/assets/p/serum-1.webp', '/assets/p/henna-1.webp', '/assets/p/rizinusoel-1.webp'],
  story: '/assets/p/khadija.webp',
  banner: ['/assets/p/kaffeeseife-1.webp', '/assets/p/sidr-2.webp', '/assets/p/aker-fassi-seife-1.webp'],
  about: ['/assets/p/khadija.webp', '/assets/p/kaffeeseife-3.webp', '/assets/p/serum-2.webp', '/assets/p/henna-2.webp', '/assets/p/sidr-1.webp', '/assets/p/rizinusoel-2.webp'],
};

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' https:; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com; upgrade-insecure-requests";
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), usb=()',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'cross-origin-opener-policy': 'same-origin-allow-popups',
  'content-security-policy': CSP,
};

function html(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...SECURITY_HEADERS } });
}

function pickLang(request) {
  const saved = (request.headers.get('cookie') || '').match(/(?:^|;\s*)lang=(de|en|ar)/);
  if (saved) return saved[1];
  for (const part of (request.headers.get('accept-language') || '').toLowerCase().split(',')) {
    const code = part.trim().slice(0, 2);
    if (LANGS.includes(code)) return code;
  }
  const country = String(request.cf?.country || '').toUpperCase();
  if (!country) return DEFAULT_LANG;
  if (['DE', 'AT', 'CH', 'LI', 'LU'].includes(country)) return 'de';
  if (['MA', 'DZ', 'TN', 'LY', 'EG', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'SY', 'IQ', 'YE', 'PS', 'SD', 'MR'].includes(country)) return 'ar';
  return 'en';
}

const PROBE = /(\.(php\d?|asp|aspx|jsp|cgi|env|ini|sql|bak|old|swp|log|yml|yaml)(\/|$)|^\/(wp-|wordpress|wp\/|phpmyadmin|pma\/|xmlrpc|\.git|\.env|\.aws|\.ssh|\.svn|\.ds_store|vendor\/|cgi-bin|boaform|hnap1|actuator|server-status|config\.json|owa\/|autodiscover|telescope|_profiler|solr\/|jenkins|console\/))/i;
const BAD_AGENT = /(sqlmap|nikto|nuclei|masscan|zgrab|wpscan|acunetix|nessus|openvas|dirbuster|gobuster|feroxbuster|ffuf|wfuzz|nmap|netsparker|havij|jaeles|whatweb|commix|xsstrike)/i;

// Addresses of the old WordPress shop, sent to their new home so links and Google results keep working.
const OLD_PATHS = { '/shop/': '/de/shop', '/about-us/': '/de/about', '/contact-us/': '/de/contact', '/privacy-policy/': '/de/datenschutz', '/refund-policy/': '/de/widerruf', '/term-of-use/': '/de/agb', '/cart/': '/de/cart', '/checkout/': '/de/checkout', '/my-account/': '/de/', '/wishlist/': '/de/shop' };

// "22337 Hamburg" (or "Hamburg 22337", "1010 Wien", "1012 AB Amsterdam") → { zip, city }. The postcode is needed by DHL.
export function splitCity(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  let m = t.match(/^((?:[A-Z]{1,2}-)?\d{4,5}(?:\s?[A-Z]{2})?|\d{2}-\d{3}|\d{3}\s\d{2})[\s,]+(.+)$/i);
  if (m) return { zip: m[1].toUpperCase(), city: m[2] };
  m = t.match(/^(.+?)[\s,]+((?:[A-Z]{1,2}-)?\d{4,5})$/i);
  if (m) return { zip: m[2].toUpperCase(), city: m[1] };
  return { zip: '', city: t };
}

// Where each old WordPress product now lives: oils and serums, soaps, masks and peelings.
function oldProduct(path) {
  if (/argan|rosemary|prickly-pear-oil|oil/.test(path)) return '/de/c/oele-seren';
  if (/soap|seife/.test(path)) return '/de/c/seifen-hammam';
  if (/peeling|scrub|mask/.test(path)) return '/de/c/masken-peelings';
  return '/de/shop';
}

// Only the shop's own domain (SITE_URL) is indexed by search engines. The workers.dev test address and any other
// host answer with "noindex", so Google never sees two copies of the shop.
function indexable(env, url) {
  const site = String(env.SITE_URL || '').trim().replace(/\/+$/, '');
  return Boolean(site) && site === url.origin;
}

// Cloudflare's built-in rate limiter (the RATE_LIMIT binding in wrangler.jsonc): a fast first line in front of the
// database-backed limits. Without the binding (local development) everything is allowed.
async function overLimit(env, request, kind) {
  if (!env.RATE_LIMIT) return false;
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  try {
    const { success } = await env.RATE_LIMIT.limit({ key: `${kind}:${ip}` });
    return !success;
  } catch {
    return false;
  }
}

// Headers for static files (images, CSS, scripts, the admin app); the pages set their own.
const FILE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), usb=(), interest-cohort=()',
};
const ADMIN_CSP = "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' https://challenges.cloudflare.com; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const agent = request.headers.get('user-agent') || '';
    if (BAD_AGENT.test(agent)) return new Response('Forbidden', { status: 403 });
    if (OLD_PATHS[path]) return Response.redirect(`${url.origin}${OLD_PATHS[path]}`, 301);
    if (path.startsWith('/product/')) return Response.redirect(`${url.origin}${oldProduct(path)}`, 301);
    if (path.startsWith('/product-category/')) return Response.redirect(`${url.origin}/de/shop`, 301);
    if (path === '/feed/' || path === '/comments/feed/') return Response.redirect(`${url.origin}/de/blog`, 301);
    if (PROBE.test(path)) return new Response('Not found', { status: 404, headers: { 'cache-control': 'public, max-age=86400' } });
    if (path.startsWith('/api/') && request.method !== 'GET' && request.method !== 'HEAD' && !agent) return json({ error: 'bad_request' }, 400);
    const site = siteOrigin(env, url);
    if (site !== url.origin && (request.method === 'GET' || request.method === 'HEAD') && !path.startsWith('/api/') && (url.hostname.startsWith('www.') || url.hostname.endsWith('.workers.dev'))) {
      return Response.redirect(`${site}${path}${url.search}`, 301);
    }
    try {
      if (path.startsWith('/api/') && (await overLimit(env, request, path.startsWith('/api/admin/login') ? 'login' : 'api'))) {
        return json({ error: 'too_many' }, 429, { 'retry-after': '60' });
      }
      if (path.startsWith('/api/admin/')) return await handleAdmin(request, env, url, ctx);
      if (path.startsWith('/api/')) return await handleApi(request, env, url, ctx);
      if (path.startsWith('/img/')) return await serveImage(env, path.slice(5), request);
      if (path === '/admin') return Response.redirect(`${url.origin}/admin/`, 301);
      if (path === '/sitemap.xml') return await sitemap(env, site);
      if (path === '/merchant-feed.xml') return await merchantFeed(env, site, url.searchParams.get('lang'));
      if (path === '/robots.txt') {
        if (!indexable(env, url)) return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
        return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /*/cart\nDisallow: /*/checkout\nDisallow: /*/order/\nDisallow: /*/paypal/\nSitemap: ${site}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } });
      }
      if (path === '/') return new Response(null, { status: 302, headers: { location: `/${pickLang(request)}/`, vary: 'accept-language, cookie' } });
      const m = path.match(/^\/(de|en|ar)(\/.*)?$/);
      if (m) {
        if (!m[2]) return Response.redirect(`${url.origin}/${m[1]}/${url.search}`, 301);
        return await storefront(request, env, url, m[1], m[2].replace(/(.)\/$/, '$1'), ctx);
      }
      if (path === '/.well-known/security.txt') {
        const expires = new Date(Date.now() + 300 * 864e5).toISOString();
        return new Response(`Contact: mailto:info@khachija-shop.de\nExpires: ${expires}\nPreferred-Languages: de, en, ar\nCanonical: ${site}/.well-known/security.txt\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', ...FILE_HEADERS } });
      }
      const asset = await env.ASSETS.fetch(request);
      const res = new Response(asset.body, asset);
      for (const [k, v] of Object.entries(FILE_HEADERS)) res.headers.set(k, v);
      if (path.startsWith('/admin')) {
        res.headers.set('content-security-policy', ADMIN_CSP);
        res.headers.set('x-frame-options', 'DENY');
        res.headers.set('cache-control', 'no-store');
        res.headers.set('x-robots-tag', 'noindex, nofollow');
      } else if (!indexable(env, url)) res.headers.set('x-robots-tag', 'noindex');
      return res;
    } catch (err) {
      console.error(err);
      if (path.startsWith('/api/')) return json({ error: 'server' }, 500);
      return html('<!doctype html><meta charset="utf-8"><title>Fehler</title><p>Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.</p>', 500);
    }
  },
};

function siteOrigin(env, url) {
  const s = String(env.SITE_URL || '').trim().replace(/\/+$/, '');
  return /^https:\/\/[a-z0-9.-]+$/i.test(s) ? s : url.origin;
}

async function loadOrder(db, number, token) {
  if (!number || !token) return null;
  return db.prepare('SELECT * FROM orders WHERE number = ? AND token = ?').bind(number, token).first();
}

async function storefront(request, env, url, lang, rest, exec) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const db = env.DB;
  const [settings, cats] = await Promise.all([getSettings(db), db.prepare('SELECT * FROM categories ORDER BY sort, id').all()]);
  const categories = cats.results;
  const ctx = { lang, settings, categories, origin: siteOrigin(env, url), env };
  const t = T[lang];
  let res;

  if (rest === '/') {
    const featured = await db.prepare('SELECT * FROM products WHERE active = 1 AND featured = 1 ORDER BY sort, id DESC LIMIT 8').all();
    const latest = await db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY id DESC LIMIT 12').all();
    const ids = new Set(featured.results.map((p) => p.id));
    const fresh = latest.results.filter((p) => !ids.has(p.id));
    const rows4 = (list) => (list.length >= 4 ? list.slice(0, list.length - (list.length % 4)) : list);
    const all = await db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort, id').all();
    res = html(homePage(ctx, rows4(featured.results), rows4((fresh.length >= 4 ? fresh : latest.results).slice(0, 4)), PHOTOS, all.results));
  } else if (rest === '/shop' || rest.startsWith('/c/')) {
    let cat = null;
    if (rest.startsWith('/c/')) {
      cat = categories.find((c) => c.slug === decodeURIComponent(rest.slice(3)));
      if (!cat) return html(notFoundPage(ctx), 404);
    }
    const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
    const sort = ORDER_BY[url.searchParams.get('sort')] ? url.searchParams.get('sort') : '';
    const where = ['active = 1'];
    const args = [];
    if (cat) {
      where.push('category_id = ?');
      args.push(cat.id);
    }
    if (q) {
      where.push("(name_de LIKE ?1 ESCAPE '\\' OR name_en LIKE ?1 ESCAPE '\\' OR name_ar LIKE ?1 ESCAPE '\\' OR subtitle_de LIKE ?1 ESCAPE '\\')".replace(/\?1/g, '?'));
      const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      args.push(like, like, like, like);
    }
    const rows = await db.prepare(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${ORDER_BY[sort] || 'featured DESC, sort, id DESC'} LIMIT 200`).bind(...args).all();
    res = html(
      listingPage(ctx, {
        title: cat ? catName(cat, lang) : t.allProducts,
        seoTitle: cat ? t.catSeoTitle(catName(cat, lang)) : t.shopSeoTitle,
        metaDescription: cat ? t.catSeoDesc(catName(cat, lang)) : t.shopSeoDesc,
        description: cat ? t.catIntro?.[cat.slug] || t.catSeoDesc(catName(cat, lang)) : t.shopIntro || t.tagline,
        seoText: cat ? t.catText?.[cat.slug] || '' : t.shopText || '',
        path: cat ? `/c/${cat.slug}` : '/shop',
        products: rows.results,
        q,
        sort,
        image: cat?.image || '',
        current: cat?.slug || '',
      }),
    );
  } else if (rest.startsWith('/p/')) {
    const slug = decodeURIComponent(rest.slice(3));
    const p = await db.prepare('SELECT * FROM products WHERE active = 1 AND slug = ?').bind(slug).first();
    if (!p) {
      const moved = await movedTo(db, slug, categories);
      return moved ? Response.redirect(`${url.origin}/${lang}${moved.to}`, moved.status) : html(notFoundPage(ctx), 404);
    }
    const related = await db.prepare('SELECT * FROM products WHERE active = 1 AND id != ? AND (category_id IS ?2 OR featured = 1) ORDER BY (category_id IS ?2) DESC, RANDOM() LIMIT 4').bind(p.id, p.category_id).all();
    res = html(productPage(ctx, p, categories.find((c) => c.id === p.category_id), related.results));
  } else if (rest === '/blog') {
    const posts = await db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC, id DESC LIMIT 60').all();
    res = html(blogIndexPage(ctx, posts.results));
  } else if (rest.startsWith('/blog/')) {
    const post = await db.prepare('SELECT * FROM posts WHERE published = 1 AND slug = ?').bind(decodeURIComponent(rest.slice(6))).first();
    if (!post) return html(notFoundPage(ctx), 404);
    const [others, latest] = await Promise.all([
      db.prepare('SELECT * FROM posts WHERE published = 1 AND id != ? ORDER BY created_at DESC LIMIT 3').bind(post.id).all(),
      db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY featured DESC, id DESC LIMIT 4').all(),
    ]);
    res = html(blogPostPage(ctx, post, others.results, latest.results));
  } else if (rest === '/about') {
    const picks = await db.prepare('SELECT * FROM products WHERE active = 1 AND featured = 1 ORDER BY sort, id LIMIT 4').all();
    res = html(aboutPage(ctx, PHOTOS, picks.results));
  } else if (rest === '/contact') {
    res = html(contactPage(ctx));
  } else if (LEGAL_PAGES.includes(rest.slice(1))) {
    res = html(legalPage(ctx, rest.slice(1)));
  } else if (rest === '/privacy' || rest === '/terms') {
    return Response.redirect(`${url.origin}/${lang}/${rest === '/privacy' ? 'datenschutz' : 'agb'}`, 301);
  } else if (rest === '/cart') {
    res = html(cartPage(ctx));
  } else if (rest === '/checkout') {
    res = html(checkoutPage(ctx));
  } else if (rest.startsWith('/order/')) {
    const order = await loadOrder(db, rest.slice(7), url.searchParams.get('t') || '');
    if (!order) return html(notFoundPage(ctx), 404);
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all();
    res = html(orderPage(ctx, order, items.results, { paypalError: url.searchParams.get('pp') === 'cancel' }));
  } else if (rest === '/paypal/return') {
    return paypalReturn(env, url, lang, settings, ctx.origin, exec);
  } else {
    return html(notFoundPage(ctx), 404);
  }
  res.headers.append('set-cookie', `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
  if (!indexable(env, url)) res.headers.set('x-robots-tag', 'noindex');
  let csp = pixelCsp(CSP, settings);
  if (turnstileKey(settings)) csp = csp.replace("script-src 'self'", "script-src 'self' https://challenges.cloudflare.com").replace('frame-src ', 'frame-src https://challenges.cloudflare.com ');
  res.headers.set('content-security-policy', csp);
  return res;
}

// The customer comes back from PayPal: take the money (capture), then show the order.
async function paypalReturn(env, url, lang, settings, origin, exec) {
  const db = env.DB;
  const order = await loadOrder(db, url.searchParams.get('o'), url.searchParams.get('t'));
  if (!order) return Response.redirect(`${url.origin}/${lang}/`, 302);
  const page = `${url.origin}/${lang}/order/${order.number}?t=${order.token}`;
  if (order.payment_status === 'paid') return Response.redirect(page, 303);
  const ppId = url.searchParams.get('token') || '';
  if (url.searchParams.get('cancel') || !ppId || ppId !== order.paypal_order_id) {
    await db.prepare("INSERT INTO order_events (order_id, kind, value) VALUES (?, 'payment', 'paypal_cancelled')").bind(order.id).run();
    return Response.redirect(`${page}&pp=cancel`, 303);
  }
  let r;
  try {
    r = await capturePaypalOrder(env, settings, ppId, order);
  } catch (err) {
    console.error('paypal capture', String(err));
    return Response.redirect(`${page}&pp=cancel`, 303);
  }
  if (!r.paid) {
    await db.prepare("INSERT INTO order_events (order_id, kind, value) VALUES (?, 'payment', ?)").bind(order.id, `paypal_failed ${r.issue || r.status || ''}`.trim()).run();
    return Response.redirect(`${page}&pp=cancel`, 303);
  }
  // Only the first return marks it paid and sends the emails (a reload finds payment_status = 'paid').
  const upd = await db
    .prepare("UPDATE orders SET payment_status = 'paid', paid_at = datetime('now'), paypal_capture_id = ?, updated_at = datetime('now') WHERE id = ? AND payment_status != 'paid'")
    .bind(r.captureId || '', order.id)
    .run();
  if (upd.meta?.changes) {
    await db.prepare("INSERT INTO order_events (order_id, kind, value) VALUES (?, 'payment', ?)").bind(order.id, r.pending ? 'paid (PayPal: pending review)' : 'paid').run();
    const fresh = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(order.id).first();
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all();
    exec.waitUntil(sendOrderEmails(env, settings, origin, fresh, items.results));
    exec.waitUntil(notifyWebhook(env, fresh));
  }
  return Response.redirect(page, 303);
}

async function notifyWebhook(env, order) {
  if (!env.ORDER_WEBHOOK) return;
  const text = `Neue Bestellung ${order.number}: ${order.first_name} ${order.last_name}, ${order.city}, ${money(order.total, 'de')} (${order.payment_method})`;
  await fetch(env.ORDER_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, number: order.number, total: order.total / 100, method: order.payment_method }) }).catch(() => {});
}

async function readJSON(request, limit = 20000) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  const text = await request.text();
  if (text.length > limit) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function publicLine(line, lang) {
  const p = line.product;
  return { id: line.id, option: line.option, optionLabel: lineText(line, lang), saved: line.saved || 0, qty: line.qty, price: line.price, total: line.total, name: productName(p, lang), slug: p.slug, image: productImages(p)[0] || '/assets/placeholder.svg', stock: p.stock };
}

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

async function handleApi(request, env, url, ctx) {
  if (request.method !== 'GET' && !sameOrigin(request, url)) return json({ error: 'bad_origin' }, 403);
  const lang = LANGS.includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : DEFAULT_LANG;
  const db = env.DB;
  let m;

  // POST /api/quote {items, country, method} → the cart priced by the server (the browser's copy is never trusted).
  if (url.pathname === '/api/quote' && request.method === 'POST') {
    const body = await readJSON(request);
    if (!body) return json({ error: 'bad_request' }, 400);
    const settings = await getSettings(db);
    const country = shippingCountries(settings).includes(body.country) ? body.country : 'DE';
    const q = await quote(db, body.items, { country, method: String(body.method || '') }, settings);
    return json({
      lines: q.lines.map((l) => publicLine(l, lang)),
      subtotal: q.subtotal,
      shipping: q.shipping,
      fee: q.fee,
      total: q.total,
      vat: q.vat,
      shipsTo: q.shipsTo,
      issues: q.issues,
      freeOver: country === 'DE' || settings.free_shipping_all === '1' ? Number(settings.free_shipping_over) || 0 : 0,
      methods: paymentMethods(settings, env, country),
    });
  }

  // POST /api/newsletter {email, lang}
  if (url.pathname === '/api/newsletter' && request.method === 'POST') {
    const body = await readJSON(request, 2000);
    if (!body || body.website) return json({ error: 'bad_request' }, 400);
    const email = clean(body.email, 254).toLowerCase();
    if (!validEmail(email)) return json({ error: 'email' }, 422);
    const bucket = `news:${await visitorId(request, env.ADMIN_PASSWORD || 'khachija')}`;
    if ((await recentHits(db, bucket, 3600)) >= 5) return json({ error: 'too_many' }, 429);
    await addHit(db, bucket);
    await db.prepare('INSERT OR IGNORE INTO subscribers (email, lang) VALUES (?, ?)').bind(email, LANGS.includes(body.lang) ? body.lang : lang).run();
    return json({ ok: true });
  }

  // POST /api/orders/<number>/paypal?t= → a new PayPal attempt for an unpaid PayPal order (after a cancel).
  if ((m = url.pathname.match(/^\/api\/orders\/([A-Z0-9-]{6,30})\/paypal$/)) && request.method === 'POST') {
    const order = await loadOrder(db, m[1], url.searchParams.get('t'));
    if (!order || order.payment_method !== 'paypal' || order.payment_status === 'paid' || order.status === 'cancelled') return json({ error: 'not_found' }, 404);
    const settings = await getSettings(db);
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all();
    try {
      const attempt = { ...order, number: order.number, token: order.token };
      const pp = await createPaypalOrder(env, settings, siteOrigin(env, url), attempt, items.results);
      await db.prepare("UPDATE orders SET paypal_order_id = ?, updated_at = datetime('now') WHERE id = ?").bind(pp.id, order.id).run();
      if ((request.headers.get('accept') || '').includes('application/json')) return json({ url: pp.approve });
      return Response.redirect(pp.approve, 303);
    } catch (err) {
      console.error('paypal retry', String(err));
      return json({ error: 'paypal' }, 502);
    }
  }

  // POST /api/orders → a new order. PayPal orders answer with PayPal's page; the others with the confirmation page.
  if (url.pathname === '/api/orders' && request.method === 'POST') {
    const body = await readJSON(request);
    if (!body) return json({ error: 'bad_request' }, 400);
    if (body.website) return json({ error: 'bad_request' }, 400); // honeypot filled in by a bot
    const settings = await getSettings(db);
    if (!(await botCheck(env, settings, body.cf_token, request))) return json({ error: 'bot' }, 403);
    const orderLang = LANGS.includes(body.lang) ? body.lang : lang;
    const f = {
      first_name: clean(body.name, 120),
      last_name: '',
      email: clean(body.email, 254).toLowerCase(),
      street: clean(body.street, 160),
      address2: '',
      ...splitCity(clean(body.city, 90)),
      country: clean(body.country, 2).toUpperCase(),
      note: clean(body.note, 500),
    };
    const phone = normalizePhone(body.phone);
    const method = String(body.payment || '');
    const errors = {};
    if (f.first_name.length < 2) errors.name = 'required';
    if (f.email && !validEmail(f.email)) errors.email = 'email';
    if (!phone) errors.phone = phone === null ? 'phone' : 'required';
    if (f.street.length < 3) errors.street = 'required';
    if (f.city.length < 2) errors.city = errors.city || 'required';
    if (!shippingCountries(settings).includes(f.country)) errors.country = 'required';
    else if (!validZip(f.zip, f.country)) errors.city = 'zip';
    if (!paymentMethods(settings, env, f.country).includes(method)) errors.payment = 'payment';
    if (body.terms !== true) errors.terms = 'terms';
    if (Object.keys(errors).length) return json({ error: 'invalid', fields: errors }, 422);

    // Fake-order protection: at most 3 orders per email address and 6 per visitor each hour, 15 per visitor a day.
    // Fake-order protection: at most 3 orders per phone number an hour.
    const recent = await db.prepare("SELECT COUNT(*) AS n FROM orders WHERE phone = ? AND created_at > datetime('now', '-1 hour')").bind(phone).first();
    if (recent.n >= 3) return json({ error: 'too_many' }, 429);
    const visitor = `order:${await visitorId(request, env.ADMIN_PASSWORD || 'khachija')}`;
    if ((await recentHits(db, visitor, 3600)) >= 6 || (await recentHits(db, visitor, 86400)) >= 15) return json({ error: 'too_many' }, 429);

    const q = await quote(db, body.items, { country: f.country, method }, settings);
    if (!q.lines.length) return json({ error: 'empty' }, 422);
    if (q.issues.length) return json({ error: 'cart_changed', issues: q.issues }, 409);
    if (!q.shipsTo) return json({ error: 'invalid', fields: { country: 'required' } }, 422);

    const number = orderNumber();
    const token = randomToken();
    const items = q.lines.flatMap((l) => splitLine(l.total, l.qty).map((row) => ({ product_id: l.id, name: productName(l.product, 'de'), option: lineText(l, 'de'), nameLang: productName(l.product, orderLang), optionLang: lineText(l, orderLang), price: row.price, qty: row.qty })));
    const order = { number, token, lang: orderLang, ...f, phone: phone || '', payment_method: method, subtotal: q.subtotal, shipping: q.shipping, payment_fee: q.fee, total: q.total, vat: q.vat };

    // PayPal first: if PayPal can't be reached, nothing is saved and the customer can pick another method.
    let pp = null;
    if (method === 'paypal') {
      try {
        pp = await createPaypalOrder(env, settings, siteOrigin(env, url), order, items.map((i) => ({ name: i.nameLang, option: i.optionLang, price: i.price, qty: i.qty })));
      } catch (err) {
        console.error('paypal create', String(err));
        return json({ error: 'paypal' }, 502);
      }
    }

    const statements = [
      db
        .prepare('INSERT INTO orders (number, token, status, payment_method, payment_status, paypal_order_id, first_name, last_name, email, phone, street, address2, zip, city, country, note, lang, subtotal, shipping, payment_fee, total, vat, newsletter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(number, token, 'new', method, 'pending', pp?.id || '', f.first_name, f.last_name, f.email, phone || '', f.street, f.address2, f.zip, f.city, f.country, f.note, orderLang, q.subtotal, q.shipping, q.fee, q.total, q.vat, body.newsletter === true ? 1 : 0),
      db.prepare("INSERT INTO order_events (order_id, kind, value) VALUES ((SELECT id FROM orders WHERE number = ?), 'status', 'new')").bind(number),
    ];
    for (const i of items) {
      statements.push(db.prepare('INSERT INTO order_items (order_id, product_id, name, option, price, qty) VALUES ((SELECT id FROM orders WHERE number = ?), ?, ?, ?, ?, ?)').bind(number, i.product_id, i.name, i.option, i.price, i.qty));
    }
    for (const l of q.lines) {
      // The CHECK (stock >= 0) on products makes this fail, and the whole order roll back, if stock ran out meanwhile.
      statements.push(db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL').bind(l.qty, l.id));
    }
    if (body.newsletter === true && f.email) statements.push(db.prepare('INSERT OR IGNORE INTO subscribers (email, lang) VALUES (?, ?)').bind(f.email, orderLang));
    try {
      await db.batch(statements);
      await addHit(db, visitor);
    } catch (err) {
      if (String(err).includes('CHECK')) return json({ error: 'cart_changed', issues: [{ issue: 'stock' }] }, 409);
      throw err;
    }
    const page = `/${orderLang}/order/${number}?t=${token}`;
    if (pp) return json({ number, url: pp.approve, paypal: true }, 201);
    // Bank transfer and cash on delivery: confirmation to the customer and an alert to the shop, after the response.
    const saved = await db.prepare('SELECT * FROM orders WHERE number = ?').bind(number).first();
    ctx.waitUntil(sendOrderEmails(env, settings, siteOrigin(env, url), saved, items.map((i) => ({ name: i.nameLang, option: i.optionLang, price: i.price, qty: i.qty }))));
    ctx.waitUntil(notifyWebhook(env, saved));
    return json({ number, url: page }, 201);
  }

  return json({ error: 'not_found' }, 404);
}

async function serveImage(env, key, request) {
  if (!/^[a-z0-9/_-]+\.(jpe?g|png|webp|gif|avif|mp4|webm|mov)$/i.test(key)) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' });
  if (request.headers.get('if-none-match') === `"${key}"`) return new Response(null, { status: 304, headers });
  headers.set('etag', `"${key}"`);
  const range = request.headers.get('range');
  const obj = env.IMAGES ? await env.IMAGES.get(key, range ? { range: request.headers } : undefined) : null;
  if (obj) {
    obj.writeHttpMetadata(headers);
    if (range && obj.range) {
      const { offset = 0, length = obj.size - offset } = obj.range;
      headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
      return new Response(obj.body, { status: 206, headers });
    }
    return new Response(obj.body, { headers });
  }
  const row = await env.DB.prepare("SELECT type, size, CASE WHEN type LIKE 'video/%' THEN NULL ELSE data END AS data FROM images WHERE key = ?").bind(key).first();
  if (!row) return new Response('Not found', { status: 404 });
  headers.set('content-type', row.type);
  if (!row.type.startsWith('video/')) return new Response(new Uint8Array(row.data), { headers });
  const size = row.size;
  let from = 0;
  let to = size - 1;
  const mm = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (mm && (mm[1] || mm[2])) {
    if (mm[1]) {
      from = Number(mm[1]);
      if (mm[2]) to = Math.min(Number(mm[2]), size - 1);
    } else {
      from = Math.max(0, size - Number(mm[2]));
    }
    if (from > to || from >= size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
  }
  const first = Math.floor(from / VIDEO_CHUNK);
  const last = Math.floor(to / VIDEO_CHUNK);
  const parts = await env.DB.prepare('SELECT idx, data FROM media_chunks WHERE key = ? AND idx BETWEEN ? AND ? ORDER BY idx').bind(key, first, last).all();
  const out = new Uint8Array(to - from + 1);
  let pos = 0;
  for (const part of parts.results) {
    const bytes = new Uint8Array(part.data);
    const base = part.idx * VIDEO_CHUNK;
    const slice = bytes.subarray(Math.max(0, from - base), Math.min(bytes.length, to - base + 1));
    out.set(slice, pos);
    pos += slice.length;
  }
  if (mm) {
    headers.set('content-range', `bytes ${from}-${to}/${size}`);
    return new Response(out, { status: 206, headers });
  }
  return new Response(out, { headers });
}

async function movedTo(db, slug, categories) {
  const hidden = await db.prepare('SELECT category_id FROM products WHERE slug = ?').bind(slug).first();
  if (hidden) {
    const cat = categories.find((c) => c.id === hidden.category_id);
    return { to: cat ? `/c/${cat.slug}` : '/shop', status: 302 };
  }
  const r = await db.prepare('SELECT target FROM redirects WHERE path = ?').bind(`/p/${slug}`).first();
  if (!r) return null;
  const gone = r.target.startsWith('/c/') && !categories.some((c) => `/c/${c.slug}` === r.target);
  return { to: gone ? '/shop' : r.target, status: 301 };
}

// Product feed for Google Merchant Center (free listings in Google Shopping), prices in euros.
async function merchantFeed(env, origin, wanted) {
  const lang = LANGS.includes(wanted) ? wanted : 'de';
  const [products, cats, settings] = await Promise.all([env.DB.prepare('SELECT * FROM products WHERE active = 1 ORDER BY id DESC').all(), env.DB.prepare('SELECT * FROM categories').all(), getSettings(env.DB)]);
  const store = settings.store_name || 'Khachija';
  const absu = (u) => (/^https?:/.test(u) ? u : origin + u);
  const tag = (k, v) => (v === '' || v == null ? '' : `<${k}>${esc(String(v))}</${k}>`);
  const eur = (c) => `${(c / 100).toFixed(2)} EUR`;
  const items = products.results
    .map((p) => {
      const images = productImages(p).filter((u) => !/\.svg$/i.test(u));
      if (!images.length || !(p.price > 0)) return '';
      const name = productName(p, lang).slice(0, 150);
      const desc = richText(productDesc(p, lang)).replace(/\s+/g, ' ').trim() || name;
      const cat = cats.results.find((c) => c.id === p.category_id);
      const onSale = p.compare_price && p.compare_price > p.price;
      const soldOut = p.stock != null && p.stock <= 0;
      const unit = Number(p.unit_amount) > 0 && ['ml', 'g'].includes(p.unit_type) ? `${tag('g:unit_pricing_measure', `${p.unit_amount}${p.unit_type}`)}${tag('g:unit_pricing_base_measure', p.unit_type === 'ml' ? '1l' : '1kg')}` : '';
      return `<item>${tag('g:id', `KH-${p.id}`)}${tag('g:title', name)}${tag('g:description', desc.slice(0, 5000))}${tag('g:link', `${origin}/${lang}/p/${p.slug}`)}${tag('g:image_link', absu(images[0]))}${images.slice(1, 10).map((u) => tag('g:additional_image_link', absu(u))).join('')}${tag('g:availability', soldOut ? 'out_of_stock' : 'in_stock')}${tag('g:price', eur(onSale ? p.compare_price : p.price))}${onSale ? tag('g:sale_price', eur(p.price)) : ''}${unit}${tag('g:condition', 'new')}${tag('g:brand', store)}${tag('g:identifier_exists', 'no')}${cat ? tag('g:product_type', catName(cat, lang)) : ''}<g:shipping><g:country>DE</g:country><g:price>${eur(Number(settings.shipping_fee) || 0)}</g:price></g:shipping></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(store)}</title><link>${esc(origin)}/${lang}/</link><description>${esc(store)}</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

async function sitemap(env, origin) {
  const [products, cats, posts] = await Promise.all([
    env.DB.prepare('SELECT slug, images, created_at FROM products WHERE active = 1 ORDER BY id DESC').all(),
    env.DB.prepare('SELECT slug FROM categories').all(),
    env.DB.prepare('SELECT slug, updated_at FROM posts WHERE published = 1 ORDER BY created_at DESC').all(),
  ]);
  const day = (d) => String(d || '').slice(0, 10);
  const pages = [
    { p: '/', pri: '1.0' },
    { p: '/shop', pri: '0.9' },
    ...cats.results.map((c) => ({ p: `/c/${c.slug}`, pri: '0.8' })),
    ...products.results.map((x) => ({ p: `/p/${x.slug}`, pri: '0.8', mod: day(x.created_at), imgs: parseJSON(x.images || '[]', []).slice(0, 6) })),
    { p: '/about', pri: '0.6' },
    { p: '/contact', pri: '0.4' },
    { p: '/blog', pri: '0.5', mod: day(posts.results[0]?.updated_at) },
    ...posts.results.map((x) => ({ p: `/blog/${x.slug}`, pri: '0.5', mod: day(x.updated_at) })),
    ...LEGAL_PAGES.map((k) => ({ p: `/${k}`, pri: '0.2' })),
  ];
  const urls = pages
    .map(({ p, pri, mod, imgs = [] }) => {
      const alts = LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${esc(origin)}/${l}${esc(p)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(origin)}/de${esc(p)}"/>`;
      const image = imgs.filter((img) => typeof img === 'string' && img).map((img) => `<image:image><image:loc>${esc(img.startsWith('http') ? img : origin + img)}</image:loc></image:image>`).join('');
      return LANGS.map((l) => `<url><loc>${esc(origin)}/${l}${esc(p)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}<priority>${pri}</priority>${alts}${image}</url>`).join('');
    })
    .join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
