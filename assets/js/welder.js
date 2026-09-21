/* ==========================================================================
   Quick-actions welder
   --------------------------------------------------------------------------
   The "Request a Quote" button is complete - except for its words. A
   backpack-wearing welder leaps in from off-screen in a high arc and lands on
   the pill's top edge (the pill dips under him and he rebounds in a little
   hop), kneels and tack-welds along the top edge in three short bursts
   (shuffling forward between them). The words "weld in" on the button along
   the seam as it is laid (on the first visit), glowing white-hot in sync with
   each spark and cooling back down. He stands up, the pill gives a little
   "done" shake and its check icon flashes, then he turns around, crouches and
   jumps back out of the screen in another arc.
   The whole thing repeats every ~22 s.

   Everything is a pure function of time (poseAt), so it is easy to preview
   any frame:  window.__qaWelder.preview(seconds)
   ========================================================================== */
(function () {
  'use strict';

  var svg = document.getElementById('wdRig');
  var btn = document.getElementById('openRequestModal');
  if (!svg || !btn) return;
  var box = svg.parentNode;                                   // .qa-welder
  var icon = btn.querySelector('.qa-item-icon');
  var label = btn.querySelector('.qa-item-label');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealed = false;                                        // the words only need to be "welded on" once

  var $ = function (id) { return document.getElementById(id); };
  var E = {
    fig: $('wdFig'), body: $('wdBody'), head: $('wdHead'), pack: $('wdPack'),
    legFo: $('wdLegFo'), legFf: $('wdLegFf'), bootF: $('wdBootF'),
    legNo: $('wdLegNo'), legNf: $('wdLegNf'), bootN: $('wdBootN'),
    armFo: $('wdArmFo'), armFf: $('wdArmFf'), torch: $('wdTorch'), gloveF: $('wdGloveF'),
    armNo: $('wdArmNo'), armNf: $('wdArmNf'), armNs: $('wdArmNs'), gloveN: $('wdGloveN'),
    arc: $('wdArcG')
  };

  if (!reduce && label) { label.classList.add('qa-lblwait'); label.style.setProperty('--lw', 0); }   // the words are "missing" until he welds them on

  /* ---------- tunables ---------- */  /* ---------- tunables ---------- */
  var LOOP = 22;                 // seconds between the start of two visits
  var VU = 78;                   // walking speed, svg units / second
  var TD = 0.45, TA = 0.35;      // brake / accelerate time while walking
  var NB = 3, SEG = 13;          // number of weld bursts, seam length per burst (units)
  var BURST = 1.45, STEP = 0.65; // seconds per burst / per shuffle between bursts
  var SETTLE = 0.55, RISE = 0.6, HOLD = 0.6, TURN = 0.42, GET_READY = 0.3;
  var TIP0 = 27;                 // where (in front of the body) the torch tip starts, units
  var SEAM_A = -6;               // weld line start, units from the pill centre (in walking direction)
  var T_IN = 1.15, H_IN = 62;    // flight in: seconds, apex height above the pill (units)
  var L1 = 0.16, HOP = 0.34, L3 = 0.16, LAND = L1 + HOP + L3;   // landing: squash, small rebound hop, settle (seconds)
  var HOP_H = 8;                 // rebound hop height (units)
  var ANT = 0.32;                // crouch before the jump out
  var T_OUT = 1.3, H_OUT = 56;   // flight out: seconds, apex height (units)
  var BUMP = 3.4;                // how far (px) the pill is pressed down by his landing

  /* ---------- rig geometry (svg units, figure faces +x) ---------- */
  var G = 90.5;                  // ankle height when standing on the pill
  var LT = 10.5, LS = 10.5;      // thigh, shin
  var LA1 = 16, LA2 = 15;        // upper arm, forearm
  var SURF = 97.2;               // y of the seam (pill top edge)
  var S_STEP = 9.5, LC = 4 * S_STEP, LW = 19.6;

  var DEG = Math.PI / 180;
  var SINK = 1.3;                // how far a boot sole overlaps the pill edge (same overlap the standing boot has: G + 8 = SURF + 1.3)
  // Ankle y that makes a boot rotated by `a` degrees (about the ankle) rest ON the pill's top edge.
  // Boot sole corners in boot space: heel (-7, 8), toe (17, 8) -> whichever corner is lower touches the edge.
  function footRest(a) {
    var s = Math.sin(a * DEG), c = Math.cos(a * DEG);
    return SURF + SINK - Math.max(-7 * s + 8 * c, 17 * s + 8 * c);
  }
  function f(n) { return (Math.round(n * 100) / 100); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, e) { return a + (b - a) * e; }

  /* ---------- pose vectors ---------- */
  // P = { hx,hy,lean,head,pack, fn:{x,y,a}, ff:{x,y,a}, hn:{x,y}, hf:{x,y}, torch }
  function mixP(A, B, e) {
    if (e <= 0) return A;
    if (e >= 1) return B;
    function pt(a, b) { var o = {}; for (var k in a) o[k] = lerp(a[k], b[k], e); return o; }
    return {
      hx: lerp(A.hx, B.hx, e), hy: lerp(A.hy, B.hy, e), lean: lerp(A.lean, B.lean, e),
      head: lerp(A.head, B.head, e), pack: lerp(A.pack, B.pack, e), torch: lerp(A.torch, B.torch, e),
      fn: pt(A.fn, B.fn), ff: pt(A.ff, B.ff), hn: pt(A.hn, B.hn), hf: pt(A.hf, B.hf)
    };
  }

  function shoulder(hx, hy, lean) {
    var c = Math.cos(lean * DEG), s = Math.sin(lean * DEG);
    return { x: hx + 2 * c + 25 * s, y: hy + 2 * s - 25 * c };
  }
  function handAt(sh, deg, len) {           // hand hanging from the shoulder, swung by deg (+ = forward)
    return { x: sh.x + len * Math.sin(deg * DEG), y: sh.y + len * Math.cos(deg * DEG) };
  }

  var STAND = (function () {
    var hx = 50, hy = 70.5, lean = 3, sh = shoulder(hx, hy, lean);
    return {
      hx: hx, hy: hy, lean: lean, head: 0, pack: 0, torch: 22,
      fn: { x: 54.5, y: G, a: 0 }, ff: { x: 45.5, y: G, a: 0 },
      hn: handAt(sh, -3, 25), hf: handAt(sh, 8, 25)
    };
  })();

  function walkPose(dist) {
    var q = dist / LC;
    function gait(off) {
      var r = q + off; r -= Math.floor(r);
      if (r < 0.5) return { ox: S_STEP - 4 * S_STEP * r, lift: 0, a: 0 };
      var s = (r - 0.5) * 2;
      return { ox: -S_STEP + 2 * S_STEP * (1 - Math.cos(Math.PI * s)) / 2,
               lift: 5 * Math.sin(Math.PI * s), a: 16 * Math.sin(2 * Math.PI * s) };
    }
    var n = gait(0), fa = gait(0.5);
    function reach(g) { return g.lift + Math.sqrt(LW * LW - g.ox * g.ox); }
    var hy = G - Math.min(reach(n), reach(fa)), hx = 50, lean = 7;
    var sh = shoulder(hx, hy, lean);
    return {
      hx: hx, hy: hy, lean: lean, head: 1.5 * Math.sin(4 * Math.PI * q), pack: 3 * Math.sin(4 * Math.PI * q + 0.7),
      torch: 24,
      fn: { x: hx + n.ox, y: G - n.lift, a: n.a }, ff: { x: hx + fa.ox, y: G - fa.lift, a: fa.a },
      hn: handAt(sh, -26 * n.ox / S_STEP, 22), hf: handAt(sh, 11 * n.ox / S_STEP + 4, 23)
    };
  }

  /* ---------- jump poses ---------- */
  var SQUASH = (function () {                                    // crouched: landing impact / getting ready to jump
    var hx = 50, hy = 80, lean = 10, sh = shoulder(hx, hy, lean);
    return { hx: hx, hy: hy, lean: lean, head: 6, pack: 2, torch: 22,
             fn: { x: 55, y: G, a: 0 }, ff: { x: 45, y: G, a: 0 },
             hn: handAt(sh, -35, 24), hf: handAt(sh, 40, 24) };
  })();
  var TUCK = (function () {                                      // top of the jump: knees up, arms flung forward
    var hx = 50, hy = 70.5, lean = 14, sh = shoulder(hx, hy, lean);
    return { hx: hx, hy: hy, lean: lean, head: -8, pack: -3, torch: 22,
             fn: { x: 58, y: 82, a: 12 }, ff: { x: 47, y: 84, a: 12 },
             hn: handAt(sh, 150, 27), hf: handAt(sh, 118, 27) };
  })();
  var SETTLE_DIP = { hx: 50, hy: 74, lean: 5, head: 2, pack: 0, torch: 22, fn: STAND.fn, ff: STAND.ff, hn: STAND.hn, hf: STAND.hf };

  function shiftY(P, dy) {                                       // a copy of P moved up by dy (never mutate shared poses)
    return { hx: P.hx, hy: P.hy - dy, lean: P.lean, head: P.head, pack: P.pack, torch: P.torch,
             fn: { x: P.fn.x, y: P.fn.y - dy, a: P.fn.a }, ff: { x: P.ff.x, y: P.ff.y - dy, a: P.ff.a },
             hn: { x: P.hn.x, y: P.hn.y - dy }, hf: { x: P.hf.x, y: P.hf.y - dy } };
  }
  // k = 0..1 through a jump with a parabolic path of apex height H; k = 0 and k = 1 are on the ground
  function flightPose(k, H) {
    return shiftY(mixP(STAND, TUCK, Math.sin(Math.PI * k)), 4 * H * k * (1 - k));
  }
  // a = seconds since touchdown: squash, small rebound hop, settle
  function landPose(a) {
    if (a < L1) return mixP(STAND, SQUASH, sstep(a / L1));
    a -= L1;
    if (a < HOP) {
      var k = a / HOP;
      return shiftY(mixP(mixP(SQUASH, STAND, sstep(k * 3)), TUCK, 0.45 * Math.sin(Math.PI * k)), 4 * HOP_H * k * (1 - k));
    }
    return mixP(STAND, SETTLE_DIP, Math.sin(Math.PI * clamp((a - HOP) / L3, 0, 1)));
  }

  /* weld pose from world numbers (everything in "u" units along the walking axis) */
  function weldPose(w, wob) {
    var hx = 46, hy = 77, lean = 47 + 5 * w.reachK;
    var tipX = 50 + (w.tipW - w.u), tipY = SURF - w.tipLift + wob.y;
    var hf = { x: tipX - 8.5 + wob.x, y: tipY - 11 };
    return {
      hx: hx, hy: hy, lean: lean, head: 15, pack: 2, torch: 0,
      fn: { x: 50 + (w.fnW - w.u), y: G - w.fnLift, a: 3 },
      ff: { x: 50 + (w.ffW - w.u), y: footRest(30) - w.ffLift, a: 30 },   // back foot: toe on the pill edge, heel up (was G - 2.5 -> toe sank into the button)
      hf: hf, hn: { x: hf.x - 5.3, y: hf.y - 6.7 }
    };
  }

  /* ---------- weld choreography (tau = seconds since the first spark) ---------- */
  var tl = null;   // current timeline, rebuilt at the start of every visit

  function weldWorld(tau) {
    var B0 = tl.B0, cyc = BURST + STEP;
    var idx = Math.min(NB - 1, Math.floor(tau / cyc));
    var lt = tau - idx * cyc, Bk = B0 + SEG * idx;
    var w;
    if (lt <= BURST || idx === NB - 1) {
      var r = clamp(lt / BURST, 0, 1);
      w = { u: Bk, tipW: SEAM_A + SEG * idx + SEG * r, tipLift: 0, fnW: Bk + 5, ffW: Bk - 19,
            fnLift: 0, ffLift: 0, arc: clamp(lt / 0.12, 0, 1) * clamp((BURST - lt) / 0.08, 0, 1),
            len: SEG * idx + SEG * r, reachK: r, sinceOff: -1 };
    } else {
      var s = (lt - BURST) / STEP, e = sstep(s);
      var rf = clamp(s / 0.55, 0, 1), rb = clamp((s - 0.4) / 0.6, 0, 1);
      w = { u: Bk + SEG * e, tipW: SEAM_A + SEG * (idx + 1), tipLift: 4 * Math.sin(Math.PI * s),
            fnW: Bk + 5 + SEG * sstep(rf), ffW: Bk - 19 + SEG * sstep(rb),
            fnLift: 5 * Math.sin(Math.PI * rf), ffLift: 5 * Math.sin(Math.PI * rb),
            arc: 0, len: SEG * (idx + 1), reachK: 1 - e, sinceOff: lt - BURST };
    }
    return w;
  }

  /* ---------- timeline ---------- */
  function measure() {
    var scale = (box.offsetWidth || 112) / 120;
    var r = btn.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var side = cx < window.innerWidth / 2 ? 1 : -1;            // which screen edge he jumps in from
    var edge = side > 0 ? cx : window.innerWidth - cx;
    return { scale: scale, side: side, edge: edge };
  }

  function build() {
    var m = measure();
    btn.style.setProperty('--wdir', m.side > 0 ? 'to right' : 'to left');   // screen direction the seam grows in
    var t = { scale: m.scale, side: m.side };
    t.uStart = -(m.edge / m.scale + 64);                         // take-off / landing spot outside the screen
    t.B0 = SEAM_A - TIP0;                                        // body position while welding burst #1 (= where he lands)
    t.tL = T_IN;                                                 // touchdown
    t.tL2 = T_IN + L1 + HOP;                                     // second (small) touchdown after the rebound
    t.t1 = T_IN + LAND;                                          // landing finished
    t.t2 = t.t1 + SETTLE;                                        // first spark
    t.tw = NB * BURST + (NB - 1) * STEP;
    t.t3 = t.t2 + t.tw;                                          // last spark off
    t.t4 = t.t3 + RISE;                                          // standing
    t.t5 = t.t4 + HOLD;                                          // start turning
    t.t6 = t.t5 + TURN;                                          // start crouching for the jump
    t.t6a = t.t6 + ANT;                                          // take-off
    t.uEnd = t.B0 + SEG * (NB - 1);
    t.t7 = t.t6a + T_OUT;                                        // gone
    t.tEnd = t.t7 + 0.1;
    t.seamLen = NB * SEG;
    t.hitAt = t.t3 + 0.12;
    t.fadeAt = t.t3 + 3.4;
    return t;
  }

  /* ---------- the animation itself: everything at time t ---------- */
  function poseAt(t) {
    var T = tl, u = T.B0, face = 1, P, arc = 0, len = 0, sinceOff = 1e9;
    var wob = { x: Math.sin(t * 41) * 0.25, y: Math.sin(t * 53) * 0.2 };
    var DIP = { hx: STAND.hx, hy: STAND.hy - 3, lean: 3, head: 0, pack: 0, torch: 22, fn: STAND.fn, ff: STAND.ff, hn: STAND.hn, hf: STAND.hf };

    if (t < T.tL) {                                               // leaping in from off-screen
      var k = t / T_IN;
      u = T.uStart + (T.B0 - T.uStart) * k; P = flightPose(k, H_IN);
    } else if (t < T.t1) {                                        // touchdown: squash, small rebound, settle
      P = landPose(t - T.tL);
    } else if (t < T.t2) {                                        // drop into the crouch
      P = mixP(STAND, weldPose(weldWorld(0), { x: 0, y: 0 }), sstep((t - T.t1) / SETTLE));
    } else if (t < T.t3) {                                        // welding
      var w = weldWorld(t - T.t2);
      u = w.u; arc = w.arc; len = w.len; sinceOff = w.sinceOff; P = weldPose(w, wob);
      if (arc <= 0 && sinceOff < 0) sinceOff = 0;
    } else if (t < T.t4) {                                        // get up
      var wEnd = weldWorld(T.tw);
      u = wEnd.u; len = wEnd.len; sinceOff = t - T.t3;
      P = mixP(weldPose(wEnd, { x: 0, y: 0 }), STAND, sstep((t - T.t3) / RISE));
    } else if (t < T.t5) {                                        // admire the seam
      u = T.uEnd; len = T.seamLen; sinceOff = t - T.t3;
      P = mixP(STAND, { hx: STAND.hx, hy: STAND.hy, lean: 3, head: 10, pack: 0, torch: 22, fn: STAND.fn, ff: STAND.ff, hn: STAND.hn, hf: STAND.hf },
               Math.sin(clamp((t - T.t4) / HOLD, 0, 1) * Math.PI));
    } else if (t < T.t6) {                                        // turn around
      var r = (t - T.t5) / TURN;
      u = T.uEnd; len = T.seamLen; sinceOff = t - T.t3; face = Math.cos(Math.PI * r);
      P = mixP(STAND, DIP, Math.sin(Math.PI * r));
    } else if (t < T.t6a) {                                       // crouch, ready to jump
      u = T.uEnd; face = -1; len = T.seamLen; sinceOff = t - T.t3;
      P = mixP(STAND, SQUASH, sstep((t - T.t6) / ANT));
    } else {                                                      // leap out of the screen
      var k2 = clamp((t - T.t6a) / T_OUT, 0, 1);
      u = T.uEnd + (T.uStart - T.uEnd) * k2; face = -1; len = T.seamLen; sinceOff = t - T.t3;
      P = flightPose(k2, H_OUT);
      if (k2 < 0.12) P = mixP(SQUASH, P, sstep(k2 / 0.12));       // spring out of the crouch
    }
    return { P: P, u: u, face: face, arc: arc, len: len, sinceOff: sinceOff };
  }

  // how far (px) the pill is pressed down by his landings: two damped springs
  function bump(t) {
    var T = tl, y = 0, a = t - T.tL;
    if (a > 0) y += BUMP * Math.exp(-7 * a) * Math.sin(24 * a);
    a = t - T.tL2;
    if (a > 0) y += BUMP * 0.3 * Math.exp(-9 * a) * Math.sin(28 * a);
    return y;
  }

  /* ---------- draw ---------- */
  function ik(ax, ay, tx, ty, l1, l2, bend) {
    var dx = tx - ax, dy = ty - ay, d = Math.sqrt(dx * dx + dy * dy);
    var dd = clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
    var base = Math.atan2(dy, dx);
    var ang = base + bend * Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
    return { ex: ax + l1 * Math.cos(ang), ey: ay + l1 * Math.sin(ang),
             hx: ax + dd * Math.cos(base), hy: ay + dd * Math.sin(base) };
  }
  function line3(ax, ay, bx, by, cx, cy) {
    return 'M' + f(ax) + ' ' + f(ay) + ' L' + f(bx) + ' ' + f(by) + ' L' + f(cx) + ' ' + f(cy);
  }

  function draw(t) {
    var st = poseAt(t), P = st.P, T = tl;
    var face = Math.abs(st.face) < 0.03 ? 0.03 : st.face;

    E.fig.setAttribute('transform', 'translate(60 0) scale(' + T.side + ' 1) translate(' + f(st.u) + ' 0) scale(' + f(face) + ' 1) translate(-50 0)');

    // the pill gives way under his landings
    var by = bump(t);
    btn.style.translate = Math.abs(by) > 0.02 ? '0 ' + f(by) + 'px' : '';

    // legs
    var lf = ik(P.hx, P.hy, P.ff.x, P.ff.y, LT, LS, -1), ln = ik(P.hx, P.hy, P.fn.x, P.fn.y, LT, LS, -1);
    var d = line3(P.hx, P.hy, lf.ex, lf.ey, lf.hx, lf.hy); E.legFo.setAttribute('d', d); E.legFf.setAttribute('d', d);
    d = line3(P.hx, P.hy, ln.ex, ln.ey, ln.hx, ln.hy); E.legNo.setAttribute('d', d); E.legNf.setAttribute('d', d);
    E.bootF.setAttribute('transform', 'translate(' + f(lf.hx) + ' ' + f(lf.hy) + ') rotate(' + f(P.ff.a) + ')');
    E.bootN.setAttribute('transform', 'translate(' + f(ln.hx) + ' ' + f(ln.hy) + ') rotate(' + f(P.fn.a) + ')');

    // torso, pack, helmet
    var bt = 'translate(' + f(P.hx) + ' ' + f(P.hy) + ') rotate(' + f(P.lean) + ')';
    E.body.setAttribute('transform', bt);
    E.pack.setAttribute('transform', 'rotate(' + f(P.pack) + ' -12 -27)');
    E.head.setAttribute('transform', bt + ' rotate(' + f(P.head) + ' 2 -33)');

    // arms
    var sh = shoulder(P.hx, P.hy, P.lean);
    var af = ik(sh.x, sh.y, P.hf.x, P.hf.y, LA1, LA2, 1), an = ik(sh.x, sh.y, P.hn.x, P.hn.y, LA1, LA2, 1);
    d = line3(sh.x, sh.y, af.ex, af.ey, af.hx, af.hy); E.armFo.setAttribute('d', d); E.armFf.setAttribute('d', d);
    d = line3(sh.x, sh.y, an.ex, an.ey, an.hx, an.hy); E.armNo.setAttribute('d', d); E.armNf.setAttribute('d', d);
    E.armNs.setAttribute('x1', f(lerp(sh.x, an.ex, 0.3))); E.armNs.setAttribute('y1', f(lerp(sh.y, an.ey, 0.3)));
    E.armNs.setAttribute('x2', f(lerp(sh.x, an.ex, 0.85))); E.armNs.setAttribute('y2', f(lerp(sh.y, an.ey, 0.85)));
    E.gloveF.setAttribute('cx', f(af.hx)); E.gloveF.setAttribute('cy', f(af.hy));
    E.gloveN.setAttribute('cx', f(an.hx)); E.gloveN.setAttribute('cy', f(an.hy));
    E.torch.setAttribute('transform', 'translate(' + f(af.hx) + ' ' + f(af.hy) + ') rotate(' + f(P.torch) + ')');

    // arc at the nozzle
    var ca = Math.cos(P.torch * DEG), sa = Math.sin(P.torch * DEG);
    E.arc.setAttribute('transform', 'translate(' + f(af.hx + 8.5 * ca - 11 * sa) + ' ' + f(af.hy + 8.5 * sa + 11 * ca) + ')');
    E.arc.setAttribute('opacity', f(st.arc));

    // on the first visit the words are missing; they "weld in" along the seam as it is laid down, then stay for good
    if (!revealed && label) {
      var wProg = clamp(st.len / T.seamLen, 0, 1);
      label.style.setProperty('--lw', f(wProg));
      if (wProg >= 1) { revealed = true; label.classList.remove('qa-lblwait'); }
    }

    // the button's own label glows white-hot in sync with each spark, then cools back down
    if (label) {
      var heat = st.arc > 0 ? 1 : (st.sinceOff < 0 ? 1 : Math.exp(-st.sinceOff / 1.1));
      label.style.setProperty('--heat', f(heat));
    }

    // "done" shake + icon flash, once per visit
    if (!T.hit && t >= T.hitAt) { T.hit = true; done(); }
  }

  function done() {
    btn.classList.remove('qa-hit'); void btn.offsetWidth; btn.classList.add('qa-hit');
    setTimeout(function () { btn.classList.remove('qa-hit'); }, 1500);
    if (icon) {
      icon.classList.remove('qa-flash'); void icon.offsetWidth; icon.classList.add('qa-flash');
      setTimeout(function () { icon.classList.remove('qa-flash'); }, 1000);
    }
  }

  /* ---------- driver ---------- */
  var raf = 0, timer = 0, t0 = 0;

  function hideAll() {
    svg.style.visibility = 'hidden';
    if (label) label.style.setProperty('--heat', 0);
    btn.style.translate = '';
  }
  function visit() {
    tl = build(); tl.hit = false;
    svg.style.visibility = 'visible';
    t0 = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function loop(now) {
    var t = (now - t0) / 1000;
    if (t >= tl.tEnd) {
      hideAll();
      timer = setTimeout(visit, Math.max(2000, (LOOP - tl.tEnd) * 1000));
      return;
    }
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  function begin() {
    if (reduce) {                                                // reduced motion: hold one calm frame
      revealed = true; if (label) label.classList.remove('qa-lblwait');
      tl = build();
      svg.style.visibility = 'visible';
      draw(tl.t2 + BURST + STEP + BURST * 0.55);
      return;
    }
    visit();
  }

  hideAll();

  // wait for the splash screen to leave (and the pill to finish dropping in), then start
  function armStart() { setTimeout(begin, 1100); }
  var splash = document.getElementById('splash');
  if (splash) {
    var mo = new MutationObserver(function () {
      if (!document.getElementById('splash')) { mo.disconnect(); armStart(); }
    });
    mo.observe(document.body, { childList: true });
    setTimeout(function () { if (!tl) armStart(); }, 7000);        // safety net
  } else {
    armStart();
  }

  // test / preview hook
  window.__qaWelder = {
    preview: function (t) {
      clearTimeout(timer); cancelAnimationFrame(raf);
      if (!tl) { tl = build(); tl.hit = true; }
      svg.style.visibility = 'visible';
      draw(t); return tl;
    },
    timeline: function () { return tl || (tl = build()); },
    rebuild: function () { tl = build(); tl.hit = true; return tl; }      // re-measure (e.g. after a language switch)
  };
})();
