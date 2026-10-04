/* 3D animated capability tree — self-contained, progressive enhancement */
(function () {
  'use strict';
  var kicker = document.querySelector('[data-kicker]');
  if (!kicker || kicker.__k3d) return;
  var anchor = kicker.querySelector('[data-anchor]');
  var sub = kicker.querySelector('[data-kicker-sub]');
  if (!anchor || !sub) return;
  kicker.__k3d = true;

  var pills = [].slice.call(sub.querySelectorAll('.spec-pill'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer:fine)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  // wrap everything in a tiltable 3D stage (keeps the .reveal transform on the outer element untouched)
  var stage = document.createElement('div');
  stage.className = 'k3d-stage';
  while (kicker.firstChild) stage.appendChild(kicker.firstChild);
  kicker.appendChild(stage);
  kicker.classList.add('k3d');

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'k3d-lines');
  svg.setAttribute('aria-hidden', 'true');
  stage.insertBefore(svg, stage.firstChild);

  var core = document.createElement('div');
  core.className = 'k3d-core';
  core.setAttribute('aria-hidden', 'true');
  core.innerHTML = '<i class="k3d-ring"></i><i class="k3d-ring r2"></i><i class="k3d-orb"></i>';
  stage.appendChild(core);

  for (var n = 0; n < 14; n++) {
    var d = document.createElement('i');
    d.className = 'k3d-dust';
    var z = Math.round(Math.random() * 250 - 170);
    var s = 2 + ((z + 170) / 420) * 4;
    d.style.cssText = 'left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;width:' + s + 'px;height:' + s +
      'px;transform:translateZ(' + z + 'px);animation-delay:-' + (Math.random() * 8) + 's;animation-duration:' + (6 + Math.random() * 6) +
      's;opacity:' + (0.25 + Math.random() * 0.5);
    d.setAttribute('aria-hidden', 'true');
    stage.appendChild(d);
  }

  var paths = [], pulses = [];
  pills.forEach(function (p, i) {
    p.style.setProperty('--i', i);
    for (var k = 4; k >= 1; k--) {
      var slab = document.createElement('i');
      slab.className = 'k3d-slab';
      slab.setAttribute('aria-hidden', 'true');
      slab.style.setProperty('--n', -k);
      p.insertBefore(slab, p.firstChild);
    }
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('class', 'k3d-line');
    path.setAttribute('pathLength', '1');
    path.style.setProperty('--i', i);
    svg.appendChild(path);
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('class', 'k3d-pulse');
    c.setAttribute('r', '3.5');
    svg.appendChild(c);
    paths.push(path); pulses.push(c);
  });

  var ax = 0, ay = 0, geo = [];
  // offset of el relative to the stage (walks the offsetParent chain; unaffected by 3D transforms)
  function posIn(el) {
    var x = 0, y = 0, n = el;
    while (n && n !== stage) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x, y: y };
  }
  function measure() {
    svg.setAttribute('viewBox', '0 0 ' + stage.offsetWidth + ' ' + stage.offsetHeight);
    var a = posIn(anchor);
    ax = a.x + anchor.offsetWidth / 2;
    ay = a.y + anchor.offsetHeight + 6;
    core.style.left = ax + 'px';
    core.style.top = ay + 'px';
    geo = pills.map(function (p) { var q = posIn(p); return { x: q.x + p.offsetWidth / 2, y: q.y }; });
  }
  // live position of a pill: layout position + the in-flight shuffle (FLIP) `translate`
  function livePos(p) {
    var q = posIn(p), tr = 0, ty2 = 0;
    var v = getComputedStyle(p).translate;
    if (v && v !== 'none') { var m = v.split(' '); tr = parseFloat(m[0]) || 0; ty2 = parseFloat(m[1]) || 0; }
    return { x: q.x + tr + p.offsetWidth / 2, y: q.y + ty2 };
  }

  var rx = 0, ry = 0, tx = 0, ty = 0, t0 = performance.now(), raf = 0;
  function frame(now) {
    var t = (now - t0) / 1000;
    var k = window.innerWidth < 900 ? 0.5 : 1;
    var sway = reduce ? 0 : 1;
    rx += (tx * k + Math.sin(t * 0.55) * 2.2 * sway - rx) * 0.08;
    ry += (ty * k + Math.cos(t * 0.42) * 3.6 * sway - ry) * 0.08;
    stage.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    var a0 = posIn(anchor); ax = a0.x + anchor.offsetWidth / 2; ay = a0.y + anchor.offsetHeight + 6;
    core.style.left = ax + 'px'; core.style.top = ay + 'px';
    for (var i = 0; i < pills.length; i++) {
      var g = livePos(pills[i]);
      var bob = reduce ? 0 : Math.sin(t * 1.3 + i * 1.9) * 5;
      pills[i].style.setProperty('--bob', bob.toFixed(2) + 'px');
      var y2 = g.y + bob + 4, dy = y2 - ay;
      paths[i].setAttribute('d', 'M' + ax + ' ' + ay + ' C' + (ax + (g.x - ax) * 0.1) + ' ' + (ay + dy * 0.65) + ' ' + g.x + ' ' + (y2 - dy * 0.6) + ' ' + g.x + ' ' + y2);
      if (!reduce) {
        var pr = (t * 0.32 + i * 0.21) % 1;
        var pt = paths[i].getPointAtLength(pr * paths[i].getTotalLength());
        pulses[i].setAttribute('cx', pt.x);
        pulses[i].setAttribute('cy', pt.y);
        pulses[i].setAttribute('opacity', Math.sin(pr * Math.PI).toFixed(2));
      }
    }
    if (!reduce) raf = requestAnimationFrame(frame);
  }

  if (!reduce && fine) {
    window.addEventListener('pointermove', function (e) {
      var r = kicker.getBoundingClientRect();
      var nx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      var ny = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      ty = Math.max(-1, Math.min(1, nx)) * 14;
      tx = -Math.max(-1, Math.min(1, ny)) * 9;
    }, { passive: true });
  }

  measure();
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(measure);
    ro.observe(stage); ro.observe(sub); ro.observe(anchor);
  }
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function start() {
    if (reduce) { frame(performance.now()); return; }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          measure(); start();
          if (!kicker.classList.contains('k3d-in')) {
            requestAnimationFrame(function () { kicker.classList.add('k3d-in'); });
            setTimeout(function () { kicker.classList.add('k3d-done'); }, 2400);
          }
        } else if (!reduce) { stop(); }
      });
    }, { threshold: 0.15 }).observe(kicker);
  } else {
    measure(); start(); kicker.classList.add('k3d-in', 'k3d-done');
  }
})();
