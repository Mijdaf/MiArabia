/* 3D coins for the "How we work" section — progressive enhancement */
(function () {
  'use strict';
  var sec = document.getElementById('process');
  if (!sec || sec.__p3d) return;
  var row = sec.querySelector('.process-circles');
  var btns = [].slice.call(sec.querySelectorAll('.process-circle'));
  if (!row || !btns.length) return;
  sec.__p3d = true;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer:fine)').matches;

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; e.setAttribute('aria-hidden', 'true'); return e; }

  btns.forEach(function (btn) {
    var ring = btn.querySelector('.process-circle-ring');
    var num = btn.querySelector('.process-circle-num');
    var label = btn.querySelector('.process-circle-label');
    if (!ring) return;
    var scene = el('span', 'p3d-scene'); scene.removeAttribute('aria-hidden');
    var flt = el('span', 'p3d-float'); flt.removeAttribute('aria-hidden');
    flt.appendChild(el('i', 'p3d-glow'));
    for (var n = 8; n >= 1; n--) { var l = el('i', 'p3d-layer'); l.style.setProperty('--n', n); flt.appendChild(l); }
    flt.appendChild(ring);
    var orbit = el('span', 'p3d-orbit'); orbit.appendChild(document.createElement('b')); flt.appendChild(orbit);
    if (num) flt.appendChild(num);
    scene.appendChild(flt);
    btn.insertBefore(el('i', 'p3d-shadow'), btn.firstChild);
    btn.insertBefore(scene, label || null);

    if (!reduce && fine) {
      btn.addEventListener('pointermove', function (e) {
        var r = scene.getBoundingClientRect();
        var nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.8)));
        var ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.8)));
        scene.style.setProperty('--ty', (nx * 28).toFixed(1) + 'deg');
        scene.style.setProperty('--tx', (-ny * 28).toFixed(1) + 'deg');
      });
      btn.addEventListener('pointerleave', function () {
        scene.style.setProperty('--ty', '0deg'); scene.style.setProperty('--tx', '0deg');
      });
    }
  });

  // flow rail behind the coins
  var rail = el('div', 'p3d-rail'); rail.appendChild(document.createElement('i'));
  row.insertBefore(rail, row.firstChild);
  function layoutRail() {
    var first = btns[0], last = btns[btns.length - 1];
    var rr = row.getBoundingClientRect(), a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
    var ringH = parseFloat(getComputedStyle(first).getPropertyValue('--r')) || 88;
    var x1 = Math.min(a.left + a.width / 2, b.left + b.width / 2) - rr.left;
    var x2 = Math.max(a.left + a.width / 2, b.left + b.width / 2) - rr.left;
    rail.style.left = x1 + 'px'; rail.style.width = (x2 - x1) + 'px';
    rail.style.top = (a.top - rr.top + ringH / 2) + 'px';
  }
  layoutRail();
  window.addEventListener('resize', layoutRail);
  window.addEventListener('load', layoutRail);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutRail);
  if (window.ResizeObserver) new ResizeObserver(layoutRail).observe(row);

  // pointer depth for headings + closing line
  if (!reduce && fine) {
    sec.addEventListener('pointermove', function (e) {
      var r = sec.getBoundingClientRect();
      sec.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      sec.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    }, { passive: true });
    sec.addEventListener('pointerleave', function () { sec.style.setProperty('--mx', 0); sec.style.setProperty('--my', 0); });
  }

  // pause loops when offscreen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { sec.classList.toggle('p3d-paused', !e.isIntersecting); if (e.isIntersecting) layoutRail(); });
    }, { threshold: 0.05 }).observe(sec);
  }
})();
