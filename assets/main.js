/* ERA BAND CAMP — лендинг. Без залежностей. */
(function () {
  'use strict';
  var cfg = window.EBC_CONFIG || {};

  /* 1. UTM-мітки й click-id з адреси сторінки → у всі посилання на квіз */
  var PASS = /^(utm_[a-z]+|fbclid|gclid|ttclid|yclid)$/i;
  var here = new URLSearchParams(location.search);
  var passed = [];
  here.forEach(function (v, k) { if (PASS.test(k)) passed.push([k, v]); });
  if (passed.length) {
    document.querySelectorAll('a.js-quiz').forEach(function (a) {
      try {
        var u = new URL(a.href);
        passed.forEach(function (p) { if (!u.searchParams.has(p[0])) u.searchParams.set(p[0], p[1]); });
        a.href = u.toString();
      } catch (e) { /* залишаємо посилання як є */ }
    });
  }

  /* 2. Аналітика: вантажимо лише якщо ID заповнені в index.html */
  if (cfg.GA4_ID) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.GA4_ID);
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', cfg.GA4_ID);
  }
  if (cfg.META_PIXEL_ID) {
    /* стандартний код Meta Pixel */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', cfg.META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  function track(kind, label) {
    try {
      if (kind === 'lead') {
        if (window.fbq) window.fbq('track', 'Lead', { content_name: label });
        if (window.gtag) window.gtag('event', 'generate_lead', { method: 'quiz', button: label });
      } else {
        if (window.fbq) window.fbq('track', 'Contact', { channel: label });
        if (window.gtag) window.gtag('event', 'contact', { method: label });
      }
    } catch (e) { /* аналітика не повинна ламати сторінку */ }
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    if (a.classList.contains('js-quiz')) track('lead', (a.textContent || '').trim().replace(/\s+→$/, ''));
    else if (a.classList.contains('js-track')) track('contact', a.getAttribute('data-channel'));
  });

  /* 3. Копіювання телефону */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () {
        var old = btn.textContent; btn.textContent = 'Скопійовано';
        setTimeout(function () { btn.textContent = old; }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
      function fallback() {
        var t = document.createElement('textarea');
        t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* ігноруємо */ }
        document.body.removeChild(t);
      }
      track('contact', 'phone_copy');
    });
  });

  /* 3б. Крапки під стрічкою карток-сторіз на телефоні */
  document.querySelectorAll('[data-stories]').forEach(function (list) {
    var dots = list.parentElement.querySelector('.st-dots');
    if (!dots) return;
    var cards = list.children;
    for (var i = 0; i < cards.length; i++) dots.appendChild(document.createElement('i'));
    var mark = function () {
      var w = cards[0] ? cards[0].getBoundingClientRect().width + 12 : 1;
      var idx = Math.min(cards.length - 1, Math.round(list.scrollLeft / w));
      for (var j = 0; j < dots.children.length; j++) dots.children[j].classList.toggle('on', j === idx);
    };
    list.addEventListener('scroll', function () { window.requestAnimationFrame(mark); }, { passive: true });
    mark();
  });

  /* 3б-2. Карусель «Кімнати шале»: стрілки гортають на одну картку, на краях вимикаються */
  document.querySelectorAll('[data-rail]').forEach(function (rail) {
    var sec = rail.closest('section');
    var prev = sec && sec.querySelector('[data-rail-prev]');
    var next = sec && sec.querySelector('[data-rail-next]');
    if (!prev || !next) return;
    var step = function () {
      var c = rail.firstElementChild;
      return c ? c.getBoundingClientRect().width + (parseFloat(getComputedStyle(rail).columnGap) || 12) : 300;
    };
    var update = function () {
      prev.disabled = rail.scrollLeft < 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
      rail.classList.toggle('at-start', prev.disabled);
      rail.classList.toggle('at-end', next.disabled);
    };
    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: 'smooth' }); });
    rail.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* 3в. Програма по днях: лінія «заповнюється» під час прокрутки, поточний день підсвічується
         в таймлайні й у смужці-календарі, картки плавно зʼявляються */
  var tl = document.querySelector('[data-tl]');
  if (tl) {
    var days = [].slice.call(tl.querySelectorAll('.day'));
    var cells = {};
    document.querySelectorAll('.strip-days a').forEach(function (a) { cells[a.getAttribute('href').slice(1)] = a; });
    var strip = document.querySelector('.strip');
    var cur = -2, queued = false;
    var center = function (c) {
      if (!strip || strip.scrollWidth <= strip.clientWidth + 1) return;
      var x = c.offsetLeft - strip.clientWidth / 2 + c.offsetWidth / 2;
      try { strip.scrollTo({ left: x, behavior: 'smooth' }); } catch (e) { strip.scrollLeft = x; }
    };
    var tick = function () {
      queued = false;
      var mark = window.innerHeight * 0.55;
      var r = tl.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (mark - r.top) / r.height));
      tl.style.setProperty('--p', p.toFixed(4));
      var idx = -1;
      for (var i = 0; i < days.length; i++) {
        if (days[i].getBoundingClientRect().top < mark) idx = i; else break;
      }
      if (idx === cur) return;
      cur = idx;
      days.forEach(function (d, k) {
        d.classList.toggle('is-past', k < idx);
        d.classList.toggle('is-on', k === idx);
        var c = cells[d.id];
        if (c) { c.classList.toggle('past', k < idx); c.classList.toggle('on', k === idx); }
      });
      if (idx >= 0 && cells[days[idx].id]) center(cells[days[idx].id]);
    };
    var ask = function () { if (!queued) { queued = true; window.requestAnimationFrame(tick); } };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    tick();

    if ('IntersectionObserver' in window) {
      tl.classList.add('tl-rv');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      days.forEach(function (d) {
        // те, що вже вище екрана (перехід за якорем, перезавантаження), показуємо одразу
        if (d.getBoundingClientRect().top < window.innerHeight) d.classList.add('in'); else io.observe(d);
      });
    }
  }

  /* 4. Нижня панель на телефоні: ховаємо на першому екрані й у фінальному блоці, щоб не дублювати кнопки */
  var bar = document.querySelector('.mbar');
  var hero = document.querySelector('.hero');
  var fin = document.querySelector('.final');
  if (bar && hero && fin && 'IntersectionObserver' in window) {
    var heroVisible = true, finVisible = false;
    var update = function () { bar.classList.toggle('is-hidden', heroVisible || finVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { rootMargin: '0px 0px -40% 0px' }).observe(hero);
    new IntersectionObserver(function (e) { finVisible = e[0].isIntersecting; update(); }).observe(fin);
    update();
  }
})();

