/* ============================================================
   MiArabia — ambient "glow dots" background.
   A sparse field of soft, slowly twinkling dots (brand orange /
   steel blue / white) fixed behind every section, sitting behind
   the pipe-rack and sparks layers. Each dot drifts almost
   imperceptibly and pulses in brightness on its own cycle, giving
   the page a bit of quiet depth without competing with the
   welding-sparks layer up front.
   ============================================================ */

(function () {
  const canvas = document.getElementById('glowDotsCanvas');
  if (!canvas || !canvas.getContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const isSmall = window.matchMedia('(max-width: 760px)').matches;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  /* brand palette: warm orange, steel blue, soft white */
  const COLORS = [
    { r: 253, g: 87,  b: 43  }, // orange
    { r: 22,  g: 77,  b: 204 }, // steel
    { r: 255, g: 255, b: 255 }, // white
  ];

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

  const COUNT = isSmall ? 26 : 54;
  const dots = [];
  for (let i = 0; i < COUNT; i++) {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    dots.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 1.8,
      c,
      baseAlpha: 0.25 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4, // twinkle speed
      driftX: (Math.random() - 0.5) * 0.06,
      driftY: (Math.random() - 0.5) * 0.06,
    });
  }

  let t = 0;
  let raf = null;

  function frame() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);

    for (const d of dots) {
      d.x += d.driftX;
      d.y += d.driftY;
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10;
      if (d.y > H + 10) d.y = -10;

      const twinkle = 0.5 + 0.5 * Math.sin(t * d.speed + d.phase);
      const alpha = d.baseAlpha * (0.4 + 0.6 * twinkle);
      const glowR = d.r * (2.6 + twinkle * 1.4);

      const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowR);
      grad.addColorStop(0, `rgba(${d.c.r},${d.c.g},${d.c.b},${alpha})`);
      grad.addColorStop(1, `rgba(${d.c.r},${d.c.g},${d.c.b},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(d.x, d.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${d.c.r},${d.c.g},${d.c.b},${Math.min(alpha * 1.6, 0.9)})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
  });

  raf = requestAnimationFrame(frame);
})();
