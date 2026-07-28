/* Topos Labs — math rendering, étale layer, Hopf fibration, the rising sea */
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

  /* ——— Figure 1: the Hopf fibration ———
     Fiber over (α, β) ∈ S²:  s ↦ (cos(β/2)e^{is}, sin(β/2)e^{i(s+α)}) ∈ S³,
     then a (softened) stereographic projection S³ → R³ and a slow tumble. */
  function initHopf(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    function resize() {
      W = canvas.clientWidth || 600;
      H = Math.round(W * 0.68);
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
        var base = 2 * Math.PI * k / FIBERS;
        var alpha = base + t * 0.12;
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

      /* base-space inset: S² with the latitude being fibered */
      var r0 = 26, bx = 52, by = H - 52;
      ctx.strokeStyle = "rgba(141,137,126,0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(bx, by, r0, 0, 2 * Math.PI);
      ctx.stroke();
      var ry = by - r0 * Math.cos(beta);
      var rx = r0 * Math.sin(beta);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(bx, ry, rx, rx * 0.3, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(RED, 0.9);
      ctx.beginPath();
      ctx.arc(bx + rx * Math.cos(t * 0.7), ry + rx * 0.3 * Math.sin(t * 0.7), 2.4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "rgba(141,137,126,1)";
      ctx.font = "italic 13px 'STIX Two Text', Georgia, serif";
      ctx.fillText("S²", bx + r0 + 7, by + 4);
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

  /* ——— the rising sea (Grothendieck): red, at the bottom, higher as you scroll ——— */
  function initSea(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, t = 0;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function scrollFrac() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, window.scrollY / max) : 0;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var level = H * (0.88 - 0.36 * scrollFrac());
      for (var L = 0; L < 4; L++) {
        var amp = 8 + L * 7;
        var kx = 0.010 - L * 0.0022;
        var top = level + L * 16;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var x = 0; x <= W; x += 8) {
          ctx.lineTo(x, top + amp * Math.sin(x * kx + t * (0.5 + L * 0.22) + L * 2.1));
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = rgba(RED, 0.10 - L * 0.015);
        ctx.fill();
        if (L === 0) {
          ctx.strokeStyle = rgba(RED, 0.4);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    if (reduceMotion) {
      draw();
      window.addEventListener("scroll", draw, { passive: true });
      window.addEventListener("resize", draw);
      return;
    }

    (function frame() {
      if (!document.hidden) {
        t += 0.016;
        draw();
      }
      requestAnimationFrame(frame);
    })();
  }

  onReady(function () {
    // ——— KaTeX auto-render (scripts are deferred, so it exists by now) ———
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    }

    // ——— scroll reveal ———
    var revealed = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealed.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      revealed.forEach(function (el) { io.observe(el); });
    }

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

    var sea = document.getElementById("sea");
    if (sea && sea.getContext) initSea(sea);
  });
})();
