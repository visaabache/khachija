// Tests for the German shop: euros, unit prices, VAT, shipping, payment methods, IBAN/GiroCode, legal pages,
// translations and the PayPal flow (with a fake PayPal API).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTiers, parcelGrams, money, toCents, unitPrice, contentLabel, vatOf, shippingFor, paymentMethods, paymentFee, validZip, normalizePhone, slugify, orderNumber, shippingCountries } from '../src/lib.js';
import { validIban, formatIban, giroCodeSvg } from '../src/girocode.js';
import { legalDoc, LEGAL_PAGES } from '../src/legal.js';
import { T } from '../src/i18n.js';
import { createPaypalOrder, capturePaypalOrder } from '../src/paypal.js';
import { trackingUrl, confirmationEmail } from '../src/email.js';

const settings = { shipping_fee: '490', free_shipping_over: '4900', shipping_rates: '{"AT": 990, "CH": 1990}', cod_fee: '590', vat_mode: 'small', vat_rate: '19', bank_owner: 'Khadija Hakki', bank_iban: 'DE89370400440532013000', bank_days: '7', legal_name: 'Khadija Hakki', legal_company: 'Khachija Shop', legal_address: 'Schmuckshöhe 13, 22337 Hamburg', contact_email: 'info@khachija-shop.de' };

test('euros: German and English formats, and parsing what the admin types', () => {
  assert.equal(money(1690, 'de'), '16,90 €');
  assert.equal(money(123456, 'de'), '1.234,56 €');
  assert.equal(money(1690, 'en'), '€16.90');
  assert.equal(money(5, 'de'), '0,05 €');
  assert.equal(toCents('16,90'), 1690);
  assert.equal(toCents('16.9'), 1690);
  assert.equal(toCents('1.234,50'), 123450);
  assert.equal(toCents('12 €'), 1200);
  assert.equal(toCents(''), null);
  assert.equal(toCents('abc'), null);
});

test('unit price per litre / kilo (PAngV)', () => {
  assert.equal(unitPrice({ price: 1690, unit_amount: 100, unit_type: 'ml' }, 'de'), '169,00 € / 1 l');
  assert.equal(unitPrice({ price: 890, unit_amount: 120, unit_type: 'g' }, 'de'), '74,17 € / 1 kg');
  assert.equal(unitPrice({ price: 890, unit_amount: null, unit_type: '' }, 'de'), '');
  assert.equal(contentLabel({ unit_amount: 100, unit_type: 'g' }), '100 g');
});

test('VAT: none for a small business, 19 % contained otherwise', () => {
  assert.equal(vatOf(2380, { vat_mode: 'small' }), 0);
  assert.equal(vatOf(2380, { vat_mode: 'included', vat_rate: '19' }), 380);
  assert.equal(vatOf(1000, { vat_mode: 'included', vat_rate: '7' }), 65);
});

test('shipping by country, free above the threshold in Germany', () => {
  assert.equal(shippingFor('DE', 1880, settings), 490);
  assert.equal(shippingFor('DE', 4900, settings), 0);
  assert.equal(shippingFor('AT', 6000, settings), 990);
  assert.equal(shippingFor('AT', 6000, { ...settings, free_shipping_all: '1' }), 0);
  assert.equal(shippingFor('US', 1000, settings), null);
  assert.deepEqual(shippingCountries(settings), ['DE', 'AT', 'CH']);
});

test('payment methods: PayPal needs its keys, cash on delivery only in Germany', () => {
  assert.deepEqual(paymentMethods(settings, {}, 'DE'), ['bank', 'cod']);
  assert.deepEqual(paymentMethods(settings, { PAYPAL_CLIENT_ID: 'id', PAYPAL_SECRET: 's' }, 'DE'), ['paypal', 'bank', 'cod']);
  assert.deepEqual(paymentMethods(settings, { PAYPAL_CLIENT_ID: 'id', PAYPAL_SECRET: 's' }, 'AT'), ['paypal', 'bank']);
  assert.deepEqual(paymentMethods({ ...settings, pay_cod: '0', pay_bank: '0' }, {}, 'DE'), []);
  assert.equal(paymentFee('cod', settings), 590);
  assert.equal(paymentFee('bank', settings), 0);
});

test('postcodes, phone numbers, addresses', () => {
  assert.ok(validZip('22337', 'DE'));
  assert.ok(!validZip('2233', 'DE'));
  assert.ok(validZip('1010', 'AT'));
  assert.ok(validZip('1012 AB', 'NL'));
  assert.equal(normalizePhone('0176 80278899'), '+4917680278899');
  assert.equal(normalizePhone('+49 (176) 802-78899'), '+4917680278899');
  assert.equal(normalizePhone('0033 6 12 34 56 78'), '+33612345678');
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone('abc'), null);
  assert.equal(slugify('Rizinusöl für Haare & Wimpern'), 'rizinusoel-fuer-haare-wimpern');
  assert.match(orderNumber(new Date('2026-11-24T10:00:00Z')), /^KH-261124-[2-9A-HJ-NP-Z]{4}$/);
});

