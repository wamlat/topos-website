// Canvas flock copied from the live toposlab.bio site; no framework or backend required.
const TAU = Math.PI * 2
const FRAME_INTERVAL = 1000 / 30
const INK = ['#383838', '#606060', '#9b9b9b', '#f0f0f0']

function random(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

// The uneven edges and scattered outliers come from the same fixed flock on every visit.
const birds = Array.from({ length: 2050 }, (_, index) => {
  const seed = index + 1
  const along = random(seed)
  const across = (random(seed + 2100) + random(seed + 4200) + random(seed + 6300) - 1.5) / 1.5
  const depth = random(seed + 8400)
  return {
    along,
    across: across * (index % 13 === 0 ? 1.7 : 1),
    drift: random(seed + 10500) - 0.5,
    phase: random(seed + 12600) * TAU,
    size: 0.6 + depth * depth * 2.0 + (index % 79 === 0 ? 1.4 : 0),
    depth: Math.min(3, Math.floor(depth * 4)),
  }
})

function position(bird, time, width, height) {
  const u = bird.along
  const breath = Math.sin(time * 0.11 + u * 4.8)
  const widthOfFlock = 0.045 + Math.pow(Math.sin(u * Math.PI), 0.75) * 0.23
  const center = 0.60 - Math.sin(u * Math.PI * 1.16 - 0.30) * 0.28
    + Math.sin(u * Math.PI * 3.0 + 0.7) * 0.035
  const ripple = Math.sin(u * 8.4 + bird.across * 2.4 - time * 0.18)
  return {
    x: width * (0.035 + u * 0.93 + bird.drift * 0.045 + breath * 0.012),
    y: height * (center + bird.across * widthOfFlock + ripple * 0.032 + breath * 0.025),
    angle: -0.12 + Math.sin(u * 5.2 + time * 0.08) * 0.25 + bird.drift * 0.5,
  }
}


function initSwarm() {
  const element = document.querySelector('.swarm-study__canvas')
  const container = document.querySelector('.swarm-study__stage')
  if (!element || !container) return
  const context = element.getContext('2d', { alpha: true })
  if (!context) return

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let wantsMotion = !motion.matches
  let inView = true
  let frame = 0
  let lastTime = 0
  let time = 0
  let width = 0
  let height = 0
  const pointer = { x: 0, y: 0, active: false, influence: 0 }
  const flock = birds.map(bird => ({
    ...bird, offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0,
  }))
  const layers = INK.map((_, depth) => flock.filter(bird => bird.depth === depth))

  function draw(delta = 0) {
    if (!context || !width || !height) return
    context.clearRect(0, 0, width, height)
    context.lineCap = 'round'
    const birdScale = Math.max(0.72, Math.min(width / 1300, 1.25))
    const radius = Math.max(95, Math.min(width * 0.16, 190))
    const damping = Math.exp(-12 * delta)
    pointer.influence += ((pointer.active ? 1 : 0) - pointer.influence) * (1 - Math.exp(-10 * delta))

    for (let depth = 0; depth < layers.length; depth++) {
      context.beginPath()
      context.strokeStyle = INK[depth]
      context.lineWidth = (0.65 + depth * 0.13) * birdScale
      for (const bird of layers[depth]) {
        const rest = position(bird, time, width, height)
        let targetX = 0
        let targetY = 0
        if (pointer.influence > 0.001) {
          const dx = rest.x - pointer.x
          const dy = rest.y - pointer.y
          const distance = Math.hypot(dx, dy)
          if (distance < radius) {
            const falloff = (1 - distance / radius) ** 2
            const push = radius * 0.85 * falloff * pointer.influence * (0.85 + bird.depth * 0.08)
            // Give a bird directly under the pointer a direction too.
            targetX = (distance > 0.01 ? dx / distance : Math.cos(bird.phase)) * push
            targetY = (distance > 0.01 ? dy / distance : Math.sin(bird.phase)) * push
          }
        }
        // A damped spring leaves a brief wake, then returns each bird to the flock.
        bird.velocityX = (bird.velocityX + (targetX - bird.offsetX) * 100 * delta) * damping
        bird.velocityY = (bird.velocityY + (targetY - bird.offsetY) * 100 * delta) * damping
        bird.offsetX += bird.velocityX * delta
        bird.offsetY += bird.velocityY * delta
        const x = rest.x + bird.offsetX
        const y = rest.y + bird.offsetY
        const turn = Math.atan2(bird.velocityY, Math.abs(bird.velocityX) + 40)
        const angle = rest.angle + turn * Math.min(Math.hypot(bird.velocityX, bird.velocityY) / 100, 0.65)
        const size = bird.size * birdScale
        const wing = (0.3 + Math.sin(time * 2.1 + bird.phase) * 0.32) * size
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const tipX = size * cos
        const tipY = size * sin
        const riseX = wing * sin
        const riseY = wing * cos
        context.moveTo(x - tipX - riseX, y - tipY + riseY)
        context.quadraticCurveTo(
          x - tipX * 0.5 + riseX * 0.8,
          y - tipY * 0.5 - riseY * 0.8,
          x, y + size * 0.18,
        )
        context.quadraticCurveTo(
          x + tipX * 0.5 + riseX * 0.8,
          y + tipY * 0.5 - riseY * 0.8,
          x + tipX - riseX, y + tipY + riseY,
        )
      }
      context.stroke()
    }
    element?.setAttribute('data-ready', 'true')
  }

  function animate(now) {
    frame = 0
    if (!wantsMotion || !inView || document.hidden) return
    const elapsed = lastTime ? now - lastTime : FRAME_INTERVAL
    if (elapsed >= FRAME_INTERVAL - 0.5) {
      const delta = Math.min(elapsed / 1000, 0.05)
      time += delta
      lastTime = now
      draw(delta)
    }
    frame = requestAnimationFrame(animate)
  }

  function syncAnimation() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
    if (wantsMotion && inView && !document.hidden) {
      frame = requestAnimationFrame(animate)
    }
  }

  function resize() {
    if (!element || !container || !context) return
    const bounds = container.getBoundingClientRect()
    width = bounds.width
    height = bounds.height
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    element.width = Math.round(width * dpr)
    element.height = Math.round(height * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    resetInteraction()
    draw()
  }

  function movePointer(event) {
    if (!wantsMotion || event.pointerType === 'touch' || !container) return
    const bounds = container.getBoundingClientRect()
    pointer.x = event.clientX - bounds.left
    pointer.y = event.clientY - bounds.top
    pointer.active = true
  }

  function leavePointer() {
    pointer.active = false
  }

  function resetInteraction() {
    pointer.active = false
    pointer.influence = 0
    for (const bird of flock) {
      bird.offsetX = bird.offsetY = bird.velocityX = bird.velocityY = 0
    }
  }

  const motionChanged = () => {
    wantsMotion = !motion.matches
    resetInteraction()
    draw()
    syncAnimation()
  }
  const visibilityChanged = () => {
    resetInteraction()
    syncAnimation()
  }
  container.addEventListener('pointerenter', movePointer, { passive: true })
  container.addEventListener('pointermove', movePointer, { passive: true })
  container.addEventListener('pointerleave', leavePointer, { passive: true })
  container.addEventListener('pointercancel', leavePointer, { passive: true })
  window.addEventListener('blur', leavePointer)
  window.addEventListener('scroll', leavePointer, { passive: true })
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
  resizeObserver?.observe(container)
  window.addEventListener('resize', resize)
  const intersectionObserver = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (!inView) resetInteraction()
      syncAnimation()
    })
    : null
  intersectionObserver?.observe(container)
  motion.addEventListener('change', motionChanged)
  document.addEventListener('visibilitychange', visibilityChanged)
  resize()
  syncAnimation()
}

