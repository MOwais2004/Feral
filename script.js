/* =========================================================
   FERAL PICTURES
   Lenis smooth scroll + GSAP ScrollTrigger. Sections in page order.
   Rules that keep it smooth:
   - an intro tween and a scroll tween never touch the same property of the same element
   - the hero belt is pure maths: no DOM reads per frame, transforms only
   - film tiles show a poster and only load/play their video on hover
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mobile = () => innerWidth < 760;
  const RAD = Math.PI / 180;
  gsap.registerPlugin(ScrollTrigger);
  history.scrollRestoration = 'manual'; scrollTo(0, 0);   // the loader always opens onto the hero

  /* ---------- Smooth scroll ---------- */
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  const goTo = target => lenis.scrollTo(target, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });

  /* ---------- Splitting ---------- */
  const setRoll = (el, t) => {
    el.innerHTML = `<span class="sr-only">${t}</span>` +
      [...t].map((c, i) => `<span class="l" aria-hidden="true" style="--i:${i}" data-l="${c}">${c}</span>`).join('');
  };
  $$('[data-roll]').forEach(el => setRoll(el, el.textContent.trim()));
  $$('.sec-head > *').forEach(el => { el.innerHTML = `<span class="mask"><span>${el.innerHTML}</span></span>`; });
  const wrapWords = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(part);
          else { const s = document.createElement('span'); s.className = 'wd'; s.textContent = part; frag.append(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrapWords(n);
    });
  };
  $$('.lit').forEach(wrapWords);
  $$('.slats').forEach(s => { s.innerHTML = '<i></i>'.repeat(mobile() ? 6 : 12); });

  /* Hero belt: a twin of each card so the belt is always full */
  const belt = $('.hero__belt');
  $$('.wcard', belt).forEach(c => { const t = c.cloneNode(true); t.setAttribute('aria-hidden', 'true'); belt.append(t); });

  /* ---------- Plates ---------- */
  const TILT = 35, SX = .3;              // slab angle; Anton squeezed to 30% width
  const plate = (word, tag) => {
    const p = document.createElement('span');
    p.className = 'plate';
    const t = tag ? tag.split('|') : null;
    p.innerHTML = `<span class="plate__face">${t ? `<span class="plate__tag"><b>${t[0]}</b><small>${t.slice(1).join('<br>')}</small></span>` : ''}<span class="plate__ws"><span class="plate__w"><i>${word}</i></span></span></span>`;
    return p;
  };
  $$('[data-plates]').forEach(el => el.dataset.plates.split('|').forEach((w, i) => el.append(plate(w, i === 0 && el.dataset.tag))));
  $$('[data-words]').forEach(el => el.append(plate(el.dataset.words.split('|')[0], el.dataset.tag)));
  const wordW = w => $('i', w).offsetWidth * SX;
  // Each slab gets a lens of 1.8x its own width, so long and short words taper alike. Measure the tilted slab,
  // shift it so its tall edge sits on its layout edge (p._x), and pull the next slab in 1px past touching.
  function fitPlate(p) {
    const keep = gsap.getProperty(p, 'rotationY');
    gsap.set(p, { transformPerspective: p.offsetWidth * 1.8, transformOrigin: '50% 50%', rotationY: 0, x: 0 });
    const flat = p.getBoundingClientRect();
    gsap.set(p, { rotationY: TILT });
    const tilt = p.getBoundingClientRect();
    p._x = flat.left - tilt.left;
    gsap.set(p, { x: p._x, rotationY: keep });
    p.style.marginRight = (tilt.width - flat.width - 1) + 'px';
  }
  const sizeWord = ws => { ws.style.width = wordW($$('.plate__w', ws).pop()) + 'px'; };
  const sizePlates = () => { $$('.plate__ws').forEach(sizeWord); $$('.plate').forEach(fitPlate); };
  // Roll a slab to its next word: old word leaves up, new one rises, the slab resizes, then re-fits
  function roll(p, words, d = .7) {
    let i = 0;
    return () => {
      const ws = $('.plate__ws', p), old = $$('.plate__w', ws);
      i = (i + 1) % words.length;
      const nx = document.createElement('span'); nx.className = 'plate__w'; nx.innerHTML = `<i>${words[i]}</i>`;
      ws.append(nx);
      gsap.timeline({ onComplete: () => { old.forEach(o => o.remove()); $$('.plate', p.parentNode).forEach(fitPlate); } })
        .to(old, { yPercent: -110, duration: d, ease: 'expo.inOut', force3D: false }, 0)
        .fromTo(nx, { yPercent: 110 }, { yPercent: 0, duration: d, ease: 'expo.inOut', force3D: false, clearProps: 'transform' }, 0)  // 2D only: a 3D layer inside the rotated slab gets mis-clipped by Chrome
        .to(ws, { width: wordW(nx), duration: d, ease: 'expo.inOut' }, 0);
    };
  }
  // run fn every few seconds, but only while el is on screen
  const onScreen = new Set();
  const seen = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
  const loop = (el, fn, every, delay) => {
    seen.observe(el);
    gsap.delayedCall(delay, function tick() { if (onScreen.has(el) && !document.hidden) fn(); gsap.delayedCall(every, tick); });
  };

  /* ---------- Fit to width: every .fitline fills its container ---------- */
  function fitAll() {
    const ml = $('.menu__list');
    ml.style.removeProperty('--pf');
    sizePlates();
    if (!mobile()) {                       // menu row: scale the slabs so the row spans the screen
      const room = ml.parentNode.clientWidth - 2 * parseFloat(getComputedStyle(ml.parentNode).paddingLeft);
      ml.style.setProperty('--pf', Math.min(parseFloat(getComputedStyle($('.plates', ml)).fontSize) * room / ml.scrollWidth, innerHeight * .2) + 'px');
      $$('.plate__ws', ml).forEach(sizeWord); $$('.plate', ml).forEach(fitPlate);
    }
    $$('.fitline').forEach(line => {
      const el = $('.ml__in', line);
      el.style.fontSize = '100px';
      el.style.fontSize = (100 * line.clientWidth / (el.scrollWidth || 1)) + 'px';
    });
    measureBelt();
  }

  /* ---------- Videos ---------- */
  const load = v => { if (!v.getAttribute('src')) v.src = v.dataset.src; };
  // film tiles + hero cards: poster until hovered
  $$('.tile, .wcard').forEach(h => {
    const v = $('video', h); if (!v) return;
    h.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; load(v); v.play().catch(() => {}); });
    h.addEventListener('pointerleave', () => v.pause());
  });
  // manifesto clips are part of the type: they play whenever they're on screen
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { load(v); v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '20% 0%' });
  $$('.clip video').forEach(v => io.observe(v));

  /* ---------- Hero belt: the projector ----------
     The WE ARE FERAL slabs hold the left; film cards stand in a line to their right, tilted like the slabs.
     The belt doesn't crawl: like film through a projector it holds a frame, then pulls down exactly one card.
     During each pull (one eased progress value u, 0 -> 1):
       - the card at the wordmark folds edge-on into it, and the wordmark recoils as it lands
       - the card in the gate (slot K) turns back from its white info side while the next one turns open
       - gaps stretch like an accordion and the tilted cards lean a little further, then everything settles
     Every card's state is a pure function of its slot and u, so nothing can drift or fight.
     Projection: a card of width w turned by th under perspective P has its edges at
       a = -h cos(th) P / (P - h sin(th)),  b = h cos(th) P / (P + h sin(th)),  h = w/2  */
  const TC = 38, HOLD = 2.6, PULL = 1.35;
  const cards = $$('.wcard', belt).map((el, i) => ({ el, n: i % 4 + 1, flip: $('.wcard__flip', el), cap: $('.wcard__cap', el) }));
  let order = cards.slice(), G = null;
  const bp = { u: 0 };
  const ext = th => {
    const h = G.w / 2, c = Math.cos(th * RAD), s = Math.sin(th * RAD);
    const a = -h * c * G.P / (G.P - h * s), b = h * c * G.P / (G.P + h * s);
    return { l: Math.min(a, b), r: Math.max(a, b) };
  };
  function measureBelt() {
    const w = cards[0].el.offsetWidth, plates = $('.hero__plates');
    const g = parseFloat(getComputedStyle($('.hero')).getPropertyValue('--g')) || 24;
    const W = belt.clientWidth;
    G = { w, P: w * 1.6, g, W };
    const e = ext(TC); G.bw = e.r - e.l;
    G.L0 = mobile() ? 0 : plates.offsetLeft + plates.offsetWidth + g;
    G.K = mobile() ? 1 : 2;                                      // the gate: which slot shows its info side
    belt.style.setProperty('--cvw', G.bw + 'px');
  }
  const intro = { x: 0 };
  function place(c, s, lw, th, e, alpha) {
    const left = s + lw / 2 - (e.l + e.r) / 2 - G.w / 2 + intro.x;
    c.el.style.transform = `translate3d(${left.toFixed(2)}px,0,0)`;
    c.flip.style.transform = `rotateY(${th.toFixed(2)}deg)`;
    c.cap.style.transform = `translate3d(${(s + intro.x - left).toFixed(2)}px,0,0)`;
    c.cap.style.opacity = alpha;
    c.cap.style.clipPath = alpha < 1 ? `inset(0 ${(G.bw - lw).toFixed(1)}px 0 0)` : '';   // folding: caption narrows with the card
  }
  const smooth = t => t * t * (3 - 2 * t);
  function beltFrame() {
    const u = bp.u, pull = Math.sin(Math.PI * u);           // 0 at rest, 1 mid-pull
    const gap = G.g * (1 + .9 * pull), lean = 7 * pull;
    let s = G.L0;
    order.forEach((c, k) => {
      if (k === 0) {                                   // folding into the wordmark: visible width shrinks to nothing
        const f = 1 - u;
        const th = Math.acos(Math.cos(TC * RAD) * f) / RAD, e = ext(th);
        place(c, s, e.r - e.l, th, e, f);
        s += (e.r - e.l) + gap * f;
        return;
      }
      const o = smooth(Math.max(0, 1 - Math.abs(k - u - G.K)));   // 1 in the gate, easing across one slot either side
      const th = TC + lean * (1 - o) + (180 - TC) * o, lw = G.bw + (G.w - G.bw) * o;
      place(c, s, lw, th, ext(th), 1);
      s += lw + gap;
    });
  }
  // progress: gate card number + a hairline that fills while the frame holds
  const pNum = $('.hero__prog b'), pBar = $('.hero__prog s');
  const drawNum = () => {
    pNum.textContent = p2(order[G.K].n);
    gsap.fromTo(pNum, { yPercent: 100 }, { yPercent: 0, duration: .7, ease: 'expo.out' });
  };
  let beltOn = false;
  const heroLive = () => !document.hidden && lenis.scroll < innerHeight && !menuOpen && !dlg.open;
  function hold() {
    gsap.fromTo(pBar, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0 50%', duration: HOLD, ease: 'none' });
    gsap.delayedCall(HOLD, pullDown);
  }
  function pullDown() {
    if (!heroLive()) return gsap.delayedCall(.5, pullDown);   // wait offscreen, resume where it stopped
    gsap.to(pBar, { scaleX: 0, transformOrigin: '100% 50%', duration: .5, ease: 'power3.inOut' });
    gsap.to(bp, { u: 1, duration: PULL, ease: 'expo.inOut', onComplete() {
      bp.u = 0; order.push(order.shift());                       // u=1 and the next u=0 are the same picture
      drawNum(); hold();                                         // the wordmark never moves: it's the fixed point the films fold into
    } });
  }
  gsap.ticker.add(() => { if (beltOn && G && heroLive()) beltFrame(); });

  /* ---------- Loader -> hero ---------- */
  const loader = $('.loader'), lpEl = $('.loader__plate'), lp = $('.plate', lpEl), lslats = $$('i', $('.loader__slats'));
  const heroPlates = $$('.hero__plates .plate'), heroBits = $$('.hero__top > *, .hero__foot');
  const nav = $('.nav');
  const fonts = Promise.all([
    document.fonts.load('400 100px Anton'), document.fonts.load('900 100px "Inter Tight"'),
    document.fonts.load('500 100px "Inter Tight"'), document.fonts.load('italic 400 100px "Instrument Serif"')
  ]).catch(() => {});
  const img = src => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = src; });
  const ready = Promise.all([fonts, ...$$('.wcard video').slice(0, 4).map(v => img(v.poster)), new Promise(r => setTimeout(r, 1900))]);

  document.body.classList.add('is-loading');
  lenis.stop();
  fonts.then(() => {
    fitAll();
    gsap.set('.plate', { rotationY: TILT });
    gsap.set(heroPlates, { rotationY: 90, autoAlpha: 0 });
    gsap.set(heroBits, { autoAlpha: 0, y: 14 });
    gsap.set(belt, { autoAlpha: 0 });
    intro.x = innerWidth * .6;
    gsap.set(lp, { rotationY: 90 });
    gsap.set(lpEl, { visibility: 'visible' });
    const step = roll(lp, ['000', '024', '047', '073', '100'], .5);
    gsap.timeline()
      .to(lp, { rotationY: TILT, duration: 1.1, ease: 'expo.out' })
      .call(step, null, .5).call(step, null, 1.05).call(step, null, 1.6);
    return ready.then(() => new Promise(r => gsap.delayedCall(.15, () => { step(); gsap.delayedCall(.75, r); })));
  }).then(() => {
    build();
    gsap.timeline({ onComplete: () => { loader.classList.add('is-done'); document.body.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); } })
      .to(lp, { rotationY: -90, duration: .7, ease: 'expo.in' })
      .set(lpEl, { autoAlpha: 0 })
      .to($('.loader__foot'), { autoAlpha: 0, duration: .3 }, '<')
      .set(loader, { background: 'transparent' })
      .to(lslats, { rotationY: -90, transformPerspective: 900, transformOrigin: '0% 50%', duration: 1.1, ease: 'expo.inOut', stagger: .045 }, '-=.15')
      .to(heroPlates, { rotationY: TILT, autoAlpha: 1, duration: 1.4, ease: 'expo.out', stagger: .14 }, '-=.75')
      .add(() => { beltOn = true; drawNum(); }, '<')
      .to(belt, { autoAlpha: 1, duration: .6 }, '<')
      .to(intro, { x: 0, duration: 2, ease: 'expo.out' }, '<')
      .to(heroBits, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .06 }, '<.2')
      .add(hold, '-=.6');
  });

  /* ---------- Everything scroll-driven ---------- */
  function build() {
    /* Hero: the stage sinks a little slower than the page; the nav waits until the hero has gone */
    gsap.to('.hero__stage', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });
    ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: '80% top', onToggle: s => nav.classList.toggle('at-hero', s.isActive) });
    nav.classList.add('at-hero');

    /* Section heads: label, sentence, count rise out of their masks */
    $$('.sec-head').forEach(h => gsap.fromTo($$('.mask > span', h), { yPercent: 110 }, {
      yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: h, start: 'top 88%' }
    }));

    /* Scroll-lit statement: words fade up to full */
    $$('.lit').forEach(p => gsap.to($$('.wd', p), {
      opacity: 1, stagger: .1, duration: .3, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 55%', scrub: .6 }
    }));
    gsap.fromTo('.state__list', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'expo.inOut', scrollTrigger: { trigger: '.state__list', start: 'top 90%' } });

    /* Manifesto lines drift in opposite directions */
    $$('.mani .ml__in').forEach((el, i) => {
      const d = i % 2 ? -1 : 1;
      gsap.fromTo(el, { xPercent: -4 * d }, { xPercent: 4 * d, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    });

    /* Tiles: unveil from the bottom, poster settles from a zoom (the hover zoom uses `scale`, this uses transform) */
    $$('.tile').forEach(t => {
      const m = $('.tile__media', t), v = $('video', t), cap = $$('.tile__cap > *', t);
      gsap.timeline({ scrollTrigger: { trigger: t, start: 'top 90%' } })
        .fromTo(m, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' })
        .fromTo(v, { scale: 1.4 }, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' }, '<.2')
        .fromTo(cap, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .9, ease: 'expo.out', stagger: .08 }, '-=1.1');
    });
    $$('.mosaic .tile').forEach((t, i) => {
      if (i % 3 === 2) gsap.to($('.tile__media', t), { y: -50, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    });

    /* Directors: each clip's slab rolls through the director's disciplines, out of step with its neighbours */
    $$('.card__plate').forEach((p, i) => loop(p, roll($('.plate', p), p.dataset.words.split('|')), 2.6, 1 + i * .45));

    /* Contact: the last slab rolls (Story? / Script? / Idea? / Brand?); contact + footer slabs turn in */
    const cpw = $('.cta__plates'), cp = $$('.plate', cpw);
    loop(cpw, roll(cp[cp.length - 1], cpw.dataset.wordsLast.split('|')), 2.2, 2);
    gsap.fromTo(cp, { rotationY: 90, autoAlpha: 0 }, { rotationY: TILT, autoAlpha: 1, duration: 1.3, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: cpw, start: 'top 85%' } });
    gsap.fromTo('.foot__mark .plate', { rotationY: 90, autoAlpha: 0 }, { rotationY: TILT, autoAlpha: 1, duration: 1.4, ease: 'expo.out', stagger: .14, scrollTrigger: { trigger: '.foot__mark', start: 'top 92%' } });
    gsap.fromTo('.cta__grid', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'expo.inOut', scrollTrigger: { trigger: '.cta__grid', start: 'top 92%' } });
  }

  let rz, lastW = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (Math.abs(innerWidth - lastW) < 2) return; lastW = innerWidth; fitAll(); ScrollTrigger.refresh(); }, 180);
  });

  /* ---------- Hero countdown: to the next shoot (rolls forward a week once it passes) ---------- */
  const p2 = n => String(n).padStart(2, '0');
  let shoot = new Date('2026-10-12T07:00:00-07:00').getTime();
  const units = { d: 864e5, h: 36e5, m: 6e4, s: 1e3 }, cells = $$('.hero__count b');
  function tick() {
    while (shoot < Date.now()) shoot += 7 * 864e5;
    let left = shoot - Date.now();
    cells.forEach(c => { const u = units[c.dataset.u]; const v = Math.floor(left / u); left -= v * u; c.textContent = p2(v); });
  }
  tick(); setInterval(tick, 1000);

  /* ---------- Nav: logo slab spins on hover; Menu slab rolls to Close ---------- */
  const logo = $$('.nav__logo .plate');
  $('.nav__logo').addEventListener('pointerenter', () => { if (!gsap.isTweening(logo[0])) gsap.to(logo, { rotationY: '-=360', duration: 1.2, ease: 'expo.inOut', stagger: .08 }); });

  /* ---------- Menu ----------
     Open: blinds fold shut from the right, then the link slabs turn in. Close: slabs turn away, blinds fold open.
     Two separate timelines (not one reversed), and hover tweens never run while either is playing,
     so nothing fights over a slab's rotation. */
  const menu = $('.menu'), mBtn = $('.nav__menu'), mItems = $$('.menu__list a'), mPlates = $$('.menu__list .plate');
  const mSlats = $$('.menu__slats i'), mBits = $$('.menu__foot, .menu__head');
  const mRoll = roll($('.plate', mBtn), ['Menu', 'Close'], .6);
  let menuOpen = false, menuBusy = false, mAnim = null;
  gsap.set(mSlats, { transformPerspective: 900, transformOrigin: '100% 50%', rotationY: 90 });
  gsap.set(mBits, { autoAlpha: 0 });
  function toggleMenu(open = !menuOpen) {
    if (open === menuOpen) return;
    menuOpen = open;
    menu.setAttribute('aria-hidden', !open);
    mBtn.setAttribute('aria-expanded', open);
    mBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('menu-open', open);
    mRoll();
    if (mAnim) mAnim.kill();
    gsap.killTweensOf([...mPlates, ...mSlats, ...mBits]);
    menuBusy = true;
    const done = () => { menuBusy = false; };
    if (open) {
      lenis.stop();
      mAnim = gsap.timeline({ onComplete: done })
        .set(menu, { visibility: 'visible', backgroundColor: 'transparent' })
        .set(mPlates, { rotationY: 90, x: i => mPlates[i]._x, scale: 1, autoAlpha: 0 })
        .to(mSlats, { rotationY: 0, duration: .75, ease: 'expo.inOut', stagger: .03 })
        .set(menu, { backgroundColor: '#000' })             // shut blinds can leave hairline seams; cover them
        .to(mPlates, { rotationY: TILT, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: .06 }, '-=.3')
        .to(mBits, { autoAlpha: 1, duration: .4 }, '<.2');
    } else {
      lenis.start();
      mAnim = gsap.timeline({ onComplete: () => { gsap.set(menu, { visibility: 'hidden' }); gsap.set(mSlats, { rotationY: 90 }); done(); } })
        .to(mBits, { autoAlpha: 0, duration: .2 }, 0)
        .to(mPlates, { rotationY: 90, autoAlpha: 0, x: i => mPlates[i]._x, scale: 1, duration: .4, ease: 'power3.in', stagger: .035 }, 0)
        .set(menu, { backgroundColor: 'transparent' })
        .to(mSlats, { rotationY: -90, duration: .7, ease: 'expo.inOut', stagger: { each: .03, from: 'end' } });
    }
  }
  mBtn.addEventListener('click', () => toggleMenu());
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });
  mItems.forEach((a, i) => {
    const p = mPlates[i];
    a.addEventListener('pointerenter', () => { if (menuOpen && !menuBusy) gsap.to(p, { rotationY: 0, x: 0, scale: 1.12, duration: .8, ease: 'expo.out', overwrite: true }); });
    a.addEventListener('pointerleave', () => { if (menuOpen && !menuBusy) gsap.to(p, { rotationY: TILT, x: p._x, scale: 1, duration: .8, ease: 'expo.out', overwrite: true }); });
  });

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault();
    const go = () => goTo(id === '#top' ? 0 : el);
    if (menuOpen) { toggleMenu(false); setTimeout(go, 450); } else go();
  }));

  /* ---------- Cursor: grey dot; over a film it turns into a small slab that leans with the mouse ---------- */
  const cur = $('.cursor'), cpEl = $('.cursor__plate'), cpl = $('.plate', cpEl), cWord = () => $('.plate__w i', cpl);
  const qx = gsap.quickTo(cur, 'x', { duration: .4, ease: 'expo.out' }), qy = gsap.quickTo(cur, 'y', { duration: .4, ease: 'expo.out' });
  let px = -100, py = -100, lastX = 0, on = false, lean = 0, rot = TILT;
  function setCursor(label) {
    if (label && cWord().textContent !== label) { cWord().textContent = label; sizeWord($('.plate__ws', cpl)); fitPlate(cpl); }
    if (!!label === on) return;
    on = !!label;
    cur.classList.toggle('is-on', on);
    gsap.killTweensOf(cpEl);
    if (on) gsap.fromTo(cpEl, { visibility: 'visible', scale: .4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .5, ease: 'expo.out' });
    else gsap.to(cpEl, { scale: .4, autoAlpha: 0, duration: .25, ease: 'power2.in' });
  }
  function hit() {
    const el = document.elementFromPoint(px, py);
    const t = el && el.closest('[data-cursor]');
    setCursor(t && !menuOpen && !dlg.open ? t.dataset.cursor : '');
  }
  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY; qx(px); qy(py);
    lean = gsap.utils.clamp(-55, 55, lean + (px - lastX) * 1.6);    // leans into the movement
    lastX = px;
    cur.classList.remove('is-hidden'); hit();
  });
  document.addEventListener('pointerleave', () => { cur.classList.add('is-hidden'); setCursor(''); });
  let hitT = 0;
  lenis.on('scroll', () => { const n = performance.now(); if (n - hitT > 120) { hitT = n; hit(); } });
  gsap.ticker.add(() => {                                // ...and settles back to the slab angle when the mouse stops
    lean *= .86;
    if (!on) return;
    rot += (TILT + lean - rot) * .18;
    gsap.set(cpl, { rotationY: rot });
  });

  /* ---------- Player ---------- */
  const dlg = $('.player'), pv = $('.player__video'), prog = $('.player__prog'), ptc = $('.player__tc'), tog = $('.player__toggle'), snd = $('.player__sound');
  // The showreel carries its own music; every other clip is silent, so the popup plays the same theme alongside it.
  const pa = $('.player__audio');
  let theme = false;
  const voice = () => theme ? pa : pv;                   // whichever element carries the sound
  const drawSound = () => setRoll(snd, voice().muted ? 'Sound on' : 'Sound off');
  function openPlayer(src, title, sub) {
    $('.player__t').textContent = title || '';
    $('.player__s').textContent = sub || '';
    theme = !/reel\.mp4$/.test(src);
    pv.src = src; pv.loop = true; pv.muted = theme;
    pa.muted = false; pa.currentTime = 0;
    dlg.showModal();
    setCursor('');
    lenis.stop();
    const v = voice();
    if (theme) pv.play().catch(() => {});
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }).finally(drawSound);
    drawSound();
  }
  $$('[data-play]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openPlayer(el.dataset.play, el.dataset.title, el.dataset.sub); }));
  $('.player__close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { pv.pause(); pa.pause(); pv.removeAttribute('src'); pv.load(); if (!menuOpen) lenis.start(); });
  const toggle = () => {
    if (pv.paused) { pv.play().catch(() => {}); if (theme) pa.play().catch(() => {}); }
    else { pv.pause(); pa.pause(); }
  };
  tog.addEventListener('click', toggle);
  pv.addEventListener('click', toggle);
  snd.addEventListener('click', () => { const v = voice(); v.muted = !v.muted; if (theme && !pv.paused) pa.play().catch(() => {}); drawSound(); });
  pv.addEventListener('play', () => tog.setAttribute('aria-label', 'Pause'));
  pv.addEventListener('pause', () => tog.setAttribute('aria-label', 'Play'));
  gsap.ticker.add(() => {
    if (!dlg.open || !pv.duration) return;
    prog.style.strokeDashoffset = 1 - pv.currentTime / pv.duration;
    ptc.textContent = `${p2(Math.floor(pv.currentTime / 60))}:${p2(Math.floor(pv.currentTime % 60))}`;
  });
})();
