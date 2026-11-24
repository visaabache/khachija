# Khachija: Moroccan natural cosmetics shop for Germany (khachija-shop.de)

An online shop for Khadija Hakki's natural cosmetics, handmade by women's cooperatives in Morocco and shipped from Hamburg. Built on the same system as Abolux (Cloudflare Workers, D1 database, admin at `/admin/`), rebuilt for a German shop.

- **German, English and Arabic** at `/de/`, `/en/` and `/ar/` (Arabic right to left). German is the main language; visitors land in their browser's language and the shop remembers their choice. Old WordPress addresses (`/shop/`, `/about-us/`, `/product/…`) redirect to the new pages.
- **Prices in euros** (stored as cents), with the **unit price per litre or kilo** next to every price as German law (PAngV) asks, and "inkl. MwSt." or the § 19 UStG small-business note with a link to the shipping costs.
- **Product page → cart → checkout → confirmation.** The product page has "In den Warenkorb" (opens a slide-in mini cart) and "Jetzt kaufen" (straight to checkout). The checkout asks for email, optional phone, German address (street and number, PLZ, city, country), shows DHL shipping and the payment methods, the AGB checkbox and the legally required **"Zahlungspflichtig bestellen"** button. Totals are always recalculated by the server.
- **Three payment methods**, each switchable in the admin:
  - **PayPal** (also card, direct debit and Pay Later through PayPal). The server creates the PayPal order and sends the customer to PayPal; on return it captures the payment and checks the amount before marking the order paid. No PayPal script runs on the shop pages. A cancelled payment can be retried from the order page.
  - **Bank transfer in advance (Vorkasse).** The confirmation page and email show the bank details with copy buttons and a **GiroCode** (EPC QR code) that German banking apps scan to fill in the transfer. Mark the order paid in the admin when the money arrives; the customer gets an email.
  - **Cash on delivery (DHL Nachnahme)**, Germany only, with a fee set in the admin.
- **Shipping**: a German rate (4,90 €), free from a threshold (49 €), and a rate per country for Austria, Switzerland, the Benelux and others.
- **German legal pages**, filled in from the admin settings: Impressum, AGB, Widerrufsbelehrung with the model withdrawal form, Datenschutzerklärung and Versand & Zahlung. English courtesy translations; the Arabic pages show the German text with a note. **They are drafts: have them checked before going live** (a lawyer or a service such as Händlerbund or IT-Recht Kanzlei).
- **Admin at `/admin/`** (in French, English or Arabic), same as Abolux: dashboard, orders, products, categories, blog and settings, plus:
  - orders show the payment method and status, with a **"Mark as paid"** button, a notice for unpaid transfers and PayPal orders, the **DHL tracking number** (sent to the customer in the shipping email with a tracking link) and a history of every change;
  - products have a subtitle, a description editor, how-to-use text, the **INCI ingredient list** and the content (ml or g) for the unit price; prices are typed in euros ("16,90");
  - settings for payments, bank account (IBAN checked), shipping per country, VAT status, Impressum details and the newsletter export (CSV).
- **Emails** through Brevo (free plan): order confirmation with bank details, payment received, shipped with tracking, delivered, cancelled, plus a German new-order alert to the shop.
- **Design**: Moroccan premium in the brand colours (sand, cream, argan gold `#B8812F`, leaf green `#24493A`), Cormorant Garamond and Poppins (Amiri and IBM Plex Sans Arabic in Arabic), arch-shaped photo frames, a zellige star pattern, the KH star-flower as ornament, a slowly turning star behind the hero, product shots blended into tinted tiles, scroll reveals, a sticky buy bar on phones and a WhatsApp chat button. Animations switch off for visitors who ask for less motion.
- **SEO**: server-rendered pages, hreflang links, product structured data in EUR with shipping and 14-day returns, a sitemap, a Google Merchant Center feed at `/merchant-feed.xml` (with unit pricing), and a share image.
- **Security** from Abolux: strict Content-Security-Policy, signed admin sessions, login and order rate limits, honeypot fields, optional Cloudflare Turnstile, uploads checked by content.

## Products