test('IBAN check and GiroCode (EPC QR)', () => {
  assert.ok(validIban('DE89 3704 0044 0532 0130 00'));
  assert.ok(!validIban('DE89 3704 0044 0532 0130 01'));
  assert.ok(!validIban('hello'));
  assert.equal(formatIban('de89370400440532013000'), 'DE89 3704 0044 0532 0130 00');
  const svg = giroCodeSvg({ owner: 'Khadija Hakki', iban: settings.bank_iban, cents: 2370, reference: 'KH-261124-ABCD' });
  assert.match(svg, /^<svg role="img" aria-label="GiroCode"/);
  assert.equal(giroCodeSvg({ owner: 'X', iban: 'bad', cents: 100, reference: 'r' }), '');
  assert.equal(giroCodeSvg({ owner: 'X', iban: settings.bank_iban, cents: 0, reference: 'r' }), '');
});

test('legal pages exist in every language and carry the shop details', () => {
  for (const kind of LEGAL_PAGES) {
    for (const lang of ['de', 'en', 'ar']) {
      const doc = legalDoc(kind, lang, settings);
      assert.ok(doc.title && doc.sections.length, `${kind}/${lang}`);
    }
  }
  const imp = JSON.stringify(legalDoc('impressum', 'de', settings));
  assert.match(imp, /Khadija Hakki/);
  assert.match(imp, /§ 19 UStG/);
  assert.match(JSON.stringify(legalDoc('widerruf', 'de', settings)), /Muster-Widerrufsformular/);
  assert.match(JSON.stringify(legalDoc('versand', 'de', settings)), /4,90/);
  // Text from the admin is escaped.
  assert.doesNotMatch(JSON.stringify(legalDoc('impressum', 'de', { ...settings, legal_name: '<script>x</script>' })), /<script>/);
});

test('every text key exists in German, English and Arabic', () => {
  const keys = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
  const de = keys(T.de).sort();
  assert.deepEqual(keys(T.en).sort(), de);
  assert.deepEqual(keys(T.ar).sort(), de);
});

test('emails: bank details in the confirmation, DHL tracking link', () => {
  const order = { id: 1, number: 'KH-261124-ABCD', token: 't', lang: 'de', first_name: 'Anna', last_name: 'Müller', email: 'a@example.de', phone: '', street: 'Musterstraße 1', address2: '', zip: '20095', city: 'Hamburg', country: 'DE', payment_method: 'bank', payment_status: 'pending', subtotal: 1880, shipping: 490, payment_fee: 0, total: 2370, vat: 0 };
  const m = confirmationEmail({ order, items: [{ name: 'Henna Pulver', option: '', price: 890, qty: 1 }], origin: 'https://khachija-shop.de', cfg: { store: 'Khachija', replyTo: 'info@khachija-shop.de' }, settings });
  assert.match(m.html, /DE89 3704 0044 0532 0130 00/);
  assert.match(m.html, /KH-261124-ABCD/);
  assert.match(m.text, /23,70/);
  assert.match(trackingUrl('DHL', '00340434'), /dhl\.de.*piececode=00340434/);
});

