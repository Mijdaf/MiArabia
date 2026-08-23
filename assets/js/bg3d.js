/* ============================================================
   Mijdaf — ambient 3D background: a slowly drifting steel
   "pipe-rack" lattice (the elevated structural framework that
   carries process piping across an industrial site). Rendered
   once, fixed behind the whole page, visible through every
   section's translucent background.
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';

(function () {
  const canvas = document.getElementById('bg3d');
  if (!canvas || !window.WebGLRenderingContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia('(max-width: 760px)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- renderer / scene / camera ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.3 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.35, 12);
  camera.lookAt(0, -0.2, 0);

  const rig = new THREE.Group();
  scene.add(rig);

  /* ---------- build the pipe-rack lattice ---------- */
  const NX = isSmall ? 10 : 17;      // bays across
  const NZ = 3;                      // depth rows
  const FLOORS = 3;                  // structural levels
  const SX = 1.05, SY = 1.0, SZ = 1.05;

  const idx = (f, x, z) => f * NX * NZ + x * NZ + z;
  const positions = [];
  const rand = (n) => (Math.random() - 0.5) * n;

  for (let f = 0; f < FLOORS; f++) {
    const y = (f - (FLOORS - 1) / 2) * SY;
    for (let x = 0; x < NX; x++) {
      const px = (x - (NX - 1) / 2) * SX;
      for (let z = 0; z < NZ; z++) {
        const pz = (z - (NZ - 1) / 2) * SZ;
        positions.push(px + rand(0.06), y + rand(0.04), pz + rand(0.06));
      }
    }
  }

  const linePairs = [];
  for (let f = 0; f < FLOORS; f++) {
    for (let x = 0; x < NX; x++) {
      for (let z = 0; z < NZ; z++) {
        if (x < NX - 1) linePairs.push(idx(f, x, z), idx(f, x + 1, z));
        if (z < NZ - 1) linePairs.push(idx(f, x, z), idx(f, x, z + 1));
        if (x < NX - 1 && z < NZ - 1 && (x + z) % 2 === 0) {
          linePairs.push(idx(f, x, z), idx(f, x + 1, z + 1));
        }
      }
    }
    if (f < FLOORS - 1) {
      for (let x = 0; x < NX; x++) {
        for (let z = 0; z < NZ; z++) {
          linePairs.push(idx(f, x, z), idx(f + 1, x, z));
          if (x < NX - 1 && (x + f) % 3 === 0) {
            linePairs.push(idx(f, x, z), idx(f + 1, x + 1, z));
          }
        }
      }
    }
  }

  const posArr = new Float32Array(positions);
  const lineGeo = new THREE.BufferGeometry();
  const lineVerts = new Float32Array(linePairs.length * 3);
  for (let i = 0; i < linePairs.length; i++) {
    const p = linePairs[i] * 3;
    lineVerts[i * 3] = posArr[p];
    lineVerts[i * 3 + 1] = posArr[p + 1];
    lineVerts[i * 3 + 2] = posArr[p + 2];
  }
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lineVerts, 3));

  const lineMat = new THREE.LineBasicMaterial({ color: 0x164dcc, transparent: true, opacity: 0.24 });
  const structure = new THREE.LineSegments(lineGeo, lineMat);
  rig.add(structure);

  /* accent joints — top floor only, brand-orange "signal" nodes */
  const accentPos = [];
  const topFloor = FLOORS - 1;
  for (let x = 0; x < NX; x++) {
    for (let z = 0; z < NZ; z++) {
      const p = idx(topFloor, x, z) * 3;
      accentPos.push(posArr[p], posArr[p + 1], posArr[p + 2]);
    }
  }
  const accentGeo = new THREE.BufferGeometry();
  accentGeo.setAttribute('position', new THREE.Float32BufferAttribute(accentPos, 3));
  const accentMat = new THREE.PointsMaterial({
    color: 0xfd572b, size: isSmall ? 3.2 : 4, sizeAttenuation: false,
    transparent: true, opacity: 0.8, depthWrite: false
  });
  const accents = new THREE.Points(accentGeo, accentMat);
  rig.add(accents);

  /* faint dust points through the volume for depth */
  const dustCount = isSmall ? 60 : 140;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = rand(NX * SX * 1.1);
    dustPos[i * 3 + 1] = rand(FLOORS * SY * 1.6);
    dustPos[i * 3 + 2] = rand(NZ * SZ * 2.4);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x164dcc, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.22, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  rig.add(dust);

  rig.rotation.y = -0.28;
  rig.rotation.x = 0.05;

  /* ---------- theme-aware palette ---------- */
  function applyTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    lineMat.color.set(dark ? 0x5a8bff : 0x164dcc);
    lineMat.opacity = dark ? 0.32 : 0.22;
    accentMat.opacity = dark ? 0.85 : 0.7;
    dustMat.color.set(dark ? 0x7fa0ff : 0x164dcc);
    dustMat.opacity = dark ? 0.24 : 0.15;
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- sizing ---------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const aspect = w / h;
    camera.position.z = THREE.MathUtils.clamp(15 / Math.max(aspect, 0.55), 9, 20);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- gentle pointer parallax (desktop only) ---------- */
  let targetYaw = rig.rotation.y, targetPitch = rig.rotation.x;
  const baseYaw = rig.rotation.y, basePitch = rig.rotation.x;
  if (!isCoarse && !reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) - 0.5;
      const ny = (e.clientY / window.innerHeight) - 0.5;
      targetYaw = baseYaw + nx * 0.35;
      targetPitch = basePitch + ny * 0.12;
    }, { passive: true });
  }

  /* ---------- render loop ---------- */
  const clock = new THREE.Clock();
  let running = true;

  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      rig.rotation.y += (targetYaw - rig.rotation.y) * 0.02 + 0.0006;
      rig.rotation.x += (targetPitch - rig.rotation.x) * 0.02;
      rig.position.y = Math.sin(t * 0.18) * 0.12;
      accentMat.opacity = (document.documentElement.getAttribute('data-theme') === 'dark' ? 0.85 : 0.65) + Math.sin(t * 0.9) * 0.18;
    }

    renderer.render(scene, camera);
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduceMotion) requestAnimationFrame(frame);
  });

  frame();
  if (reduceMotion) renderer.render(scene, camera); // single static frame
})();
