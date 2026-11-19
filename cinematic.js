(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const root = document.documentElement;
  const body = document.body;
  const button = document.querySelector('.motion-toggle');
  const label = button.querySelector('.motion-label');
  const icon = button.querySelector('.motion-icon');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const wide = matchMedia('(min-width: 701px)');
  let enabled = !reduced.matches;
  let frame = 0;
  let scrollFrame = 0;
  let visible = true;

  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // Elementi che entrano in scena quando arrivano sullo schermo (anche quelli dei giochi futuri).
  const revealGroups = [
    '.feature-kicker', '.feature-text', '.feature .game-links',
    '.promise-list > *', '.studio h2', '.studio-lead', '.studio-links', '.studio-facts > div',
    '.contact h2', '.contact-grid > div', '.footer-top > *',
  ];
  const watched = new Set();
  revealGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const index = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.classList.add('reveal');
      el.style.setProperty('--d', `${Math.min(index, 5) * 0.12}s`);
      watched.add(el);
    });
  });
  document.querySelectorAll('.threshold, .feature, .feature-shots').forEach((el) => watched.add(el));

  // Il titolo del gioco, lettera per lettera.
  document.querySelectorAll('.feature-title').forEach((title) => {
    const node = title.firstChild;
    if (!node || node.nodeType !== 3) return;
    const text = node.textContent;
    const sub = title.querySelector('span');
    title.setAttribute('aria-label', sub ? `${text.trim()}: ${sub.textContent}` : text.trim());
    const word = document.createElement('span');
    word.className = 'title-word';
    word.setAttribute('aria-hidden', 'true');
    [...text].forEach((c, i) => {
      const ch = document.createElement('span');
      ch.className = 'ch';
      ch.textContent = c;
      ch.style.setProperty('--i', i);
      word.appendChild(ch);
    });
    title.replaceChild(word, node);
    if (sub) sub.setAttribute('aria-hidden', 'true');
  });

  // Le schermate: indice per il ritardo e l'inclinazione di partenza.
  document.querySelectorAll('.feature-shots').forEach((row) => {
    [...row.children].forEach((img, k) => img.style.setProperty('--k', k));
  });

  // La promessa, parola per parola.
  const promise = document.querySelector('.promise h2');
  if (promise) {
    const words = promise.textContent.trim().split(/\s+/);
    promise.textContent = '';
    words.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = w;
      span.style.setProperty('--i', i);
      promise.appendChild(span);
      if (i < words.length - 1) promise.appendChild(document.createTextNode(' '));
    });
    promise.style.setProperty('--n', words.length);
  }

  // Particelle di luce nei giochi.
  document.querySelectorAll('.feature').forEach((feature) => {
    const motes = document.createElement('div');
    motes.className = 'feature-motes';
    motes.setAttribute('aria-hidden', 'true');
    const count = wide.matches ? 26 : 12;
    for (let i = 0; i < count; i++) {
      const m = document.createElement('span');
      m.className = 'mote';
      m.style.setProperty('--left', `${30 + ((i * 23) % 68)}%`);
      m.style.setProperty('--size', `${i % 5 === 0 ? 3 : i % 2 ? 2 : 1}px`);
      m.style.setProperty('--duration', `${9 + (i * 5) % 11}s`);
      m.style.setProperty('--delay', `${-i * 1.3}s`);
      m.style.setProperty('--drift', `${(i % 2 ? 1 : -1) * (20 + (i * 7) % 60)}px`);
      motes.appendChild(m);
    }
    feature.insertBefore(motes, feature.children[1]);
  });

  // I numeri dello studio contano fino al valore vero.
  const countUp = (dd) => {
    const target = parseInt(dd.textContent, 10);
    if (!Number.isFinite(target) || String(target) !== dd.textContent.trim()) return;
    const from = target >= 1000 ? target - 26 : 0;
    const start = performance.now();
    const holder = dd.parentElement;
    holder.classList.add('counting');
    const step = (now) => {
      const t = clamp((now - start) / 1500);
      const eased = 1 - Math.pow(1 - t, 3);
      dd.textContent = String(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(step);
      else holder.classList.remove('counting');
    };
    requestAnimationFrame(step);
  };

  const showAll = () => watched.forEach((el) => el.classList.add('is-in'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-in');
        io.unobserve(el);
        if (enabled && el.matches('.studio-facts > div')) countUp(el.querySelector('dd'));
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    watched.forEach((el) => io.observe(el));
  } else {
    showAll();
  }

  // Effetti legati allo scorrimento: un solo calcolo per fotogramma, solo se qualcosa si è mosso.
  const features = [...document.querySelectorAll('.feature')];
  const onScroll = () => {
    scrollFrame = 0;
    if (!enabled) return;
    const vh = innerHeight;
    const heroH = hero.offsetHeight;
    if (scrollY < heroH * 1.2) hero.style.setProperty('--hs', (clamp(scrollY / heroH) * 0.9).toFixed(3));
    features.forEach((f) => {
      const r = f.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const fp = clamp((vh - r.top) / (vh + r.height));
      f.style.setProperty('--fp', fp.toFixed(3));
      const shots = f.querySelector('.feature-shots');
      if (shots && wide.matches) shots.style.setProperty('--sp', `${((0.5 - fp) * 60).toFixed(1)}px`);
    });
    if (promise) {
      const r = promise.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) promise.style.setProperty('--pp', clamp((vh * 0.92 - r.top) / (vh * 0.5)).toFixed(3));
    }
  };
  const queueScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(onScroll); };
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll, { passive: true });

  // Col mouse la fila delle schermate si inclina verso il puntatore.
  document.querySelectorAll('.feature-shots').forEach((row) => {
    let tilt = 0;
    row.addEventListener('pointermove', (event) => {
      if (!enabled || !finePointer.matches || !wide.matches || tilt) return;
      const x = event.clientX;
      const y = event.clientY;
      tilt = requestAnimationFrame(() => {
        const r = row.getBoundingClientRect();
        row.style.setProperty('--ty', `${(((x - r.left) / r.width) - 0.5) * 8}deg`);
        row.style.setProperty('--tx', `${(0.5 - ((y - r.top) / r.height)) * 6}deg`);
        tilt = 0;
      });
    }, { passive: true });
    row.addEventListener('pointerleave', () => {
      row.style.removeProperty('--tx');
      row.style.removeProperty('--ty');
    });
  });

  const update = () => {
    button.hidden = reduced.matches;
    const on = enabled && !reduced.matches;
    if (!on) showAll();
    root.classList.toggle('motion-on', on);
    body.classList.toggle('motion-paused', !enabled);
    button.setAttribute('aria-pressed', String(enabled));
    label.textContent = enabled ? button.dataset.pause : button.dataset.play;
    icon.textContent = enabled ? 'Ⅱ' : '▷';
    if (!enabled) {
      hero.style.removeProperty('--px');
      hero.style.removeProperty('--py');
      hero.style.removeProperty('--hs');
    } else {
      queueScroll();
    }
  };
  button.hidden = false;
  button.addEventListener('click', () => { enabled = !enabled; update(); });
  reduced.addEventListener('change', () => { enabled = !reduced.matches; update(); });

  const particles = document.querySelector('.embers');
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 22; i++) {
    const particle = document.createElement('span');
    particle.className = 'ember';
    particle.style.setProperty('--left', `${46 + ((i * 17) % 49)}%`);
    particle.style.setProperty('--size', `${i % 4 === 0 ? 2 : 1}px`);
    particle.style.setProperty('--duration', `${10 + (i * 7) % 13}s`);
    particle.style.setProperty('--delay', `${-i * 1.7}s`);
    particle.style.setProperty('--drift', `${(i % 2 ? 1 : -1) * (12 + i * 2)}px`);
    fragment.appendChild(particle);
  }
  particles.appendChild(fragment);

  hero.addEventListener('pointermove', (event) => {
    if (!enabled || reduced.matches || !finePointer.matches || !visible || frame) return;
    const x = event.clientX;
    const y = event.clientY;
    frame = requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty('--px', `${(x / rect.width - .5) * -10}px`);
      hero.style.setProperty('--py', `${((y - rect.top) / rect.height - .5) * -6}px`);
      frame = 0;
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    hero.style.removeProperty('--px');
    hero.style.removeProperty('--py');
  });
  document.addEventListener('visibilitychange', () => {
    body.classList.toggle('tab-hidden', document.hidden);
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      body.classList.toggle('hero-away', !visible);
    });
    observer.observe(hero);
  }
  update();
})();