initSwarm()

for (const year of document.querySelectorAll('[data-year]')) {
  year.textContent = String(new Date().getFullYear())
}

// Monad beta form: posts through FormSubmit (no backend here). Without JavaScript the
// form still posts and FormSubmit redirects back to #sent (shown via :target in CSS); on any
// failure we offer a filled-in email.
function initRequestForm() {
  const form = document.querySelector('form.request')
  if (!form) return
  const status = form.querySelector('.request__status')
  const button = form.querySelector('button[type="submit"]')

  // The message box starts one line tall and grows with its text (field-sizing where supported).
  const message = form.querySelector('textarea')
  const fit = () => {
    if (!message || CSS.supports('field-sizing', 'content')) return
    message.style.height = 'auto'
    message.style.height = `${message.scrollHeight}px`
  }
  message?.addEventListener('input', fit)
  form.addEventListener('reset', () => requestAnimationFrame(fit))

  function mailtoFallback(data) {
    const body = ['name', 'email', 'affiliation', 'message']
      .map((key) => `${key[0].toUpperCase()}${key.slice(1)}: ${data.get(key) || ''}`)
      .join('\n')
    const href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(data.get('_subject'))}&body=${encodeURIComponent(body)}`
    status.textContent = 'Something went wrong sending that. '
    const link = document.createElement('a')
    link.href = href
    link.textContent = 'Send it by email instead'
    status.append(link, '.')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data = new FormData(form)
    if (data.get('_honey')) return
    button.disabled = true
    status.textContent = 'Sending…'
    try {
      const response = await fetch(form.dataset.ajax, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(data)),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || String(result.success) !== 'true') throw new Error(result.message || response.statusText)
      form.reset()
      status.textContent = 'Thanks — we’ll be in touch.'
    } catch {
      mailtoFallback(data)
    } finally {
      button.disabled = false
    }
  })
}

initRequestForm()
