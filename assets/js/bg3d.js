/* ============================================================
   Mijdaf — "Why Us" ambient 3D scene: a soft constellation of
   faceted, low-poly nodes (structural units) drifting slowly in
   depth and linked by a light network of connectors. Contained
   entirely inside the #why section — not a full-page background —
   so it reads as a deliberate visual moment rather than noise
   behind every section.
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';

(function () {
  const canvas = document.getElementById('whyCanvas');
  const section = document.getElementById('why');
  if (!canvas || !section || !window.WebGLRenderingContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia('(max-width: 760px)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- renderer / scene / camera ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.4 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0d1f, 0.052);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.3, 13);
  camera.lookAt(0, 0, 0);

  const rig = new THREE.Group();
  scene.add(rig);

  /* ---------- lighting: soft studio setup for faceted shading ---------- */
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x0a0d1f, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(4, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfd572b, 0.55);
  rim.position.set(-5, -2, -4);
  scene.add(rim);

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
  const NODE_COUNT = isSmall ? 15 : 26;
  const RADIUS_X = isSmall ? 4.6 : 7.6;
  const RADIUS_Y = isSmall ? 5.4 : 3.1;
  const RADIUS_Z = 2.6;

  const nodes = []; // { mesh, glow, basePos, phase, spinAxis, spinSpeed, bobSpeed, bobAmp }
  const geoA = new THREE.IcosahedronGeometry(1, 0);
  const geoB = new THREE.OctahedronGeometry(1, 0);

  for (let i = 0; i < NODE_COUNT; i++) {
    const isAccent = Math.random() < 0.16;
    const isPrimary = !isAccent && Math.random() < 0.3;
    const scale = isPrimary ? (isSmall ? 0.2 : 0.42) + Math.random() * (isSmall ? 0.08 : 0.14)
                             : (isSmall ? 0.14 : 0.19) + Math.random() * 0.1;

    const color = isAccent ? ORANGE.clone() : (isPrimary ? BLUE.clone() : BLUE_LIGHT.clone().lerp(BLUE, Math.random()));

    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      metalness: 0.25,
      roughness: 0.45,
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
  const dustCount = isSmall ? 40 : 90;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * RADIUS_X * 2.4;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * RADIUS_Y * 2.6;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * RADIUS_Z * 3.2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x5a8bff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.25, depthWrite: false });
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

  function ensureLoop() {
    if (rafId === null && running && inView && !reduceMotion) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function frame() {
    rafId = null;
    if (!running || !inView) return;
    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      rig.rotation.y += (targetYaw - rig.rotation.y) * 0.02 + 0.0007;
      rig.rotation.x += (targetPitch - rig.rotation.x) * 0.02;
      camera.position.z += Math.sin(t * 0.12) * 0.002;

      for (const n of nodes) {
        n.mesh.position.y = n.basePos.y + Math.sin(t * n.bobSpeed + n.phase) * n.bobAmp;
        n.mesh.position.x = n.basePos.x + Math.cos(t * n.bobSpeed * 0.7 + n.phase) * n.bobAmp * 0.5;
        n.glow.position.copy(n.mesh.position);
        n.mesh.rotateOnAxis(n.spinAxis, n.spinSpeed * 0.01);
        n.glow.material.opacity = n.baseGlowOpacity + Math.sin(t * 0.8 + n.phase) * n.baseGlowOpacity * 0.35;
      }
    }

    renderer.render(scene, camera);
    if (!reduceMotion) ensureLoop();
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    ensureLoop();
  });

  if (reduceMotion) {
    renderer.render(scene, camera); // single static frame
  } else {
    ensureLoop();
  }
})();
