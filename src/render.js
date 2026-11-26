// Server-rendered storefront pages. Every page works without JavaScript except the cart, the checkout
// and add-to-cart buttons, which use public/assets/store.js.

import { T } from './i18n.js';
import { legalDoc, LEGAL_PAGES } from './legal.js';
import { richHtml, richText } from './rich.js';
import { pixelConfig } from './pixels.js';
import { giroCodeSvg, formatIban } from './girocode.js';
import { trackingUrl } from './email.js';
import {
  LANGS, HREFLANG, LOCALE, turnstileKey, esc, money, unitPrice, contentLabel, productName, productField, productDesc, productImages, productOptions,
  liveBundles, bundleTitle, optionGroupName, shippingCountries, countryName, paymentMethods, parseJSON, displayPhone,
} from './lib.js';

const PLACEHOLDER = '/assets/placeholder.svg';
const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR' };
const BRAND_OG = '/assets/brand/og-image.jpg';

const abs = (origin, u) => (/^https?:/.test(u) ? u : origin + u);
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
function breadcrumbLd(origin, items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(origin, url) })) };
}

export function catName(c, lang) {
  return c[`name_${lang}`] || c.name_de || c.name_en || c.name_ar || c.slug;
}

// Our own photos come in a large (1000×1250) and a small (480×600) version.
export function small(url) {
  return /^\/assets\/p\/[a-z0-9-]+\.webp$/.test(url) && !url.endsWith('-sm.webp') ? url.replace(/\.webp$/, '-sm.webp') : url;
}
function srcset(url) {
  const s = small(url);
  return s !== url ? ` srcset="${esc(s)} 480w, ${esc(url)} 1000w"` : '';
}
// Gold divider with a small seal where a dark band meets a light one.
const EDGE = '<div class="edge" aria-hidden="true"><span><img src="/assets/brand/symbol-gold.svg" alt="" width="22" height="22"></span></div>';
const isPackshot = (url) => /-pack\d?(-sm)?\.webp$/.test(url);

// Line icons (24×24, stroke = currentColor).
const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  menu: '<path d="M4 7h16M4 12h11M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  bag: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevronL: '<path d="m15 5-7 7 7 7"/>',
  chevronR: '<path d="m9 5 7 7-7 7"/>',
  chevronD: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
  truck: '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  undo: '<path d="M9 7 4.5 11.5 9 16"/><path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  phone: '<path d="M6.6 3.5h2.6l1.5 4-2 1.3a11 11 0 0 0 6.5 6.5l1.3-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  bank: '<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20h17"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  sparkle: '<path d="M12 3c.7 4.4 2.6 6.3 7 7-4.4.7-6.3 2.6-7 7-.7-4.4-2.6-6.3-7-7 4.4-.7 6.3-2.6 7-7Z"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 7.5V12l3 2"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
};
export function icon(name, size = 22) {
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
const WA_PATH = 'M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.8c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.8 10.8 0 1 1 16 26.8Zm6-8.1c-.3-.2-1.9-1-2.2-1-.3-.2-.5-.2-.7.1l-1 1.3c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.6-.5-.8-.5h-.6c-.2 0-.6 0-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.4Z';
const waIcon = (size = 24) => `<svg class="icon" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true"><path fill="currentColor" d="${WA_PATH}"/></svg>`;
const SOCIAL = {
  instagram: '<path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21.1 8c-.1-1.5-.4-2.8-1.5-3.9S17.2 2.7 15.7 2.6C14.2 2.5 9.8 2.5 8.3 2.6 6.8 2.7 5.5 3 4.4 4.1S3 6.5 2.9 8c-.1 1.5-.1 6 0 7.5.1 1.5.4 2.8 1.5 3.9s2.4 1.4 3.9 1.5c1.5.1 6 .1 7.5 0 1.5-.1 2.8-.4 3.9-1.5s1.4-2.4 1.5-3.9c.1-1.5.1-6 0-7.5Zm-2 9.4a3 3 0 0 1-1.7 1.7c-1.2.5-4 .4-5.4.4s-4.2.1-5.4-.4a3 3 0 0 1-1.7-1.7c-.5-1.2-.4-4-.4-5.4s-.1-4.2.4-5.4a3 3 0 0 1 1.7-1.7c1.2-.5 4-.4 5.4-.4s4.2-.1 5.4.4a3 3 0 0 1 1.7 1.7c.5 1.2.4 4 .4 5.4s.1 4.2-.4 5.4Z"/>',
  facebook: '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/>',
  tiktok: '<path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4s-1.9.1-3.2-1.6Z"/>',
};

export function socialUrl(kind, value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^https:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '');
  if (!handle) return '';
  return kind === 'tiktok' ? `https://www.tiktok.com/@${handle}` : `https://www.${kind}.com/${handle}`;
}
function socialLinks(settings) {
  const links = Object.keys(SOCIAL)
    .map((k) => [k, socialUrl(k, settings[k])])
    .filter(([, u]) => u)
    .map(([k, u]) => `<a href="${esc(u)}" rel="noopener me" target="_blank" aria-label="${k}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><g fill="currentColor">${SOCIAL[k]}</g></svg></a>`);
  return links.length ? `<div class="socials">${links.join('')}</div>` : '';
}

