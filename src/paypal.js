// PayPal Checkout (Orders API v2), server side only: no PayPal script runs on the shop's pages.
//   1. POST /api/orders creates the shop order, then createPaypalOrder() creates the PayPal order and
//      returns PayPal's approval page, where the customer pays (PayPal, card, direct debit, Pay Later…).
//   2. PayPal sends the customer back to /<lang>/paypal/return?o=<number>&t=<token>, where
//      capturePaypalOrder() takes the money and marks the shop order as paid.
// Keys are secrets: PAYPAL_CLIENT_ID and PAYPAL_SECRET (npx wrangler secret put …).
// The mode (sandbox for tests, live for real money) is set in the admin, or with the PAYPAL_MODE variable.

const BASE = { sandbox: 'https://api-m.sandbox.paypal.com', live: 'https://api-m.paypal.com' };
const LOCALES = { de: 'de-DE', en: 'en-DE', ar: 'ar-EG' };

export function paypalMode(env, settings) {
  const m = String(env.PAYPAL_MODE || settings.paypal_mode || 'sandbox').toLowerCase();
  return m === 'live' ? 'live' : 'sandbox';
}

const euros = (cents) => (Math.round(cents) / 100).toFixed(2);

async function token(env, base) {
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`paypal token ${res.status}`);
  return (await res.json()).access_token;
}

async function call(env, settings, path, body, requestId) {
  const base = env.PAYPAL_API_URL || BASE[paypalMode(env, settings)];
  const access = await token(env, base);
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${access}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      // Makes a retried request (double click, network hiccup) return the first result instead of acting twice.
      ...(requestId ? { 'paypal-request-id': requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// items: [{ name, option, price (cents per piece), qty }]
export async function createPaypalOrder(env, settings, origin, order, items) {
  const store = settings.store_name || 'Khachija';
  const back = `${origin}/${order.lang}/paypal/return?o=${encodeURIComponent(order.number)}&t=${order.token}`;
  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: order.number,
        invoice_id: order.number,
        custom_id: order.number,
        description: `${store} ${order.number}`.slice(0, 127),
        amount: {
          currency_code: 'EUR',
          value: euros(order.total),
          breakdown: {
            item_total: { currency_code: 'EUR', value: euros(order.subtotal) },
            shipping: { currency_code: 'EUR', value: euros(order.shipping) },
            ...(order.payment_fee ? { handling: { currency_code: 'EUR', value: euros(order.payment_fee) } } : {}),
          },
        },
        items: items.map((i) => ({
          name: `${i.name}${i.option ? ` (${i.option})` : ''}`.slice(0, 127),
          quantity: String(i.qty),
          unit_amount: { currency_code: 'EUR', value: euros(i.price) },
          category: 'PHYSICAL_GOODS',
        })),
        shipping: {
          type: 'SHIPPING',
          name: { full_name: `${order.first_name} ${order.last_name}`.slice(0, 300) },
          address: {
            address_line_1: order.street.slice(0, 300),
            ...(order.address2 ? { address_line_2: order.address2.slice(0, 300) } : {}),
            admin_area_2: order.city.slice(0, 120),
            postal_code: order.zip.slice(0, 60),
            country_code: order.country,
          },
        },
      },
    ],
    payment_source: {
      paypal: {
        ...(order.email ? { email_address: order.email } : {}),
        experience_context: {
          brand_name: store.slice(0, 127),
          locale: LOCALES[order.lang] || 'de-DE',
          shipping_preference: 'SET_PROVIDED_ADDRESS',
          user_action: 'PAY_NOW',
          return_url: back,
          cancel_url: `${back}&cancel=1`,
        },
      },
    },
  };
  const r = await call(env, settings, '/v2/checkout/orders', body, `create-${order.number}`);
  if (!r.ok) throw new Error(`paypal create ${r.status}: ${JSON.stringify(r.data).slice(0, 300)}`);
  const approve = (r.data.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;
  if (!approve) throw new Error('paypal: no approval link');
  return { id: r.data.id, approve };
}

// Captures an approved PayPal order. Returns { paid, captureId } when the money was taken for the right amount.
export async function capturePaypalOrder(env, settings, paypalId, order) {
  const r = await call(env, settings, `/v2/checkout/orders/${encodeURIComponent(paypalId)}/capture`, null, `capture-${order.number}`);
  // Already captured (customer reloaded the return page): PayPal answers 422 ORDER_ALREADY_CAPTURED.
  const already = r.status === 422 && JSON.stringify(r.data).includes('ORDER_ALREADY_CAPTURED');
  if (!r.ok && !already) return { paid: false, status: r.status, issue: r.data?.details?.[0]?.issue || '' };
  if (already) return { paid: true, captureId: order.paypal_capture_id || '' };
  const cap = r.data.purchase_units?.[0]?.payments?.captures?.[0];
  const amountOk = cap && cap.amount?.currency_code === 'EUR' && Math.round(Number(cap.amount.value) * 100) === order.total;
  const done = r.data.status === 'COMPLETED' && cap && ['COMPLETED', 'PENDING'].includes(cap.status);
  return { paid: Boolean(done && amountOk), captureId: cap?.id || '', pending: cap?.status === 'PENDING' };
}
