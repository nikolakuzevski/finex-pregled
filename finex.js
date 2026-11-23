// Finex website script.
// - MK/EN switch: Macedonian is in the markup, English in data-en (inner HTML) and
//   data-en-<attr>. ?lang=en opens the page in English. (From homepages/shared/site.js.)
// - Phone menu, bar shadow after the hero, current section marked in the menu.
// - Services: the bar of the service in the middle of the screen is orange, read ones navy,
//   and the photo beside the text follows it.
// - Contact form: checks the required fields, then sends through FormSubmit's AJAX endpoint
//   to the address in the form's data-form (finansiskimenadzment@gmail.com).
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
    // Links between the pages keep the language: "./#uslugi" becomes "./?lang=en#uslugi".
    document.querySelectorAll('a[data-page]').forEach((a) => {
      const [path, hash] = a.dataset.page.split('#');
      a.setAttribute('href', path + (lang === 'en' ? '?lang=en' : '') + (hash ? '#' + hash : ''));
    });
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
  if (!('IntersectionObserver' in window) || !document.querySelector('.hero')) return; // legal pages have no sections
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

// Hero: the straight dashed line over the bars. It starts only when the pictures have fully
// appeared (their opening animations are over and the photos are loaded), then shows one dash
// after another. Every dash is its own line, so all are the same length and none is cut.
(() => {
  const svg = document.querySelector('.trend');
  if (!svg) return;
  const chart = svg.parentElement;
  const FROM = [0.083, 0.57], TO = [0.917, -0.12]; // share of the chart's width and height
  const DASH = 6, GAP = 8, TOTAL = 1700; // px, px, ms for the whole line
  let started = false;
  const draw = (play) => {
    svg.replaceChildren();
    svg.classList.toggle('is-playing', play);
    if (getComputedStyle(svg).display === 'none') return; // phones have no line
    const w = chart.clientWidth, h = chart.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const x = FROM[0] * w, y = FROM[1] * h, dx = TO[0] * w - x, dy = TO[1] * h - y;
    const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const n = Math.round((len + GAP) / (DASH + GAP)), period = (len - DASH) / (n - 1);
    for (let i = 0; i < n; i++) {
      const a = i * period, b = a + DASH;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', (x + ux * a).toFixed(2)); line.setAttribute('y1', (y + uy * a).toFixed(2));
      line.setAttribute('x2', (x + ux * b).toFixed(2)); line.setAttribute('y2', (y + uy * b).toFixed(2));
      line.style.animationDelay = Math.round((i * TOTAL) / n) + 'ms';
      svg.append(line);
    }
  };
  const opening = chart.getAnimations ? chart.getAnimations({ subtree: true }).map((a) => a.finished) : [];
  const photos = Promise.all([...chart.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
  const enough = new Promise((r) => setTimeout(r, 5000)); // a photo that never loads must not hold the line back
  Promise.all([Promise.allSettled(opening), Promise.race([photos, enough])]).then(() => { started = true; draw(true); });
  let width = innerWidth, height = innerHeight;
  addEventListener('resize', () => {
    if (!started || (innerWidth === width && innerHeight === height)) return;
    width = innerWidth; height = innerHeight;
    draw(false);
  }, { passive: true });
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

// Contact form: FormSubmit (formsubmit.co) e-mails each message to the inbox. The very first
// message sends an activation e-mail to that inbox instead; nothing arrives until its link is
// clicked once. The honeypot field _honey stays empty for people and catches simple bots.
(() => {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const endpoint = 'https://formsubmit.co/ajax/' + form.dataset.form;
  const text = {
    mk: {
      missing: 'Пополнете ги име и презиме и телефон или е-пошта.',
      sending: 'Се праќа…',
      sent: 'Ви благодариме. Пораката е примена, ќе ви се јавиме наскоро.',
      failed: 'Пораката не беше пратена. Обидете се повторно или јавете ни се на +389 71 260 471.',
    },
    en: {
      missing: 'Please fill in your name and a phone number or e-mail.',
      sending: 'Sending…',
      sent: 'Thank you. Your message has arrived and we will get back to you soon.',
      failed: 'The message was not sent. Please try again or call us on +389 71 260 471.',
    },
  };
  const say = (msg, ok) => { status.textContent = msg; status.classList.toggle('is-ok', !!ok); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = text[document.documentElement.lang === 'en' ? 'en' : 'mk'];
    let first = null;
    form.querySelectorAll('[required]').forEach((f) => {
      const bad = !f.value.trim();
      f.setAttribute('aria-invalid', String(bad));
      if (bad && !first) first = f;
    });
    if (first) { say(t.missing); first.focus(); return; }

    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    data['Услуга'] = fd.getAll('Услуга').join(', ') || 'Не е избрано';
    const contact = (data['Телефон или е-пошта'] || '').trim();
    const payload = {
      ...data,
      _subject: 'Finex: нова порака од ' + (data['Име и презиме'] || '').trim(),
      _template: 'table',
      _captcha: 'false',
    };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) payload._replyto = contact;

    button.disabled = true;
    say(t.sending);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || String(out.success) === 'false') throw new Error(out.message || res.status);
      form.reset();
      say(t.sent, true);
    } catch (err) {
      say(t.failed);
    } finally {
      button.disabled = false;
    }
  });
  form.addEventListener('input', (e) => { if (e.target.value.trim()) e.target.removeAttribute('aria-invalid'); });
  // Services: any number can be ticked, but "Not sure yet" and a named service exclude each other.
  const picks = [...form.querySelectorAll('[data-picks] input[type="checkbox"]')];
  form.addEventListener('change', (e) => {
    const box = e.target;
    if (!picks.includes(box) || !box.checked) return;
    const unsure = box.hasAttribute('data-pick-unsure');
    picks.forEach((p) => { if (p !== box && p.hasAttribute('data-pick-unsure') !== unsure) p.checked = false; });
  });
})();

if (window.ScrollCraft) window.ScrollCraft.mount(document.body);
