/* ============================================================
   Mijdaf — "Why Us" ambient 3D scene: a soft constellation of
   faceted, low-poly nodes (structural units) drifting slowly in
   depth and linked by a light network of connectors. Contained
   entirely inside the #why section — not a full-page background —
   so it reads as a deliberate visual moment rather than noise
   behind every section.
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';

/* Defer the whole scene build to idle time. Building it (geometry, materials,
   the O(n²) link pass) plus the first render — which is also when the GPU
   actually compiles shaders — is real synchronous work. Done at page-load
   time it can land in the same stretch of main-thread activity as other
   startup work and delay it. requestIdleCallback waits until the browser
   genuinely has nothing more pressing queued, so this scene never competes
   with page interactions like scrolling into the "why" section itself. */
function whenIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
}

whenIdle(function () {
  const canvas = document.getElementById('whyCanvas');
  const section = document.getElementById('why');
  if (!canvas || !section || !window.WebGLRenderingContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia('(max-width: 760px)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  /* Skip the ambient 3D background scene entirely on phone — the "why"
     section just shows its plain background there, no particles/nodes.
     Desktop is unaffected. */
  if (isSmall) return;

  /* ---------- renderer / scene / camera ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) { return; }

  /* Bail out early on software-rendered GPUs (common on machines with no real
     graphics driver / weak integrated chips + old drivers). A software
     rasterizer can take 100ms+ per frame, which doesn't just look choppy —
     it hogs the main thread long enough to delay scroll-driven work like the
     IntersectionObserver that reveals the "why" rows, making them appear to
     never show up at all. On this hardware tier we skip the scene build
     entirely (not just the render loop) — building ~16 meshes, sprites and
     an O(n²) link pass is itself real synchronous cost, and there's no point
     paying it for a scene we've already decided not to keep animated. We
     just clear the canvas and leave the section's plain background showing. */
  let isSoftwareRenderer = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    isSoftwareRenderer = /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(rendererStr);
  } catch (e) { /* if we can't tell, assume it's fine and let the benchmark below catch it */ }

  if (isSoftwareRenderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    return;
  }

  let pixelRatioCap = isSmall ? 1 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0d1f, 0.052);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.3, 13);
  camera.lookAt(0, 0, 0);

  const rig = new THREE.Group();
  scene.add(rig);

  /* ---------- lighting: minimal two-light setup for faceted shading ---------- */
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x0a0d1f, 0.95);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 5, 6);
  scene.add(key);

  /* ---------- palette ---------- */
  const BLUE = new THREE.Color(0x2f63e0);
  const BLUE_LIGHT = new THREE.Color(0x5a8bff);
  const ORANGE = new THREE.Color(0xfd572b);

  /* ---------- glow sprite texture (cheap bloom substitute) ---------- */
  function makeGlowTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  const glowTex = makeGlowTexture();

  /* ---------- build the node field ---------- */
  const NODE_COUNT = isSmall ? 10 : 16;
  const RADIUS_X = isSmall ? 4.6 : 7.6;
  const RADIUS_Y = isSmall ? 5.4 : 3.1;
  const RADIUS_Z = 2.6;

  const nodes = []; // { mesh, glow, basePos, phase, spinAxis, spinSpeed, bobSpeed, bobAmp }
  const geoA = new THREE.IcosahedronGeometry(1, 0);
  const geoB = new THREE.OctahedronGeometry(1, 0);

  for (let i = 0; i < NODE_COUNT; i++) {
    const isAccent = Math.random() < 0.16;
    const isPrimary = !isAccent && Math.random() < 0.3;
    const scale = isPrimary ? (isSmall ? 0.3 : 0.63) + Math.random() * (isSmall ? 0.12 : 0.21)
                             : (isSmall ? 0.21 : 0.29) + Math.random() * 0.15;

    const color = isAccent ? ORANGE.clone() : (isPrimary ? BLUE.clone() : BLUE_LIGHT.clone().lerp(BLUE, Math.random()));

    const mat = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      transparent: true,
      opacity: 0.92
    });
    const geo = Math.random() < 0.5 ? geoA : geoB;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(scale);

    const basePos = new THREE.Vector3(
      (Math.random() - 0.5) * 2 * RADIUS_X,
      (Math.random() - 0.5) * 2 * RADIUS_Y,
      (Math.random() - 0.5) * 2 * RADIUS_Z
    );
    mesh.position.copy(basePos);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rig.add(mesh);

    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: color.clone(),
      transparent: true,
      opacity: isAccent ? 0.5 : 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Sprite(glowMat);
    const glowScale = scale * (isAccent ? 7 : 5.2);
    glow.scale.set(glowScale, glowScale, 1);
    glow.position.copy(basePos);
    rig.add(glow);

    nodes.push({
      mesh, glow, basePos,
      phase: Math.random() * Math.PI * 2,
      spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spinSpeed: 0.08 + Math.random() * 0.16,
      bobSpeed: 0.25 + Math.random() * 0.35,
      bobAmp: 0.12 + Math.random() * 0.16,
      baseGlowOpacity: glowMat.opacity
    });
  }

  /* ---------- network connectors: link each node to its 2 nearest neighbours ---------- */
  const MAX_LINK_DIST = isSmall ? 3.4 : 4.2;
  const linkVerts = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const d = nodes[i].basePos.distanceTo(nodes[j].basePos);
      if (d < MAX_LINK_DIST) dists.push([d, j]);
    }
    dists.sort((a, b) => a[0] - b[0]);
    const linkCount = Math.min(2, dists.length);
    for (let k = 0; k < linkCount; k++) {
      const j = dists[k][1];
      if (j > i) {
        linkVerts.push(nodes[i].basePos.x, nodes[i].basePos.y, nodes[i].basePos.z);
        linkVerts.push(nodes[j].basePos.x, nodes[j].basePos.y, nodes[j].basePos.z);
      }
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkVerts, 3));
  const linkMat = new THREE.LineBasicMaterial({ color: 0x5a8bff, transparent: true, opacity: 0.22 });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  rig.add(links);

  /* ---------- faint dust for depth ---------- */
  const dustCount = isSmall ? 30 : 60;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * RADIUS_X * 2.4;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * RADIUS_Y * 2.6;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * RADIUS_Z * 3.2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x5a8bff, size: 3.5, sizeAttenuation: false, transparent: true, opacity: 0.25, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  rig.add(dust);

  rig.rotation.y = -0.22;

  /* ---------- theme-aware palette ---------- */
  function applyTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    scene.fog.color.set(dark ? 0x05070f : 0xeef1fb);
    linkMat.opacity = dark ? 0.3 : 0.2;
    dustMat.opacity = dark ? 0.32 : 0.22;
    hemi.intensity = dark ? 1.1 : 0.9;
    key.intensity = dark ? 1.15 : 1.0;
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- sizing: track the section, not the viewport ---------- */
  function resize() {
    const w = section.clientWidth, h = section.clientHeight;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const aspect = w / h;
    camera.position.z = THREE.MathUtils.clamp(13 / Math.max(aspect, 0.7), 10, isSmall ? 19 : 17);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(section);

  /* ---------- gentle pointer parallax (desktop only) ---------- */
  let targetYaw = rig.rotation.y, targetPitch = 0;
  const baseYaw = rig.rotation.y;
  if (!isCoarse && !reduceMotion) {
    section.addEventListener('pointermove', (e) => {
      const rect = section.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) - 0.5;
      const ny = ((e.clientY - rect.top) / rect.height) - 0.5;
      targetYaw = baseYaw + nx * 0.3;
      targetPitch = ny * 0.14;
    }, { passive: true });
  }

  /* ---------- only animate while the section is actually visible ---------- */
  let inView = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      ensureLoop();
    }, { threshold: 0.05 }).observe(section);
  }

  /* ---------- render loop (single-flight: never more than one RAF chain) ---------- */
  const clock = new THREE.Clock();
  let running = true;
  let rafId = null;
  let lastRenderTime = 0;
  const FRAME_INTERVAL = 1000 / 30; // decorative scene: 30fps is plenty, saves battery/CPU

  /* ---------- adaptive quality: if this device is struggling, quietly
     simplify the scene — or stop animating altogether — instead of letting
     it choke the page. Two tiers.

     We decide the STARTING tier with a synchronous preflight render before
     the animation loop ever begins (see below), rather than only reacting
     after several janky frames have already played out. A slow machine
     doesn't just render slowly once it's running — a single renderer.render()
     call can itself block the main thread long enough to delay unrelated
     things like scroll-driven IntersectionObservers elsewhere on the page
     (e.g. the "why" row reveal). Catching that on frame zero, before the
     section is even scrolled to, avoids that knock-on delay entirely. ---- */
  let quality = 0; // 0 = full, 1 = reduced, 2 = static-only
  let benchFrames = 0, benchTotal = 0, worstFrame = 0;
  const BENCH_SAMPLE = 6;

  {
    const preflightStart = performance.now();
    renderer.render(scene, camera);
    const preflightCost = performance.now() - preflightStart;
    if (preflightCost > 60) downgradeToStatic();
    else if (preflightCost > 22) downgradeToReduced();
  }

  function downgradeToReduced() {
    if (quality >= 1) return;
    quality = 1;
    for (const n of nodes) n.glow.visible = false;
    dust.visible = false;
    if (renderer.getPixelRatio() > 1) renderer.setPixelRatio(1);
  }

  function downgradeToStatic() {
    quality = 2;
    running = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    renderer.render(scene, camera); // leave one clean still frame on screen
  }

  function ensureLoop() {
    if (quality === 2) return; // static tier never (re)starts the loop
    if (rafId === null && running && inView && !reduceMotion) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    rafId = null;
    if (!running || !inView) return;

    const elapsed = now - lastRenderTime;
    if (elapsed < FRAME_INTERVAL) { ensureLoop(); return; }
    const frameStart = performance.now();
    lastRenderTime = now - (elapsed % FRAME_INTERVAL);

    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      rig.rotation.y += (targetYaw - rig.rotation.y) * 0.02 + 0.0007;
      rig.rotation.x += (targetPitch - rig.rotation.x) * 0.02;
      camera.position.z += Math.sin(t * 0.12) * 0.002;

      for (const n of nodes) {
        n.mesh.position.y = n.basePos.y + Math.sin(t * n.bobSpeed + n.phase) * n.bobAmp;
        n.mesh.position.x = n.basePos.x + Math.cos(t * n.bobSpeed * 0.7 + n.phase) * n.bobAmp * 0.5;
        n.mesh.rotateOnAxis(n.spinAxis, n.spinSpeed * 0.01);
        if (n.glow.visible) {
          n.glow.position.copy(n.mesh.position);
          n.glow.material.opacity = n.baseGlowOpacity + Math.sin(t * 0.8 + n.phase) * n.baseGlowOpacity * 0.35;
        }
      }
    }

    renderer.render(scene, camera);
    const cost = performance.now() - frameStart;

    if (quality < 2 && !isSmall && !reduceMotion) {
      benchFrames++;
      benchTotal += cost;
      if (cost > worstFrame) worstFrame = cost;

      // Any single very slow frame (main thread blocked ~4+ dropped frames'
      // worth) is reason enough to act now rather than waiting for an average.
      if (cost > 60) {
        quality === 0 ? downgradeToReduced() : downgradeToStatic();
      } else if (benchFrames >= BENCH_SAMPLE) {
        const avg = benchTotal / benchFrames;
        if (quality === 0 && avg > 18) downgradeToReduced();
        else if (quality === 1 && avg > 18) downgradeToStatic();
        benchFrames = 0; benchTotal = 0; worstFrame = 0;
      }
    }

    if (quality < 2 && !reduceMotion) ensureLoop();
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    ensureLoop();
  });

  if (quality === 2) {
    // downgradeToStatic() (called above, from the preflight benchmark)
    // already left a still frame on screen.
  } else if (reduceMotion) {
    renderer.render(scene, camera); // single static frame
  } else {
    ensureLoop();
  }
});
