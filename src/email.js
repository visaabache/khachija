// Order emails, sent through Brevo's HTTP API (free plan: 300 emails a day).
// Nothing is sent unless the BREVO_API_KEY secret is set and a sender address is saved in the admin.
//   • to the customer, in their language: order confirmation (with bank details for a bank transfer),
//     payment received, shipped (with the DHL tracking link), delivered, cancelled
//   • to the shop owner, in German: a new-order alert

import { T } from './i18n.js';
import { esc, money, displayPhone, countryName } from './lib.js';
import { formatIban } from './girocode.js';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,24}$/i;
export const validEmail = (s) => EMAIL_RE.test(String(s || '').trim());

// Statuses that send the customer an update.
export const STATUS_EMAILS = ['shipped', 'delivered', 'cancelled'];

export function trackingUrl(carrier, tracking) {
  const n = encodeURIComponent(String(tracking || '').trim());
  if (!n) return '';
  if (/dhl|post/i.test(carrier || 'DHL')) return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${n}`;
  if (/hermes/i.test(carrier)) return `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation#${n}`;
  if (/dpd/i.test(carrier)) return `https://tracking.dpd.de/status/de_DE/parcel/${n}`;
  if (/gls/i.test(carrier)) return `https://gls-group.com/DE/de/paketverfolgung?match=${n}`;
  return '';
}

const S = {
  de: {
    receivedSubject: (n) => `Ihre Bestellung ${n} bei Khachija`,
    hello: (name) => `Hallo ${name},`,
    receivedText: 'vielen Dank für Ihre Bestellung! Hier ist Ihre Bestellbestätigung. Wir melden uns, sobald Ihr Paket unterwegs ist.',
    bankText: (days) => `Bitte überweisen Sie den Gesamtbetrag innerhalb von ${days} Tagen auf das folgende Konto. Wir versenden sofort nach Zahlungseingang.`,
    paidSubject: (n) => `Zahlung erhalten · Bestellung ${n}`,
    paidText: 'Ihre Zahlung ist bei uns eingegangen. Wir bereiten Ihr Paket jetzt mit viel Liebe vor.',
    statusSubject: { shipped: (n) => `Ihre Bestellung ${n} ist unterwegs`, delivered: (n) => `Ihre Bestellung ${n} wurde zugestellt`, cancelled: (n) => `Bestellung ${n} storniert` },
    statusText: {
      shipped: 'Gute Nachrichten: Ihr Paket ist auf dem Weg zu Ihnen!',
      delivered: 'Ihr Paket wurde zugestellt. Wir wünschen Ihnen viel Freude mit Ihren Produkten und freuen uns auf ein Wiedersehen!',
      cancelled: 'Ihre Bestellung wurde storniert. Bereits gezahlte Beträge erstatten wir umgehend. Bei Fragen antworten Sie einfach auf diese E-Mail.',
    },
    view: 'Bestellung ansehen',
    items: 'Ihre Artikel',
    address: 'Lieferadresse',
    payment: 'Zahlungsart',
    help: 'Fragen? Antworten Sie einfach auf diese E-Mail',
    legal: 'Es gelten unsere AGB. Widerrufsbelehrung und Muster-Widerrufsformular:',
  },
  en: {
    receivedSubject: (n) => `Your Khachija order ${n}`,
    hello: (name) => `Hello ${name},`,
    receivedText: 'thank you for your order! Here is your order confirmation. We’ll let you know as soon as your parcel is on its way.',
    bankText: (days) => `Please transfer the total within ${days} days to the account below. We ship as soon as the payment arrives.`,
    paidSubject: (n) => `Payment received · order ${n}`,
    paidText: 'Your payment has arrived. We’re now preparing your parcel with love.',
    statusSubject: { shipped: (n) => `Your order ${n} is on its way`, delivered: (n) => `Your order ${n} has been delivered`, cancelled: (n) => `Order ${n} cancelled` },
    statusText: {
      shipped: 'Good news: your parcel is on its way to you!',
      delivered: 'Your parcel has been delivered. Enjoy your products, and we hope to see you again soon!',
      cancelled: 'Your order has been cancelled. Any payment will be refunded promptly. Questions? Just reply to this email.',
    },
    view: 'View order',
    items: 'Your items',
    address: 'Delivery address',
    payment: 'Payment method',
    help: 'Questions? Just reply to this email',
    legal: 'Our terms and conditions apply. Right of withdrawal and model form:',
  },
  ar: {
    receivedSubject: (n) => `طلبك ${n} لدى خديجة`,
    hello: (name) => `مرحبًا ${name}،`,
    receivedText: 'شكرًا على طلبك! هذا تأكيد طلبك. سنخبرك فور شحن الطرد.',
    bankText: (days) => `المرجو تحويل المبلغ الإجمالي خلال ${days} أيام إلى الحساب التالي. نشحن فور وصول المبلغ.`,
    paidSubject: (n) => `وصلنا المبلغ · الطلب ${n}`,
    paidText: 'وصلنا مبلغك. نجهز طردك الآن بكل حب.',
    statusSubject: { shipped: (n) => `طلبك ${n} في الطريق`, delivered: (n) => `تم توصيل طلبك ${n}`, cancelled: (n) => `تم إلغاء الطلب ${n}` },
    statusText: {
      shipped: 'خبر سار: طردك في الطريق إليك!',
      delivered: 'تم توصيل طردك. نتمنى أن تستمتعي بمنتجاتك، وإلى اللقاء قريبًا!',
      cancelled: 'تم إلغاء طلبك. سنرجع أي مبلغ مدفوع في أقرب وقت. لديك سؤال؟ رد على هذه الرسالة.',
    },
    view: 'عرض الطلب',
    items: 'منتجاتك',
    address: 'عنوان التوصيل',
    payment: 'طريقة الدفع',
    help: 'عندك سؤال؟ رد على هذه الرسالة',
    legal: 'تسري شروطنا العامة. حق العدول ونموذج العدول:',
  },
};

