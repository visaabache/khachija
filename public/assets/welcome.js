// First-visit welcome intro: plays once per browser session (sessionStorage, no cookie), never for bots,
// never for visitors who asked for less motion. One tap skips it. The shop loads underneath while it plays.
(function () {
  var tpl = document.getElementById('welcome-tpl');
  if (!tpl) return;
  try {
    if (sessionStorage.getItem('kh.welcomed')) return;
    sessionStorage.setItem('kh.welcomed', '1');
  } catch (e) {
    return;
  }
  if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent)) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var el = tpl.content.firstElementChild.cloneNode(true);
  document.body.appendChild(el);
  document.documentElement.classList.add('welcoming');
  var done = false;
  function close() {
    if (done) return;
    done = true;
    el.classList.add('out');
    document.documentElement.classList.remove('welcoming');
    setTimeout(function () { el.remove(); }, 900);
  }
  el.addEventListener('click', close);
  addEventListener('keydown', close, { once: true });
  setTimeout(close, 3100);
})();
