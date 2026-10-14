(function () {
  "use strict";
  var root = document.querySelector(".topos");
  if (!root) return;
  var irisNotations = document.querySelector(".iris-notations");
  var scrollStage = document.querySelector(".scroll-scrub__stage");
  var media = document.querySelector(".scroll-scrub__media");
  var frames = Array.from(document.querySelectorAll(".film-frame"));
  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reducedQuery.matches;
  var mobileQuery = window.matchMedia("(hover: none) and (pointer: coarse), (max-width: 860px)");
  var paused = false;
  var targetProgress = 0;
  var renderedProgress = 0;
  var notationClock = 0;
  var lastTime = performance.now();
  var lastIrisTransform = "";
  var chapter = 0;
  var chapterPositions = [0, .48, 1];
  var eyeKeys = [
    [786, 426, 30], [782, 419, 39], [769, 403, 48], [763, 401, 62],
    [762, 391, 88], [767, 383, 135], [760, 379, 219]
  ];
  var frameMetrics = [];
  var measuredWidth = 0;
  var measuredHeight = 0;
  var measuredMobile = null;
  var activePair = [-1, -1];
  var lastFilmProgress = -1;

  function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
  function smooth(low, high, value) {
    var t = clamp((value - low) / (high - low), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function measureFilm() {
    if (!media || !frames.length) return;
    var width = media.clientWidth;
    var height = media.clientHeight;
    var mobile = mobileQuery.matches;
    if (width === measuredWidth && height === measuredHeight && mobile === measuredMobile) return;
    measuredWidth = width;
    measuredHeight = height;
    measuredMobile = mobile;
    var sourceWidth = mobile ? 960 : 1440;
    var sourceHeight = mobile ? 540 : 810;
    var sourceScale = sourceWidth / 1440;
    var fit = Math.max(width / sourceWidth, height / sourceHeight);
    var left = (width - sourceWidth * fit) / 2;
    var top = (height - sourceHeight * fit) / 2;
    frameMetrics = eyeKeys.map(function (key) {
      return { x: left + key[0] * sourceScale * fit,
        y: top + key[1] * sourceScale * fit, radius: key[2] * sourceScale * fit };
    });
    lastFilmProgress = -1;
  }

  function warmFrames() {
    if (reduced) return;
    frames.forEach(function (frame) {
      var image = frame.querySelector("img");
      if (image && image.decode) image.decode().catch(function () {});
    });
  }

  function placeFrame(index, centerX, centerY, radius) {
    var frame = frames[index];
    var metric = frameMetrics[index];
    var scale = radius / metric.radius;
    var x = centerX - scale * metric.x;
    var y = centerY - scale * metric.y;
    frame.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + scale.toFixed(5) + ")";
  }

  function paintFilm(progress) {
    if (reduced || frames.length < 2 || frameMetrics.length !== frames.length) return;
    var nextProgress = clamp(progress, 0, 1);
    if (Math.abs(nextProgress - lastFilmProgress) < .00001) return;
    var position = nextProgress * (frames.length - 1);
    var first = Math.min(frames.length - 2, Math.floor(position));
    var second = first + 1;
    var local = position - first;
    if (activePair[0] !== first || activePair[1] !== second) {
      frames.forEach(function (frame, index) {
        var active = index === first || index === second;
        frame.style.visibility = active ? "visible" : "hidden";
        frame.style.willChange = active ? "transform, opacity" : "auto";
      });
      activePair = [first, second];
    }
    var start = frameMetrics[first];
    var end = frameMetrics[second];
    var centerX = start.x + (end.x - start.x) * local;
    var centerY = start.y + (end.y - start.y) * local;
    var radius = Math.exp(Math.log(start.radius) + (Math.log(end.radius) - Math.log(start.radius)) * local);
    placeFrame(first, centerX, centerY, radius);
    placeFrame(second, centerX, centerY, radius);
    var blend = smooth(.72, .96, local);
    frames[first].style.opacity = "1";
    frames[second].style.opacity = blend.toFixed(4);
    var showFirst = blend < 1;
    var showSecond = blend > 0;
    if (frames[first].style.visibility !== (showFirst ? "visible" : "hidden")) frames[first].style.visibility = showFirst ? "visible" : "hidden";
    if (frames[second].style.visibility !== (showSecond ? "visible" : "hidden")) frames[second].style.visibility = showSecond ? "visible" : "hidden";
    if (frames[first].style.willChange !== (showFirst ? "transform, opacity" : "auto")) frames[first].style.willChange = showFirst ? "transform, opacity" : "auto";
    if (frames[second].style.willChange !== (showSecond ? "transform, opacity" : "auto")) frames[second].style.willChange = showSecond ? "transform, opacity" : "auto";
    lastFilmProgress = nextProgress;
  }

  function setGrade(id) {
    root.dataset.grade = id;
    document.querySelectorAll(".grade-chip").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.swatch === id ? "true" : "false");
    });
    try { localStorage.setItem("topos-grade", id); } catch (_) {}
  }

  function updateProgress() {
    var max = Math.max(1, document.documentElement.scrollHeight - (scrollStage ? scrollStage.clientHeight : window.innerHeight));
    targetProgress = Math.max(0, Math.min(1, window.scrollY / max));
    var nextChapter = targetProgress >= .67 ? 2 : targetProgress >= .22 ? 1 : 0;
    if (nextChapter !== chapter) {
      chapter = nextChapter;
    }
  }

  function paintMotion(now) {
    var dt = Math.min(.08, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!paused && !reduced && document.visibilityState === "visible") notationClock += dt;
    renderedProgress += (targetProgress - renderedProgress) * (1 - Math.exp(-dt * 4.2));
    var irisTransform = "translate(-50%, -50%) scale(" + (1 + renderedProgress * .48).toFixed(5) + ")";
    if (irisNotations && irisTransform !== lastIrisTransform) {
      irisNotations.style.transform = irisTransform;
      lastIrisTransform = irisTransform;
    }
    if (!paused && !reduced) {
      var notation = String(Math.floor((notationClock % 15) / 3.75));
      if (root.dataset.notation !== notation) root.dataset.notation = notation;
    }
    paintFilm(renderedProgress);
    window.requestAnimationFrame(paintMotion);
  }

  function jump(position) {
    var max = Math.max(0, document.documentElement.scrollHeight - (scrollStage ? scrollStage.clientHeight : window.innerHeight));
    window.scrollTo({ top: max * position, behavior: reduced ? "auto" : "smooth" });
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
  window.addEventListener("resize", function () { updateProgress(); measureFilm(); });
  reducedQuery.addEventListener?.("change", function (event) {
    reduced = event.matches;
    if (!reduced) { measureFilm(); warmFrames(); paintFilm(renderedProgress); }
  });
  mobileQuery.addEventListener?.("change", function () { measureFilm(); warmFrames(); });
  try {
    var saved = localStorage.getItem("topos-grade");
    if (saved === "silver" || saved === "iron" || saved === "selenium") setGrade(saved);
  } catch (_) {}
  updateProgress();
  measureFilm();
  warmFrames();
  window.requestAnimationFrame(paintMotion);
})();