/* Сніг, що падає, у синіх блоках (.js-snow). Легкий: малює лише коли блок видно на екрані.
   Якщо в системі ввімкнено «менше руху» — сніжинки просто стоять, без анімації. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  // заготовка «кристалика» — шестипроменева сніжинка
  function crystal(size) {
    var c = document.createElement('canvas'), s = Math.ceil(size * DPR) + 4;
    c.width = c.height = s;
    var g = c.getContext('2d'), r = (s - 4) / 2;
    g.translate(s / 2, s / 2);
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    g.lineWidth = Math.max(1, size * DPR / 9);
    for (var i = 0; i < 6; i++) {
      g.rotate(Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r);
      g.moveTo(0, -r * 0.55); g.lineTo(r * 0.28, -r * 0.8);
      g.moveTo(0, -r * 0.55); g.lineTo(-r * 0.28, -r * 0.8);
      g.stroke();
    }
    return c;
  }
  // м'яка «пухнаста» крапка
  function dot(size) {
    var c = document.createElement('canvas'), s = Math.ceil(size * DPR * 2) + 2;
    c.width = c.height = s;
    var g = c.getContext('2d'), grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    return c;
  }
  var SPRITES = { c: [crystal(9), crystal(13), crystal(18)], d: [dot(2), dot(3), dot(4.5)] };

  function Snow(section) {
    var cv = document.createElement('canvas');
    cv.className = 'snow'; cv.setAttribute('aria-hidden', 'true');
    section.insertBefore(cv, section.firstChild);
    var ctx = cv.getContext('2d'), W = 0, H = 0, flakes = [], running = false, last = 0, visible = false, raf = 0;

    function make(randomY) {
      var crystalFlake = Math.random() < 0.28, set = crystalFlake ? SPRITES.c : SPRITES.d;
      var k = Math.floor(Math.random() * set.length);
      return {
        img: set[k], x: Math.random() * W, y: randomY ? Math.random() * H : -20,
        vy: (crystalFlake ? 18 : 22) + Math.random() * 38 + k * 8,      // пікс/с
        sway: 10 + Math.random() * 22, phase: Math.random() * 6.28, freq: 0.4 + Math.random() * 0.9,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * (crystalFlake ? 0.9 : 0),
        a: crystalFlake ? 0.55 + Math.random() * 0.35 : 0.35 + Math.random() * 0.55, crystal: crystalFlake
      };
    }
    function resize() {
      var r = section.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var n = Math.round(Math.min(W < 600 ? 32 : 80, (W * Math.min(H, 1400)) / (W < 600 ? 11000 : 14000)));
      while (flakes.length < n) flakes.push(make(true));
      flakes.length = n;
      if (!running) draw(0);
    }
    function draw(dt) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        if (dt) {
          f.y += f.vy * dt; f.phase += f.freq * dt; f.rot += f.vr * dt;
          if (f.y > H + 20) { flakes[i] = f = make(false); }
        }
        var x = f.x + Math.sin(f.phase) * f.sway, w = f.img.width / DPR;
        ctx.globalAlpha = f.a;
        if (f.crystal) {
          ctx.save(); ctx.translate(x, f.y); ctx.rotate(f.rot);
          ctx.drawImage(f.img, -w / 2, -w / 2, w, w); ctx.restore();
        } else ctx.drawImage(f.img, x - w / 2, f.y - w / 2, w, w);
      }
      ctx.globalAlpha = 1;
    }
    function loop(t) {
      if (!running) return;
      // на телефоні — 30 кадрів/с: вдвічі менше роботи, на око різниці немає
      if (last && W < 600 && t - last < 30) { raf = requestAnimationFrame(loop); return; }
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0; last = t;
      draw(dt); raf = requestAnimationFrame(loop);
    }
    function sync() {
      var should = visible && !document.hidden && !reduce;
      if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(section); else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; sync(); }).observe(section);
    } else { visible = true; sync(); }
    document.addEventListener('visibilitychange', sync);
  }

  function init() { document.querySelectorAll('.js-snow').forEach(function (s) { new Snow(s); }); }
  // стартуємо після завантаження сторінки, щоб не заважати першому показу
  var later = function () {
    setTimeout(function () {
      if (window.requestIdleCallback) window.requestIdleCallback(init, { timeout: 1500 }); else init();
    }, 1200);
  };
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
})();

/* Меню в шапці: відкрити/закрити панель на вузьких екранах і підсвітити розділ, який зараз на екрані. */
(function () {
  'use strict';
  var header = document.querySelector('.header');
  var menu = document.getElementById('menu');
  var burger = document.querySelector('.burger');
  if (!header || !menu || !burger) return;
  function setOpen(open) {
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Меню');
  }
  burger.addEventListener('click', function () { setOpen(!header.classList.contains('menu-open')); });
  menu.addEventListener('click', function (ev) { if (ev.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && header.classList.contains('menu-open')) { setOpen(false); burger.focus(); } });
  document.addEventListener('click', function (ev) { if (header.classList.contains('menu-open') && !header.contains(ev.target)) setOpen(false); });

  // підсвітка поточного розділу
  if (!('IntersectionObserver' in window)) return;
  var links = [].slice.call(menu.querySelectorAll(':scope > a[href^="#"]'));
  var map = {};
  links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) map[s.id] = a; });
  var visible = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    var current = null;
    // беремо перший (найвищий) розділ, що перетинає смугу посередині екрана
    links.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (!current && visible[id]) current = id; });
    links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + current ? 'true' : 'false'); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
})();