The 11 products of the new range are in `seed/sample.sql`, with photos in `public/assets/p/` (white-background pack shots are named `*-pack.webp`). **Check before going live:**

- **Prices are placeholders.** Set the real prices in the admin.
- **Sizes**: only the ones printed on the labels are filled in (100 g, 120 g). Add the content (ml or g) for the serum, the black soaps, the Nila scrub and the castor oil, so their unit price shows.
- **Ingredients (INCI)**: required for cosmetics. Only the single-ingredient products are filled in (henna, sidr, castor oil). Add the lists printed on the packs for the others.
- The descriptions only use what the labels say; adjust them freely (the "✨ AI" button in the product form can write new ones).

## Run it on your computer

```bash
npm install
cp .dev.vars.example .dev.vars        # local admin password "change-me"
npm run db:migrate:local
npm run db:seed:local                 # the 11 products, 4 categories, 2 articles
npm run dev                           # http://localhost:8787  (admin: /admin/)
```

`npm test` runs the tests.

## Put it online (Cloudflare, free plan)

```bash
npx wrangler login
npx wrangler d1 create khachija        # paste the printed database_id into wrangler.jsonc
npm run db:migrate
npm run db:seed
npm run deploy
npx wrangler secret put ADMIN_PASSWORD # a long password for /admin/
```

Then in the admin, **Settings**: bank account (IBAN), payment methods, shipping, VAT status (small business or VAT included) and the Impressum details.

### Domain (khachija-shop.de at netcup)

1. In the Cloudflare dashboard, **Add a domain** → `khachija-shop.de` → Free plan. Check the imported DNS records, especially **MX/TXT for email** if netcup mail is used.
2. At netcup (CCP → Domains → khachija-shop.de → **Administration** → Nameserver), enter the two Cloudflare nameservers.
3. Once the zone is active, set `"SITE_URL": "https://khachija-shop.de"` in `wrangler.jsonc`, uncomment the `routes`, and deploy.

### PayPal

1. At [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials, create an app (first in **Sandbox** to test).
2. Add the keys as secrets: `npx wrangler secret put PAYPAL_CLIENT_ID` and `npx wrangler secret put PAYPAL_SECRET`.
3. In the admin, Settings → Payment methods: PayPal mode **Test (sandbox)**, place a test order with a sandbox buyer account, then switch to **Live** with the live keys of a PayPal **Business** account.

### Emails (Brevo, free)

Create a Brevo account, verify the sender (best: an address on khachija-shop.de), then `npx wrangler secret put BREVO_API_KEY`. In the admin, Settings → Automatic emails: sender and alert address, then **Send a test**.

### Optional

- `ANTHROPIC_API_KEY` secret: the AI description writer in the product form.
- `TURNSTILE_SECRET` secret + the site key in the admin: invisible bot check on checkout and admin login.
- Meta/TikTok pixel IDs in the admin: loaded only after cookie consent.
- `ORDER_WEBHOOK` secret: a URL that receives a JSON POST for each new order.

## Files

| Path | What it is |
| --- | --- |
| `src/worker.js` | Routing, storefront pages, order and quote API, PayPal return, sitemap, Merchant feed |
| `src/render.js` | HTML of the storefront pages |
| `src/i18n.js` | All storefront text in German, English and Arabic |
| `src/lib.js` | Euros, unit prices, VAT, shipping, payment methods, cart pricing |
| `src/paypal.js` | PayPal Orders API (create and capture) |
| `src/girocode.js` | IBAN check and the GiroCode QR |
| `src/legal.js` | Impressum, AGB, Widerruf, Datenschutz, Versand & Zahlung |
| `src/email.js` | Order emails (Brevo) |
| `src/admin.js` | Admin API |
| `public/assets/` | `style.css`, `store.js` (cart, checkout), product photos (`p/`), logo files (`brand/`) |
| `public/admin/` | The admin app |
| `migrations/0001_init.sql` | Database schema and default settings |
| `seed/sample.sql` | The 11 products, categories and 2 blog articles |
| `brand/` | The full logo kit (SVG and PNG, gold, white, ink, foil, icons) |
