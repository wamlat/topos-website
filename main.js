/* Topos Labs — étale layer + Hopf fibration */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BLUE = [45, 89, 165];
  var RED = [190, 61, 46];

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  function mix(c1, c2, w) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * w),
      Math.round(c1[1] + (c2[1] - c1[1]) * w),
      Math.round(c1[2] + (c2[2] - c1[2]) * w)
    ];
  }

  /* ——— the Hopf fibration ———
     Fiber over (α, β) ∈ S²:  s ↦ (cos(β/2)e^{is}, sin(β/2)e^{i(s+α)}) ∈ S³,
     then a (softened) stereographic projection S³ → R³ and a slow tumble. */
  function initHopf(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    function resize() {
      W = canvas.clientWidth || 600;
      H = Math.round(W * 0.62);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    var FIBERS = 22, SEG = 64;
    var t = reduceMotion ? 2.4 : 0;
    var beta = 1.15, betaTarget = null;
    var visible = true;

    if (!reduceMotion) {
      canvas.addEventListener("pointermove", function (e) {
        var r = canvas.getBoundingClientRect();
        betaTarget = 0.5 + 1.4 * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      }, { passive: true });
      canvas.addEventListener("pointerleave", function () { betaTarget = null; });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(canvas);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var cb = Math.cos(beta / 2), sb = Math.sin(beta / 2);
      var a1 = t * 0.55, a2 = t * 0.34;
      var c1 = Math.cos(a1), s1 = Math.sin(a1);
      var c2 = Math.cos(a2), s2 = Math.sin(a2);
      var scale = H * 0.4, cx = W / 2, cy = H / 2;

      for (var k = 0; k < FIBERS; k++) {
        var alpha = 2 * Math.PI * k / FIBERS + t * 0.12;
        var col = mix(BLUE, RED, (1 - Math.cos(alpha)) / 2);
        var px = 0, py = 0;
        for (var i = 0; i <= SEG; i++) {
          var s = 2 * Math.PI * i / SEG;
          var x1 = cb * Math.cos(s), y1 = cb * Math.sin(s);
          var x2 = sb * Math.cos(s + alpha), y2 = sb * Math.sin(s + alpha);
          var den = 1.28 - y2;
          var X = x1 / den, Y = y1 / den, Z = x2 / den;
          var Yr = Y * c1 - Z * s1, Zr = Y * s1 + Z * c1;
          var Xr = X * c2 + Zr * s2;
          Zr = -X * s2 + Zr * c2;
          var f = 3.6 / (3.6 - Zr);
          var sx = cx + Xr * f * scale;
          var sy = cy + Yr * f * scale;
          if (i > 0) {
            var zn = Math.min(1, Math.max(0, (Zr + 1.9) / 3.8));
            ctx.strokeStyle = rgba(col, 0.16 + 0.55 * zn);
            ctx.lineWidth = 0.6 + 1.1 * zn;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
          px = sx; py = sy;
        }
      }
    }

    if (reduceMotion) {
      draw();
      window.addEventListener("resize", draw);
      return;
    }

    (function frame() {
      if (visible) {
        t += 0.008;
        var auto = 1.2 + 0.55 * Math.sin(t * 0.5);
        var target = betaTarget === null ? auto : betaTarget;
        beta += (target - beta) * 0.05;
        draw();
      }
      requestAnimationFrame(frame);
    })();
  }

  onReady(function () {
    // ——— étale layer: reveal marginalia near the cursor ———
    var etale = document.getElementById("etale");
    if (etale && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
      document.addEventListener("pointermove", function (e) {
        etale.style.setProperty("--mx", e.clientX + "px");
        etale.style.setProperty("--my", e.clientY + "px");
        etale.classList.add("on");
      }, { passive: true });
      document.documentElement.addEventListener("pointerleave", function () {
        etale.classList.remove("on");
      });
    }

    var hopf = document.getElementById("hopf");
    if (hopf && hopf.getContext) initHopf(hopf);
  });
})();
