(function () {
  "use strict";
  var root = document.querySelector(".topos");
  if (!root) return;
  var video = document.querySelector(".scroll-scrub__video");
  var poster = document.querySelector(".scroll-scrub__poster");
  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reducedQuery.matches;
  var mobileQuery = window.matchMedia("(max-width: 860px)");
  var paused = false;
  var duration = 15;
  var targetProgress = 0;
  var renderedProgress = 0;
  var notationClock = 0;
  var lastTime = performance.now();
  var raf = 0;
  var chapter = 0;
  var chapterPositions = [0, .48, 1];

  function setGrade(id) {
    root.dataset.grade = id;
    document.querySelectorAll(".grade-chip").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.swatch === id ? "true" : "false");
    });
    try { localStorage.setItem("topos-grade", id); } catch (_) {}
  }

  function updateProgress() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetProgress = Math.max(0, Math.min(1, window.scrollY / max));
    root.style.setProperty("--journey", targetProgress.toFixed(5));
    var nextChapter = targetProgress >= .67 ? 2 : targetProgress >= .22 ? 1 : 0;
    if (nextChapter !== chapter) {
      chapter = nextChapter;
      document.querySelectorAll(".contact-frame").forEach(function (button, index) {
        if (index === chapter) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    }
  }

  function seekFilm() {
    if (!video || reduced || !Number.isFinite(video.duration)) return;
    var next = targetProgress * Math.max(0.1, video.duration - 0.04);
    if (Math.abs(video.currentTime - next) > 0.018) {
      try { video.currentTime = next; } catch (_) {}
    }
  }

  function paintMotion(now) {
    var dt = Math.min(.08, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!paused && !reduced && document.visibilityState === "visible") notationClock += dt;
    renderedProgress += (targetProgress - renderedProgress) * Math.min(1, dt * 9);
    root.style.setProperty("--journey", renderedProgress.toFixed(5));
    if (!paused && !reduced) {
      var phase = (notationClock % 15) / 15;
      var angle = phase * Math.PI * 2;
      var reveal = .56 + .22 * Math.sin(angle + .5) + .045 * Math.sin(2 * angle - .7);
      root.style.setProperty("--trace-reveal", Math.max(0, Math.min(1, reveal)).toFixed(5));
      root.dataset.notation = String(Math.floor((notationClock % 15) / 3.75));
    }
    seekFilm();
    raf = window.requestAnimationFrame(paintMotion);
  }

  function jump(position) {
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: max * position, behavior: reduced ? "auto" : "smooth" });
  }

  function loadFilm() {
    if (!video || reduced) return;
    video.src = mobileQuery.matches ? "assets/world/scene-01-mobile.mp4" : "assets/world/scene-01.mp4";
    video.addEventListener("loadedmetadata", function () {
      duration = video.duration || duration;
      seekFilm();
    }, { once: true });
    video.load();
  }

  document.querySelectorAll(".contact-frame").forEach(function (button, index) {
    button.addEventListener("click", function () {
      chapter = index;
      jump(chapterPositions[index]);
    });
  });
  document.querySelector(".descend")?.addEventListener("click", function () {
    jump(chapter === 2 ? 0 : chapterPositions[chapter + 1]);
  });
  document.querySelector(".motion-switch")?.addEventListener("click", function () {
    paused = !paused;
    root.dataset.paused = String(paused);
    this.setAttribute("aria-pressed", String(paused));
    this.setAttribute("aria-label", paused ? "Resume photographic motion" : "Hold photographic motion");
    this.setAttribute("title", paused ? "Resume photographic motion" : "Hold photographic motion");
    var icon = this.querySelector("img");
    if (icon) icon.src = paused ? "assets/identity/play.png" : "assets/identity/pause.png";
  });
  document.querySelectorAll(".grade-chip").forEach(function (button) {
    button.addEventListener("click", function () { setGrade(button.dataset.swatch); });
  });
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  reducedQuery.addEventListener?.("change", function (event) {
    reduced = event.matches;
    if (reduced && video) { video.removeAttribute("src"); video.load(); }
    else loadFilm();
  });
  try {
    var saved = localStorage.getItem("topos-grade");
    if (saved === "silver" || saved === "iron" || saved === "selenium") setGrade(saved);
  } catch (_) {}
  updateProgress();
  loadFilm();
  raf = window.requestAnimationFrame(paintMotion);
})();