function waLink(number, text) {
  const n = String(number || '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '';
}

// The 8-petal star-flower from the logo, as a small ornament.
const ornament = (cls = '') => `<img class="orn ${cls}" src="/assets/brand/symbol-gold.svg" alt="" width="28" height="28" aria-hidden="true">`;
const kicker = (text) => `<p class="kicker">${ornament()}<span>${esc(text)}</span></p>`;

function sectionHead(title, kick = '', link = '', linkText = '', center = true) {
  return `<div class="section-head${center ? ' center' : ''} reveal">${kick ? kicker(kick) : ''}<h2>${esc(title)}</h2>${link ? `<a class="more" href="${esc(link)}">${esc(linkText)} ${icon('arrow', 18)}</a>` : ''}</div>`;
}

// "inkl. MwSt. zzgl. Versand" (or the § 19 note), with a link to the shipping page, as German law asks next to prices.
function priceNote(ctx) {
  const t = T[ctx.lang];
  const vat = ctx.settings.vat_mode === 'included' ? t.inclVat : t.smallBusiness;
  return `<p class="price-note">${esc(vat)}, <a href="/${ctx.lang}/versand">${esc(t.plusShipping)}</a></p>`;
}

function payBadges() {
  return `<div class="pay-badges" aria-hidden="true"><span class="pb pb-paypal"><b>Pay</b><i>Pal</i></span><span class="pb">${icon('bank', 16)} SEPA</span><span class="pb">${icon('cash', 16)} Nachnahme</span><span class="pb pb-dhl">DHL</span></div>`;
}

export function layout(ctx, { title, seoTitle = '', description = '', path, body, noindex = false, image = '', page = '', product = null, track = null, lds = [], ogType = 'website', preload = '', minimal = false }) {
  const { lang, settings, origin, categories = [] } = ctx;
  const t = T[lang];
  const px = pixelConfig(settings);
  const pixels = px.meta || px.tiktok;
  const store = settings.store_name || 'Khachija';
  const fullTitle = seoTitle ? `${seoTitle} | ${store}` : title ? `${title} · ${store}` : `${store} · ${t.seoTitle}`;
  const metaDesc = description || t.seoDesc;
  const verify = String(settings.google_verify || '').match(/content=["']?([\w-]{10,100})/)?.[1] || (/^[\w-]{10,100}$/.test(String(settings.google_verify || '').trim()) ? String(settings.google_verify).trim() : '');
  const announcement = [settings[`announcement_${lang}`], t.trust[2][1], t.trust[3][2]].filter(Boolean);
  const wa = waLink(settings.whatsapp);
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${esc(origin)}/${l}${esc(path)}">`).join('');
  const langLinks = LANGS.map((l) => `<a href="/${l}${esc(path)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l === 'ar' ? 'ع' : l.toUpperCase()}</a>`).join('');
  const og = image || BRAND_OG;
  const fonts = lang === 'ar' ? 'family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600' : 'family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Poppins:wght@300;400;500;600';
  const nav = `<a href="/${lang}/shop">${esc(t.allProducts)}</a>${categories.map((c) => `<a href="/${lang}/c/${esc(c.slug)}">${esc(catName(c, lang))}</a>`).join('')}<a href="/${lang}/about">${esc(t.about)}</a>`;
  const here = (p) => ((p === '/' ? path === '/' || path === '' : path === p || path.startsWith(p + '/')) ? ' class="here" aria-current="page"' : '');
  const legal = LEGAL_PAGES.map((k) => `<li><a href="/${lang}/${k}">${esc(t.legal[k])}</a></li>`).join('');
  return `<!doctype html>
<html lang="${lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(metaDesc)}">
${noindex ? '<meta name="robots" content="noindex">' : `<meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${esc(origin)}/${lang}${esc(path)}">${alternates}<link rel="alternate" hreflang="x-default" href="${esc(origin)}/de${esc(path)}">`}
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${esc(origin)}/${lang}${esc(path)}">
<meta property="og:locale" content="${OG_LOCALE[lang]}">
<meta property="og:site_name" content="${esc(store)}">
<meta property="og:image" content="${esc(abs(origin, og))}">
<meta name="twitter:card" content="summary_large_image">
${verify ? `<meta name="google-site-verification" content="${esc(verify)}">` : ''}
${lds.filter(Boolean).map(ld).join('')}
${preload ? `<link rel="preload" as="image" href="${esc(preload)}" fetchpriority="high">` : ''}
<meta name="theme-color" content="#24493A">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/brand/symbol-gold.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=42">
<script src="/assets/js-on.js"></script>
${pixels ? `<script type="application/json" id="pixels">${JSON.stringify({ ...px, page: track }).replace(/</g, '\\u003c')}</script><script src="/assets/pixels.js?v=2" defer></script>` : ''}
<script src="/assets/store.js?v=13" defer></script>
</head>
<body data-lang="${lang}"${turnstileKey(settings) ? ` data-ts="${esc(turnstileKey(settings))}"` : ''} class="page-${page || 'default'}${minimal ? ' minimal' : ''}">
${minimal ? '' : `<template id="welcome-tpl"><div class="welcome" aria-hidden="true"><div class="welcome-in"><span class="welcome-seal"><svg class="welcome-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56"/></svg><img src="/assets/brand/symbol-gold.svg" alt="" width="84" height="84"></span><p class="welcome-hello">${esc(t.welcome[0])}</p><p class="welcome-name">${[...'KHACHIJA'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')}</p><p class="welcome-line">${esc(t.welcome[1])}</p></div><span class="welcome-skip">${esc(t.welcome[2])}</span></div></template><script src="/assets/welcome.js?v=1"></script>`}
<div class="scroll-progress" aria-hidden="true"></div>
<a class="skip" href="#main">${esc(t.allProducts)}</a>
${minimal ? '' : `<div class="announce" role="region" aria-label="${esc(announcement[0] || store)}"><div class="announce-track" data-rotate>${announcement.map((a, i) => `<span${i ? ' hidden' : ''}>${esc(a)}</span>`).join('')}</div></div>`}
<header class="top" data-header>
  <div class="wrap top-row">
    ${minimal ? '<span></span>' : `<div class="top-start">
      <button type="button" class="icon-btn only-sm" data-drawer="menu" aria-label="${esc(t.menu)}" aria-controls="menu-panel">${icon('menu', 24)}</button>
      <button type="button" class="icon-btn only-lg" data-drawer="search" aria-label="${esc(t.search)}" aria-controls="search-panel">${icon('search', 22)}</button>
      ${settings.phone ? `<a class="top-phone only-lg" href="tel:${esc(String(settings.phone).replace(/[^\d+]/g, ''))}" dir="ltr">${icon('phone', 16)} ${esc(settings.phone)}</a>` : ''}
    </div>`}
    <a class="logo" href="/${lang}/" aria-label="${esc(store)}"><img src="/assets/brand/logo-horizontal.svg" alt="" width="300" height="80"></a>
    ${minimal ? `<p class="secure-note" title="${esc(t.secureCheckout)}">${icon('lock', 16)}<span class="sn-long">${esc(t.secureCheckout)}</span><span class="sn-short">SSL</span></p>` : `<div class="top-actions">
      <button type="button" class="icon-btn only-sm" data-drawer="search" aria-label="${esc(t.search)}" aria-controls="search-panel">${icon('search', 22)}</button>
      <details class="lang-menu"><summary aria-label="${esc(t.langName)}">${icon('globe', 20)}<span>${lang === 'ar' ? 'ع' : lang.toUpperCase()}</span></summary><div>${LANGS.map((l) => `<a href="/${l}${esc(path)}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(T[l].langName)}</a>`).join('')}</div></details>
      <a class="icon-btn cart-link" href="/${lang}/cart" data-drawer="cart" aria-label="${esc(t.cart)}">${icon('bag', 24)}<span class="cart-count" hidden>0</span></a>
    </div>`}
  </div>
  ${minimal ? '' : `<nav class="main-nav" aria-label="${esc(t.categories)}"><div class="wrap">${nav}<a href="/${lang}/blog">${esc(t.blog)}</a></div></nav>`}
</header>
${minimal ? '' : `<div class="drawer-back" data-drawer-close hidden></div>
<aside class="drawer drawer-start" id="menu-panel" aria-label="${esc(t.menu)}" hidden>
  <div class="drawer-head menu-head"><img src="/assets/brand/logo-horizontal.svg" alt="${esc(store)}" width="200" height="54"><button type="button" class="icon-btn menu-close" data-drawer-close aria-label="${esc(t.close)}">${icon('close', 22)}</button></div>
  <div class="menu-body">
    <nav class="menu-nav" aria-label="${esc(t.menu)}">
      <p class="menu-kicker">${esc(t.shop)}</p>
      <a class="menu-all${here('/shop')}" href="/${lang}/shop"><span>${esc(t.allProducts)}</span>${icon('arrow', 20)}</a>
      <ul class="menu-cats">${categories.map((c, i) => `<li style="--i:${i}"><a${here(`/c/${c.slug}`)} href="/${lang}/c/${esc(c.slug)}"><img src="${esc(c.image || PLACEHOLDER)}" alt="" width="56" height="56" loading="lazy"><span><small>0${i + 1}</small>${esc(catName(c, lang))}</span>${icon('arrow', 18)}</a></li>`).join('')}</ul>
      <p class="menu-kicker">Khachija</p>
      <div class="menu-tiles">${[['/', t.home], ['/about', t.about], ['/blog', t.blog], ['/contact', t.contact]].map(([href, label]) => `<a${here(href)} href="/${lang}${href}">${esc(label)}</a>`).join('')}</div>
    </nav>
    <a class="menu-promo" href="/${lang}/#ritual-finder" data-drawer-close><img src="/assets/brand/symbol-gold.svg" alt="" width="44" height="44"><span><small>${esc(t.finder.kicker)}</small><strong>${esc(t.finder.title)}</strong><em>${esc(t.finder.start)} ${icon('arrow', 16)}</em></span></a>
  </div>
  <div class="drawer-foot menu-foot"><span class="langs menu-langs">${langLinks}</span>${wa ? `<a class="menu-wa" href="${esc(wa)}" rel="noopener">${waIcon(18)} WhatsApp</a>` : ''}</div>
</aside>
<aside class="drawer drawer-search" id="search-panel" aria-label="${esc(t.search)}" hidden>
  <div class="drawer-head"><strong>${esc(t.search)}</strong><button type="button" class="icon-btn" data-drawer-close aria-label="${esc(t.close)}">${icon('close', 24)}</button></div>
  <form class="search-form" action="/${lang}/shop" method="get" role="search"><input type="search" name="q" placeholder="${esc(t.searchPh)}" aria-label="${esc(t.search)}" enterkeyhint="search"><button aria-label="${esc(t.search)}">${icon('search', 22)}</button></form>
  ${categories.length ? `<div class="search-chips">${categories.map((c) => `<a href="/${lang}/c/${esc(c.slug)}">${esc(catName(c, lang))}</a>`).join('')}</div>` : ''}
</aside>
<aside class="drawer drawer-cart" id="cart-panel" aria-label="${esc(t.cart)}" hidden>
  <div class="drawer-head"><strong>${esc(t.cart)} <span class="cart-count-inline" data-count></span></strong><button type="button" class="icon-btn" data-drawer-close aria-label="${esc(t.close)}">${icon('close', 24)}</button></div>
  <div class="mini-cart" data-view="mini"></div>
</aside>
<aside class="drawer drawer-cart" id="recent-panel" aria-label="${esc(t.recent)}" hidden>
  <div class="drawer-head"><strong>${esc(t.recent)}</strong><button type="button" class="icon-btn" data-drawer-close aria-label="${esc(t.close)}">${icon('close', 24)}</button></div>
  <div class="mini-cart" data-view="recent"></div>
</aside>
<div class="side-rail" aria-label="${esc(t.recent)}">
  <button type="button" data-drawer="recent" aria-label="${esc(t.recent)}" title="${esc(t.recent)}">${icon('history', 24)}</button>
  <button type="button" data-share-page aria-label="${esc(t.share)}" title="${esc(t.share)}">${icon('share', 24)}</button>
  <button type="button" class="rail-top" data-to-top aria-label="${esc(t.toTop)}" title="${esc(t.toTop)}" tabindex="-1"><svg class="rail-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"/></svg><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>
</div>`}
<main id="main">
${body}
</main>
${minimal ? '' : EDGE}
<footer class="foot">
  ${minimal ? '' : `<div class="foot-pattern" aria-hidden="true"></div>
  <div class="wrap foot-trust">${t.trust.map(([ic, h, x]) => `<div class="ft-item">${icon(ic, 22)}<span><strong>${esc(h)}</strong><small>${esc(x)}</small></span></div>`).join('')}</div>
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <img class="foot-logo" src="/assets/brand/logo-full-white.svg" alt="${esc(store)}" width="150" height="230" loading="lazy">
      <p>${esc(t.footerAbout)}</p>
      ${socialLinks(settings)}
    </div>
    <div class="foot-col"><h3>${esc(t.shop)}</h3><ul><li><a href="/${lang}/shop">${esc(t.allProducts)}</a></li>${categories.map((c) => `<li><a href="/${lang}/c/${esc(c.slug)}">${esc(catName(c, lang))}</a></li>`).join('')}<li><a href="/${lang}/blog">${esc(t.blog)}</a></li></ul></div>
    <div class="foot-col"><h3>${esc(t.customerService)}</h3><ul><li><a href="/${lang}/about">${esc(t.about)}</a></li><li><a href="/${lang}/contact">${esc(t.contact)}</a></li>${legal}</ul></div>
    <div class="foot-col foot-contact"><h3>${esc(t.contact)}</h3><ul>
      ${settings.contact_email ? `<li>${icon('mail', 18)}<a href="mailto:${esc(settings.contact_email)}">${esc(settings.contact_email)}</a></li>` : ''}
      ${settings.phone ? `<li>${icon('phone', 18)}<a href="tel:${esc(String(settings.phone).replace(/[^\d+]/g, ''))}" dir="ltr">${esc(settings.phone)}</a></li>` : ''}
      ${wa ? `<li>${waIcon(18)}<a href="${esc(wa)}" rel="noopener">WhatsApp</a></li>` : ''}
      ${settings.legal_address ? `<li>${icon('pin', 18)}<span>${esc(settings.legal_address)}</span></li>` : ''}
    </ul><h3>${esc(t.paymentOptions)}</h3>${payBadges()}</div>
  </div>`}
  <div class="wrap foot-bottom"><span>© ${new Date().getUTCFullYear()} ${esc(store)} · ${esc(t.rights)}</span>${minimal ? `<span class="foot-links">${LEGAL_PAGES.map((k) => `<a href="/${lang}/${k}">${esc(t.legal[k])}</a>`).join(' · ')}</span>` : ''}${pixels ? `<button type="button" class="link-btn" data-consent-open>${esc(t.cookieSettings)}</button>` : ''}<span class="langs">${langLinks}</span><a class="made-by" href="https://abachedev.com/${lang === 'ar' ? 'ar/' : 'en/'}" target="_blank" rel="noopener">${esc(t.madeBy)} <strong>AbacheDev</strong></a></div>
</footer>
${minimal ? '' : `<nav class="tabbar" aria-label="${esc(t.shop)}" style="--ti:${{ home: 0, shop: 1, category: 1, product: 1, cart: 2 }[page] ?? -1}">
  <a href="/${lang}/"${page === 'home' ? ' aria-current="page"' : ''}>${icon('home', 24)}<span>${esc(t.home)}</span></a>
  <a href="/${lang}/shop"${page === 'shop' ? ' aria-current="page"' : ''}>${icon('grid', 24)}<span>${esc(t.shop)}</span></a>
  <a href="/${lang}/cart" data-drawer="cart"${page === 'cart' ? ' aria-current="page"' : ''} class="tab-cart">${icon('bag', 24)}<span>${esc(t.cart)}</span><span class="cart-count" hidden>0</span></a>
  <a href="/${lang}/shop" data-drawer="search">${icon('search', 24)}<span>${esc(t.searchTab || t.search)}</span></a>
</nav>`}
${minimal || !wa ? '' : waWidget(ctx, product)}
<div class="toast" role="status" aria-live="polite" hidden></div>
${pixels ? `<div class="consent-bar" id="consent" role="dialog" aria-label="${esc(t.cookieSettings)}" hidden><p>${esc(t.consentAds)} <a href="/${lang}/datenschutz">${esc(t.legal.datenschutz)}</a></p><div><button type="button" class="btn btn-ghost" data-consent="no">${esc(t.refuse)}</button><button type="button" class="btn" data-consent="yes">${esc(t.accept)}</button></div></div>` : ''}
<script type="application/json" id="i18n">${JSON.stringify({ ...t.js, lang, freeOver: Number(settings.free_shipping_over) || 0, vatMode: settings.vat_mode === 'included' ? 'included' : 'small' }).replace(/</g, '\\u003c')}</script>
</body>
</html>`;
}

function waWidget(ctx, product) {
  const { lang, settings, origin } = ctx;
  const t = T[lang];
  const number = settings.whatsapp;
  const store = settings.store_name || 'Khachija';
  const ref = product ? `\n${product.name} · ${product.price}\n${origin}/${lang}/p/${product.slug}` : '';
  const chips = (product ? t.waChipsProduct : t.waChips).map((c) => [c, `${c}${ref}`]);
  return `<div class="wa-widget" data-wa>
  <div class="wa-panel" id="wa-panel" role="dialog" aria-labelledby="wa-title" hidden>
    <div class="wa-head">
      <span class="wa-avatar"><img src="/assets/brand/symbol-gold.svg" alt="" width="30" height="30"><i class="wa-online" aria-hidden="true"></i></span>
      <div><strong id="wa-title">${esc(store)}</strong><small><span class="wa-live">${esc(t.waOnline.status)}</span> · ${esc(t.waReplies)}</small></div>
      <button type="button" class="wa-close" data-wa-close aria-label="${esc(t.close)}">${icon('close', 18)}</button>
    </div>
    <div class="wa-body">
      <span class="wa-day">${esc(t.waOnline.today)}</span>
      <div class="wa-typing" aria-hidden="true"><i></i><i></i><i></i></div>
      <p class="wa-bubble"><span>${esc(t.waHello)}</span><time data-wa-time></time></p>
      <div class="wa-chips">${chips.map(([label, text], i) => `<a href="${esc(waLink(number, text))}" rel="noopener" target="_blank" style="--i:${i}"><span>${esc(label)}</span>${icon('arrow', 16)}</a>`).join('')}</div>
    </div>
    <form class="wa-compose" data-wa-compose data-wa-number="${esc(String(number || '').replace(/\D/g, ''))}" data-wa-ref="${esc(ref.trim())}">
      <input name="msg" type="text" autocomplete="off" placeholder="${esc(t.waOnline.placeholder)}" aria-label="${esc(t.waOnline.placeholder)}" maxlength="500">
      <button type="submit" aria-label="${esc(t.waStart)}">${icon('arrow', 20)}</button>
    </form>
  </div>
  <a class="wa-float" href="${esc(waLink(number, ref.trim()))}" rel="noopener" target="_blank" aria-label="${esc(t.whatsappUs)}" aria-controls="wa-panel" aria-expanded="false" data-wa-toggle>${waIcon(26)}</a>
</div>`;
}

function priceHtml(ctx, p) {
  const onSale = p.compare_price && p.compare_price > p.price;
  // Choices that cost more than the base price (e.g. "set" vs. single piece): show "ab 12,50 €".
  const from = productOptions(p).some((g) => g.values.some((v) => v.price > 0)) ? `${esc(T[ctx.lang].priceFrom)} ` : '';
  return `${onSale ? `<s>${esc(money(p.compare_price, ctx.lang))}</s> ` : ''}<span class="now">${from}${esc(money(p.price, ctx.lang))}</span>`;
}

export function productCard(p, ctx, i = 0) {
  const { lang } = ctx;
  const t = T[lang];
  const imgs = productImages(p);
  const img = imgs[0] || PLACEHOLDER;
  const name = productName(p, lang);
  const sub = productField(p, 'subtitle', lang);
  const soldOut = p.stock != null && p.stock <= 0;
  const onSale = p.compare_price && p.compare_price > p.price;
  const quickAdd = !soldOut && !productOptions(p).length;
  const unit = unitPrice(p, lang);
  const content = contentLabel(p);
  return `<article class="card reveal" style="--d:${(i % 4) * 80}ms">
  <a href="/${lang}/p/${esc(p.slug)}" class="card-img${isPackshot(img) ? ' packshot' : ''}" tabindex="-1" aria-hidden="true" data-vt="p${p.id}" data-tilt>
    <img src="${esc(small(img))}"${srcset(img)} sizes="(min-width: 900px) 25vw, 50vw" alt="" loading="lazy" width="480" height="600">
    ${imgs[1] ? `<img class="alt" src="${esc(small(imgs[1]))}" alt="" loading="lazy" width="480" height="600">` : ''}
    ${soldOut ? `<span class="badge muted">${esc(t.outOfStock)}</span>` : onSale ? `<span class="badge">−${Math.round((1 - p.price / p.compare_price) * 100)} %</span>` : ''}
  </a>
  ${soldOut ? '' : quickAdd ? `<button class="quick-add" type="button" data-add="${p.id}" data-name="${esc(name)}" data-price="${p.price}" data-image="${esc(img)}" data-slug="${esc(p.slug)}" aria-label="${esc(t.addToCart)}: ${esc(name)}">${icon('plus', 18)}<span>${esc(t.quickAdd)}</span></button>` : `<a class="quick-add" href="/${lang}/p/${esc(p.slug)}">${esc(t.chooseOptions)}</a>`}
  <div class="card-body">
    <h3><a href="/${lang}/p/${esc(p.slug)}">${esc(name)}</a></h3>
    ${sub ? `<p class="card-sub">${esc(sub)}</p>` : ''}
    <p class="price">${priceHtml(ctx, p)}</p>
    ${unit ? `<p class="unit">${esc(content)} · ${esc(unit)}</p>` : ''}
  </div>
</article>`;
}

function grid(products, ctx, emptyText, cls = '') {
  const t = T[ctx.lang];
  const vat = ctx.settings?.vat_mode === 'included' ? t.inclVat : t.smallBusiness;
  return products.length ? `<div class="grid ${cls}">${products.map((p, i) => productCard(p, ctx, i)).join('')}</div><p class="grid-note">* ${esc(t.allPrices)} ${esc(vat)}, <a href="/${ctx.lang}/versand">${esc(t.plusShipping)}</a></p>` : `<p class="empty">${esc(emptyText)}</p>`;
}

function trustStrip(lang) {
  const t = T[lang];
  return `<ul class="trust">${t.trust.map(([ic, title, text], i) => `<li class="reveal" style="--d:${i * 80}ms">${icon(ic, 28)}<div><strong>${esc(title)}</strong><span>${esc(text)}</span></div></li>`).join('')}</ul>`;
}

// "Schmuckshöhe 13, 22337 Hamburg, Deutschland" → a schema.org PostalAddress.
function postalAddress(text) {
  const m = String(text).match(/^(.+?),\s*(\d{4,5})\s+([^,]+)(?:,\s*(.+))?$/);
  if (!m) return String(text);
  return { '@type': 'PostalAddress', streetAddress: m[1], postalCode: m[2], addressLocality: m[3], addressCountry: /deutschland|germany/i.test(m[4] || 'DE') ? 'DE' : m[4] };
}

function orgLd(ctx) {
  const { origin, settings } = ctx;
  const sameAs = ['instagram', 'facebook', 'tiktok'].map((k) => socialUrl(k, settings[k])).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: settings.store_name || 'Khachija',
    url: `${origin}/`,
    logo: `${origin}/assets/brand/icon-512.png`,
    image: `${origin}${BRAND_OG}`,
    ...(settings.contact_email ? { email: settings.contact_email } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.legal_address ? { address: postalAddress(settings.legal_address) } : {}),
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', availableLanguage: ['German', 'English', 'Arabic'], ...(settings.contact_email ? { email: settings.contact_email } : {}), ...(settings.phone ? { telephone: settings.phone } : {}) },
    hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'DE', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility' },
    founder: { '@type': 'Person', name: settings.legal_name || 'Khadija Hakki' },
    currenciesAccepted: 'EUR',
    paymentAccepted: 'PayPal, Bank transfer, Cash on delivery',
    areaServed: 'DE',
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function homePage(ctx, featured, latest, photos, all = []) {
  const { lang, categories, settings } = ctx;
  const t = T[lang];
  const h = t.hero;
  const title = settings[`hero_title_${lang}`] || h.title;
  const text = settings[`hero_text_${lang}`] || h.text;
  // Headline words rise one after the other.
  const words = esc(title).split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}"><span>${w}</span></span>`).join(' ');
  const marquee = t.marquee.map((m) => `<span>${ornament()}${esc(m)}</span>`).join('');
  // Categories: the section stays on screen while each scroll step slides in the next category.
  const cats = categories.length
    ? `<section class="hscroll" data-hscroll style="--n:${categories.length}" aria-label="${esc(t.shopByCategory)}">
  <div class="hs-sticky">
    <div class="wrap hs-head">
      <div>${kicker(t.categories)}<h2>${esc(t.shopByCategory)}</h2></div>
      <div class="hs-count" aria-hidden="true"><b data-hs-i>01</b><span> / ${String(categories.length).padStart(2, '0')}</span><i class="hs-bar"><i data-hs-bar></i></i></div>
    </div>
    <div class="hs-track" data-hs-track>${categories
      .map((c, i) => {
        const items = all.filter((p) => p.category_id === c.id).slice(0, 3);
        return `<article class="hs-slide${i ? '' : ' on'}" data-hs-slide>
        <a class="hs-img" href="/${lang}/c/${esc(c.slug)}" tabindex="-1" aria-hidden="true"><img src="${esc(c.image || PLACEHOLDER)}" alt="" ${i ? 'loading="lazy"' : ''} width="1000" height="1250"></a>
        <div class="hs-text">
          <span class="hs-n">${String(i + 1).padStart(2, '0')}</span>
          <h3><a href="/${lang}/c/${esc(c.slug)}">${esc(catName(c, lang))}</a></h3>
          <p>${esc(t.catIntro?.[c.slug] || '')}</p>
          ${items.length ? `<ul class="hs-products">${items.map((p) => `<li><a href="/${lang}/p/${esc(p.slug)}"><img src="${esc(small(productImages(p)[0] || PLACEHOLDER))}" alt="" loading="lazy" width="96" height="120"><span>${esc(productName(p, lang))}<b>${esc(money(p.price, lang))}</b></span></a></li>`).join('')}</ul>` : ''}
          <a class="btn" href="/${lang}/c/${esc(c.slug)}">${esc(t.discover || t.viewAll)} ${icon('arrow', 18)}</a>
        </div>
      </article>`;
      })
      .join('')}</div>
    <div class="hs-hint" aria-hidden="true">
      <span class="hs-dots">${categories.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span>
      <span class="hs-cue">
        <i class="cue-mouse"><i></i></i><i class="cue-finger"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7l-2.3-3.6a1.5 1.5 0 0 1 2.5-1.6L9 15"/></svg></i>
        <span class="cue-next cue-touch">${esc(t.hsSwipe)}</span><span class="cue-next cue-wheel">${esc(t.hsScroll)}</span><span class="cue-done">${esc(t.hsDone)}</span>
      </span>
    </div>
  </div>
</section>`
    : '';
  // Products the Ritual Finder can pick from (only those for sale).
  const finderData = all
    .filter((p) => !(p.stock != null && p.stock <= 0) && !productOptions(p).length)
    .map((p) => ({ id: p.id, slug: p.slug, name: productName(p, lang), price: p.price, image: small(productImages(p)[0] || PLACEHOLDER), sub: productField(p, 'subtitle', lang) }));
  const f = t.finder;
  const body = `<section class="hero-v" data-hero>
  <video class="hero-video" autoplay muted loop playsinline preload="auto" poster="/assets/video/kooperative-poster.webp" aria-hidden="true" data-loop><source src="/assets/video/kooperative-loop.mp4" type="video/mp4"></video>
  <div class="hero-veil" aria-hidden="true"></div>
  <img class="hero-v-star" src="/assets/brand/symbol-gold.svg" alt="" aria-hidden="true" width="600" height="600">
  <div class="wrap hero-v-in">
    ${kicker(h.kicker)}
    <h1 class="split">${words}</h1>
    <p class="lead">${esc(text)}</p>
    <div class="hero-ctas"><a class="btn btn-gold btn-lg" href="/${lang}/shop">${esc(h.cta)} ${icon('arrow', 20)}</a><button type="button" class="btn btn-light btn-lg" data-film-open><span class="play" aria-hidden="true"></span>${esc(t.heroFilm)} <small>· ${esc(t.film.length)}</small></button></div>
  </div>
  <a class="hero-scroll" href="#after-hero" aria-label="${esc(t.heroScroll)}"><span>${esc(t.heroScroll)}</span><i></i></a>
</section>
<div class="marquee" aria-hidden="true"><div class="marquee-track">${marquee}${marquee}</div></div>
<div id="after-hero"></div>
${cats}
${featured.length ? `<section class="section wrap">${sectionHead(t.featured, t.shop, `/${lang}/shop`, t.viewAll)}${grid(featured, ctx, t.noProducts)}</section>` : ''}
<section class="ritual-scroll" data-ritual>
  <div class="wrap ritual-grid">
    <div class="ritual-sticky">
      <div class="ritual-stage">${t.ritualImgs.map((u, i) => `<img src="${esc(u)}" alt="" loading="lazy" width="1000" height="1250" class="${i ? '' : 'on'}" data-ritual-img="${i}">`).join('')}<span class="ritual-count"><b data-ritual-n>1</b> / ${t.ritual.length}</span></div>
    </div>
    <div class="ritual-text">
      ${kicker(t.ritualKicker)}
      <h2>${esc(t.ritualTitle)}</h2>
      <ol>${t.ritual.map(([h2, x], i) => `<li data-ritual-step="${i}"${i ? '' : ' class="on"'}><span class="step-n">${i + 1}</span><div><h3>${esc(h2)}</h3><p>${esc(x)}</p></div></li>`).join('')}</ol>
    </div>
  </div>
</section>
${EDGE}
<section class="finder-sec" id="ritual-finder">
  <div class="wrap finder-wrap">
    <div class="finder-intro reveal">${kicker(f.kicker)}<h2>${esc(f.title)}</h2><p>${esc(f.text)}</p></div>
    <div class="finder card-box reveal" data-finder>
      <div class="finder-start"><img src="/assets/brand/symbol-gold.svg" alt="" width="90" height="90"><button type="button" class="btn btn-lg" data-finder-go>${esc(f.start)} ${icon('arrow', 20)}</button></div>
      ${f.q.map(([q, opts], qi) => `<fieldset class="finder-q" data-q="${qi}" hidden><p class="finder-step">${esc(f.step(qi + 1, f.q.length))}</p><legend>${esc(q)}</legend><div class="finder-opts">${opts.map(([v, l, d]) => `<button type="button" data-a="${v}"><strong>${esc(l)}</strong><span>${esc(d)}</span></button>`).join('')}</div>${qi ? `<button type="button" class="link-btn finder-back" data-finder-back>${esc(f.back)}</button>` : ''}</fieldset>`).join('')}
      <div class="finder-result" hidden><p class="finder-step">${esc(f.result)}</p><p>${esc(f.resultText)}</p><ul class="finder-list" data-finder-list></ul><p class="finder-total" data-finder-total></p><button type="button" class="btn btn-lg btn-block" data-finder-add>${icon('bag', 20)} ${esc(f.addAll)}</button><button type="button" class="link-btn finder-back" data-finder-restart>${esc(f.restart)}</button></div>
    </div>
  </div>
  <script type="application/json" id="finder-data">${JSON.stringify({ products: finderData, added: f.added }).replace(/</g, '\\u003c')}</script>
</section>
${EDGE}
${processStrip(lang)}
${EDGE}
<section class="saga reveal" aria-labelledby="saga-title">
  <span class="saga-word" aria-hidden="true"><span>Khadija · Atlas · Hamburg · Khadija · Atlas · Hamburg · </span><span>Khadija · Atlas · Hamburg · Khadija · Atlas · Hamburg · </span></span>
  <div class="wrap saga-grid">
    <figure class="saga-medal">
      <svg class="saga-ring" viewBox="0 0 400 400" aria-hidden="true"><defs><path id="saga-circle" d="M200,200 m-176,0 a176,176 0 1,1 352,0 a176,176 0 1,1 -352,0"/></defs><text><textPath href="#saga-circle">${esc(t.saga.ring)}</textPath></text></svg>
      <span class="saga-orbit" aria-hidden="true"><i></i></span>
      <span class="saga-photo"><img src="${esc(photos.story)}" alt="Khadija Hakki" loading="lazy" width="1000" height="1250"></span>
      <span class="saga-seal" aria-hidden="true"><img src="/assets/brand/symbol-gold.svg" alt="" width="40" height="40"></span>
    </figure>
    <div class="saga-text">
      ${kicker(t.storyKicker)}
      <h2 id="saga-title" class="saga-title">${esc(t.storyTitle).split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ')}</h2>
      <p class="saga-lead">${esc(t.storyText)}</p>
      <div class="saga-route" aria-label="${esc(t.saga.route)}">
        <svg viewBox="0 0 360 120" aria-hidden="true">
          <path class="saga-path-bg" d="M24 96 C 110 96, 150 18, 336 24"/>
          <path class="saga-path" id="saga-path" d="M24 96 C 110 96, 150 18, 336 24"/>
          <circle class="saga-pin a" cx="24" cy="96" r="6"/><circle class="saga-pin b" cx="336" cy="24" r="6"/>
          <circle class="saga-dot" r="5"/>
        </svg>
        <span class="saga-place a"><b>${esc(t.saga.from)}</b>${esc(t.saga.fromSub)}</span>
        <span class="saga-place b"><b>Hamburg</b>${esc(t.saga.toSub)}</span>
        <span class="saga-km">≈ 2.800 km</span>
      </div>
      <ul class="saga-facts">${t.trust.slice(0, 3).map(([ic, h], i) => `<li style="--i:${i}">${icon(ic, 18)}<span>${esc(h)}</span></li>`).join('')}</ul>
      <p class="saga-sign"><span class="saga-name">Khadija</span><span>${esc(t.storySign)}</span></p>
      <div class="saga-ctas"><a class="btn btn-gold" href="/${lang}/about">${esc(t.storyCta)} ${icon('arrow', 20)}</a><button type="button" class="btn btn-light" data-film-open><span class="play" aria-hidden="true"></span>${esc(t.heroFilm)}</button></div>
    </div>
  </div>
</section>
${EDGE}
${latest.length ? `<section class="section wrap">${sectionHead(t.newArrivals, t.shop, `/${lang}/shop`, t.viewAll)}${grid(latest, ctx, t.noProducts)}</section>` : ''}
<section class="section wrap faq-news">
  <div class="faq reveal"><h2>${esc(t.faqTitle)}</h2><div class="accordion">${t.faq.map(([q, a]) => `<details><summary>${esc(q)}${icon('plus', 18)}</summary><div>${esc(a)}</div></details>`).join('')}</div></div>
  ${newsletterBox(lang)}
</section>
${filmDialog(t)}`;
  const lds = [
    orgLd(ctx),
    { '@context': 'https://schema.org', '@type': 'WebSite', name: settings.store_name || 'Khachija', url: `${ctx.origin}/${lang}/`, inLanguage: lang, potentialAction: { '@type': 'SearchAction', target: `${ctx.origin}/${lang}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'VideoObject', name: t.film.title, description: t.film.text, thumbnailUrl: `${ctx.origin}/assets/video/kooperative-poster.webp`, contentUrl: `${ctx.origin}/assets/video/kooperative-film.mp4`, uploadDate: '2026-11-24', duration: 'PT5M7S' },
  ];
  return layout(ctx, { title: '', path: '/', body, page: 'home', lds, preload: '/assets/video/kooperative-poster.webp' });
}

function filmDialog(t) {
  return `<dialog class="film-dialog" aria-label="${esc(t.film.title)}"><button type="button" class="film-close" data-film-close aria-label="${esc(t.close)}">${icon('close', 26)}</button><video controls playsinline preload="none" poster="/assets/video/kooperative-poster.webp"><source src="/assets/video/kooperative-film.mp4" type="video/mp4"></video></dialog>`;
}

// "From fruit to care": the real production steps, with frames from the cooperative's film.
function processStrip(lang) {
  const pr = T[lang].process;
  return `<section class="process-sec">
  <div class="wrap process-head reveal">${kicker(pr.kicker)}<h2>${esc(pr.title)}</h2><p>${esc(pr.text)}</p></div>
  <div class="process-track" data-drag>${pr.steps.map(([img, h, x], i) => `<figure class="process-card reveal" style="--d:${i * 70}ms"><img src="/assets/story/${img}.webp" alt="" loading="lazy" width="848" height="478"><figcaption><span>0${i + 1}</span><strong>${esc(h)}</strong>${esc(x)}</figcaption></figure>`).join('')}</div>
</section>`;
}

function newsletterBox(lang) {
  const t = T[lang];
  return `<form class="newsletter reveal" data-newsletter novalidate>
    ${ornament('news-orn')}
    <h2>${esc(t.newsletterTitle)}</h2>
    <p>${esc(t.newsletterText)}</p>
    <div class="news-row"><input type="email" name="email" required autocomplete="email" placeholder="${esc(t.newsletterPh)}" aria-label="${esc(t.newsletterPh)}"><button class="btn" type="submit">${esc(t.newsletterBtn)}</button></div>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="news-done" hidden>${esc(t.newsletterThanks)}</p>
  </form>`;
}

export function listingPage(ctx, { title, path, products, q = '', sort = '', description = '', image = '', seoTitle = '', metaDescription = '', current = '', seoText = '' }) {
  const { lang, categories } = ctx;
  const t = T[lang];
  const sortOpts = [['', t.sortNew], ['price_asc', t.sortPriceAsc], ['price_desc', t.sortPriceDesc]];
  const body = `<section class="page-hero${image ? ' has-img' : ''}">
  <div class="wrap page-hero-in">
    <div>${kicker(t.shop)}<h1>${esc(title)}</h1>${description ? `<p class="lead">${esc(description)}</p>` : ''}</div>
    ${image ? `<span class="arch-frame page-hero-img"><img src="${esc(small(image))}" alt="" width="480" height="600"></span>` : ''}
  </div>
</section>
<section class="wrap section listing">
  <nav class="cat-chips" aria-label="${esc(t.categories)}"><a href="/${lang}/shop"${!current ? ' aria-current="page"' : ''}>${esc(t.allProducts)}</a>${categories.map((c) => `<a href="/${lang}/c/${esc(c.slug)}"${current === c.slug ? ' aria-current="page"' : ''}>${esc(catName(c, lang))}</a>`).join('')}</nav>
  <form class="filters" action="/${lang}${esc(path)}" method="get">
    <p class="count">${esc(t.productsCount(products.length))}</p>
    <label class="search">${icon('search', 18)}<input type="search" name="q" value="${esc(q)}" placeholder="${esc(t.search)}" aria-label="${esc(t.search)}"></label>
    <label class="sort"><span>${esc(t.sort)}</span><select name="sort" data-autosubmit>${sortOpts.map(([v, l]) => `<option value="${v}"${v === sort ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <noscript><button class="btn btn-small">OK</button></noscript>
  </form>
  ${grid(products, ctx, q ? t.noResults : t.noProducts)}
  ${seoText && !q ? `<div class="seo-text">${seoText}</div>` : ''}
</section>`;
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (sort) query.set('sort', sort);
  const lds = [
    breadcrumbLd(ctx.origin, [[t.home, `/${lang}/`], [title, `/${lang}${path}`]]),
    products.length ? { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: products.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${ctx.origin}/${lang}/p/${p.slug}`, name: productName(p, lang) })) } : null,
  ];
  return layout(ctx, { title, seoTitle, description: metaDescription, path: query.size ? `${path}?${query}` : path, body, noindex: Boolean(q || sort), image, page: 'shop', lds });
}

const optLabel = (v, lang) => v.tr?.[lang] || v.label;

// Text choices with their own prices become cards that show the full price of each choice (first one preselected).
const pricedChoices = (g) => g.type !== 'color' && g.values.length > 1 && g.values.some((v) => v.price);

export function optionFieldset(ctx, g, gi, base = 0) {
  const t = T[ctx.lang];
  const name = optionGroupName(g, ctx.lang);
  if (pricedChoices(g)) {
    const top = Math.max(...g.values.map((v) => v.price));
    return `<fieldset class="options opt-cards"><legend>${esc(name || t.choose)}<em class="picked" data-picked>: ${esc(optLabel(g.values[0], ctx.lang))}</em></legend><div>${g.values
      .map((v, i) => `<label><input type="radio" name="opt${gi}" value="${esc(v.label)}" data-extra="${v.price}" data-show="${esc(optLabel(v, ctx.lang))}"${i ? '' : ' checked'} required><span><i class="oc-radio" aria-hidden="true"></i><b>${esc(optLabel(v, ctx.lang))}</b>${v.price === top && i === 0 ? `<em class="oc-tag">${esc(t.setBest)}</em>` : ''}<strong>${esc(money(base + v.price, ctx.lang))}</strong></span></label>`)
      .join('')}</div></fieldset>`;
  }
  const only = g.values.length === 1;
  const extra = (n) => (n ? `<small class="opt-extra">${n > 0 ? '+' : '−'}${esc(money(Math.abs(n), ctx.lang))}</small>` : '');
  return `<fieldset class="options${g.type === 'color' ? ' swatches' : ''}"><legend>${esc(name || t.choose)}<em class="picked" data-picked>${only ? `: ${esc(optLabel(g.values[0], ctx.lang))}` : ''}</em></legend><div>${g.values
    .map((v) => `<label title="${esc(optLabel(v, ctx.lang))}"><input type="radio" name="opt${gi}" value="${esc(v.label)}" data-extra="${v.price}" data-show="${esc(optLabel(v, ctx.lang))}"${only ? ' checked' : ''} required><span>${g.type === 'color' ? `<i class="dot" style="background:${esc(v.color)}"></i>` : ''}${esc(optLabel(v, ctx.lang))}${extra(v.price)}</span></label>`)
    .join('')}</div></fieldset>`;
}

function offerCards(ctx, p, bundles, image) {
  const t = T[ctx.lang];
  const tiers = [{ qty: 1, price: p.price, label: {}, hot: false }, ...bundles];
  return `<fieldset class="offers" data-offers><legend>${esc(t.offersTitle)}</legend>${tiers
    .map((b) => {
      const was = p.price * b.qty;
      const save = was - b.price;
      const title = bundleTitle(b, ctx.lang) || t.offerPieces(b.qty);
      return `<label class="offer${b.hot ? ' hot' : ''}"><input type="radio" name="offer" value="${b.qty}" data-price="${b.price}"${b.qty === 1 ? ' checked' : ''}>
        <span class="offer-pic"><img src="${esc(small(image))}" alt="" width="56" height="70" loading="lazy">${b.qty > 1 ? `<b>×${b.qty}</b>` : ''}</span>
        <span class="offer-main"><strong>${esc(title)}</strong><span class="offer-price"><span>${esc(money(b.price, ctx.lang))}</span>${save > 0 ? ` <s>${esc(money(was, ctx.lang))}</s>` : ''}</span></span>
        ${save > 0 ? `<span class="offer-tags">${b.hot ? `<em>${esc(t.offerHot)}</em>` : ''}<span class="offer-save">${esc(t.offerSave(money(save, ctx.lang)))}</span></span>` : ''}
      </label>`;
    })
    .join('')}</fieldset>`;
}

export function productLd(ctx, p, { name, desc, images, category = null, url }) {
  const { origin, settings, lang } = ctx;
  const store = settings.store_name || 'Khachija';
  const soldOut = p.stock != null && p.stock <= 0;
  const year = new Date().getUTCFullYear();
  const fee = Number(settings.shipping_fee) || 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name,
    description: String(desc || name).slice(0, 5000),
    image: images.map((u) => abs(origin, u)),
    sku: `KH-${p.id}`,
    url,
    brand: { '@type': 'Brand', name: store },
    ...(category ? { category: catName(category, lang) } : {}),
    offers: {
      '@type': 'Offer',
      price: (p.price / 100).toFixed(2),
      priceCurrency: 'EUR',
      priceValidUntil: `${year + 1}-12-31`,
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: store },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: (fee / 100).toFixed(2), currency: 'EUR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'DE' },
        deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' }, transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' } },
      },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'DE', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility' },
    },
  };
}

export function productPage(ctx, p, category, related) {
  const { lang, origin, settings } = ctx;
  const t = T[lang];
  const name = productName(p, lang);
  const sub = productField(p, 'subtitle', lang);
  const descRaw = productDesc(p, lang);
  const desc = richText(descRaw);
  const usage = productField(p, 'usage', lang);
  const images = productImages(p);
  if (!images.length) images.push(PLACEHOLDER);
  const options = productOptions(p);
  const bundles = liveBundles(p).filter((b) => p.stock == null || b.qty <= p.stock);
  const soldOut = p.stock != null && p.stock <= 0;
  const onSale = p.compare_price && p.compare_price > p.price;
  const unit = unitPrice(p, lang);
  const content = contentLabel(p);
  const url = `${origin}/${lang}/p/${p.slug}`;
  const stockLine = soldOut ? '' : p.stock != null && p.stock <= 5 ? `<p class="stock stock-low"><span class="dot"></span>${esc(t.onlyLeft(p.stock))}</p>` : `<p class="stock"><span class="dot"></span>${esc(t.inStock)}</p>`;
  const tabs = [
    descRaw ? [t.details, `<div class="rich">${richHtml(descRaw)}</div>`, true] : null,
    usage ? [t.usage, `<div class="rich">${richHtml(usage)}</div>`] : null,
    p.ingredients ? [t.ingredients, `<p class="inci">${esc(p.ingredients)}</p>`] : null,
    [t.shippingReturns, `<p>${esc(t.shippingReturnsText)}</p><p><a href="/${lang}/versand">${esc(t.legal.versand)}</a> · <a href="/${lang}/widerruf">${esc(t.legal.widerruf)}</a></p>`],
  ].filter(Boolean);
  const body = `<nav class="crumbs wrap" aria-label="breadcrumb"><a href="/${lang}/">${esc(t.home)}</a><span>/</span>${category ? `<a href="/${lang}/c/${esc(category.slug)}">${esc(catName(category, lang))}</a><span>/</span>` : ''}<span aria-current="page">${esc(name)}</span></nav>
<section class="wrap product">
  <div class="gallery" aria-label="${esc(name)}">
    <span class="gal-seal" aria-hidden="true"><img src="/assets/brand/symbol-gold.svg" alt="" width="30" height="30"><span>${esc(t.trust?.[1]?.[1] || 'Handmade')}</span></span>
    <div class="gallery-track">${images.map((u, i) => `<figure class="${isPackshot(u) ? 'packshot' : ''}"${i ? '' : ` style="view-transition-name: p${p.id}"`}><img src="${esc(u)}" alt="${esc(name)}${i ? ` ${i + 1}` : ''}" width="1000" height="1250"${i ? ' loading="lazy"' : ' fetchpriority="high"'}></figure>`).join('')}</div>
    ${images.length > 1 ? `<button type="button" class="gal-arrow gal-prev" data-gal="-1" aria-label="‹">${icon('chevronL', 22)}</button><button type="button" class="gal-arrow gal-next" data-gal="1" aria-label="›">${icon('chevronR', 22)}</button><span class="gal-count" aria-hidden="true"><b data-gal-i>1</b> / ${images.length}</span><div class="thumbs">${images.map((u, i) => `<button type="button" data-go="${i}"${i === 0 ? ' class="on"' : ''} aria-label="${i + 1}"><img src="${esc(small(u))}" alt="" width="96" height="120" loading="lazy"></button>`).join('')}</div>` : ''}
  </div>
  <div class="product-info">
    ${category ? kicker(catName(category, lang)) : ''}
    <h1>${esc(name)}</h1>
    ${sub ? `<p class="subtitle sub-chips">${sub.split(/\s+·\s+/).filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')}</p>` : ''}
    <div class="price-block">
      <p class="price big"><span data-unit>${esc(money(p.price + options.filter(pricedChoices).reduce((x, g) => x + g.values[0].price, 0), lang))}</span>${onSale ? ` <s>${esc(money(p.compare_price, lang))}</s> <span class="save">−${Math.round((1 - p.price / p.compare_price) * 100)} %</span>` : ''}</p>
      ${unit ? `<p class="unit">${esc(t.contents)}: ${esc(content)} · ${esc(t.unit)}: ${esc(unit)}</p>` : ''}
      ${priceNote(ctx)}
    </div>
    <form class="buy" novalidate data-product="${p.id}" data-name="${esc(name)}" data-price="${p.price}" data-image="${esc(images[0])}" data-slug="${esc(p.slug)}">
      ${options.map((g, gi) => optionFieldset(ctx, g, gi, p.price)).join('')}
      ${bundles.length && !soldOut ? `${offerCards(ctx, p, bundles, images[0])}<input type="hidden" name="qty" value="1">` : ''}
      ${soldOut ? `<button class="btn btn-block" type="button" disabled>${esc(t.outOfStock)}</button>` : `<div class="buy-row">
        ${bundles.length ? '' : `<div class="qty" role="group" aria-label="${esc(t.quantity)}"><button type="button" data-step="-1" aria-label="−">${icon('minus', 16)}</button><input name="qty" type="number" inputmode="numeric" min="1" max="${p.stock != null ? Math.max(1, Math.min(20, p.stock)) : 20}" value="1" aria-label="${esc(t.quantity)}"><button type="button" data-step="1" aria-label="+">${icon('plus', 16)}</button></div>`}
        <button class="btn btn-lg add-btn" type="submit" name="go" value="cart">${icon('bag', 20)}<span>${esc(t.addToCart)}</span></button>
      </div>
      <button class="btn btn-gold btn-lg btn-block" type="submit" name="go" value="checkout">${esc(t.buyNow)}</button>
      <p class="form-error" role="alert" hidden></p>`}
    </form>
    ${stockLine}
    ${soldOut ? '' : `<div class="eta">${icon('truck', 22)}<span>${esc(t.eta)} <strong data-eta="${esc(settings.delivery_days || '1-3')}"></strong></span></div>`}
    <ul class="perks">${t.perks.map(([ic, x]) => `<li>${icon(ic, 22)}<span>${esc(x)}</span></li>`).join('')}</ul>
    ${payBadges()}
    <div class="accordion product-tabs">${tabs.map(([h, html, open]) => `<details${open ? ' open' : ''}><summary>${esc(h)}${icon('plus', 18)}</summary><div>${html}</div></details>`).join('')}</div>
    <div class="share-row"><span>${esc(t.share)}</span><a class="share-btn" href="https://wa.me/?text=${encodeURIComponent(`${name} · ${url}`)}" rel="noopener" target="_blank" aria-label="WhatsApp">${waIcon(18)}</a><button class="share-btn" type="button" data-copy="${esc(url)}" aria-label="${esc(t.copyLink)}">${icon('link', 18)}</button></div>
  </div>
</section>
${soldOut ? '' : `<div class="buy-bar"><div><strong>${esc(name)}</strong><span data-unit>${esc(money(p.price + options.filter(pricedChoices).reduce((x, g) => x + g.values[0].price, 0), lang))}</span></div><div class="buy-bar-actions">${settings.whatsapp ? `<a class="buy-bar-wa" href="${esc(waLink(settings.whatsapp, `${name} · ${url}`))}" rel="noopener" target="_blank" aria-label="WhatsApp">${waIcon(22)}</a>` : ''}<button type="button" class="btn" data-buy-bar>${esc(t.addToCart)}</button></div></div>`}
${related.length ? `<section class="section wrap">${sectionHead(t.alsoLike, category ? catName(category, lang) : t.shop, category ? `/${lang}/c/${category.slug}` : `/${lang}/shop`, t.viewAll)}${grid(related, ctx, '')}</section>` : ''}
${ld(productLd(ctx, p, { name, desc, images, category, url }))}`;
  const crumbs = [[t.home, `/${lang}/`], ...(category ? [[catName(category, lang), `/${lang}/c/${category.slug}`]] : []), [name, `/${lang}/p/${p.slug}`]];
  return layout(ctx, {
    title: name,
    seoTitle: t.productSeoTitle(name),
    description: desc.length >= 70 ? desc.slice(0, 158) : t.productSeoDesc(name, money(p.price, lang)),
    lds: [breadcrumbLd(origin, crumbs)],
    path: `/p/${p.slug}`,
    body,
    image: images[0],
    preload: images[0],
    page: 'product',
    product: { name, price: money(p.price, lang), slug: p.slug },
    track: { event: 'ViewContent', value: p.price / 100, items: [{ id: p.id, name, price: p.price / 100, qty: 1 }] },
  });
}

function stepsBar(lang, current) {
  const t = T[lang];
  return `<ol class="checkout-steps">${[t.stepCart, t.stepDetails, t.stepDone].map((s, i) => `<li${i === current ? ' aria-current="step"' : ''}${i < current ? ' class="done"' : ''}><span>${i < current ? icon('check', 14) : i + 1}</span>${esc(s)}</li>`).join('')}</ol>`;
}

export function cartPage(ctx) {
  const { lang } = ctx;
  const t = T[lang];
  const body = `<section class="wrap section cart-page">
  ${stepsBar(lang, 0)}
  <h1 class="center">${esc(t.cart)}</h1>
  <div class="cart-layout">
    <div id="cart" class="cart" data-view="cart"><div class="skeleton"></div><div class="skeleton"></div></div>
    <aside class="cart-side card-box" data-view="cart-totals"></aside>
  </div>
  <noscript><p class="center">JavaScript is required for the cart.</p></noscript>
</section>`;
  return layout(ctx, { title: t.cart, path: '/cart', body, noindex: true, page: 'cart' });
}

export function checkoutPage(ctx) {
  const { lang, settings, env } = ctx;
  const t = T[lang];
  const countries = shippingCountries(settings);
  const methods = ['paypal', 'bank', 'cod'];
  const available = paymentMethods(settings, env, 'DE');
  const anyMethod = paymentMethods(settings, env, 'XX');
  const fee = Number(settings.cod_fee) || 0;
  const FI = { name: 'user', phone: 'phone', street: 'pin', city: 'home', email: 'mail' };
  const field = (name, label, attrs = '', cls = '') => `<label class="fl fl-ico ${cls}"><input name="${name}" placeholder=" " ${attrs}><span>${esc(label)}</span><i class="fl-i" aria-hidden="true">${icon(FI[name] || 'pin', 18)}</i><i class="fl-ok" aria-hidden="true">${icon('check', 14)}</i></label>`;
  const payIcon = { paypal: '<span class="pb pb-paypal"><b>Pay</b><i>Pal</i></span>', bank: icon('bank', 26), cod: icon('cash', 26) };
  const body = `<section class="wrap section checkout-wrap">
  ${stepsBar(lang, 1)}
  <a class="co-mini" href="#co-summary" data-co-mini><span class="co-mini-thumbs" data-co-thumbs></span><span class="co-mini-label">${esc(t.coX.show)}</span><b data-co-total>…</b>${icon('chevronD', 18)}</a>
  <form id="checkout" class="checkout" novalidate>
    <div class="co-main">
      <fieldset class="co-step"><legend><span class="co-n">1</span>${esc(t.addressTitle)}</legend>
        ${field('name', t.fullName, 'autocomplete="name" required maxlength="120"')}
        ${field('phone', t.phoneReq, 'type="tel" autocomplete="tel" inputmode="tel" required maxlength="24" dir="ltr"')}
        ${field('street', t.street, 'autocomplete="street-address" required maxlength="160"')}
        ${field('city', t.cityZip, 'autocomplete="address-level2" required maxlength="90"')}
        <p class="hint">${esc(t.cityZipHint)}</p>
        <label class="fl fl-select"><select name="country" autocomplete="country" required data-country>${countries.map((c) => `<option value="${c}">${esc(countryName(c, lang))}</option>`).join('')}</select><span>${esc(t.country)}</span></label>
        ${field('email', t.emailOpt, 'type="email" autocomplete="email" maxlength="254" dir="ltr"')}
        <p class="hint">${esc(t.emailHint)}</p>
      </fieldset>
      <fieldset class="co-step"><legend><span class="co-n">2</span>${esc(t.shippingTitle)}</legend>
        <div class="ship-opt">${icon('truck', 26)}<div><strong>${esc(t.shippingDhl)}</strong><span>${esc(t.shippingDays(String(settings.delivery_days || '1-3').replace('-', '–')))}</span></div><b data-ship-price>…</b></div>
      </fieldset>
      <fieldset class="co-step"><legend><span class="co-n">3</span>${esc(t.paymentTitle)}</legend>
        <div class="pay-opts">${methods
          .filter((m) => anyMethod.includes(m) || (m === 'cod' && available.includes('cod')))
          .map((m, i) => `<label class="pay-opt" data-method="${m}"><input type="radio" name="payment" value="${m}"${i === 0 ? ' checked' : ''} required><span class="pay-radio"></span><span class="pay-text"><strong>${esc(t.pay[m][0])}${m === 'cod' && fee ? ` <small>${esc(t.codFee(money(fee, lang)))}</small>` : ''}</strong><span>${esc(t.pay[m][1])}</span></span><span class="pay-icon">${payIcon[m]}</span></label>`)
          .join('')}</div>
      </fieldset>
      <label class="fl fl-area"><textarea name="note" rows="2" maxlength="500" placeholder=" "></textarea><span>${esc(t.note)}</span></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    </div>
    <aside class="co-side">
      <div class="card-box summary" id="co-summary">
        <h2>${esc(t.summaryTitle)}</h2>
        <div id="cart" data-view="summary"><div class="skeleton"></div></div>
        <label class="check"><input type="checkbox" name="terms" required><span>${t.terms(`/${lang}/agb`, `/${lang}/widerruf`, `/${lang}/datenschutz`)}</span></label>
        <button class="btn btn-lg btn-block place-order" type="submit" data-label-default="${esc(t.placeOrder)}" data-label-paypal="${esc(t.placeOrderPaypal)}">${icon('lock', 18)}<span>${esc(t.placeOrder)}</span><b class="po-total" data-co-total></b></button>
        <p class="form-error" role="alert" hidden></p>
        <ul class="co-trust">${t.coX.trust.map(([ic, x]) => `<li>${icon(ic, 18)}<span>${esc(x)}</span></li>`).join('')}</ul>
        <p class="hint center">${esc(t.hygiene)}</p>
        ${payBadges()}
      </div>
    </aside>
  </form>
</section>`;
  return layout(ctx, { title: t.checkout, path: '/checkout', body, noindex: true, page: 'checkout', minimal: true, track: { event: 'InitiateCheckout' } });
}

const ADDRESS = (o, lang) => `${esc(`${o.first_name} ${o.last_name}`.trim())}<br>${esc(o.street)}${o.address2 ? `<br>${esc(o.address2)}` : ''}<br>${esc(o.zip)} ${esc(o.city)}<br>${esc(countryName(o.country, lang))}`;

export function orderPage(ctx, order, items, { paypalError = false } = {}) {
  const { lang, settings } = ctx;
  const t = T[lang];
  const flow = ['new', 'confirmed', 'shipped', 'delivered'];
  const at = flow.indexOf(order.status);
  const paid = order.payment_status === 'paid';
  const timeline = at >= 0 ? `<ol class="timeline">${flow.map((s, i) => `<li class="${i <= at ? 'done' : ''}"><span>${i <= at ? icon('check', 14) : ''}</span>${esc(t.status[s])}</li>`).join('')}</ol>` : `<p class="center status-pill">${esc(t.status[order.status] || order.status)}</p>`;
  let pay = '';
  if (order.payment_method === 'bank' && !paid && order.status !== 'cancelled') {
    const qr = giroCodeSvg({ owner: settings.bank_owner || settings.legal_name, iban: settings.bank_iban, bic: settings.bank_bic, cents: order.total, reference: order.number });
    const row = (k, v, copy = true) => `<div><dt>${esc(k)}</dt><dd dir="ltr"><span>${esc(v)}</span>${copy ? `<button type="button" class="copy-btn" data-copy="${esc(String(v).replace(/\s/g, k === t.bankIban ? '' : ' '))}" aria-label="${esc(t.copy)}">${icon('copy', 16)}</button>` : ''}</dd></div>`;
    pay = `<div class="card-box bank-box">
      <h2>${icon('bank', 24)} ${esc(t.bankTitle)}</h2>
      <p>${esc(t.bankText(settings.bank_days || '7'))}</p>
      ${settings.bank_iban ? `<div class="bank-grid"><dl class="bank-dl">${row(t.bankOwner, settings.bank_owner || settings.legal_name || '', false)}${row(t.bankIban, formatIban(settings.bank_iban))}${settings.bank_bic ? row(t.bankBic, settings.bank_bic) : ''}${settings.bank_name ? row(t.bankName, settings.bank_name, false) : ''}${row(t.bankAmount, money(order.total, lang))}${row(t.bankRef, order.number)}</dl>${qr ? `<figure class="qr">${qr}<figcaption>${esc(t.bankQr)}</figcaption></figure>` : ''}</div>` : `<p><strong>${esc(t.bankMissing)}</strong></p>`}
    </div>`;
  } else if (order.payment_method === 'paypal' && !paid && order.status !== 'cancelled') {
    pay = `<div class="card-box pay-box"><p>${esc(paypalError ? t.paypalFailed : t.paypalPending)}</p><form method="post" action="/api/orders/${esc(order.number)}/paypal?t=${esc(order.token)}&lang=${lang}" data-paypal-retry><button class="btn btn-lg"><span class="pb pb-paypal"><b>Pay</b><i>Pal</i></span> ${esc(t.paypalRetry)}</button></form></div>`;
  }
  const lead = paid ? t.thanksPaid : order.payment_method === 'cod' ? t.thanksCod : t.thanksText;
  const track = order.tracking ? trackingUrl(order.carrier, order.tracking) : '';
  const body = `<section class="wrap section order-page">
  ${stepsBar(lang, 2)}
  <div class="thanks">
    <div class="check-burst" aria-hidden="true"><img src="/assets/brand/symbol-gold.svg" alt="" width="120" height="120"><span>${icon('check', 36)}</span></div>
    <h1>${esc(t.thanks)}</h1>
    <p class="lead">${esc(lead)}</p>
  </div>
  ${timeline}
  ${pay}
  ${track ? `<p class="center"><a class="btn btn-ghost" href="${esc(track)}" rel="noopener" target="_blank">${icon('truck', 20)} ${esc(t.trackParcel)} · ${esc(order.tracking)}</a></p>` : ''}
  <div class="order-grid">
    <div class="card-box">
      <dl class="order-meta">
        <div><dt>${esc(t.orderNumber)}</dt><dd dir="ltr">${esc(order.number)}</dd></div>
        <div><dt>${esc(t.payment)}</dt><dd>${esc(t.pay[order.payment_method]?.[0] || order.payment_method)} · ${esc(t.paymentStatus[order.payment_status] || '')}</dd></div>
      </dl>
      <ul class="lines">${items.map((i) => `<li><span>${esc(i.name)}${i.option ? ` <small>${esc(i.option)}</small>` : ''} <small>× ${i.qty}</small></span><span>${esc(money(i.price * i.qty, lang))}</span></li>`).join('')}</ul>
      <ul class="totals">
        <li><span>${esc(t.js.subtotal)}</span><span>${esc(money(order.subtotal, lang))}</span></li>
        <li><span>${esc(t.js.shipping)}</span><span>${order.shipping ? esc(money(order.shipping, lang)) : esc(t.js.free)}</span></li>
        ${order.payment_fee ? `<li><span>${esc(t.js.codFee)}</span><span>${esc(money(order.payment_fee, lang))}</span></li>` : ''}
        <li class="total"><span>${esc(t.js.total)}</span><span>${esc(money(order.total, lang))}</span></li>
        <li class="vat"><span>${esc(order.vat ? t.js.vatIncl.replace('{amount}', money(order.vat, lang)) : t.js.vatSmall)}</span></li>
      </ul>
    </div>
    <div class="card-box"><h2>${esc(t.deliverTo)}</h2><p>${ADDRESS(order, lang)}</p><p class="muted" dir="ltr">${esc(displayPhone(order.phone || ''))}${order.email ? `<br>${esc(order.email)}` : ''}</p></div>
  </div>
  <p class="center actions"><a class="btn btn-ghost" href="/${lang}/shop">${esc(t.continueShopping)}</a></p>
</section>`;
  return layout(ctx, { title: t.thanks, path: '/', body, noindex: true, page: 'order', track: paid || order.payment_method !== 'paypal' ? { event: 'Purchase', id: order.number, value: order.total / 100, items: items.map((i) => ({ id: i.product_id, name: i.name, price: i.price / 100, qty: i.qty })) } : null });
}

export function legalPage(ctx, kind) {
  const { lang, settings } = ctx;
  const t = T[lang];
  const doc = legalDoc(kind, lang, settings);
  const date = new Date(`${doc.updated}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC', numberingSystem: 'latn' });
  const body = `<section class="wrap section narrow legal">
  ${kicker(t.customerService)}
  <h1>${esc(doc.title)}</h1>
  <p class="legal-updated">${esc(t.updated)} <time datetime="${doc.updated}">${esc(date)}</time></p>
  ${doc.arNote ? `<p class="legal-note">${doc.arNote}</p>` : ''}
  <div${doc.sourceLang === 'de' && lang !== 'de' ? ' lang="de" dir="ltr"' : ''}>
  ${doc.sections.map(([h, html], i) => `<section id="s${i + 1}"><h2>${esc(h)}</h2>${html}</section>`).join('\n  ')}
  </div>
  <nav class="legal-nav">${LEGAL_PAGES.filter((k) => k !== kind).map((k) => `<a href="/${lang}/${k}">${esc(t.legal[k])}</a>`).join('')}</nav>
</section>`;
  return layout(ctx, { title: doc.title, description: `${doc.title} · ${settings.store_name || 'Khachija'}`, path: `/${kind}`, body, page: 'legal' });
}

export function aboutPage(ctx, photos, products = []) {
  const { lang, settings } = ctx;
  const t = T[lang];
  const a = t.aboutPage;
  const ab = t.aboutX;
  const portrait = settings.founder_photo || photos.about[0];
  const body = `<section class="about-x">
  <div class="wrap about-x-grid">
    <div class="about-x-text">
      ${kicker(a.kicker)}
      <p class="about-hello">${esc(ab.hello)}</p>
      <h1 class="about-name">Khadija<span>Hakki</span></h1>
      <p class="lead">${esc(a.lead)}</p>
      <button type="button" class="btn btn-ghost btn-lg" data-film-open><span class="play" aria-hidden="true"></span>${esc(ab.filmCta)}</button>
    </div>
    <div class="about-x-img"><span class="arch-frame parallax"><img src="${esc(portrait)}" alt="Khadija Hakki" width="1000" height="1250" fetchpriority="high"></span><img class="about-seal" src="/assets/brand/symbol-gold.svg" alt="" width="120" height="120"></div>
  </div>
  <span class="about-x-word" aria-hidden="true">Khachija</span>
</section>
<section class="wrap section chapters">
  ${sectionHead(ab.chaptersTitle, a.kicker)}
  <ol class="chapter-list">${ab.chapters.map(([n, h, x], i) => `<li class="reveal" style="--d:${i * 100}ms"><span class="chapter-n">${n}</span><div><h3>${esc(h)}</h3><p>${esc(x)}</p></div></li>`).join('')}</ol>
</section>
<section class="spot">
  <div class="wrap spot-grid">
    <figure class="spot-img reveal"><img src="/assets/p/kaffeeseife-khadija.webp" alt="${esc(t.spot.alt)}" loading="lazy" width="1000" height="1067"><figcaption><span>${esc(t.spot.badge)}</span></figcaption></figure>
    <div class="spot-text reveal" style="--d:150ms">
      ${kicker(t.spot.kicker)}
      <h2>${esc(t.spot.title)}</h2>
      <p class="spot-lead">${esc(t.spot.text)}</p>
      <ul class="spot-list">${t.spot.points.map((x) => `<li>${icon('check', 18)}<span>${esc(x)}</span></li>`).join('')}</ul>
      <a class="btn btn-gold btn-lg" href="/${lang}/p/anti-cellulite-kaffeeseife">${esc(t.spot.cta)} ${icon('arrow', 20)}</a>
    </div>
  </div>
</section>
${EDGE}
<section class="about-film">
  <video class="about-film-video" muted loop playsinline preload="none" poster="/assets/video/kooperative-poster.webp" aria-hidden="true" data-loop><source src="/assets/video/kooperative-loop.mp4" type="video/mp4"></video>
  <div class="about-film-in reveal">
    ${kicker(t.film.kicker)}
    <h2>${esc(t.film.title)}</h2>
    <p>${esc(t.film.text)}</p>
    <button type="button" class="film-play" data-film-open><span class="film-ring"><span class="play" aria-hidden="true"></span></span><span>${esc(t.film.cta)} <small>· ${esc(t.film.length)}</small></span></button>
  </div>
</section>
${EDGE}
<section class="quote-band"><div class="wrap narrow center reveal"><img src="/assets/brand/symbol-gold.svg" alt="" width="60" height="60"><blockquote>${esc(ab.quote)}</blockquote><p class="sign">${esc(t.storySign)}</p></div></section>
${processStrip(lang)}
${EDGE}
<section class="story about-mission"><div class="wrap narrow center reveal">${kicker(a.missionTitle)}<p class="mission">${esc(a.mission)}</p></div></section>
${EDGE}
<section class="wrap section"><ul class="values-grid three">${a.pillars.map(([h, x], i) => `<li class="reveal" style="--d:${i * 80}ms">${ornament('val-orn')}<h3>${esc(h)}</h3><p>${esc(x)}</p></li>`).join('')}</ul></section>
${products.length ? `<section class="section wrap">${sectionHead(ab.shopTitle, t.shop, `/${lang}/shop`, t.viewAll)}${grid(products, ctx, '')}</section>` : ''}
${filmDialog(t)}`;
  const film = { '@context': 'https://schema.org', '@type': 'VideoObject', name: t.film.title, description: t.film.text, thumbnailUrl: `${ctx.origin}/assets/video/kooperative-poster.webp`, contentUrl: `${ctx.origin}/assets/video/kooperative-film.mp4`, uploadDate: '2026-11-24', duration: 'PT5M7S' };
  return layout(ctx, { title: a.title, description: a.lead.slice(0, 160), path: '/about', body, page: 'about', lds: [orgLd(ctx), film], image: portrait });
}

export function contactPage(ctx) {
  const { lang, settings } = ctx;
  const t = T[lang];
  const c = t.contactPage;
  const wa = waLink(settings.whatsapp, '');
  const card = (ic, h, inner) => `<li class="reveal">${ic}<h3>${esc(h)}</h3>${inner}</li>`;
  const body = `<section class="page-hero"><div class="wrap narrow center">${kicker(t.contact)}<h1>${esc(c.title)}</h1><p class="lead">${esc(c.lead)}</p></div></section>
<section class="wrap section"><ul class="contact-cards">
  ${settings.contact_email ? card(icon('mail', 30), c.emailUs, `<a href="mailto:${esc(settings.contact_email)}">${esc(settings.contact_email)}</a>`) : ''}
  ${settings.phone ? card(icon('phone', 30), c.callUs, `<a href="tel:${esc(String(settings.phone).replace(/[^\d+]/g, ''))}" dir="ltr">${esc(settings.phone)}</a>`) : ''}
  ${wa ? card(waIcon(30), c.writeUs, `<a href="${esc(wa)}" rel="noopener">${esc(t.whatsappUs)}</a>`) : ''}
  ${settings.legal_address ? card(icon('pin', 30), c.address, `<p>${esc(settings.legal_address)}</p>`) : ''}
</ul><p class="center muted">${esc(c.hours)}</p></section>`;
  return layout(ctx, { title: c.title, description: c.lead, path: '/contact', body, page: 'contact' });
}

export function notFoundPage(ctx) {
  const t = T[ctx.lang];
  const body = `<section class="wrap section narrow center notfound"><img src="/assets/brand/symbol-gold.svg" alt="" width="110" height="110"><h1>${esc(t.notFound)}</h1><p>${esc(t.notFoundText)}</p><p class="actions"><a class="btn" href="/${ctx.lang}/shop">${esc(t.allProducts)}</a> <a class="btn btn-ghost" href="/${ctx.lang}/">${esc(t.backHome)}</a></p></section>`;
  return layout(ctx, { title: t.notFound, path: '/', body, noindex: true });
}

// Blog ("Magazin").
const postField = (post, key, lang) => post[`${key}_${lang}`] || post[`${key}_de`] || post[`${key}_en`] || post[`${key}_ar`] || '';
const postDate = (iso, lang) => {
  const d = new Date(`${String(iso || '').replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'long', numberingSystem: 'latn' }).format(d);
};
const isoDate = (iso) => `${String(iso || '').replace(' ', 'T')}Z`;

function postCard(post, lang, i = 0) {
  const t = T[lang];
  const url = `/${lang}/blog/${esc(post.slug)}`;
  return `<article class="post-card reveal" style="--d:${(i % 3) * 80}ms">
  <a class="post-img" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(small(post.cover || PLACEHOLDER))}" alt="" loading="lazy" width="480" height="600"></a>
  <div class="post-body"><p class="post-date">${esc(postDate(post.created_at, lang))}</p><h2><a href="${url}">${esc(postField(post, 'title', lang))}</a></h2><p>${esc(postField(post, 'excerpt', lang))}</p><a class="more" href="${url}">${esc(t.readMore)} ${icon('arrow', 16)}</a></div>
</article>`;
}

export function blogIndexPage(ctx, posts) {
  const { lang } = ctx;
  const t = T[lang];
  const body = `<section class="page-hero"><div class="wrap narrow center">${kicker(t.blog)}<h1>${esc(t.blogTitle)}</h1><p class="lead">${esc(t.blogIntro)}</p></div></section>
<section class="wrap section">${posts.length ? `<div class="post-grid">${posts.map((p, i) => postCard(p, lang, i)).join('')}</div>` : `<p class="empty">${esc(t.noPosts)}</p>`}</section>`;
  const lds = [breadcrumbLd(ctx.origin, [[t.home, `/${lang}/`], [t.blog, `/${lang}/blog`]])];
  return layout(ctx, { title: t.blog, seoTitle: t.blogSeoTitle, description: t.blogIntro, path: '/blog', body, page: 'blog', lds });
}

export function blogPostPage(ctx, post, others, products) {
  const { lang, origin, settings } = ctx;
  const t = T[lang];
  const store = settings.store_name || 'Khachija';
  const title = postField(post, 'title', lang);
  const excerpt = postField(post, 'excerpt', lang);
  const raw = postField(post, 'body', lang);
  const words = richText(raw).split(/\s+/).filter(Boolean).length;
  const cover = post.cover || '';
  const body = `<nav class="crumbs wrap" aria-label="breadcrumb"><a href="/${lang}/">${esc(t.home)}</a><span>/</span><a href="/${lang}/blog">${esc(t.blog)}</a><span>/</span><span aria-current="page">${esc(title)}</span></nav>
<article class="wrap narrow post">
  <header class="post-head center">${kicker(t.blog)}<h1>${esc(title)}</h1><p class="post-meta">${esc(t.publishedOn(postDate(post.created_at, lang)))} · ${esc(t.minRead(Math.max(1, Math.ceil(words / 200))))}</p></header>
  ${cover ? `<img class="post-cover" src="${esc(cover)}" alt="${esc(title)}" width="1000" height="1250" fetchpriority="high">` : ''}
  <div class="rich post-text">${richHtml(raw)}</div>
  <aside class="post-cta card-box center"><h2>${esc(t.shopTheStore)}</h2><p>${esc(t.shopTheStoreText)}</p><a class="btn" href="/${lang}/shop">${esc(t.allProducts)}</a></aside>
</article>
${products.length ? `<section class="section wrap">${sectionHead(t.latestProducts, t.shop, `/${lang}/shop`, t.viewAll)}${grid(products, ctx, '')}</section>` : ''}
${others.length ? `<section class="section wrap">${sectionHead(t.morePosts, t.blog, `/${lang}/blog`, t.viewAll)}<div class="post-grid">${others.map((p, i) => postCard(p, lang, i)).join('')}</div></section>` : ''}`;
  const url = `${origin}/${lang}/blog/${post.slug}`;
  const lds = [
    breadcrumbLd(origin, [[t.home, `/${lang}/`], [t.blog, `/${lang}/blog`], [title, `/${lang}/blog/${post.slug}`]]),
    { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: title, description: excerpt, ...(cover ? { image: abs(origin, cover) } : {}), datePublished: isoDate(post.created_at), dateModified: isoDate(post.updated_at || post.created_at), inLanguage: lang, wordCount: words, mainEntityOfPage: url, author: { '@type': 'Organization', name: store }, publisher: { '@type': 'Organization', name: store, logo: { '@type': 'ImageObject', url: `${origin}/assets/brand/icon-512.png` } } },
  ];
  return layout(ctx, { title, seoTitle: title, description: excerpt || richText(raw).slice(0, 158), path: `/blog/${post.slug}`, body, image: cover || BRAND_OG, page: 'blog', lds, ogType: 'article' });
}

export { parseJSON };
