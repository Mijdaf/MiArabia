/* ============================================================
   Mijdaf — ambient "welding sparks" background.
   A sparse, full-viewport 2D canvas that sits fixed behind every
   section on the page. Small bursts of hot orange sparks fire off
   at random points, arc briefly under gravity, cool from white-hot
   to orange to ember-red, and fade out. Deliberately restrained —
   a handful of particles alive at any moment, not a snowstorm —
   so it reads as texture, not noise, and never fights the content
   for attention.

   Pure canvas 2D (no WebGL/Three.js), so it's cheap enough to run
   for the whole scroll length of the site rather than being
   confined to a single section.
   ============================================================ */

(function () {
  const canvas = document.getElementById('sparksCanvas');
  if (!canvas || !canvas.getContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // respect the user's OS-level preference — no canvas at all

  const isSmall = window.matchMedia('(max-width: 760px)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  /* ---------- theme awareness ----------
     Light mode needs punchier, more saturated colour + a dark-ish
     halo so hot sparks don't wash out against a pale background.
     Dark mode can lean into the near-white core since it already
     pops against the deep background. We watch the html[data-theme]
     attribute so the palette flips live with the toggle. */
  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }
  let dark = isDark();
  const mo = new MutationObserver(() => { dark = isDark(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- palette: cools from white-hot core → brand orange → dark ember ---------- */
  const STOPS_DARK = [
    { t: 0.00, r: 255, g: 250, b: 235 }, // white-hot
    { t: 0.35, r: 253, g: 165, b: 87 },  // hot orange
    { t: 0.70, r: 253, g: 87,  b: 43 },  // brand orange (#fd572b)
    { t: 1.00, r: 90,  g: 24,  b: 10 },  // dying ember
  ];
  /* Light-mode palette skews away from white/pale-yellow (invisible on
     a light page) toward saturated orange → deep red-orange, so the
     spark reads clearly against bright backgrounds. */
  const STOPS_LIGHT = [
    { t: 0.00, r: 255, g: 214, b: 120 }, // hot amber core (no near-white)
    { t: 0.30, r: 253, g: 150, b: 60 },  // hot orange
    { t: 0.65, r: 235, g: 74,  b: 28 },  // brand orange, slightly deeper
    { t: 1.00, r: 120, g: 20,  b: 8  },  // dying ember
  ];
  function colorAt(t, stops) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].t && t <= stops[i + 1].t) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const span = (b.t - a.t) || 1;
    const local = (t - a.t) / span;
    const r = a.r + (b.r - a.r) * local;
    const g = a.g + (b.g - a.g) * local;
    const bl = a.b + (b.b - a.b) * local;
    return `${r | 0},${g | 0},${bl | 0}`;
  }

  /* ---------- sizing: tracks the viewport (fixed canvas), capped DPR ---------- */
  let W = 0, H = 0, DPR = 1;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  /* ---------- particle pool ---------- */
  const GRAVITY = 260; // px/s²
  const DRAG = 0.985;
  /* Bumped up on every form factor so the effect reads clearly instead
     of being a barely-there accent. */
  const MAX_PARTICLES = isSmall || isCoarse ? 70 : 130;

  let particles = [];

  function spawnBurst() {
    if (particles.length > MAX_PARTICLES - 10) return;
    const x = Math.random() * W;
    const y = Math.random() * H;
    const count = 5 + Math.floor(Math.random() * 6); // 5–10 per burst
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 2.2;
      const speed = 40 + Math.random() * 110;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30, // slight initial upward kick
        life: 0,
        maxLife: 0.55 + Math.random() * 0.65,
        size: 1.7 + Math.random() * 2.1,
        px: x, py: y, // previous position, for the streak
      });
    }
  }

  /* Spawn cadence: roughly one burst every 0.45–1.1s, independent of
     frame rate — noticeably livelier than the original slow trickle. */
  let spawnTimer = 0;
  let nextSpawnAt = 0.3;
  function scheduleNextSpawn() {
    nextSpawnAt = 0.45 + Math.random() * 0.65;
  }
  scheduleNextSpawn();

  /* ---------- animation loop ---------- */
  let running = true;
  let lastT = performance.now();

  function frame(now) {
    if (!running) return;
    let dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.05) dt = 0.05; // clamp huge gaps (tab switches, etc.)

    spawnTimer += dt;
    if (spawnTimer >= nextSpawnAt) {
      spawnTimer = 0;
      scheduleNextSpawn();
      spawnBurst();
    }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    const stops = dark ? STOPS_DARK : STOPS_LIGHT;
    // Light backgrounds swallow low-alpha glow, so push opacity harder
    // and add a real shadow blur to make each spark pop as a distinct
    // glint rather than a faint smudge.
    const alphaBoost = dark ? 1 : 1.35;
    const glow = dark ? 8 : 10;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }

      p.px = p.x; p.py = p.y;
      p.vx *= Math.pow(DRAG, dt * 60);
      p.vy = p.vy * Math.pow(DRAG, dt * 60) + GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const t = p.life / p.maxLife;
      const rawAlpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88; // quick fade-in, gentle fade-out
      const alpha = Math.min(1, rawAlpha * alphaBoost);
      const rgb = colorAt(t, stops);

      ctx.shadowColor = `rgba(${rgb},${Math.min(1, alpha * 0.85).toFixed(3)})`;
      ctx.shadowBlur = glow * (1 - t * 0.3);

      // hot streak (short line from previous to current position)
      ctx.strokeStyle = `rgba(${rgb},${(Math.min(1, alpha) * 0.95).toFixed(3)})`;
      ctx.lineWidth = p.size * (1 - t * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // bright core at the leading point
      ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - t * 0.4) * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }

  /* Pause entirely when the tab isn't visible — no point burning battery
     animating sparks nobody can see. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      lastT = performance.now();
      requestAnimationFrame(frame);
    }
  });

  /* Defer the first frame slightly so this never competes with initial
     paint / LCP work. */
  function start() {
    lastT = performance.now();
    requestAnimationFrame(frame);
  }
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 });
  else window.addEventListener('load', start);
})();