/* Стрічка фото «Подивіться, як це було» (.reel): дублюємо список для безшовного кола й вмикаємо рух.
   Якщо «менше руху» — лишається звичайна стрічка, яку гортають пальцем. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.reel').forEach(function (reel) {
    if (reduce) return;
    var track = reel.querySelector('.reel-track');
    if (!track) return;
    [].slice.call(track.children).forEach(function (li) {
      var copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('img').forEach(function (i) { i.alt = ''; });
      track.appendChild(copy);
    });
    reel.classList.add('is-loop');
    // пауза дотиком (на телефоні немає наведення): торкнулись — стоїть, ще раз — їде далі
    reel.addEventListener('click', function () { reel.classList.toggle('is-paused'); });
  });
})();

/* М'яка поява блоків під час прокрутки: заголовки секцій, картки, фото.
   Лише для того, що ще нижче екрана (щоб нічого не блимало), і лише якщо рух дозволено.
   Після появи клас знімається — у елементів знову працюють їхні власні ефекти наведення. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  var SEL = ['.section .sec-head', '.safe .sec-head', '.trust .sec-head', '.ratio', '.safe-ph', '.s', '.first-time',
    '.route', '.extras h3', '.extras-grid li', '.days-cta', '.home-grid > *', '.f-tile', '.food-notes li', '.stats li', '.press',
    '.team-photo', '.team-cap', '.mentors-h', '.mentor', '.plan', '.plan-benefit', '.options', '.ig', '.faq-list details', '.final-grid > *'].join(',');
  var vh = window.innerHeight;
  var items = [].slice.call(document.querySelectorAll(SEL)).filter(function (el) {
    return !el.closest('.hero') && el.getBoundingClientRect().top > vh * 0.95;
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      setTimeout(function () { el.classList.remove('rv', 'in'); el.style.removeProperty('--rd'); }, 1400);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) {
    // невелика черговість для сусідніх карток в одному ряду
    var sibs = el.parentElement ? [].slice.call(el.parentElement.children).filter(function (c) { return c.matches(SEL); }) : [];
    var i = Math.max(0, sibs.indexOf(el));
    el.style.setProperty('--rd', (Math.min(i % 4, 3) * 0.08).toFixed(2) + 's');
    el.classList.add('rv');
    io.observe(el);
  });
})();

/* Блок «Церматт» ([data-trip]): поява з наближенням фото, лічильник висоти 0 → 4478,
   паралакс фото під час прокрутки, відблиск і легкий нахил за курсором (лише миша).
   Якщо в системі «менше руху» — усе одразу в кінцевому стані, без анімацій. */
