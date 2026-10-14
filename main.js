(function () {
  "use strict";
  var root = document.querySelector(".topos");
  if (!root) return;
  var proofArchive = document.querySelector(".proof-archive") || root;
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
  var lastSeekAt = -Infinity;
  var lastJourney = null;
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
    var nextChapter = targetProgress >= .67 ? 2 : targetProgress >= .22 ? 1 : 0;
    if (nextChapter !== chapter) {
      chapter = nextChapter;
    }
  }

  function seekFilm(now) {
    if (!video || reduced || !Number.isFinite(video.duration)) return;
    if (video.seeking || now - lastSeekAt < 125) return;
    var next = renderedProgress * Math.max(0.1, video.duration - 0.04);
    if (Math.abs(video.currentTime - next) > 0.035) {
      try { video.currentTime = next; lastSeekAt = now; } catch (_) {}
    }
  }

  function paintMotion(now) {
    var dt = Math.min(.08, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!paused && !reduced && document.visibilityState === "visible") notationClock += dt;
    renderedProgress += (targetProgress - renderedProgress) * (1 - Math.exp(-dt * 4.2));
    var journey = renderedProgress.toFixed(5);
    if (journey !== lastJourney) {
      proofArchive.style.setProperty("--journey", journey);
      lastJourney = journey;
    }
    if (!paused && !reduced) {
      var notation = String(Math.floor((notationClock % 15) / 3.75));
      if (root.dataset.notation !== notation) root.dataset.notation = notation;
    }
    seekFilm(now);
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
      seekFilm(performance.now());
    }, { once: true });
    video.load();
  }

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
