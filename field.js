(function () {
  "use strict";

  var root = document.querySelector(".topos");
  var stage = document.querySelector(".angel-stage");
  var tissueFeather = document.querySelector(".angel-tissue--feather");
  var tissueWheel = document.querySelector(".angel-tissue--wheel");
  var canvas = document.querySelector(".angel-field-canvas");
  var diffuseCanvas = document.querySelector(".angel-diffuse-canvas");
  if (!root || !stage || !canvas || !diffuseCanvas) return;
  var context = canvas.getContext("2d", { alpha: true });
  var diffuseContext = diffuseCanvas.getContext("2d", { alpha: true });
  if (!context || !diffuseContext) return;
  var historyA = document.createElement("canvas");
  var historyB = document.createElement("canvas");
  var scratch = document.createElement("canvas");
  var historyAContext = historyA.getContext("2d", { alpha: true });
  var historyBContext = historyB.getContext("2d", { alpha: true });
  var scratchContext = scratch.getContext("2d", { alpha: true });
  var historyCurrent = historyA;
  var historyNext = historyB;
  var historyScale = .4;
  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var sourcePaths = [
    "assets/angels/ophanim-wheel-v1.webp",
    "assets/angels/seraph-wing-v1.webp"
  ];
  var crops = [
    { source: 0, rect: [132, 165, 375, 255], kind: "feather" },
    { source: 0, rect: [400, 35, 440, 210], kind: "eye" },
    { source: 0, rect: [755, 125, 290, 505], kind: "arc" },
    { source: 0, rect: [575, 535, 350, 160], kind: "eye" },
    { source: 0, rect: [205, 728, 475, 190], kind: "eye" },
    { source: 0, rect: [625, 805, 300, 330], kind: "feather" },
    { source: 1, rect: [188, 36, 365, 395], kind: "feather" },
    { source: 1, rect: [700, 20, 390, 400], kind: "feather" },
    { source: 1, rect: [455, 470, 405, 255], kind: "eye" },
    { source: 1, rect: [20, 360, 510, 390], kind: "feather" },
    { source: 1, rect: [845, 365, 420, 395], kind: "feather" },
    { source: 1, rect: [260, 745, 390, 435], kind: "feather" },
    { source: 1, rect: [675, 740, 400, 460], kind: "feather" }
  ];
  var eyeIndices = [1, 3, 4, 8];
  var arcIndices = [2];
  var featherIndices = [0, 5, 6, 7, 9, 10, 11, 12];
  var sprites = [];
  var particles = [];
  var videos = [];
  var videoTextures = [];
  var videoTextureContexts = [];
  var videoMask = null;
  var fieldLoaded = false;
  var width = window.innerWidth;
  var height = window.innerHeight;
  var mobile = width < 700;
  var ratio = 1;
  var sizedOnce = false;
  var clock = 3;
  var lastFrame = performance.now();
  var lastPaint = 0;
  var scrollPosition = 0;
  var displayedPhase = 0;
  var tissueX = 0;
  var tissueY = 0;
  var pointer = null;
  var pulses = [];
  var rootVariables = {};
  var stageVariables = {};
  var lastFeatherTransform = "";
  var lastWheelTransform = "";

  function random(seed) {
    var value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }
  function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
  function smooth(low, high, value) {
    var t = clamp((value - low) / (high - low), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function mix(a, b, t) { return a + (b - a) * t; }
  function setVariable(element, cache, name, value) {
    if (cache[name] === value) return;
    cache[name] = value;
    element.style.setProperty(name, value);
  }
  function normalize(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function loadImage(path) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = reject;
      image.src = path;
    });
  }

  function createSprite(image, crop, index) {
    var rect = crop.rect;
    var scale = 260 / Math.max(rect[2], rect[3]);
    var sprite = document.createElement("canvas");
    sprite.width = Math.max(1, Math.round(rect[2] * scale));
    sprite.height = Math.max(1, Math.round(rect[3] * scale));
    var brush = sprite.getContext("2d", { alpha: true });
    brush.drawImage(image, rect[0], rect[1], rect[2], rect[3], 0, 0, sprite.width, sprite.height);
    brush.globalCompositeOperation = "destination-in";
    brush.save();
    brush.translate(sprite.width / 2, sprite.height / 2);
    brush.scale(sprite.width / 2, sprite.height / 2);
    var edge = brush.createRadialGradient(0, 0, .12, 0, 0, 1);
    edge.addColorStop(0, "rgba(0,0,0,1)");
    edge.addColorStop(.47, "rgba(0,0,0,.94)");
    edge.addColorStop(.72, "rgba(0,0,0,.44)");
    edge.addColorStop(1, "rgba(0,0,0,0)");
    brush.fillStyle = edge;
    brush.fillRect(-1, -1, 2, 2);
    brush.restore();
    brush.globalCompositeOperation = "source-over";
    return { image: sprite, kind: crop.kind, aspect: sprite.width / sprite.height, index: index };
  }

  function makeVideoMask() {
    var mask = document.createElement("canvas");
    mask.width = mask.height = 96;
    var brush = mask.getContext("2d");
    var fade = brush.createRadialGradient(48, 48, 4, 48, 48, 47);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(.52, "rgba(0,0,0,.7)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    brush.fillStyle = fade;
    brush.fillRect(0, 0, 96, 96);
    return mask;
  }

  function buildVideos() {
    videoMask = makeVideoMask();
    videos = [0, 1, 2, 3].map(function (index) {
      var video = document.createElement("video");
      video.src = "assets/swarm/loop-" + index + ".mp4";
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = "auto";
      video.addEventListener("loadedmetadata", function () {
        try { video.currentTime = (index * .71) % Math.max(1, video.duration); } catch (_) {}
        video.play().catch(function () {});
      }, { once: true });
      var texture = document.createElement("canvas");
      texture.width = texture.height = 96;
      videoTextures[index] = texture;
      videoTextureContexts[index] = texture.getContext("2d", { alpha: true });
      return video;
    });
    updateVideoPlayback();
  }

  function buildParticles() {
    particles = [];
    var count = mobile ? 122 : 220;
    var centerX = width * (mobile ? .59 : .5);
    var centerY = height * .51;
    for (var index = 0; index < count; index++) {
      var kind = index % 19 === 0 ? "eye" : index % 5 === 0 ? "arc" : "feather";
      var choices = kind === "eye" ? eyeIndices : kind === "arc" ? arcIndices : featherIndices;
      var spriteIndex = choices[Math.floor(random(index + 13) * choices.length)];
      var weight = random(index + 23);
      var scale = weight < .5 ? (mobile ? 6 : 8) + random(index + 31) * (mobile ? 10 : 14)
        : weight < .92 ? (mobile ? 17 : 21) + random(index + 37) * (mobile ? 20 : 28)
        : (mobile ? 36 : 45) + random(index + 41) * (mobile ? 17 : 26);
      scale *= 1.14;
      if (kind === "eye") scale = Math.max(scale, mobile ? 24 : 30);
      var angle = random(index + 47) * Math.PI * 2;
      var radius = kind === "eye" ? .36 + random(index + 53) * .55
        : kind === "arc" ? .55 + random(index + 53) * .85
        : .74 + random(index + 53) * .95;
      var x = centerX + Math.cos(angle) * width * (mobile ? .29 : .29) * radius;
      var y = centerY + Math.sin(angle) * height * (mobile ? .23 : .25) * radius;
      particles.push({
        x: x, y: y,
        vx: (random(index + 59) - .5) * 36,
        vy: (random(index + 61) - .5) * 36,
        angle: (random(index + 67) - .5) * .34,
        baseAngle: angle,
        phase: random(index + 71) * Math.PI * 2,
        radius: radius,
        size: scale,
        ink: .85,
        flow: 0,
        depth: .52 + random(index + 73) * .48,
        opacity: kind === "eye" ? .21 : weight < .5 ? .06 : .15,
        sprite: sprites[spriteIndex],
        videoIndex: kind === "eye" && index % 3 === 0 ? index % 4 : -1
      });
    }
    stage.dataset.fragments = String(particles.length);
  }

  function resize() {
    var previousWidth = width;
    var previousHeight = height;
    var nextMobile = window.innerWidth < 700;
    var nextRatio = Math.min(nextMobile ? 1.25 : 1.6, window.devicePixelRatio || 1);
    if (sizedOnce && previousWidth === window.innerWidth && previousHeight === window.innerHeight && ratio === nextRatio) {
      updateScroll();
      return;
    }
    var previousMobile = mobile;
    width = window.innerWidth;
    height = window.innerHeight;
    sizedOnce = true;
    mobile = nextMobile;
    ratio = nextRatio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    historyScale = Math.min(.42, Math.sqrt(400000 / Math.max(1, width * height)));
    var bufferWidth = Math.max(1, Math.round(width * historyScale));
    var bufferHeight = Math.max(1, Math.round(height * historyScale));
    diffuseCanvas.width = bufferWidth;
    diffuseCanvas.height = bufferHeight;
    [historyA, historyB, scratch].forEach(function (surface) {
      surface.width = bufferWidth;
      surface.height = bufferHeight;
    });
    historyCurrent = historyA;
    historyNext = historyB;
    if (particles.length && previousMobile !== mobile && sprites.length) {
      buildParticles();
    } else if (particles.length) {
      particles.forEach(function (part) {
        part.x *= width / Math.max(1, previousWidth);
        part.y *= height / Math.max(1, previousHeight);
      });
    }
    updateScroll();
    if (!particles.length) displayedPhase = scrollPosition;
  }

  function clearHistory() {
    historyAContext.clearRect(0, 0, historyA.width, historyA.height);
    historyBContext.clearRect(0, 0, historyB.width, historyB.height);
    scratchContext.clearRect(0, 0, scratch.width, scratch.height);
    historyCurrent = historyA;
    historyNext = historyB;
    diffuseContext.clearRect(0, 0, diffuseCanvas.width, diffuseCanvas.height);
  }

  function updateScroll() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollPosition = clamp(window.scrollY / max, 0, 1);
  }

  // Reuse the three drifting centers for every fragment in this frame.
  function prepareCurrents(centerX, centerY) {
    var scale = Math.min(width, height);
    return [
      { x: centerX - scale * .23 + Math.sin(clock * .11) * scale * .08,
        y: centerY - scale * .12 + Math.cos(clock * .16) * scale * .06,
        radius: scale * .37, spin: .13 },
      { x: centerX + scale * .25 + Math.sin(clock * .14 + 1.8) * scale * .07,
        y: centerY + scale * .1 + Math.sin(clock * .1) * scale * .08,
        radius: scale * .41, spin: -.115 },
      { x: centerX + Math.cos(clock * .075 + 2.1) * scale * .12,
        y: centerY - scale * .28 + Math.sin(clock * .12 + 2.3) * scale * .07,
        radius: scale * .34, spin: .085 }
    ];
  }

  function currentAt(x, y, currents, result) {
    var vx = Math.sin(clock * .17 + y * .003) * 3;
    var vy = Math.cos(clock * .12 + x * .002) * 3;
    for (var index = 0; index < currents.length; index++) {
      var current = currents[index];
      var dx = x - current.x;
      var dy = y - current.y;
      var reach = Math.exp(-(dx * dx + dy * dy) / (current.radius * current.radius));
      vx -= dy * current.spin * reach;
      vy += dx * current.spin * reach;
    }
    var speed = Math.max(1, Math.hypot(vx, vy));
    var limit = mobile ? 21 : 28;
    if (speed > limit) { vx *= limit / speed; vy *= limit / speed; }
    result.x = vx;
    result.y = vy;
    return result;
  }

  function simulate(dt, phase, now) {
    var centerX = width * (mobile ? .59 : .5);
    var centerY = height * .51;
    var search = (.46 + .54 * smooth(.015, .23, phase)) * (1 - smooth(.62, .75, phase));
    var registration = smooth(.49, .75, phase) * (1 - smooth(.86, .98, phase));
    var failure = smooth(.73, .84, phase) * (1 - smooth(.87, .97, phase));
    var fadeOut = smooth(.88, 1, phase);
    var density = (1 - (1 - search) * (1 - registration) * (1 - failure)) * (1 - fadeOut);
    setVariable(root, rootVariables, "--archive-opacity", clamp(.24 - .12 * search + .1 * registration - .28 * failure, .05, .28).toFixed(3));
    setVariable(stage, stageVariables, "--matte", (density * .2).toFixed(3));
    setVariable(stage, stageVariables, "--proof", (registration * .13 * (1 - failure)).toFixed(3));
    setVariable(stage, stageVariables, "--burn", (failure * .15).toFixed(3));
    setVariable(stage, stageVariables, "--field-opacity", (.28 + density * .72).toFixed(3));
    setVariable(stage, stageVariables, "--tissue-feather", (density * .22).toFixed(3));
    setVariable(stage, stageVariables, "--tissue-wheel", (density * .09).toFixed(3));
    if (!particles.length) return { search: search, registration: registration, failure: failure, fadeOut: fadeOut, density: density };

    var snapshot = particles.map(function (part) { return { x: part.x, y: part.y, vx: part.vx, vy: part.vy }; });
    var neighborhood = mobile ? 66 : 91;
    var buckets = new Map();
    snapshot.forEach(function (part, index) {
      var cellX = Math.floor(part.x / neighborhood);
      var cellY = Math.floor(part.y / neighborhood);
      var key = cellX + ":" + cellY;
      var bucket = buckets.get(key);
      if (!bucket) { bucket = []; buckets.set(key, bucket); }
      bucket.push(index);
    });
    var currents = prepareCurrents(centerX, centerY);
    var currentVelocity = { x: 0, y: 0 };
    var gathering = smooth(.08, .82, registration);
    var spring = mix(.37, 1.04, gathering);
    var damping = Math.exp(-dt * mix(1.55, 3.05, gathering));
    var rx = width * (mobile ? .29 : .29);
    var ry = height * (mobile ? .23 : .25);
    pulses = pulses.filter(function (pulse) { return now - pulse.at < 1900; });
    if (pulses.length) {
      var latest = pulses[pulses.length - 1];
      var pressureAge = (now - latest.at) / 1000;
      setVariable(stage, stageVariables, "--pressure-x", (latest.x / width * 100).toFixed(2) + "%");
      setVariable(stage, stageVariables, "--pressure-y", (latest.y / height * 100).toFixed(2) + "%");
      setVariable(stage, stageVariables, "--pressure", (Math.max(0, 1 - pressureAge / 1.7) * .38).toFixed(3));
    } else setVariable(stage, stageVariables, "--pressure", "0");
    var groupX = 0, groupY = 0;
    particles.forEach(function (part, index) {
      var dx = part.x - centerX;
      var dy = part.y - centerY;
      var driftAngle = part.baseAngle + clock * (part.sprite.kind === "eye" ? .03 : .05);
      var targetRadius = mix(part.radius, .8 + (index % 13) / 13 * .5, registration);
      var targetX = centerX + Math.cos(driftAngle) * rx * targetRadius;
      var targetY = centerY + Math.sin(driftAngle) * ry * targetRadius;
      var ax = (targetX - part.x) * spring;
      var ay = (targetY - part.y) * spring;
      var radialDistance = Math.max(1, Math.hypot(dx, dy));
      ax += -dy / radialDistance * 40 * search;
      ay += dx / radialDistance * 40 * search;
      var current = currentAt(part.x, part.y, currents, currentVelocity);
      ax += (current.x - part.vx) * .66;
      ay += (current.y - part.vy) * .66;
      part.flow = current.x * .035 + current.y * .02;
      ax += Math.sin(clock * .51 + part.phase) * 5;
      ay += Math.cos(clock * .43 + part.phase) * 5;

      var sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohesionX = 0, cohesionY = 0, neighbors = 0;
      var cellX = Math.floor(part.x / neighborhood);
      var cellY = Math.floor(part.y / neighborhood);
      var candidates = [];
      for (var row = -1; row <= 1; row++) {
        for (var column = -1; column <= 1; column++) {
          var nearby = buckets.get((cellX + column) + ":" + (cellY + row));
          if (nearby) candidates.push.apply(candidates, nearby);
        }
      }
      candidates.sort(function (a, b) { return a - b; });
      candidates.forEach(function (otherIndex) {
        if (otherIndex === index) return;
        var other = snapshot[otherIndex];
        var px = part.x - other.x;
        var py = part.y - other.y;
        if (Math.abs(px) > neighborhood || Math.abs(py) > neighborhood) return;
        var distance = Math.hypot(px, py);
        if (distance > neighborhood || distance < .01) return;
        var push = Math.pow(1 - distance / neighborhood, 2);
        sepX += px / distance * push;
        sepY += py / distance * push;
        alignX += other.vx;
        alignY += other.vy;
        cohesionX += other.x;
        cohesionY += other.y;
        neighbors += 1;
      });
      if (neighbors) {
        ax += sepX * (mobile ? 58 : 75);
        ay += sepY * (mobile ? 58 : 75);
        ax += (alignX / neighbors - part.vx) * .38;
        ay += (alignY / neighbors - part.vy) * .38;
        ax += (cohesionX / neighbors - part.x) * .055;
        ay += (cohesionY / neighbors - part.y) * .055;
      }
      // Neighboring fragments share exposure; a passing band moves through the
      // congregation without turning it into outlined particles or connectors.
      var crowd = smooth(2, mobile ? 8 : 11, neighbors);
      var band = Math.sin(part.x * .012 + part.y * .004 - clock * .53);
      var targetInk = .7 + crowd * .43 + band * .11;
      part.ink += (targetInk - part.ink) * (1 - Math.exp(-dt * 1.4));
      if (pointer) {
        var pX = part.x - pointer.x;
        var pY = part.y - pointer.y;
        var pDistance = Math.max(1, Math.hypot(pX, pY));
        var reach = mobile ? 105 : 160;
        if (pDistance < reach) {
          var pressure = Math.pow(1 - pDistance / reach, 2) * (mobile ? 230 : 360);
          ax += pX / pDistance * pressure;
          ay += pY / pDistance * pressure;
        }
      }
      pulses.forEach(function (pulse) {
        var age = (now - pulse.at) / 1000;
        var pX = part.x - pulse.x;
        var pY = part.y - pulse.y;
        var distance = Math.max(1, Math.hypot(pX, pY));
        var front = age * (mobile ? 145 : 220);
        var force = Math.exp(-Math.pow((distance - front) / (mobile ? 48 : 74), 2)) * pulse.power * (1 - age / 1.9);
        ax += pX / distance * force;
        ay += pY / distance * force;
      });
      part.vx = (part.vx + ax * dt) * damping;
      part.vy = (part.vy + ay * dt) * damping;
      var speed = Math.hypot(part.vx, part.vy);
      var maxSpeed = mobile ? 48 : 72;
      if (speed > maxSpeed) {
        part.vx *= maxSpeed / speed;
        part.vy *= maxSpeed / speed;
      }
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      groupX += part.x;
      groupY += part.y;
      var desiredAngle = (part.sprite.kind === "feather" ? Math.atan2(part.vy, part.vx) * .13 : 0)
        + Math.sin(clock * .31 + part.phase) * .1;
      part.angle += normalize(desiredAngle - part.angle) * Math.min(1, dt * .46);
    });
    var weight = 1 - Math.exp(-dt * 1.15);
    tissueX += ((groupX / particles.length - centerX) * .075 - tissueX) * weight;
    tissueY += ((groupY / particles.length - centerY) * .075 - tissueY) * weight;
    var featherX = (tissueX + Math.sin(clock * .16) * (mobile ? 5 : 8)).toFixed(2) + "px";
    var featherY = (tissueY + Math.cos(clock * .13) * (mobile ? 4 : 7)).toFixed(2) + "px";
    var wheelX = (tissueX * .65 + Math.sin(clock * .11 + 1.1) * (mobile ? -4 : -6)).toFixed(2) + "px";
    var wheelY = (tissueY * .65 + Math.cos(clock * .09 + .4) * (mobile ? 4 : 5)).toFixed(2) + "px";
    var featherTransform = "translate3d(" + featherX + "," + featherY + ",0) scale(1.13)";
    var wheelTransform = "translate3d(" + wheelX + "," + wheelY + ",0) scale(1.04)";
    if (tissueFeather && featherTransform !== lastFeatherTransform) {
      tissueFeather.style.transform = featherTransform;
      lastFeatherTransform = featherTransform;
    }
    if (tissueWheel && wheelTransform !== lastWheelTransform) {
      tissueWheel.style.transform = wheelTransform;
      lastWheelTransform = wheelTransform;
    }
    return { search: search, registration: registration, failure: failure, fadeOut: fadeOut, density: density };
  }

  function updateVideoTextures() {
    videos.forEach(function (video, index) {
      if (video.readyState < 2 || !video.videoWidth) return;
      var brush = videoTextureContexts[index];
      brush.clearRect(0, 0, 96, 96);
      var cropWidth = Math.min(video.videoWidth, video.videoHeight);
      brush.drawImage(video, (video.videoWidth - cropWidth) / 2, (video.videoHeight - cropWidth) / 2, cropWidth, cropWidth, 0, 0, 96, 96);
      brush.globalCompositeOperation = "destination-in";
      brush.drawImage(videoMask, 0, 0);
      brush.globalCompositeOperation = "source-over";
    });
  }

  function paint(state, paused, dt) {
    context.clearRect(0, 0, width, height);
    if (state.density > .012) updateVideoTextures();
    context.globalCompositeOperation = "source-over";
    var centerX = width * (mobile ? .59 : .5);
    var centerY = height * .51;
    particles.forEach(function (part, index) {
      var sprite = part.sprite;
      var breathing = .9 + Math.sin(clock * .82 + part.phase) * .1;
      var base = part.opacity * part.depth * breathing * part.ink * (state.search * .9 + state.registration * .86 + state.failure * .34) * (1 - state.fadeOut) * 3.2;
      if (state.failure > .001) {
        var px = part.x - centerX;
        var py = part.y - centerY;
        var angle = Math.atan2(py, px);
        var fault = smooth(-.5, .02, angle) * (1 - smooth(.58, 1.14, angle));
        base *= 1 - state.failure * .72 * fault;
      }
      if (base < .005) return;
      var flutter = 1 + (sprite.kind === "feather" ? Math.sin(clock * .9 + part.phase) * .045 : 0);
      var span = part.size * flutter;
      var drawWidth = sprite.aspect >= 1 ? span : span * sprite.aspect;
      var drawHeight = sprite.aspect >= 1 ? span / sprite.aspect : span;
      context.save();
      context.translate(part.x, part.y);
      context.rotate(part.angle);
      if (part.videoIndex >= 0 && videoTextures[part.videoIndex]) {
        context.globalAlpha = Math.min(.13, base * .55);
        context.drawImage(videoTextures[part.videoIndex], -drawWidth * .42, -drawHeight * .42, drawWidth * .84, drawHeight * .84);
      }
      context.globalAlpha = clamp(base * .66, 0, .36);
      context.drawImage(sprite.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      if (sprite.kind === "feather" && part.size > (mobile ? 38 : 48) && index % 3 === 0) {
        context.globalAlpha = clamp(base * .07, 0, .04);
        context.drawImage(sprite.image, -drawWidth / 2 + part.flow * 2.3, -drawHeight / 2 - part.flow * 1.2, drawWidth, drawHeight);
      }
      context.restore();
    });
    if (state.failure > .001) {
      context.save();
      particles.forEach(function (part) {
        var angle = Math.atan2(part.y - centerY, part.x - centerX);
        var fault = smooth(-.5, .02, angle) * (1 - smooth(.58, 1.14, angle));
        if (fault < .001 || part.sprite.kind !== "eye") return;
        var sprite = part.sprite;
        var size = part.size * 1.07;
        context.globalAlpha = state.failure * fault * .08;
        context.drawImage(sprite.image, part.x + 9 - size / 2, part.y - 6 - size / (2 * sprite.aspect), size, size / sprite.aspect);
      });
      context.restore();
    }
    context.globalCompositeOperation = "source-over";
    if (!paused) {
      scratchContext.clearRect(0, 0, scratch.width, scratch.height);
      scratchContext.drawImage(canvas, 0, 0, scratch.width, scratch.height);
      var nextContext = historyNext === historyA ? historyAContext : historyBContext;
      nextContext.clearRect(0, 0, historyNext.width, historyNext.height);
      var retain = Math.exp(-dt / .34);
      nextContext.globalAlpha = retain;
      nextContext.drawImage(historyCurrent, 0, 0);
      nextContext.globalAlpha = 1 - retain;
      nextContext.filter = "blur(1.5px)";
      nextContext.drawImage(scratch, 0, 0);
      nextContext.filter = "none";
      nextContext.globalAlpha = 1;
      var previous = historyCurrent;
      historyCurrent = historyNext;
      historyNext = previous;
    }
    diffuseContext.clearRect(0, 0, diffuseCanvas.width, diffuseCanvas.height);
    diffuseContext.drawImage(historyCurrent, 0, 0);
  }

  function frame(now) {
    window.requestAnimationFrame(frame);
    if (now - lastPaint < 32) return;
    var dt = Math.min(.06, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    lastPaint = now;
    if (document.visibilityState !== "visible" || reducedQuery.matches) return;
    var paused = root.dataset.paused === "true";
    if (!paused) clock += dt;
    displayedPhase += (scrollPosition - displayedPhase) * (1 - Math.exp(-dt * 4.2));
    var state = simulate(paused ? 0 : dt, displayedPhase, now);
    paint(state, paused, dt);
  }

  function updateVideoPlayback() {
    var play = !reducedQuery.matches && document.visibilityState === "visible" && root.dataset.paused !== "true";
    videos.forEach(function (video) {
      if (play) video.play().catch(function () {});
      else video.pause();
    });
  }

  window.addEventListener("pointermove", function (event) {
    var next = { x: event.clientX, y: event.clientY, at: performance.now() };
    if (pointer) {
      var distance = Math.hypot(next.x - pointer.x, next.y - pointer.y);
      if (distance > 26 && next.at - pointer.at < 180) {
        pulses.push({ x: next.x, y: next.y, at: next.at, power: mobile ? 130 : 210 });
        if (pulses.length > 4) pulses.shift();
      }
    }
    pointer = next;
  }, { passive: true });
  window.addEventListener("pointerleave", function () { pointer = null; });
  window.addEventListener("pointerdown", function (event) {
    if (event.button > 0 || reducedQuery.matches) return;
    if (event.target && event.target.closest && event.target.closest("button,a")) return;
    pulses.push({ x: event.clientX, y: event.clientY, at: performance.now(), power: mobile ? 650 : 950 });
    if (pulses.length > 4) pulses.shift();
  });
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", updateVideoPlayback);
  reducedQuery.addEventListener("change", function () {
    clearHistory();
    if (!reducedQuery.matches) loadField();
    updateVideoPlayback();
  });
  new MutationObserver(updateVideoPlayback).observe(root, { attributes: true, attributeFilter: ["data-paused"] });

  function loadField() {
    if (fieldLoaded || reducedQuery.matches) return;
    fieldLoaded = true;
    buildVideos();
    Promise.all(sourcePaths.map(loadImage)).then(function (images) {
      sprites = crops.map(function (crop, index) { return createSprite(images[crop.source], crop, index); });
      buildParticles();
    }).catch(function (error) { console.error("Angel field could not prepare its fragments", error); });
  }

  resize();
  loadField();
  window.requestAnimationFrame(frame);
})();
