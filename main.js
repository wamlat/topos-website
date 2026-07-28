/* Topos Labs — figure animation, gluing demo, math rendering */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
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

    // ——— Figure 1: draw the pullback square when it scrolls into view ———
    var fig1 = document.getElementById("fig1");
    if (fig1) {
      if (reduceMotion || !("IntersectionObserver" in window)) {
        fig1.classList.add("animate"); // CSS gates the animation on motion pref
      } else {
        var fio = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              fig1.classList.add("animate");
              fio.unobserve(fig1);
            }
          });
        }, { threshold: 0.4 });
        fio.observe(fig1);
      }
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

    // ——— Figure 2: glue / unglue ———
    var btn = document.getElementById("glue-btn");
    var svg = document.getElementById("glue-svg");
    var state = document.getElementById("glue-state");
    if (btn && svg) {
      btn.addEventListener("click", function () {
        var glued = svg.classList.toggle("glued");
        btn.setAttribute("aria-pressed", String(glued));
        btn.textContent = glued ? "Unglue" : "Glue sections";
        if (state) {
          state.textContent = glued
            ? "one global section s ∈ F(U₁ ∪ U₂), by (1)"
            : "two local sections, agreeing on U₁ ∩ U₂";
        }
      });
    }
  });
})();
