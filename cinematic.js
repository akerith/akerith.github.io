(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const body = document.body;
  const button = document.querySelector('.motion-toggle');
  const label = button.querySelector('.motion-label');
  const icon = button.querySelector('.motion-icon');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  let enabled = !reduced.matches;
  let frame = 0;
  let visible = true;

  const update = () => {
    button.hidden = reduced.matches;
    body.classList.toggle('motion-paused', !enabled);
    button.setAttribute('aria-pressed', String(enabled));
    label.textContent = enabled ? 'Pausa animazioni' : 'Attiva animazioni';
    icon.textContent = enabled ? 'Ⅱ' : '▷';
    if (!enabled) {
      hero.style.removeProperty('--px');
      hero.style.removeProperty('--py');
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