test('PayPal: creates the order with matching totals, captures and checks the amount', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/v1/oauth2/token')) return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 });
    if (String(url).endsWith('/v2/checkout/orders')) return new Response(JSON.stringify({ id: 'PP123', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PP123' }] }), { status: 201 });
    if (String(url).endsWith('/capture')) return new Response(JSON.stringify({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP1', status: 'COMPLETED', amount: { currency_code: 'EUR', value: '23.70' } }] } }] }), { status: 201 });
    return new Response('{}', { status: 404 });
  };
  try {
    const env = { PAYPAL_CLIENT_ID: 'id', PAYPAL_SECRET: 'secret' };
    const order = { number: 'KH-261124-ABCD', token: 'tok123', lang: 'de', first_name: 'Anna', last_name: 'Müller', email: 'a@example.de', street: 'Musterstraße 1', address2: '', zip: '20095', city: 'Hamburg', country: 'DE', subtotal: 1880, shipping: 490, payment_fee: 0, total: 2370 };
    const pp = await createPaypalOrder(env, { paypal_mode: 'sandbox' }, 'https://khachija-shop.de', order, [{ name: 'Henna', option: '', price: 890, qty: 1 }, { name: 'Seife', option: '', price: 990, qty: 1 }]);
    assert.equal(pp.id, 'PP123');
    assert.match(pp.approve, /sandbox\.paypal\.com/);
    const create = calls.find((c) => c.url.endsWith('/v2/checkout/orders'));
    assert.match(create.url, /api-m\.sandbox\.paypal\.com/);
    const body = JSON.parse(create.init.body);
    const unit = body.purchase_units[0];
    assert.equal(unit.amount.value, '23.70');
    assert.equal(unit.amount.breakdown.item_total.value, '18.80');
    assert.equal(unit.amount.breakdown.shipping.value, '4.90');
    assert.equal(unit.invoice_id, 'KH-261124-ABCD');
    assert.match(body.payment_source.paypal.experience_context.return_url, /\/de\/paypal\/return\?o=KH-261124-ABCD&t=tok123$/);
    assert.equal(create.init.headers['paypal-request-id'], 'create-KH-261124-ABCD');

    const ok = await capturePaypalOrder(env, {}, 'PP123', order);
    assert.deepEqual({ paid: ok.paid, captureId: ok.captureId }, { paid: true, captureId: 'CAP1' });
    // A capture for another amount is not accepted as paid.
    const wrong = await capturePaypalOrder(env, {}, 'PP123', { ...order, total: 9999 });
    assert.equal(wrong.paid, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('admin two-factor codes (TOTP, RFC 6238)', async () => {
  const { totpCode, validTotp } = await import('../src/admin.js');
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890"
  assert.equal(await totpCode(secret, 1), '287082');
  assert.equal(await totpCode(secret, 37037036), '081804');
  const now = 1111111109 * 1000;
  assert.ok(await validTotp(secret, await totpCode(secret, Math.floor(now / 30000)), now));
  assert.ok(await validTotp(secret, await totpCode(secret, Math.floor(now / 30000) - 1), now)); // 30 s late is fine
  assert.ok(!(await validTotp(secret, await totpCode(secret, Math.floor(now / 30000) - 3), now))); // 90 s late is not
  assert.ok(!(await validTotp(secret, 'abcdef', now)));
});

test('checkout: postcode and city come from one field', async () => {
  const { splitCity } = await import('../src/worker.js');
  assert.deepEqual(splitCity('22337 Hamburg'), { zip: '22337', city: 'Hamburg' });
  assert.deepEqual(splitCity(' Hamburg  22337 '), { zip: '22337', city: 'Hamburg' });
  assert.deepEqual(splitCity('1012 AB Amsterdam'), { zip: '1012 AB', city: 'Amsterdam' });
  assert.deepEqual(splitCity('Hamburg'), { zip: '', city: 'Hamburg' });
});

test('DHL weight tiers: Germany and EU zone, heavier parcels, free shipping still wins', () => {
  const s = { shipping_fee: '490', free_shipping_over: '4900', shipping_rates: '{"CH": 1990}', shipping_tiers: 'DE: 2=5,19; 5=7,69; 10=10,49\nEU: 2=10,49; 5=17,49' };
  assert.deepEqual(parseTiers(s.shipping_tiers).DE, [[2000, 519], [5000, 769], [10000, 1049]]);
  assert.equal(shippingFor('DE', 1500, s, 900), 519);
  assert.equal(shippingFor('DE', 1500, s, 2500), 769);
  assert.equal(shippingFor('DE', 1500, s, 40000), 1049);
  assert.equal(shippingFor('DE', 5000, s, 2500), 0);
  assert.equal(shippingFor('AT', 2000, s, 1200), 1049);
  assert.equal(shippingFor('CH', 2000, s, 1200), 1990);
  assert.ok(shippingCountries(s).includes('FR') && shippingCountries(s).includes('CH'));
  assert.equal(parcelGrams([{ product: { unit_amount: 100, unit_type: 'ml' }, qty: 2 }, { product: { unit_amount: 200, unit_type: 'g' }, qty: 1 }]), 2 * 220 + 260 + 300);
});

test('admin password hash: verify right, reject wrong, unique salts', async () => {
  const { hashPassword, checkPassword } = await import('../src/admin.js');
  const h1 = await hashPassword('Neues-Passwort-2026');
  const h2 = await hashPassword('Neues-Passwort-2026');
  assert.ok(h1.startsWith('pbkdf2$100000$'));
  assert.notEqual(h1, h2);
  assert.equal(await checkPassword('Neues-Passwort-2026', h1), true);
  assert.equal(await checkPassword('neues-passwort-2026', h1), false);
  assert.equal(await checkPassword('x', ''), false);
});
