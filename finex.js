// Finex website script.
// - MK/EN switch: Macedonian is in the markup, English in data-en (inner HTML) and
//   data-en-<attr>. ?lang=en opens the page in English. (From homepages/shared/site.js.)
// - Phone menu, bar shadow after the hero, current section marked in the menu.
// - Services: the bar of the service in the middle of the screen is orange, read ones navy,
//   and the photo beside the text follows it.
// - Contact form: checks the required fields; it is not wired to any inbox yet.
// - Starts the scroll-craft engine (reveals and the approach line's --sc-p).
(() => {
  const root = document.documentElement;
  const KEY = 'finex-lang';
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch {} },
  };
  const mk = new Map();
  const ATTRS = ['alt', 'aria-label', 'content', 'title'];

  function apply(lang) {
    lang = lang === 'en' ? 'en' : 'mk';
    root.lang = lang;
    document.querySelectorAll('[data-en]').forEach((el) => {
      if (!mk.has(el)) mk.set(el, el.innerHTML);
      el.innerHTML = lang === 'en' ? el.dataset.en : mk.get(el);
    });
    for (const attr of ATTRS) {
      document.querySelectorAll(`[data-en-${attr}]`).forEach((el) => {
        const key = `mk${attr.replace('-', '')}`;
        if (el.dataset[key] == null) el.dataset[key] = el.getAttribute(attr) || '';
        el.setAttribute(attr, lang === 'en' ? el.getAttribute(`data-en-${attr}`) : el.dataset[key]);
      });
    }
    document.querySelectorAll('[data-lang-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langSet === lang)));
    document.dispatchEvent(new CustomEvent('finex:lang', { detail: lang }));
  }

  const fromUrl = new URLSearchParams(location.search).get('lang');
  apply(fromUrl || store.get() || 'mk');

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang-set]');
    if (!b) return;
    store.set(b.dataset.langSet);
    apply(b.dataset.langSet);
  });
})();

// Phone menu
(() => {
  const btn = document.querySelector('[data-menu-toggle]');
  const menu = btn && document.getElementById(btn.getAttribute('aria-controls'));
  if (!menu) return;
  const set = (open) => { btn.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  matchMedia('(min-width: 861px)').addEventListener('change', () => set(false));
})();

// Bar: a line under it once the page moves; the menu marks the section you are in.
(() => {
  const bar = document.querySelector('[data-bar]');
  const links = [...document.querySelectorAll('.bar__nav a[href^="#"]:not(.btn)')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const onScroll = () => bar.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle('is-here', a.getAttribute('href') === '#' + e.target.id));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
  // Back at the top nothing is marked.
  new IntersectionObserver(([e]) => { if (e.isIntersecting) links.forEach((a) => a.classList.remove('is-here')); }, { rootMargin: '-45% 0px -50% 0px' })
    .observe(document.querySelector('.hero'));
})();

// Services: the chart follows the text.
(() => {
  const box = document.querySelector('[data-svc]');
  if (!box || !('IntersectionObserver' in window)) return;
  const items = [...box.querySelectorAll('[data-svc-item]')];
  const bars = [...box.querySelectorAll('[data-svc-bar]')];
  const photos = [...box.querySelectorAll('[data-svc-photo]')];
  let current = 0;
  const show = (n) => {
    current = n;
    bars.forEach((b, i) => { b.classList.toggle('is-on', i === n); b.classList.toggle('is-done', i < n); });
    photos.forEach((p, i) => p.classList.toggle('is-on', i === n));
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(Number(e.target.dataset.svcItem));
  }, { rootMargin: '-50% 0px -50% 0px' });
  items.forEach((it) => io.observe(it));
  show(current);
})();

// Approach: each dot sits on the rising line right above the start of its step.
(() => {
  const track = document.querySelector('.steps__track');
  if (!track) return;
  const dots = [...track.querySelectorAll('i')];
  const steps = [...document.querySelectorAll('.steps li')];
  const place = () => {
    const t = track.getBoundingClientRect();
    if (!t.width) return;
    dots.forEach((d, i) => {
      const s = steps[i] && steps[i].getBoundingClientRect();
      if (s) d.style.setProperty('--x', ((s.left - t.left) / t.width).toFixed(4));
    });
  };
  place();
  addEventListener('resize', place, { passive: true });
  document.fonts && document.fonts.ready.then(place);
})();

// Contact form: not connected to an inbox yet, so it says so instead of pretending to send.
(() => {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const text = {
    mk: { missing: 'Пополнете ги име и презиме и телефон или е-пошта.', preview: 'Ова е преглед на страницата: формата ќе почне да праќа пораки откако ќе биде поврзана со вашата е-пошта.' },
    en: { missing: 'Please fill in your name and a phone number or e-mail.', preview: 'This is a preview of the site: the form will start sending messages once it is connected to your e-mail.' },
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = text[document.documentElement.lang === 'en' ? 'en' : 'mk'];
    let first = null;
    form.querySelectorAll('[required]').forEach((f) => {
      const bad = !f.value.trim();
      f.setAttribute('aria-invalid', String(bad));
      if (bad && !first) first = f;
    });
    if (first) { status.textContent = t.missing; first.focus(); return; }
    status.textContent = t.preview;
  });
  form.addEventListener('input', (e) => { if (e.target.value.trim()) e.target.removeAttribute('aria-invalid'); });
})();

if (window.ScrollCraft) window.ScrollCraft.mount(document.body);