// Brand colours, matching the storefront.
const C = { ink: '#2A2118', gold: '#B8812F', green: '#24493A', sand: '#F3EADB', cream: '#FBF7F0', muted: '#7A6A58', line: '#E8DCC8' };
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function emailConfig(env, settings) {
  const from = String(settings.email_from || '').trim();
  return {
    on: Boolean(env.BREVO_API_KEY && validEmail(from)),
    from,
    store: settings.store_name || 'Khachija',
    notify: String(settings.notify_email || settings.contact_email || '').trim(),
    replyTo: String(settings.contact_email || from).trim(),
  };
}

export async function sendEmail(env, cfg, { to, toName, subject, html, text, replyTo }) {
  const res = await fetch(env.BREVO_API_URL || BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: cfg.store, email: cfg.from },
      to: [{ email: to, ...(toName ? { name: toName } : {}) }],
      replyTo: validEmail(replyTo) ? { email: replyTo } : undefined,
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) throw new Error(`brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

function frame({ lang, origin, cfg, settings, preheader, body }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = lang === 'ar' ? 'right' : 'left';
  const s = S[lang];
  const legal = `${origin}/${lang}`;
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(cfg.store)}</title></head>
<body style="margin:0;padding:0;background:${C.sand};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};"><tr><td align="center" style="padding:30px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;" dir="${dir}">
<tr><td align="center" style="padding:0 0 20px;"><a href="${esc(origin)}/${lang}/"><img src="${esc(origin)}/assets/brand/email-logo.png" width="220" alt="${esc(cfg.store)}" style="display:block;border:0;width:220px;height:auto;"></a></td></tr>
<tr><td style="background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid ${C.line};">
<div style="height:4px;background:${C.gold};font-size:0;line-height:0">&nbsp;</div>
<div style="padding:32px 30px 28px;font-family:${FONT};color:${C.ink};font-size:15px;line-height:1.65;text-align:${align};">${body}</div>
</td></tr>
<tr><td align="center" style="padding:22px 10px 0;font-family:${FONT};font-size:12px;line-height:1.7;color:${C.muted};">
${esc(s.help)} · <a href="mailto:${esc(cfg.replyTo)}" style="color:${C.green};">${esc(cfg.replyTo)}</a><br>
${esc(settings.legal_company || cfg.store)} · ${esc(settings.legal_name || '')} · ${esc(settings.legal_address || '')}<br>
<a href="${legal}/impressum" style="color:${C.muted};">Impressum</a> · <a href="${legal}/agb" style="color:${C.muted};">AGB</a> · <a href="${legal}/widerruf" style="color:${C.muted};">Widerruf</a> · <a href="${legal}/datenschutz" style="color:${C.muted};">Datenschutz</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (text) => `<h1 style="font-family:${SERIF};font-weight:600;font-size:30px;line-height:1.2;margin:0 0 14px;color:${C.ink};">${esc(text)}</h1>`;

function itemsTable(lang, order, items) {
  const t = T[lang];
  const end = lang === 'ar' ? 'left' : 'right';
  const row = (a, b, style = '') =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid ${C.line};${style}">${a}</td><td style="padding:9px 0;border-bottom:1px solid ${C.line};text-align:${end};white-space:nowrap;${style}">${b}</td></tr>`;
  const vat = order.vat ? esc(t.js.vatIncl.replace('{amount}', money(order.vat, lang))) : esc(t.js.vatSmall);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:20px 0 6px;">
${items.map((i) => row(`${esc(i.name)}${i.option ? ` <span style="color:${C.muted}">· ${esc(i.option)}</span>` : ''} <span style="color:${C.muted}">× ${i.qty}</span>`, esc(money(i.price * i.qty, lang)))).join('')}
${row(esc(t.js.subtotal), esc(money(order.subtotal, lang)), `color:${C.muted};`)}
${row(esc(t.js.shipping), order.shipping ? esc(money(order.shipping, lang)) : `<span style="color:${C.green};font-weight:700">${esc(t.js.free)}</span>`, `color:${C.muted};`)}
${order.payment_fee ? row(esc(t.js.codFee), esc(money(order.payment_fee, lang)), `color:${C.muted};`) : ''}
${row(`<strong>${esc(t.js.total)}</strong><br><span style="color:${C.muted};font-size:12px">${vat}</span>`, `<strong style="font-size:18px">${esc(money(order.total, lang))}</strong>`, 'border-bottom:0;')}
</table>`;
}

function box(html) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:${C.cream};border:1px solid ${C.line};border-radius:4px;font-size:14px;"><tr><td style="padding:14px 16px;line-height:1.7;">${html}</td></tr></table>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="background:${C.green};border-radius:2px;"><a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

const orderLink = (origin, order) => `${origin}/${order.lang}/order/${order.number}?t=${order.token}`;
const fullName = (o) => `${o.first_name} ${o.last_name}`.trim();
const addressHtml = (o, lang) => `${esc(fullName(o))}<br>${esc(o.street)}${o.address2 ? `<br>${esc(o.address2)}` : ''}<br>${esc(o.zip)} ${esc(o.city)}<br>${esc(countryName(o.country, lang))}`;

export function bankBox(order, settings, lang) {
  const t = T[lang];
  if (!settings.bank_iban) return box(esc(t.bankMissing));
  const r = (k, v) => `<span style="color:${C.muted}">${esc(k)}:</span> <strong dir="ltr">${esc(v)}</strong><br>`;
  return box(`${r(t.bankOwner, settings.bank_owner || settings.legal_name || '')}${r(t.bankIban, formatIban(settings.bank_iban))}${settings.bank_bic ? r(t.bankBic, settings.bank_bic) : ''}${settings.bank_name ? r(t.bankName, settings.bank_name) : ''}${r(t.bankAmount, money(order.total, lang))}${r(t.bankRef, order.number)}`);
}

// To the customer, right after checkout. For a PayPal order it is sent once the payment is captured.
export function confirmationEmail({ order, items, origin, cfg, settings }) {
  const lang = S[order.lang] ? order.lang : 'de';
  const s = S[lang];
  const t = T[lang];
  const method = t.pay[order.payment_method]?.[0] || order.payment_method;
  const bank = order.payment_method === 'bank' && order.payment_status !== 'paid' ? `<p style="margin:20px 0 0;"><strong>${esc(t.bankTitle)}</strong><br>${esc(s.bankText(settings.bank_days || '7'))}</p>${bankBox(order, settings, lang)}` : '';
  const body = `${h1(t.thanks)}
<p style="margin:0 0 4px;">${esc(s.hello(order.first_name))}</p>
<p style="margin:0;color:${C.muted};">${esc(s.receivedText)}</p>
${box(`<span style="color:${C.muted}">${esc(t.orderNumber)}:</span> <strong dir="ltr">${esc(order.number)}</strong><br><span style="color:${C.muted}">${esc(s.payment)}:</span> <strong>${esc(method)}</strong>${order.payment_status === 'paid' ? ` · ${esc(t.paymentStatus.paid)}` : ''}`)}
${bank}
${itemsTable(lang, order, items)}
${box(`<span style="color:${C.muted}">${esc(s.address)}</span><br>${addressHtml(order, lang)}`)}
${button(orderLink(origin, order), s.view)}
<p style="margin:22px 0 0;font-size:12px;color:${C.muted};">${esc(s.legal)} <a href="${origin}/${lang}/widerruf" style="color:${C.green};">${origin.replace(/^https?:\/\//, '')}/${lang}/widerruf</a>. ${esc(t.hygiene)}</p>`;
  const lines = items.map((i) => `- ${i.name}${i.option ? ` (${i.option})` : ''} x${i.qty}: ${money(i.price * i.qty, lang)}`).join('\n');
  const bankText = bank && settings.bank_iban ? `\n\n${t.bankTitle}\n${t.bankOwner}: ${settings.bank_owner || settings.legal_name}\n${t.bankIban}: ${formatIban(settings.bank_iban)}\n${t.bankAmount}: ${money(order.total, lang)}\n${t.bankRef}: ${order.number}` : '';
  return {
    subject: s.receivedSubject(order.number),
    html: frame({ lang, origin, cfg, settings, preheader: s.receivedText, body }),
    text: `${s.hello(order.first_name)}\n\n${s.receivedText}\n\n${t.orderNumber}: ${order.number}\n${lines}\n${t.js.total}: ${money(order.total, lang)}${bankText}\n\n${s.view}: ${orderLink(origin, order)}`,
  };
}

export function paidEmail({ order, items, origin, cfg, settings }) {
  const lang = S[order.lang] ? order.lang : 'de';
  const s = S[lang];
  const body = `${h1(s.paidSubject(order.number))}<p style="margin:0 0 4px;">${esc(s.hello(order.first_name))}</p><p style="margin:0;color:${C.muted};">${esc(s.paidText)}</p>${itemsTable(lang, order, items)}${button(orderLink(origin, order), s.view)}`;
  return { subject: s.paidSubject(order.number), html: frame({ lang, origin, cfg, settings, preheader: s.paidText, body }), text: `${s.hello(order.first_name)}\n\n${s.paidText}\n\n${orderLink(origin, order)}` };
}

export function statusEmail({ order, items, origin, cfg, settings }) {
  const lang = S[order.lang] ? order.lang : 'de';
  const s = S[lang];
  const t = T[lang];
  const st = order.status;
  const track = st === 'shipped' ? trackingUrl(order.carrier, order.tracking) : '';
  const body = `${h1(s.statusSubject[st](order.number))}
<p style="margin:0 0 4px;">${esc(s.hello(order.first_name))}</p>
<p style="margin:0;color:${C.muted};">${esc(s.statusText[st])}</p>
${st === 'shipped' && order.tracking ? box(`${esc(order.carrier || 'DHL')} · <strong dir="ltr">${esc(order.tracking)}</strong>`) : ''}
${st === 'cancelled' ? '' : itemsTable(lang, order, items)}
${button(track || orderLink(origin, order), track ? t.trackParcel : s.view)}`;
  return {
    subject: s.statusSubject[st](order.number),
    html: frame({ lang, origin, cfg, settings, preheader: s.statusText[st], body }),
    text: `${s.hello(order.first_name)}\n\n${s.statusText[st]}\n${track ? `\n${t.trackParcel}: ${track}\n` : ''}\n${t.orderNumber}: ${order.number}\n${orderLink(origin, order)}`,
  };
}

// To the shop owner, in German, for every new order.
export function alertEmail({ order, items, origin, cfg, settings }) {
  const pay = T.de.pay[order.payment_method]?.[0] || order.payment_method;
  const body = `${h1(`Neue Bestellung · ${money(order.total, 'de')}`)}
<p style="margin:0;color:${C.muted};">Bestellung <strong dir="ltr" style="color:${C.ink}">${esc(order.number)}</strong> · ${esc(pay)} · ${esc(T.de.paymentStatus[order.payment_status] || order.payment_status)} · Sprache ${esc(order.lang.toUpperCase())}</p>
${box(`${addressHtml(order, 'de')}<br><a href="mailto:${esc(order.email)}" style="color:${C.green};">${esc(order.email)}</a>${order.phone ? ` · <a href="tel:${esc(order.phone)}" style="color:${C.green};">${esc(displayPhone(order.phone))}</a>` : ''}${order.note ? `<br><em>„${esc(order.note)}“</em>` : ''}`)}
${itemsTable('de', order, items)}
${button(`${origin}/admin/#order-${order.id}`, 'Im Admin öffnen')}`;
  return {
    subject: `🛍️ Neue Bestellung ${order.number} · ${money(order.total, 'de')} · ${pay}`,
    html: frame({ lang: 'de', origin, cfg, settings, preheader: `${fullName(order)}, ${order.city}, ${money(order.total, 'de')}`, body }),
    text: `Neue Bestellung ${order.number}\n${fullName(order)} · ${order.email} ${order.phone || ''}\n${order.street}, ${order.zip} ${order.city}, ${order.country}\n${items.map((i) => `- ${i.name}${i.option ? ` (${i.option})` : ''} x${i.qty}`).join('\n')}\nGesamt: ${money(order.total, 'de')} · ${pay}\n\n${origin}/admin/`,
  };
}

async function sendAll(env, cfg, jobs) {
  for (const r of await Promise.allSettled(jobs)) if (r.status === 'rejected') console.error('email failed', String(r.reason));
}

// New order: confirmation to the customer, alert to the shop. Errors are logged, never shown to the customer.
export async function sendOrderEmails(env, settings, origin, order, items) {
  const cfg = emailConfig(env, settings);
  if (!cfg.on) return;
  const args = { order, items, origin, cfg, settings };
  const jobs = [sendEmail(env, cfg, { to: order.email, toName: fullName(order), replyTo: cfg.replyTo, ...confirmationEmail(args) })];
  if (validEmail(cfg.notify)) jobs.push(sendEmail(env, cfg, { to: cfg.notify, replyTo: order.email, ...alertEmail(args) }));
  await sendAll(env, cfg, jobs);
}

export async function sendPaidEmail(env, settings, origin, order, items) {
  const cfg = emailConfig(env, settings);
  if (!cfg.on || settings.email_status_updates === '0') return;
  await sendAll(env, cfg, [sendEmail(env, cfg, { to: order.email, toName: fullName(order), replyTo: cfg.replyTo, ...paidEmail({ order, items, origin, cfg, settings }) })]);
}

export async function sendStatusEmail(env, settings, origin, order, items) {
  const cfg = emailConfig(env, settings);
  if (!cfg.on || !STATUS_EMAILS.includes(order.status) || settings.email_status_updates === '0') return;
  await sendAll(env, cfg, [sendEmail(env, cfg, { to: order.email, toName: fullName(order), replyTo: cfg.replyTo, ...statusEmail({ order, items, origin, cfg, settings }) })]);
}
