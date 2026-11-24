// Storefront script: the cart (kept in localStorage), add to cart, the mini cart, the cart page and the checkout,
// plus the gallery, drawers, delivery estimate, copy buttons, newsletter and scroll reveals.
// Every price shown in the cart comes from the server (/api/quote), never from localStorage.
(() => {
  const KEY = 'kh.cart.v1';
  const i18n = JSON.parse(document.getElementById('i18n')?.textContent || '{}');
  const lang = i18n.lang || document.documentElement.lang || 'de';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'de-DE', { style: 'currency', currency: 'EUR', numberingSystem: 'latn' });
  const money = (cents) => fmt.format((Math.round(cents) || 0) / 100);
  const small = (url) => (/^\/assets\/p\/[a-z0-9-]+\.webp$/.test(url) && !url.endsWith('-sm.webp') ? url.replace(/\.webp$/, '-sm.webp') : url);
  const track = (name, data) => window.shTrack?.(name, data);
  const ICON = {
    plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>',
  };

  // Cloudflare Turnstile (when the shop has it): loads only once someone starts filling in the checkout.
  const TS_KEY = document.body.dataset.ts || '';
  let tsReady = null;
  function loadTurnstile() {
    if (!TS_KEY) return Promise.resolve(null);
    if (!tsReady) {
      tsReady = new Promise((resolve) => {
        window.__tsLoaded = () => resolve(window.turnstile);
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__tsLoaded';
        s.async = true;
        s.onerror = () => resolve(null);
        document.head.appendChild(s);
      });
    }
    return tsReady;
  }
  async function botToken(form) {
    const ts = await loadTurnstile();
    if (!ts) return '';
    let box = form.querySelector('.ts-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'ts-box';
      form.querySelector('.place-order')?.before(box);
    }
    return new Promise((resolve) => {
      const done = (t) => resolve(t || '');
      if (box.dataset.id) ts.remove(box.dataset.id);
      box.dataset.id = ts.render(box, { sitekey: TS_KEY, appearance: 'interaction-only', size: 'flexible', language: lang, callback: done, 'error-callback': () => done(''), 'expired-callback': () => done('') });
      setTimeout(() => done(''), 30000);
    });
  }
  if (TS_KEY) document.addEventListener('focusin', (e) => e.target.closest?.('#checkout') && loadTurnstile(), { passive: true });

  // Cart storage
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter((i) => i && i.id) : [];
    } catch {
      return [];
    }
  }
  function save(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
    badge();
  }
  function badge(bump) {
    const n = load().reduce((s, i) => s + (i.qty || 0), 0);
    $$('.cart-count').forEach((el) => {
      el.textContent = n;
      el.hidden = n === 0;
      if (bump) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      }
    });
    $$('[data-count]').forEach((el) => (el.textContent = n ? `(${n})` : ''));
  }
  function add(item) {
    const items = load();
    const same = items.find((i) => i.id === item.id && (i.option || '') === (item.option || ''));
    if (same) same.qty = Math.min(20, same.qty + item.qty);
    else items.push(item);
    save(items);
    badge(true);
    track('AddToCart', { value: (item.price * item.qty) / 100, items: [{ id: item.id, name: item.name, price: item.price / 100, qty: item.qty }] });
  }

  let toastTimer;
  function toast(text) {
    const el = $('.toast');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  async function quote(extra = {}) {
    const res = await fetch(`/api/quote?lang=${lang}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: load(), ...extra }) });
    if (!res.ok) throw new Error('quote');
    return res.json();
  }
  // Drops items the server no longer sells and caps quantities, so the stored cart matches the quote.
  function syncCart(q) {
    if (!q.issues?.length) return;
    const valid = new Map(q.lines.map((l) => [`${l.id}|${l.option || ''}`, l.qty]));
    save(load().filter((i) => valid.has(`${i.id}|${i.option || ''}`)).map((i) => ({ ...i, qty: valid.get(`${i.id}|${i.option || ''}`) })));
    toast(q.issues.some((x) => x.issue === 'qty') ? i18n.issueQty : i18n.issueStock);
  }

  // Header: shadow once the page scrolls; rotating announcement.
  const header = $('[data-header]');
  const onScroll = () => header?.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const rot = $('[data-rotate]');
  if (rot && rot.children.length > 1 && !reduceMotion) {
    let k = 0;
    setInterval(() => {
      const kids = [...rot.children];
      kids[k].hidden = true;
      k = (k + 1) % kids.length;
      kids[k].hidden = false;
    }, 4500);
  }

  // Drawers (menu, search, cart)
  const back = $('.drawer-back');
  let openDrawer = null;
  function closeDrawers() {
    $$('.drawer').forEach((d) => d.classList.remove('open'));
    setTimeout(() => {
      $$('.drawer').forEach((d) => d.classList.contains('open') || (d.hidden = true));
      if (back && !openDrawer) back.hidden = true;
    }, 300);
    back?.classList.remove('on');
    document.body.classList.remove('locked');
    openDrawer = null;
  }
  function showDrawer(name) {
    const d = $(`#${name}-panel`);
    if (!d) return false;
    closeDrawers();
    openDrawer = d;
    d.hidden = false;
    if (back) back.hidden = false;
    requestAnimationFrame(() => {
      d.classList.add('open');
      back?.classList.add('on');
    });
    document.body.classList.add('locked');
    if (name === 'search') setTimeout(() => d.querySelector('input')?.focus(), 200);
    if (name === 'cart') renderMini();
    if (name === 'recent') renderRecent();
    return true;
  }
  $$('[data-drawer]').forEach((b) =>
    b.addEventListener('click', (e) => {
      if (b.dataset.drawer === 'cart' && document.body.classList.contains('page-cart')) return;
      if (showDrawer(b.dataset.drawer)) e.preventDefault();
    }),
  );
  $$('[data-drawer-close]').forEach((b) => b.addEventListener('click', closeDrawers));
  addEventListener('keydown', (e) => e.key === 'Escape' && openDrawer && closeDrawers());

  function freeBar(q) {
    const free = q.freeOver || 0;
    if (!free || !q.subtotal) return '';
    const left = free - q.subtotal;
    const pct = Math.min(100, Math.round((q.subtotal / free) * 100));
    return `<div class="free-bar"><p>${left > 0 ? esc(i18n.freeLeft.replace('{amount}', money(left))) : esc(i18n.freeReached)}</p><span><i style="width:${pct}%"></i></span></div>`;
  }
  const lineHtml = (l, editable) => `<li class="line" data-id="${l.id}" data-option="${esc(l.option)}">
    <a class="line-img" href="/${lang}/p/${esc(l.slug)}"><img src="${esc(small(l.image))}" alt="" width="80" height="100" loading="lazy"></a>
    <div class="line-main">
      <a class="line-name" href="/${lang}/p/${esc(l.slug)}">${esc(l.name)}</a>
      ${l.optionLabel ? `<span class="line-opt">${esc(l.optionLabel)}</span>` : ''}
      ${editable ? `<div class="line-row"><div class="qty qty-sm"><button type="button" data-q="-1" aria-label="−">${ICON.minus}</button><span>${l.qty}</span><button type="button" data-q="1" aria-label="+"${l.stock != null && l.qty >= l.stock ? ' disabled' : ''}>${ICON.plus}</button></div><button type="button" class="line-remove" data-remove aria-label="${esc(i18n.remove)}">${ICON.trash}</button></div>` : `<span class="line-opt">× ${l.qty}</span>`}
    </div>
    <strong class="line-total">${money(l.total)}</strong>
  </li>`;
  function bindLines(root, rerender) {
    root.querySelectorAll('.line').forEach((li) => {
      const id = Number(li.dataset.id);
      const option = li.dataset.option || '';
      const change = (fn) => {
        save(fn(load()));
        rerender();
      };
      li.querySelectorAll('[data-q]').forEach((b) =>
        b.addEventListener('click', () => change((items) => items.map((i) => (i.id === id && (i.option || '') === option ? { ...i, qty: Math.max(1, Math.min(20, i.qty + Number(b.dataset.q))) } : i)))),
      );
      li.querySelector('[data-remove]')?.addEventListener('click', () => change((items) => items.filter((i) => !(i.id === id && (i.option || '') === option))));
    });
  }
  const emptyHtml = () => `<div class="cart-empty"><img src="/assets/brand/symbol-gold.svg" alt="" width="70" height="70"><p>${esc(i18n.emptyCart)}</p><a class="btn" href="/${lang}/shop">${esc(i18n.startShopping)}</a></div>`;

  // Mini cart (drawer)
  async function renderMini() {
    const box = $('[data-view="mini"]');
    if (!box) return;
    if (!load().length) {
      box.innerHTML = emptyHtml();
      return;
    }
    box.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try {
      const q = await quote();
      syncCart(q);
      if (!q.lines.length) {
        box.innerHTML = emptyHtml();
        return;
      }
      box.innerHTML = `${freeBar(q)}<ul class="lines-list">${q.lines.map((l) => lineHtml(l, true)).join('')}</ul>
      <div class="mini-foot"><p class="mini-sub"><span>${esc(i18n.subtotal)}</span><strong>${money(q.subtotal)}</strong></p>
      <a class="btn btn-block btn-lg" href="/${lang}/checkout">${ICON.lock} ${esc(i18n.toCheckout)}</a>
      <a class="btn btn-ghost btn-block" href="/${lang}/cart">${esc(i18n.viewCart)}</a></div>`;
      bindLines(box, renderMini);
    } catch {
      box.innerHTML = `<p class="form-error">${esc(i18n.error)}</p>`;
    }
  }

  // Recently viewed products (kept in this browser only).
  function renderRecent() {
    const box = $('[data-view="recent"]');
    if (!box) return;
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem('kh.seen.v2') || '[]').filter((x) => x && x.slug);
    } catch {}
    box.innerHTML = list.length
      ? `<ul class="lines-list">${list.map((p) => `<li class="line"><a class="line-img" href="/${lang}/p/${esc(p.slug)}"><img src="${esc(p.image)}" alt="" width="80" height="100" loading="lazy"></a><div class="line-main"><a class="line-name" href="/${lang}/p/${esc(p.slug)}">${esc(p.name)}</a></div><strong class="line-total">${money(p.price)}</strong></li>`).join('')}</ul>`
      : `<div class="cart-empty"><img src="/assets/brand/symbol-gold.svg" alt="" width="70" height="70"><p>${esc(i18n.recentEmpty)}</p><a class="btn" href="/${lang}/shop">${esc(i18n.startShopping)}</a></div>`;
  }

  // Share this page: the phone's share sheet, or copy the link.
  $$('[data-share-page]').forEach((b) =>
    b.addEventListener('click', async () => {
      const data = { title: document.title, url: location.href };
      try {
        if (navigator.share) await navigator.share(data);
        else {
          await navigator.clipboard.writeText(location.href);
          toast(i18n.copied);
        }
      } catch {}
    }),
  );

  // Cart page
  async function renderCartPage() {
    const box = $('[data-view="cart"]');
    const side = $('[data-view="cart-totals"]');
    if (!box) return;
    if (!load().length) {
      box.innerHTML = emptyHtml();
      if (side) side.hidden = true;
      return;
    }
    try {
      const q = await quote();
      syncCart(q);
      if (!q.lines.length) {
        box.innerHTML = emptyHtml();
        if (side) side.hidden = true;
        return;
      }
      box.innerHTML = `<ul class="lines-list">${q.lines.map((l) => lineHtml(l, true)).join('')}</ul>`;
      if (side) {
        side.hidden = false;
        side.innerHTML = `${freeBar(q)}<ul class="totals"><li><span>${esc(i18n.subtotal)}</span><span>${money(q.subtotal)}</span></li><li><span>${esc(i18n.shipping)}</span><span>${q.shipping ? money(q.shipping) : esc(i18n.free)}</span></li><li class="total"><span>${esc(i18n.total)}</span><span>${money(q.total)}</span></li><li class="vat"><span>${esc(q.vat ? i18n.vatIncl.replace('{amount}', money(q.vat)) : i18n.vatSmall)}</span></li></ul><a class="btn btn-lg btn-block" href="/${lang}/checkout">${ICON.lock} ${esc(i18n.toCheckout)}</a>`;
      }
      bindLines(box, renderCartPage);
    } catch {
      box.innerHTML = `<p class="form-error">${esc(i18n.error)}</p>`;
    }
  }
  renderCartPage();

  // Quick add buttons on product cards
  $$('[data-add]').forEach((b) =>
    b.addEventListener('click', () => {
      add({ id: Number(b.dataset.add), qty: 1, option: '', name: b.dataset.name, price: Number(b.dataset.price), image: b.dataset.image, slug: b.dataset.slug });
      b.classList.add('done');
      setTimeout(() => b.classList.remove('done'), 1200);
      showDrawer('cart') || toast(i18n.added);
    }),
  );

  // Product page: options, quantity, offers, add to cart / buy now
  const buy = $('form.buy');
  if (buy) {
    const qtyInput = buy.querySelector('input[name="qty"]');
    buy.querySelectorAll('[data-step]').forEach((b) =>
      b.addEventListener('click', () => {
        const max = Number(qtyInput.max) || 20;
        qtyInput.value = Math.max(1, Math.min(max, (Number(qtyInput.value) || 1) + Number(b.dataset.step)));
      }),
    );
    buy.querySelectorAll('fieldset.options').forEach((fs) =>
      fs.addEventListener('change', (e) => {
        const picked = fs.querySelector('[data-picked]');
        if (picked) picked.textContent = `: ${e.target.value}`;
        fs.classList.remove('missing');
        const extra = [...buy.querySelectorAll('fieldset.options input:checked')].reduce((s, i) => s + Number(i.dataset.extra || 0), 0);
        const unit = $('[data-unit]');
        if (unit) unit.textContent = money(Number(buy.dataset.price) + extra);
      }),
    );
    buy.querySelectorAll('input[name="offer"]').forEach((r) => r.addEventListener('change', () => (qtyInput.value = r.value)));
    const choice = () => {
      const groups = [...buy.querySelectorAll('fieldset.options')];
      const missing = groups.find((g) => !g.querySelector('input:checked'));
      if (missing) {
        missing.classList.add('missing');
        missing.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        const err = buy.querySelector('.form-error');
        if (err) {
          err.textContent = i18n.chooseOption;
          err.hidden = false;
        }
        return null;
      }
      return groups.map((g) => g.querySelector('input:checked').value).join(' / ');
    };
    const go = (where) => {
      const option = choice();
      if (option === null) return;
      buy.querySelector('.form-error') && (buy.querySelector('.form-error').hidden = true);
      add({ id: Number(buy.dataset.product), qty: Math.max(1, Number(qtyInput?.value) || 1), option, name: buy.dataset.name, price: Number(buy.dataset.price), image: buy.dataset.image, slug: buy.dataset.slug });
      if (where === 'checkout') location.href = `/${lang}/checkout`;
      else showDrawer('cart') || toast(i18n.added);
    };
    buy.addEventListener('submit', (e) => {
      e.preventDefault();
      go(e.submitter?.value || 'cart');
    });
    $('[data-buy-bar]')?.addEventListener('click', () => go('cart'));
    const bar = $('.buy-bar');
    const addBtn = buy.querySelector('.add-btn');
    if (bar && addBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => bar.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(addBtn);
    }
    try {
      const me = { slug: buy.dataset.slug, name: buy.dataset.name, price: Number(buy.dataset.price), image: small(buy.dataset.image) };
      const seen = JSON.parse(localStorage.getItem('kh.seen.v2') || '[]').filter((x) => x && x.slug !== me.slug);
      localStorage.setItem('kh.seen.v2', JSON.stringify([me, ...seen].slice(0, 12)));
    } catch {}
  }

  // Gallery: swipe (scroll snap), arrows and thumbnails
  const gal = $('.gallery-track');
  if (gal) {
    const thumbs = $$('.thumbs button');
    const index = () => Math.round(Math.abs(gal.scrollLeft) / gal.clientWidth);
    const goTo = (i) => gal.scrollTo({ left: (document.dir === 'rtl' ? -1 : 1) * i * gal.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    gal.addEventListener('scroll', () => thumbs.forEach((t, i) => t.classList.toggle('on', i === index())), { passive: true });
    thumbs.forEach((t) => t.addEventListener('click', () => goTo(Number(t.dataset.go))));
    $$('[data-gal]').forEach((b) => b.addEventListener('click', () => goTo(Math.max(0, Math.min(thumbs.length - 1, index() + Number(b.dataset.gal))))));
  }

  // Delivery estimate: working days from tomorrow (Mon–Fri), e.g. "Do., 27. Nov. – Mo., 1. Dez."
  $$('[data-eta]').forEach((el) => {
    const [a, b] = String(el.dataset.eta || '2-4').split('-').map(Number);
    const addDays = (n) => {
      const d = new Date();
      if (d.getHours() >= 14) n += 1; // orders after 2 pm leave the next day
      while (n > 0) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) n--;
      }
      return d;
    };
    const f = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang === 'en' ? 'en-GB' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'short', numberingSystem: 'latn' });
    el.textContent = `${f.format(addDays(a || 2))} – ${f.format(addDays(b || a || 4))}`;
  });

  // Copy buttons (bank details, share link)
  $$('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.classList.add('copied');
        toast(i18n.copied);
        setTimeout(() => b.classList.remove('copied'), 1500);
      } catch {}
    }),
  );

  // Sort menu: apply right away
  $$('[data-autosubmit]').forEach((s) => s.addEventListener('change', () => s.form.submit()));

  // Newsletter
  $$('[data-newsletter]').forEach((f) =>
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = f.email.value.trim();
      if (!f.email.checkValidity() || !email) return f.email.focus();
      const btn = f.querySelector('button');
      btn.disabled = true;
      try {
        const r = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, lang, website: f.website.value }) });
        if (!r.ok) throw new Error();
        f.querySelector('.news-row').hidden = true;
        f.querySelector('.news-done').hidden = false;
      } catch {
        btn.disabled = false;
        toast(i18n.error);
      }
    }),
  );

  // WhatsApp widget
  const wa = $('[data-wa]');
  if (wa) {
    const panel = wa.querySelector('.wa-panel');
    const toggle = wa.querySelector('[data-wa-toggle]');
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    });
    wa.querySelector('[data-wa-close]').addEventListener('click', () => {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Checkout
  const co = $('#checkout');
  if (co) {
    let current = null;
    const summary = $('[data-view="summary"]');
    const err = co.querySelector('.form-error');
    const btn = co.querySelector('.place-order');
    const method = () => co.querySelector('input[name="payment"]:checked')?.value || '';
    const updateMethods = (available) => {
      co.querySelectorAll('.pay-opt').forEach((o) => {
        const ok = available.includes(o.dataset.method);
        o.hidden = !ok;
        if (!ok && o.querySelector('input').checked) o.querySelector('input').checked = false;
      });
      if (!method()) {
        const first = co.querySelector('.pay-opt:not([hidden]) input');
        if (first) first.checked = true;
      }
      co.querySelectorAll('.pay-opt').forEach((o) => o.classList.toggle('on', o.querySelector('input').checked));
      btn.querySelector('span').textContent = method() === 'paypal' ? btn.dataset.labelPaypal : btn.dataset.labelDefault;
    };
    async function renderSummary() {
      if (!load().length) {
        summary.innerHTML = emptyHtml();
        btn.disabled = true;
        return;
      }
      try {
        const asked = method();
        let q = await quote({ country: co.country.value, method: asked });
        syncCart(q);
        if (!q.lines.length) {
          summary.innerHTML = emptyHtml();
          btn.disabled = true;
          return;
        }
        updateMethods(q.methods || []);
        // Cash on delivery isn't offered abroad: when the chosen method changed, price the cart again (no COD fee).
        if (method() !== asked) q = await quote({ country: co.country.value, method: method() });
        current = q;
        const s = q;
        $('[data-ship-price]').textContent = s.shipsTo ? (s.shipping ? money(s.shipping) : i18n.free) : '—';
        summary.innerHTML = `<ul class="lines-list compact">${s.lines.map((l) => lineHtml(l, false)).join('')}</ul>
        ${freeBar(s)}
        <ul class="totals"><li><span>${esc(i18n.subtotal)}</span><span>${money(s.subtotal)}</span></li>
        <li><span>${esc(i18n.shipping)}</span><span>${s.shipsTo ? (s.shipping ? money(s.shipping) : esc(i18n.free)) : '—'}</span></li>
        ${s.fee ? `<li><span>${esc(i18n.codFee)}</span><span>${money(s.fee)}</span></li>` : ''}
        <li class="total"><span>${esc(i18n.total)}</span><span>${money(s.total)}</span></li>
        <li class="vat"><span>${esc(s.vat ? i18n.vatIncl.replace('{amount}', money(s.vat)) : i18n.vatSmall)}</span></li></ul>
        ${s.shipsTo ? '' : `<p class="form-error">${esc(i18n.noShipping)}</p>`}`;
        btn.disabled = !s.shipsTo;
      } catch {
        summary.innerHTML = `<p class="form-error">${esc(i18n.error)}</p>`;
      }
    }
    renderSummary().then(() => current && track('InitiateCheckout', { value: current.total / 100, items: current.lines.map((l) => ({ id: l.id, name: l.name, price: l.price / 100, qty: l.qty })) }));
    co.country.addEventListener('change', renderSummary);
    co.addEventListener('change', (e) => e.target.name === 'payment' && renderSummary());

    const showError = (field, text) => {
      const el = co.elements[field];
      const wrap = (el?.length && !el.tagName ? el[0] : el)?.closest('label, .pay-opts, .check');
      if (wrap) {
        wrap.classList.add('invalid');
        let m = wrap.parentElement.querySelector(`.field-error[data-for="${field}"]`);
        if (!m) {
          m = document.createElement('p');
          m.className = 'field-error';
          m.dataset.for = field;
          wrap.after(m);
        }
        m.textContent = text;
      }
    };
    const clearErrors = () => {
      co.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
      co.querySelectorAll('.field-error').forEach((x) => x.remove());
      err.hidden = true;
    };
    co.addEventListener('input', (e) => {
      const wrap = e.target.closest('.invalid');
      if (wrap) {
        wrap.classList.remove('invalid');
        wrap.parentElement.querySelector(`.field-error[data-for="${e.target.name}"]`)?.remove();
      }
    });
    const MSG = { required: i18n.required, email: i18n.badEmail, phone: i18n.badPhone, zip: i18n.badZip, terms: i18n.acceptTerms, payment: i18n.choosePayment };

    co.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const f = co.elements;
      const errors = {};
      for (const k of ['name', 'phone', 'street', 'city']) if (!f[k].value.trim()) errors[k] = 'required';
      if (f.email.value && !f.email.checkValidity()) errors.email = 'email';
      if (f.phone.value.trim() && f.phone.value.replace(/\D/g, '').length < 7) errors.phone = 'phone';
      if (f.country.value === 'DE' && f.city.value.trim() && !/\b\d{5}\b/.test(f.city.value)) errors.city = 'zip';
      if (!method()) errors.payment = 'payment';
      if (!f.terms.checked) errors.terms = 'terms';
      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([k, v]) => showError(k, MSG[v] || i18n.required));
        co.querySelector('.invalid')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      btn.disabled = true;
      const label = btn.querySelector('span').textContent;
      btn.querySelector('span').textContent = i18n.sending;
      try {
        const body = {
          items: load(),
          email: f.email.value,
          phone: f.phone.value,
          name: f.name.value,
          street: f.street.value,
          city: f.city.value,
          country: f.country.value,
          note: f.note.value,
          payment: method(),
          terms: f.terms.checked,
          newsletter: f.newsletter.checked,
          website: f.website.value,
          lang,
          cf_token: await botToken(co),
        };
        const res = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          save([]);
          location.href = data.url;
          return;
        }
        if (data.error === 'invalid') Object.entries(data.fields || {}).forEach(([k, v]) => showError(k, MSG[v] || i18n.required));
        else {
          err.textContent = { too_many: i18n.tooMany, bot: i18n.botCheck, paypal: i18n.paypalError, cart_changed: i18n.issueStock }[data.error] || i18n.error;
          err.hidden = false;
          if (data.error === 'cart_changed') renderSummary();
        }
      } catch {
        err.textContent = i18n.error;
        err.hidden = false;
      }
      btn.disabled = false;
      btn.querySelector('span').textContent = label;
    });
  }

  // Cooperative film: the silent loop plays only while it is on screen (never for visitors who asked for less motion);
  // the full film opens in a dialog and loads only when asked for.
  const loop = $('[data-loop]');
  if (loop) {
    if (reduceMotion || !('IntersectionObserver' in window)) loop.removeAttribute('data-loop');
    else {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          if (loop.preload === 'none') loop.preload = 'auto';
          loop.play().catch(() => {});
        } else loop.pause();
      }, { rootMargin: '200px 0px' }).observe(loop);
    }
  }
  const filmDialog = $('.film-dialog');
  if (filmDialog) {
    const film = filmDialog.querySelector('video');
    $$('[data-film-open]').forEach((b) => b.addEventListener('click', () => {
      filmDialog.showModal();
      film.play().catch(() => {});
    }));
    filmDialog.querySelector('[data-film-close]').addEventListener('click', () => filmDialog.close());
    filmDialog.addEventListener('click', (e) => e.target === filmDialog && filmDialog.close());
    filmDialog.addEventListener('close', () => film.pause());
  }

  // Ritual scroll story: the picture follows the step in the middle of the screen.
  const ritual = $('[data-ritual]');
  if (ritual && 'IntersectionObserver' in window) {
    const steps = $$('[data-ritual-step]', ritual);
    const imgs = $$('[data-ritual-img]', ritual);
    const n = $('[data-ritual-n]', ritual);
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = Number(e.target.dataset.ritualStep);
          steps.forEach((s) => s.classList.toggle('on', s === e.target));
          imgs.forEach((im, k) => im.classList.toggle('on', k === i));
          if (n) n.textContent = i + 1;
        }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    steps.forEach((s) => io.observe(s));
  }

  // Ritual Finder: three questions, then a ritual of products added to the bag in one click.
  const finder = $('[data-finder]');
  if (finder) {
    const data = JSON.parse(document.getElementById('finder-data')?.textContent || '{}');
    const bySlug = new Map((data.products || []).map((p) => [p.slug, p]));
    const RULES = {
      body: { cleanse: ['schwarze-seife-eukalyptus', 'nila-peeling', 'kessa-handschuh-schwarz', 'rizinusoel'], clarify: ['nila-seife', 'nila-peeling', 'schwarze-seife-nilla', 'rizinusoel'], firm: ['anti-cellulite-kaffeeseife', 'anti-cellulite-serum', 'nila-peeling'], nourish: ['schwarze-seife-aker-fassi', 'rizinusoel', 'tebrima-mit-kraeutern'] },
      face: { cleanse: ['aker-fassi-seife', 'tebrima-mit-kraeutern', 'maske-nilla'], clarify: ['nila-seife', 'maske-nilla', 'tebrima-mit-kraeutern'], firm: ['aker-fassi-seife', 'tebrima-mit-kraeutern', 'rizinusoel'], nourish: ['aker-fassi-seife', 'tebrima-mit-kraeutern', 'rizinusoel'] },
      hair: { cleanse: ['sidr-pulver', 'henna-pulver', 'rizinusoel'], clarify: ['sidr-pulver', 'henna-pulver', 'rizinusoel'], firm: ['henna-pulver', 'sidr-pulver', 'rizinusoel'], nourish: ['rizinusoel', 'henna-pulver', 'sidr-pulver'] },
    };
    const answers = [];
    const qs = $$('[data-q]', finder);
    const startBox = $('.finder-start', finder);
    const result = $('.finder-result', finder);
    let picks = [];
    const show = (i) => {
      startBox.hidden = true;
      result.hidden = true;
      qs.forEach((q, k) => (q.hidden = k !== i));
      qs[i]?.querySelector('button[data-a]')?.focus({ preventScroll: true });
    };
    const finish = () => {
      const [area, wish, time] = answers;
      const list = (RULES[area]?.[wish] || []).map((sl) => bySlug.get(sl)).filter(Boolean);
      picks = list.slice(0, time === 'quick' ? 2 : 3);
      qs.forEach((q) => (q.hidden = true));
      result.hidden = false;
      $('[data-finder-list]', finder).innerHTML = picks
        .map((p, i) => `<li style="--d:${i * 120}ms"><a href="/${lang}/p/${esc(p.slug)}"><img src="${esc(p.image)}" alt="" width="64" height="80"><span><strong>${esc(p.name)}</strong><small>${esc(p.sub || '')}</small></span></a><b>${money(p.price)}</b></li>`)
        .join('');
      $('[data-finder-total]', finder).innerHTML = `<span>${esc(i18n.total)}</span><strong>${money(picks.reduce((sum, p) => sum + p.price, 0))}</strong>`;
    };
    $('[data-finder-go]', finder).addEventListener('click', () => show(0));
    qs.forEach((q, qi) => {
      q.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-a]');
        if (b) {
          answers[qi] = b.dataset.a;
          if (qi + 1 < qs.length) show(qi + 1);
          else finish();
        }
        if (e.target.closest('[data-finder-back]')) show(qi - 1);
      });
    });
    $('[data-finder-restart]', finder).addEventListener('click', () => {
      answers.length = 0;
      show(0);
    });
    $('[data-finder-add]', finder).addEventListener('click', () => {
      picks.forEach((p) => add({ id: p.id, qty: 1, option: '', name: p.name, price: p.price, image: p.image, slug: p.slug }));
      showDrawer('cart') || toast(data.added);
    });
  }

  // Product cards lean towards the pointer, with a gold shine (pointer devices only).
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
        el.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
        el.style.setProperty('--mx', `${x * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Smooth page transitions (View Transitions): the clicked product photo flows into the product page.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="/p/"]');
    const img = a?.closest('.card')?.querySelector('[data-vt]');
    if (img) img.style.viewTransitionName = img.dataset.vt;
  });
  addEventListener('pageshow', () => $$('[data-vt]').forEach((el) => (el.style.viewTransitionName = '')));

  // The production strip can be dragged sideways with the mouse.
  $$('[data-drag]').forEach((el) => {
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = { x: e.clientX, left: el.scrollLeft };
      el.classList.add('dragging');
    });
    addEventListener('pointerup', () => {
      down = null;
      el.classList.toggle('dragging', false);
    });
    el.addEventListener('pointermove', (e) => down && (el.scrollLeft = down.left - (e.clientX - down.x)));
  });

  // Video hero: the picture drifts slightly slower than the page.
  const hero = $('[data-hero]');
  if (hero && !reduceMotion) {
    const vid = hero.querySelector('.hero-video');
    let ticking = false;
    addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = Math.min(scrollY, innerHeight);
          vid.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(${1 + y / 4000})`;
          ticking = false;
        });
      },
      { passive: true },
    );
  }

  // Scroll reveals
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('in'));

  badge();
})();
