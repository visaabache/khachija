-- Khachija store schema. All amounts are euro CENTS (1690 = 16,90 €), VAT included.
-- Content is stored in German (de), English (en) and Arabic (ar).

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name_de TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  -- A short line under the name ("Kaltgepresst · 100 % rein").
  subtitle_de TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  subtitle_ar TEXT NOT NULL DEFAULT '',
  desc_de TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL DEFAULT '',
  desc_ar TEXT NOT NULL DEFAULT '',
  -- Ingredients (INCI) and how to use: shown in their own tabs on the product page.
  ingredients TEXT NOT NULL DEFAULT '',
  usage_de TEXT NOT NULL DEFAULT '',
  usage_en TEXT NOT NULL DEFAULT '',
  usage_ar TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  compare_price INTEGER,
  -- Content for the unit price German law asks for (PAngV): 100 + 'ml' → "16,90 € / 100 ml · 169,00 € / 1 l".
  unit_amount REAL,
  unit_type TEXT NOT NULL DEFAULT '', -- 'ml' or 'g'
  -- NULL means unlimited. The CHECK makes an order fail (and roll back) rather than oversell.
  stock INTEGER CHECK (stock IS NULL OR stock >= 0),
  options TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL DEFAULT '[]',
  desc_media TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX products_category ON products(category_id);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL, -- secret part of the customer's order link
  status TEXT NOT NULL DEFAULT 'new',
  -- paypal | bank | cod
  payment_method TEXT NOT NULL DEFAULT 'bank',
  -- pending | paid | failed | refunded
  payment_status TEXT NOT NULL DEFAULT 'pending',
  paypal_order_id TEXT NOT NULL DEFAULT '',
  paypal_capture_id TEXT NOT NULL DEFAULT '',
  paid_at TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL,        -- street and house number
  address2 TEXT NOT NULL DEFAULT '', -- c/o, floor, Packstation…
  zip TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  note TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'de',
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  payment_fee INTEGER NOT NULL DEFAULT 0, -- cash-on-delivery fee
  total INTEGER NOT NULL,
  vat INTEGER NOT NULL DEFAULT 0, -- VAT contained in the total (0 for a small business under § 19 UStG)
  carrier TEXT NOT NULL DEFAULT '',
  tracking TEXT NOT NULL DEFAULT '',
  terms_accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  newsletter INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX orders_status ON orders(status, id);
CREATE INDEX orders_email ON orders(email, created_at);
CREATE INDEX orders_paypal ON orders(paypal_order_id);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  name TEXT NOT NULL,
  option TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0)
);
CREATE INDEX order_items_order ON order_items(order_id);

-- Every change of an order (status, payment, tracking), shown as a timeline in the admin and to the customer.
CREATE TABLE order_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,   -- status | payment | tracking | note
  value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX order_events_order ON order_events(order_id, id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE images (
  key TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data BLOB NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE media_chunks (
  key TEXT NOT NULL,
  idx INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (key, idx)
);

CREATE TABLE rate_hits (
  bucket TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX rate_hits_bucket_at ON rate_hits (bucket, at);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_de TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  title_ar TEXT NOT NULL DEFAULT '',
  excerpt_de TEXT NOT NULL DEFAULT '',
  excerpt_en TEXT NOT NULL DEFAULT '',
  excerpt_ar TEXT NOT NULL DEFAULT '',
  body_de TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_ar TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX posts_published ON posts(published, created_at);

CREATE TABLE redirects (
  path TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Newsletter sign-ups from the footer (double opt-in is done by the email tool you import them into).
CREATE TABLE subscribers (
  email TEXT PRIMARY KEY,
  lang TEXT NOT NULL DEFAULT 'de',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO settings (key, value) VALUES
  ('store_name', 'Khachija'),
  ('contact_email', 'info@khachija-shop.de'),
  ('phone', '+49 176 80278899'),
  ('whatsapp', '4917680278899'),
  -- Shipping (cents). Germany by default; other countries get their own rate in shipping_rates.
  ('shipping_fee', '490'),
  ('free_shipping_over', '4900'),
  ('shipping_rates', '{"AT": 990, "NL": 1290, "BE": 1290, "FR": 1290, "LU": 1290, "CH": 1990}'),
  ('delivery_days', '2-4'),
  -- Payment methods.
  ('pay_paypal', '1'),
  ('pay_bank', '1'),
  ('pay_cod', '1'),
  ('cod_fee', '590'),
  ('paypal_mode', 'sandbox'),
  ('bank_owner', 'Khadija Hakki'),
  ('bank_iban', ''),
  ('bank_bic', ''),
  ('bank_name', ''),
  ('bank_days', '7'),
  -- VAT: "included" (19 % contained in the prices) or "small" (Kleinunternehmer, § 19 UStG, no VAT shown).
  ('vat_mode', 'small'),
  ('vat_rate', '19'),
  ('announcement_de', 'Kostenloser Versand ab 49 € · Handgemacht von Frauenkooperativen in Marokko'),
  ('announcement_en', 'Free shipping from €49 · Handmade by women’s cooperatives in Morocco'),
  ('announcement_ar', 'شحن مجاني ابتداءً من 49 € · صُنع يدويًا من طرف تعاونيات نسائية في المغرب'),
  ('legal_name', 'Khadija Hakki'),
  ('legal_company', 'Khachija Shop'),
  ('legal_address', 'Schmuckshöhe 13, 22337 Hamburg, Deutschland'),
  ('legal_vat_id', ''),
  ('legal_register', ''),
  ('email_from', ''),
  ('notify_email', 'info@khachija-shop.de'),
  ('email_status_updates', '1');
