/* ============================================================
   MiArabia — ambient "pipe rack" 3D background.
   A slow, faint industrial steel structure — the elevated frames
   that carry pipe runs across a plant site — receding into depth
   behind every section of the page. Three connected tiers, X
   cross-bracing between bays, and top joints that catch a soft
   orange glow (the brand color). Fixed behind all content, for
   the whole scroll length of the site, not confined to one section.
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';

function whenIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
}

whenIdle(function () {
  const canvas = document.getElementById('pipeRackCanvas');
  if (!canvas || !window.WebGLRenderingContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia('(max-width: 760px)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- renderer ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) { return; }

  /* Bail out entirely on software-rendered GPUs — this scene runs for the
     whole page, so a slow renderer here is far costlier than a scene
     confined to one section. */
  let isSoftwareRenderer = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    isSoftwareRenderer = /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(rendererStr);
  } catch (e) { /* assume fine, let the benchmark below catch it */ }

  if (isSoftwareRenderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    return;
  }

  const pixelRatioCap = isSmall ? 1 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x000032, 0.05);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(9.5, 1.0, 1.6);
  camera.lookAt(0, 0.85, -1.2);

  const rig = new THREE.Group();
  scene.add(rig);

  /* ---------- lighting ---------- */
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x000032, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(5, 8, 6);
  scene.add(key);

  /* ---------- palette ---------- */
  const STEEL = new THREE.Color(0x8b93ab);
  const ORANGE = new THREE.Color(0xfd572b);

  const steelMat = new THREE.MeshLambertMaterial({ color: STEEL, transparent: true, opacity: 0.55 });
  const pipeMat = new THREE.MeshLambertMaterial({ color: STEEL.clone().lerp(new THREE.Color(0xffffff), 0.15), transparent: true, opacity: 0.4 });
  const jointMat = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.95 });

  /* ---------- cheap bloom substitute for the joint glow ---------- */
  function makeGlowTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,180,120,0.95)');
    g.addColorStop(0.35, 'rgba(253,87,43,0.4)');
    g.addColorStop(1, 'rgba(253,87,43,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  const glowTex = makeGlowTexture();
  const glowSprites = [];

  /* ---------- structure builder ---------- */
  function rod(p1, p2, radius, material, segments) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, segments || 6, 1);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(p1).add(dir.clone().multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  const FRAME_COUNT = isSmall ? 8 : 16;
  const SPACING = 1.15;
  const HALF_W = 0.85;
  const TIERS = [0, 0.42, 0.85, 1.28]; // base + 3 structural floors, scaled down
  const TOP = TIERS[TIERS.length - 1];
  const startZ = -((FRAME_COUNT - 1) * SPACING) / 2;

  const jointDots = []; // { mesh, sprite, basePos, phase }

  for (let i = 0; i < FRAME_COUNT; i++) {
    const z = startZ + i * SPACING;

    // columns
    rig.add(rod(new THREE.Vector3(-HALF_W, 0, z), new THREE.Vector3(-HALF_W, TOP, z), 0.017, steelMat));
    rig.add(rod(new THREE.Vector3(HALF_W, 0, z), new THREE.Vector3(HALF_W, TOP, z), 0.017, steelMat));

    // cross beams at every tier
    for (let t = 0; t < TIERS.length; t++) {
      const h = TIERS[t];
      rig.add(rod(new THREE.Vector3(-HALF_W, h, z), new THREE.Vector3(HALF_W, h, z), 0.012, steelMat));
    }

    // top joints: glowing orange nodes at the two top corners of each frame
    [-HALF_W, HALF_W].forEach((x) => {
      const pos = new THREE.Vector3(x, TOP, z);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), jointMat);
      dot.position.copy(pos);
      rig.add(dot);

      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex, color: ORANGE, transparent: true, opacity: 0.6,
        depthWrite: false, blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.26, 0.26, 1);
      sprite.position.copy(pos);
      rig.add(sprite);
      glowSprites.push(sprite);

      jointDots.push({ mesh: dot, sprite, basePos: pos.clone(), phase: Math.random() * Math.PI * 2 });
    });

    // diagonal X bracing between this frame and the next, on both sides —
    // every other bay, so it reads as structure rather than clutter
    if (i < FRAME_COUNT - 1 && i % 2 === 0) {
      const z2 = z + SPACING;
      [-HALF_W, HALF_W].forEach((x) => {
        rig.add(rod(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, TOP, z2), 0.01, steelMat));
        rig.add(rod(new THREE.Vector3(x, TOP, z), new THREE.Vector3(x, 0, z2), 0.01, steelMat));
      });
    }
  }

  // long pipe runs, one continuous cylinder per line, laid across the
  // full depth of the rack, resting on each tier at a few lateral offsets
  const totalLen = (FRAME_COUNT - 1) * SPACING + 1.4;
  const midZ = 0;
  const pipeLines = [
    { x: -0.35, tier: 1 },
    { x: -0.1, tier: 1 },
    { x: 0.16, tier: 2 },
    { x: 0.35, tier: 2 },
    { x: -0.2, tier: 3 },
    { x: 0.22, tier: 3 },
  ];
  pipeLines.forEach((p) => {
    const y = TIERS[p.tier] + 0.03;
    rig.add(rod(
      new THREE.Vector3(p.x, y, midZ - totalLen / 2),
      new THREE.Vector3(p.x, y, midZ + totalLen / 2),
      0.02, pipeMat, 6
    ));
  });

  rig.position.z = 0;
  rig.rotation.y = 0.1;

  /* ---------- theme-aware palette ---------- */
  function applyTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    fog.color.set(dark ? 0x000032 : 0xdfe5f6);
    steelMat.opacity = dark ? 0.55 : 0.6;
    pipeMat.opacity = dark ? 0.42 : 0.5;
    jointMat.opacity = dark ? 0.95 : 0.95;
    hemi.intensity = dark ? 0.9 : 0.7;
    key.intensity = dark ? 1.0 : 0.85;
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- sizing: track the viewport ---------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- stronger pointer-driven parallax (desktop only) — both a
     rotation and a translation shift, so nearer/farther members visibly
     slide against each other for a real 3D feel, not just a subtle tilt ---------- */
  let targetYaw = rig.rotation.y, targetPitch = 0;
  let targetOffsetX = 0, targetOffsetY = 0;
  const baseYaw = rig.rotation.y;
  if (!isCoarse && !reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) - 0.5;
      const ny = (e.clientY / window.innerHeight) - 0.5;
      targetYaw = baseYaw + nx * 0.55;
      targetPitch = ny * 0.24;
      targetOffsetX = nx * 0.9;
      targetOffsetY = -ny * 0.35;
    }, { passive: true });
  }

  /* ---------- adaptive quality: preflight bench, then react ---------- */
  let quality = 0; // 0 = full, 1 = reduced, 2 = static-only
  let benchFrames = 0, benchTotal = 0;
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
    for (const s of glowSprites) s.visible = false;
    if (renderer.getPixelRatio() > 1) renderer.setPixelRatio(1);
  }

  function downgradeToStatic() {
    quality = 2;
    running = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    renderer.render(scene, camera);
  }

  /* ---------- render loop: single-flight RAF, capped at 30fps,
     paused while the tab is hidden ---------- */
  const clock = new THREE.Clock();
  let running = true;
  let rafId = null;
  let lastRenderTime = 0;
  const FRAME_INTERVAL = 1000 / 30;

  function ensureLoop() {
    if (quality === 2) return;
    if (rafId === null && running && !reduceMotion) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    rafId = null;
    if (!running) return;

    const elapsed = now - lastRenderTime;
    if (elapsed < FRAME_INTERVAL) { ensureLoop(); return; }
    const frameStart = performance.now();
    lastRenderTime = now - (elapsed % FRAME_INTERVAL);

    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      rig.rotation.y += (targetYaw - rig.rotation.y) * 0.045 + 0.00025;
      rig.rotation.x += (targetPitch - rig.rotation.x) * 0.045;
      rig.position.x += (targetOffsetX - rig.position.x) * 0.045;
      rig.position.y += (targetOffsetY - rig.position.y) * 0.045;

      for (const j of jointDots) {
        if (j.sprite.visible) {
          j.sprite.material.opacity = 0.55 + Math.sin(t * 0.7 + j.phase) * 0.25;
        }
      }
    }

    renderer.render(scene, camera);
    const cost = performance.now() - frameStart;

    if (quality < 2 && !reduceMotion) {
      benchFrames++;
      benchTotal += cost;
      if (cost > 60) {
        quality === 0 ? downgradeToReduced() : downgradeToStatic();
      } else if (benchFrames >= BENCH_SAMPLE) {
        const avg = benchTotal / benchFrames;
        if (quality === 0 && avg > 18) downgradeToReduced();
        else if (quality === 1 && avg > 18) downgradeToStatic();
        benchFrames = 0; benchTotal = 0;
      }
      ensureLoop();
    }
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    ensureLoop();
  });

  if (quality === 2) {
    // downgradeToStatic() already left a still frame on screen.
  } else if (reduceMotion) {
    renderer.render(scene, camera); // single static frame, no loop
  } else {
    ensureLoop();
  }
});