(function () {
  'use strict';
  var card = document.querySelector('[data-trip]');
  if (!card) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { card.classList.add('in'); return; }

  var num = card.querySelector('[data-count]');
  var target = num ? +num.getAttribute('data-count') : 0;
  card.classList.add('is-armed');
  if (num) num.textContent = '0';

  function count() {
    if (!num) return;
    var t0 = 0, dur = 2000;
    (function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      num.textContent = String(Math.round(target * e));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  // поява: коли блок помітно заїхав на екран
  var shown = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    card.classList.add('in');
    setTimeout(count, 350);
    shown.disconnect();
  }, { threshold: 0.3 });
  shown.observe(card);

  // паралакс фото: --py від -1 (блок унизу екрана) до 1 (угорі)
  var visible = false, queued = false;
  function parallax() {
    queued = false;
    var r = card.getBoundingClientRect(), vh = window.innerHeight || 1;
    var p = ((vh / 2) - (r.top + r.height / 2)) / (vh / 2 + r.height / 2);
    card.style.setProperty('--py', Math.max(-1, Math.min(1, p)).toFixed(3));
  }
  function ask() { if (visible && !queued) { queued = true; requestAnimationFrame(parallax); } }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; ask(); }).observe(card);
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);

  // відблиск і нахил за курсором — тільки для миші
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    card.addEventListener('pointermove', function (ev) {
      var r = card.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      card.style.setProperty('--rx', ((x - 0.5) * 3).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((0.5 - y) * 3).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
})();

/* Зворотний відлік до виїзду (data-countdown у першому екрані). Після старту табору — ховається. */
(function () {
  var el = document.querySelector('[data-countdown]');
  if (!el) return;
  var n = el.querySelector('[data-countdown-n]');
  function plural(d) {
    var m10 = d % 10, m100 = d % 100;
    if (m10 === 1 && m100 !== 11) return 'день';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дні';
    return 'днів';
  }
  function update() {
    var ms = new Date(el.getAttribute('data-countdown')) - new Date();
    if (ms <= 0) { el.hidden = true; return; }
    var d = Math.ceil(ms / 86400000);
    n.textContent = d === 1 ? 'завтра!' : d + ' ' + plural(d);
    el.hidden = false;
  }
  update();
  setInterval(update, 3600000);
})();