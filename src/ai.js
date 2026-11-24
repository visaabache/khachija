// AI description writer for the admin (POST /api/admin/ai/describe).
// Claude looks at the product photos and the seller's notes and writes a product description in German,
// English and Arabic for Khachija, a shop for Moroccan natural cosmetics in Germany. The seller reviews it
// before saving. Needs the ANTHROPIC_API_KEY secret (npx wrangler secret put ANTHROPIC_API_KEY).

import Anthropic from '@anthropic-ai/sdk';
import { sanitizeRich } from './rich.js';

const MODEL = 'claude-opus-5-5';
const MAX_PHOTOS = 4;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const SYSTEM = `You write product descriptions for Khachija, an online shop in Hamburg, Germany, for Moroccan natural cosmetics (black soap, henna, sidr, nila, ghassoul-type masks, oils, soaps) made by women's cooperatives in Morocco. The founder, Khadija Hakki, is a Berber woman from Morocco. Customers are mostly women in Germany who like natural, honest, high-quality care and the hammam tradition.

Write a warm, premium description in this order:
1. A short evocative opening (h2) that tells the promise and the Moroccan origin.
2. One or two sentences on the tradition behind the product and how it feels to use.
3. Key qualities as a list (what it is, texture, scent, for which skin or hair), only from the facts given.
4. How to use it, in a few numbered steps, when the notes or photos say how.
5. One closing line that invites the reader to bring the ritual home.

Rules:
- Use only facts given in the notes, the product name or readable on the photos (weight, volume, ingredients). Never invent ingredients, certifications ("bio", "vegan", "dermatologisch getestet"), test results, reviews or prices.
- This is cosmetics sold in the EU: no medical or healing claims (no "heilt", "gegen Krankheiten", "Cellulite verschwindet"). Use careful cosmetic wording ("pflegt", "kann das Hautbild verfeinern", "unterstützt").
- Do not write prices or shipping terms: the page shows them.
- German is the main text: natural, elegant German with "Sie". English says the same naturally. Arabic is clear Modern Standard Arabic addressing a woman.
- Short paragraphs and lists that read well on a phone. At most a few emojis, or none.
- HTML only, with these tags: h2, h3, p, ul, ol, li, strong, em, br, and img. No classes, styles or other attributes, except src and alt on img.
- Photos: you may place some of the shop's photos between sections with <img src="..." alt="...">, using only the exact URLs listed in the request, each at most once.
- Also suggest a product name in each language: clear, with the words people search for (e.g. "Schwarze Seife mit Eukalyptus, 200 g"), under 80 characters.`;

const SCHEMA = {
  type: 'object',
  properties: {
    name_de: { type: 'string' },
    name_en: { type: 'string' },
    name_ar: { type: 'string' },
    desc_de: { type: 'string' },
    desc_en: { type: 'string' },
    desc_ar: { type: 'string' },
  },
  required: ['name_de', 'name_en', 'name_ar', 'desc_de', 'desc_en', 'desc_ar'],
  additionalProperties: false,
};

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// A product photo as an image block: our own uploads (R2 or D1), files of the site, or an https link.
async function photoBlock(env, url, origin) {
  let type;
  let data;
  if (url.startsWith('/img/')) {
    const key = url.slice(5);
    const obj = env.IMAGES ? await env.IMAGES.get(key) : null;
    if (obj) {
      type = obj.httpMetadata?.contentType;
      data = await obj.arrayBuffer();
    } else {
      const row = await env.DB.prepare('SELECT type, data FROM images WHERE key = ?').bind(key).first();
      if (!row) return null;
      type = row.type;
      data = row.data;
    }
  } else if (url.startsWith('/assets/') && env.ASSETS) {
    const res = await env.ASSETS.fetch(new Request(origin + url));
    if (!res.ok) return null;
    type = (res.headers.get('content-type') || '').split(';')[0];
    data = await res.arrayBuffer();
  } else if (/^https:\/\//i.test(url)) {
    return { type: 'image', source: { type: 'url', url } };
  } else {
    return null;
  }
  if (!PHOTO_TYPES.has(type) || !data || data.byteLength > 4.5 * 1024 * 1024) return null;
  return { type: 'image', source: { type: 'base64', media_type: type, data: toBase64(data) } };
}

// Keep only the photos the request listed, so the text can never point at another file.
function onlyListed(html, allowed) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = (tag.match(/\ssrc\s*=\s*"([^"]*)"/i) || [])[1];
    return src && allowed.has(src) ? tag : '';
  });
}

const clean = (html, allowed) => sanitizeRich(onlyListed(String(html || ''), allowed)).trim();

export async function writeDescription(env, origin, input) {
  if (!env.ANTHROPIC_API_KEY) return { status: 400, body: { error: 'no_ai_key' } };
  const names = input.names && typeof input.names === 'object' ? input.names : {};
  const notes = String(input.notes || '').slice(0, 6000);
  const urls = (Array.isArray(input.images) ? input.images : []).map(String).filter((u) => /^(\/img\/|\/assets\/|https:\/\/)/.test(u)).slice(0, MAX_PHOTOS);
  const name = ['de', 'en', 'ar'].map((l) => String(names[l] || '').trim().slice(0, 200)).filter(Boolean).join(' / ');
  if (!name && !notes && !urls.length) return { status: 400, body: { error: 'ai_needs_input' } };

  const photos = (await Promise.all(urls.map((u) => photoBlock(env, u, origin).catch(() => null)))).map((b, i) => (b ? { url: urls[i], block: b } : null)).filter(Boolean);
  const allowed = new Set(photos.map((p) => p.url));
  const content = [];
  photos.forEach((p, i) => content.push({ type: 'text', text: `Photo ${i + 1}: ${p.url}` }, p.block));
  content.push({
    type: 'text',
    text: [
      `Product name: ${name || '(not given: name it from the photos and notes)'}`,
      `Seller's notes:\n${notes || '(none)'}`,
      photos.length ? `Photo URLs you may use in the description: ${photos.map((p) => p.url).join(', ')}` : 'No photos to place in the description.',
    ].join('\n\n'),
  });

  // ANTHROPIC_BASE_URL is only set in tests, to point the client at a local stand-in.
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}) });
  let message;
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    });
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return { status: 502, body: { error: 'ai_bad_key' } };
    if (err instanceof Anthropic.RateLimitError) return { status: 429, body: { error: 'ai_busy' } };
    if (err instanceof Anthropic.APIError) return { status: 502, body: { error: 'ai_failed', detail: String(err.message || '').slice(0, 200) } };
    throw err;
  }
  if (message.stop_reason === 'refusal') return { status: 422, body: { error: 'ai_refused' } };
  if (message.stop_reason === 'max_tokens') return { status: 502, body: { error: 'ai_failed', detail: 'too long' } };
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    return { status: 502, body: { error: 'ai_failed', detail: 'bad output' } };
  }
  const one = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  return {
    status: 200,
    body: {
      names: { de: one(out.name_de), en: one(out.name_en), ar: one(out.name_ar) },
      desc: { de: clean(out.desc_de, allowed), en: clean(out.desc_en, allowed), ar: clean(out.desc_ar, allowed) },
    },
  };
}
