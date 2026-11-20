(() => {
  'use strict';
  // Le pagine senza apertura (quella di un gioco, per esempio) hanno lo stesso movimento: al posto dell'apertura
  // e del pulsante "Ferma le animazioni" mancanti si usano elementi vuoti fuori dalla pagina, così il resto non cambia.
  const hero = document.querySelector('.hero') || document.createElement('div');
  if (!document.querySelector('.hero') && !document.querySelector('.feature, .lightplay')) return;
  const root = document.documentElement;
  const body = document.body;
  const spare = document.createElement('button');
  spare.innerHTML = '<span class="motion-icon"></span><span class="motion-label"></span>';
  const button = document.querySelector('.motion-toggle') || spare;
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
    '.play-copy > *', '.feature-play .lightplay',
    '.game .inside h2', '.game .feature-list li', '.game .shots img', '.game .prose > *',
  ];
  const watched = new Set();
  revealGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const index = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.classList.add('reveal');
      el.style.setProperty('--d', `${Math.min(index, 4) * 0.065}s`);
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
  // Ogni volta che il numero torna sullo schermo riparte il conteggio.
  document.querySelectorAll('.studio-facts dd').forEach((dd) => {
    const value = dd.textContent.trim();
    if (/^\d+$/.test(value)) dd.dataset.target = value;
  });
  const countUp = (dd) => {
    if (!dd || !dd.dataset.target) return;
    const target = parseInt(dd.dataset.target, 10);
    const from = target >= 1000 ? target - 26 : 0;
    const start = performance.now();
    const run = (dd._run || 0) + 1;
    dd._run = run;
    const holder = dd.parentElement;
    holder.classList.add('counting');
    const step = (now) => {
      if (dd._run !== run) return;
      if (!enabled) { dd.textContent = dd.dataset.target; holder.classList.remove('counting'); return; }
      const t = clamp((now - start) / 1500);
      const eased = 1 - Math.pow(1 - t, 3);
      dd.textContent = String(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(step);
      else holder.classList.remove('counting');
    };
    requestAnimationFrame(step);
  };

  const showAll = () => watched.forEach((el) => el.classList.add('is-in'));

  // Gli elementi entrano in scena ogni volta che arrivano sullo schermo, scendendo e risalendo:
  // quando escono del tutto dallo schermo tornano al punto di partenza, pronti a rientrare.
  if ('IntersectionObserver' in window) {
    const enter = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.intersectionRatio < 0.12 || el.classList.contains('is-in')) return;
        el.classList.add('is-in');
        if (enabled && el.matches('.studio-facts > div')) countUp(el.querySelector('dd'));
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    // Si azzera solo quando è uscito del tutto dallo schermo, così chi guarda non lo vede sparire.
    const leave = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || !enabled) return;
        const el = entry.target;
        el.classList.toggle('from-above', entry.boundingClientRect.top < 0);
        el.classList.remove('is-in');
      });
    }, { threshold: 0 });
    watched.forEach((el) => { enter.observe(el); leave.observe(el); });
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

  // Il video del gioco: solo quello adatto allo schermo (telefono finto al computer, sfondo su telefono e tablet),
  // scaricato solo quando sta per arrivare sullo schermo, fermo fuori dallo schermo, mai a chi risparmia dati.
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const clips = [...document.querySelectorAll('video[data-src]')].map((v) => ({ v, mq: matchMedia(v.dataset.media || 'all'), near: false }));
  const syncClips = () => clips.forEach((c) => {
    const { v } = c;
    const active = c.mq.matches && !saveData;
    const scene = v.closest('.feature-scene');
    if (scene) scene.classList.toggle('has-video', active);
    if (active && c.near && !c.loopHold) {

      if (enabled && !reduced.matches && !document.hidden) {
        if (!v.getAttribute('src')) { v.muted = true; v.src = v.canPlayType('video/mp4; codecs="avc1.42E01E"') ? v.dataset.src : v.dataset.webm; }
        const playing = v.play();
        if (playing) playing.catch(() => { if (v.readyState < 2) v.classList.add('poster-only'); });
      } else if (!v.paused) v.pause();
    } else if (!v.paused) v.pause();
  });
  clips.forEach((c) => {
    const { v, mq } = c;
    mq.addEventListener('change', syncClips);
    if (v.hasAttribute('data-loop-pause')) {
      const cover = document.createElement('span');
      cover.className = 'loop-cover';
      v.after(cover);
      v.loop = false;
      let repeat = false;
      let frame = 0;
      const shadeFrame = () => {
        frame = 0;
        if (v.paused || c.loopHold) return;
        const fadeOut = 1 - (v.duration - v.currentTime) / 1.2;
        const fadeIn = repeat ? 1 - v.currentTime / 1.05 : 0;
        const x = Math.max(0, Math.min(1, Math.max(fadeOut, fadeIn)));
        const opacity = String(x * x * (3 - 2 * x));
        if (cover.style.opacity !== opacity) cover.style.opacity = opacity;
        frame = requestAnimationFrame(shadeFrame);
      };
      v.addEventListener('playing', () => {
        if (!frame) shadeFrame();
      });
      v.addEventListener('pause', () => {
        cancelAnimationFrame(frame);
        frame = 0;
      });
      v.addEventListener('ended', () => {
        repeat = true;
        c.loopHold = true;
        cover.style.opacity = '1';
        v.currentTime = 0;
        setTimeout(() => {
          c.loopHold = false;
          syncClips();
        }, 2000);
      });
    }
    v.addEventListener('playing', () => v.classList.remove('poster-only'));
    v.addEventListener('error', () => {
      if (!v.src.endsWith('.webm') && v.canPlayType('video/webm')) {
        v.src = v.dataset.webm;
        syncClips();
      } else {
        v.classList.add('poster-only');
      }
    });
  });
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { clips.find((c) => c.v === entry.target).near = entry.isIntersecting; });
      syncClips();
    }, { rootMargin: '400px 0px' });
    clips.forEach((c) => near.observe(c.v));
  } else {
    clips.forEach((c) => { c.near = true; });
  }
  document.addEventListener('visibilitychange', syncClips);

  // Col mouse, una luce calda segue il puntatore nelle zone scure (solo computer).
  if (finePointer.matches && matchMedia('(hover: hover)').matches) {
    const glow = document.createElement('div');
    glow.className = 'pointer-light';
    glow.setAttribute('aria-hidden', 'true');
    body.appendChild(glow);
    let gx = 0;
    let gy = 0;
    let glowFrame = 0;
    addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !enabled) return;
      gx = event.clientX;
      gy = event.clientY;
      if (glowFrame) return;
      glowFrame = requestAnimationFrame(() => {
        glowFrame = 0;
        glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
        glow.classList.add('on');
      });
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }

  const update = () => {
    button.hidden = reduced.matches;
    syncClips();
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
  if (particles) particles.appendChild(fragment);

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

// Il mini rompicapo della pagina iniziale: le regole della luce sono quelle di Atlantide (Core/BeamTracer.cs).
// Un cristallo collega due lati vicini (orientamento o: il lato o e il lato o+1, con N=0 E=1 S=2 O=3);
// la luce che entra da uno dei due esce dall'altro, da un altro lato si ferma. Un tocco lo gira di un quarto in senso orario.
(() => {
  'use strict';
  const board = document.querySelector('.lightplay');
  if (!board) return;
  const panel = board.closest('.feature-play');
  const cols = Number(board.dataset.cols);
  const rows = Number(board.dataset.rows);
  const motion = () => document.documentElement.classList.contains('motion-on');
  const buzz = (pattern) => { if (motion() && navigator.vibrate) navigator.vibrate(pattern); };
  const place = (el, cell) => {
    const [x, y] = cell.split(',').map(Number);
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
  };
  board.style.setProperty('--cols', cols);
  board.style.setProperty('--rows', rows);

  const en = document.documentElement.lang.startsWith('en');
  const stages = [
    {
      name: ['Il gomito', 'The elbow'], source: [0,3,'E'], door: [5,1],
      walls: [[3,3],[1,1]], gems: [[2,3,2],[2,1,0]],
      copy: ['Tocca i cristalli per girarli. Come fai a portare il raggio sulla fila della porta?', 'Tap the crystals to rotate them. How can you lift the beam onto the same row as the door?']
    },
    {
      name: ['Il giro largo', 'The long way round'], source: [0,2,'E'], door: [4,0],
      walls: [[3,2],[2,1],[0,4]], gems: [[2,2,0],[2,4,3],[4,4,2]],
      copy: ['La via più corta è chiusa. Guarda lo spazio sotto il muro prima di girare i cristalli.', 'The shortcut is blocked. Look below the wall before turning the crystals.']
    },
    {
      name: ['A ritroso', 'Trace it back'], source: [5,0,'W'], door: [2,1],
      walls: [[2,2],[3,2],[0,3]], gems: [[1,0,0],[1,3,2],[4,3,2],[4,1,0]],
      copy: ['Il raggio passa sopra la porta. Parti dalla serratura e cerca il percorso a ritroso.', 'The beam passes above the door. Start at the lock and trace a path backwards.']
    }
  ];
  let current = 0;
  const lang = en ? 1 : 0;
  const next = panel.querySelector('.lp-next');
  const reset = panel.querySelector('.lp-reset');
  const door = board.querySelector('.lp-door');
  const source = board.querySelector('.lp-source');
  const grid = new Map();
  let crystals = [];
  let sx, sy, sd;
  function loadStage(index, focus = false) {
    clearTimeout(pending);
    current = index;
    const stage = stages[index];
    [sx, sy, sd] = stage.source;
    won = false;
    moves = 0;
    movesOut.textContent = '0';
    status.textContent = '';
    next.hidden = true;
    if (cta) cta.hidden = true;
    panel.querySelector('.lp-chapter').textContent = (en ? 'Puzzle ' : 'Enigma ') + (index + 1) + ' / ' + stages.length;
    panel.querySelector('.play-title').textContent = stage.name[lang];
    panel.querySelector('.lp-instruction').textContent = stage.copy[lang];
    board.classList.remove('won');
    door.classList.remove('open');
    grid.clear();
    board.querySelectorAll('.lp-wall, .lp-crystal').forEach(el => el.remove());
    place(source, [sx,sy].join(','));
    source.style.setProperty('--source-angle', DIR[sd] * 90 + 'deg');
    place(door, stage.door.join(','));
    grid.set(stage.door.join(','), {type:'door'});
    stage.walls.forEach(pos => {
      const wall = document.createElement('span');
      wall.className = 'lp-wall';
      wall.setAttribute('aria-hidden', 'true');
      place(wall, pos.join(','));
      grid.set(pos.join(','), {type:'wall'});
      board.append(wall);
    });
    crystals = stage.gems.map(([x,y,start], i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'lp-crystal';
      el.setAttribute('aria-label', (en ? 'Rotate crystal ' : 'Ruota il cristallo ') + (i+1));
      el.innerHTML = '<span class="lp-gem" aria-hidden="true"></span>';
      place(el, [x,y].join(','));
      el.style.setProperty('--a', start * 90 + 'deg');
      const crystal = {type:'crystal', el, o:start, angle:start};
      el.addEventListener('click', () => rotate(crystal));
      grid.set([x,y].join(','), crystal);
      board.append(el);
      return crystal;
    });
    render(false);
    if (focus) crystals[0].el.focus({preventScroll:true});
  }

  const DIR = { N: 0, E: 1, S: 2, W: 3 };
  const STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const side = (x, y, s) => [[x + 0.5, y], [x + 1, y + 0.5], [x + 0.5, y + 1], [x, y + 0.5]][s];
  const beams = [...board.querySelectorAll('.lp-beam path')];
  const status = panel.querySelector('.lp-status');
  const movesOut = panel.querySelector('.lp-moves b');
  const cta = panel.querySelector('.lp-cta');
  let moves = 0;
  let won = false;
  let pending = 0;

  const trace = () => {
    let x = Number(sx);
    let y = Number(sy);
    let d = DIR[sd];
    let path = `M${x + 0.5} ${y + 0.5}`;
    const lit = new Set();
    let end = 'out';
    let blocked = null;
    for (let i = 0; i < cols * rows * 4; i++) {
      const nx = x + STEP[d][0];
      const ny = y + STEP[d][1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
        const p = side(x, y, d);
        path += ` L${p[0]} ${p[1]}`;
        break;
      }
      const cell = grid.get(`${nx},${ny}`);
      const entry = (d + 2) % 4;
      const ep = side(nx, ny, entry);
      if (cell && cell.type === 'wall') { path += ` L${ep[0]} ${ep[1]}`; end = 'wall'; break; }
      if (cell && cell.type === 'door') { path += ` L${nx + 0.5} ${ny + 0.5}`; end = 'door'; break; }
      if (cell && cell.type === 'crystal') {
        path += ` L${ep[0]} ${ep[1]}`;
        let exit = -1;
        if (entry === cell.o) exit = (cell.o + 1) % 4;
        else if (entry === (cell.o + 1) % 4) exit = cell.o;
        if (exit < 0 || lit.has(cell)) { end = 'blocked'; blocked = cell; break; }
        lit.add(cell);
        const xp = side(nx, ny, exit);
        const cx = entry === 1 || exit === 1 ? nx + 1 : nx;
        const cy = entry === 2 || exit === 2 ? ny + 1 : ny;
        const cross = (ep[0] - cx) * (xp[1] - cy) - (ep[1] - cy) * (xp[0] - cx);
        path += ` A0.5 0.5 0 0 ${cross > 0 ? 1 : 0} ${xp[0]} ${xp[1]}`;
        d = exit;
      }
      x = nx;
      y = ny;
    }
    return { path, lit, end, blocked };
  };

  const render = (animate) => {
    const r = trace();
    crystals.forEach((c) => c.el.classList.toggle('lit', r.lit.has(c)));
    beams.forEach((p) => p.setAttribute('d', r.path));
    if (animate && motion()) {
      const length = beams[1].getTotalLength();
      beams.slice(0, 2).forEach((p) => {
        p.style.transition = 'none';
        p.style.strokeDasharray = `${length} ${length}`;
        p.style.strokeDashoffset = `${length}`;
        p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${Math.min(0.7, 0.18 + length * 0.045).toFixed(2)}s cubic-bezier(.3,.7,.3,1)`;
        p.style.strokeDashoffset = '0';
      });
    }
    if (animate && r.blocked) {
      r.blocked.el.classList.remove('blocked');
      void r.blocked.el.offsetWidth;
      r.blocked.el.classList.add('blocked');
    }
    return r;
  };

  const win = () => {
    won = true;
    const hadFocus = board.contains(document.activeElement);
    board.classList.add('won');
    door.classList.add('open');
    crystals.forEach((c) => { c.el.disabled = true; });
    const last = current === stages.length - 1;
    status.textContent = last ? (en ? 'All three doors are open.' : 'Hai aperto tutte e tre le porte.') : (en ? 'The door is open.' : 'La porta è aperta.');
    next.hidden = false;
    next.textContent = last ? (en ? 'Play again' : 'Rigioca i tre enigmi') : (en ? 'Next puzzle' : 'Enigma successivo');
    if (cta) cta.hidden = !last;
    if (hadFocus) next.focus({preventScroll:true});
    buzz([18, 70, 34]);
  };

  const settle = () => {
    pending = 0;
    const r = render(true);
    if (r.end === 'door' && !won) win();
  };

  function rotate(crystal) {
    if (won) return;
    crystal.angle++;
    crystal.o = crystal.angle % 4;
    crystal.el.style.setProperty('--a', crystal.angle * 90 + 'deg');
    movesOut.textContent = String(++moves);
    buzz(8);
    clearTimeout(pending);
    pending = setTimeout(settle, motion() ? 160 : 0);
  }
  reset.addEventListener('click', () => loadStage(current, true));
  next.addEventListener('click', () => loadStage((current + 1) % stages.length, true));
  panel.hidden = false;
  loadStage(0);
})();
