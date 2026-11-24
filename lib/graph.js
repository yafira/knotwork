// the graph view. plain canvas, no react in here.
// components/GraphView.js mounts it and passes in the canvas.
// me in the middle, a node per channel, and a small node for every block in that channel

import { SITE, PER_PAGE } from '@/lib/shared'

const MAX_LEAVES = 400
const GOLDEN = 2.39996

export function createGraph({ canvas, peek, name, channels, threads, onOpen, loadPage }) {
  const ctx = canvas.getContext('2d')
  let nodes = []
  let links = []
  let index = {}
  let colors = {}
  let family = 'monospace'
  let w = 0, h2 = 0, dpr = 1
  let k = 1, tx = 0, ty = 0
  let heat = 0
  let raf = 0
  let hover = null
  let pinned = null
  let selected = null
  let fitted = false
  let observer = null
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  const scheme = matchMedia('(prefers-color-scheme: dark)')

  // one switch to turn off every listener when the graph is taken down
  const gone = new AbortController()
  const on = (type, fn, opts) => canvas.addEventListener(type, fn, { ...opts, signal: gone.signal })

  // block details arrive a page at a time, only for the pages someone points at
  const info = {}
  const asked = {}

  function readColors() {
    const css = getComputedStyle(document.documentElement)
    for (const key of ['bg', 'surface', 'ink', 'muted', 'line', 'thread']) colors[key] = css.getPropertyValue('--' + key).trim()
    family = getComputedStyle(document.body).fontFamily
  }

  // lean the layout toward the shape of the screen, tall on phones and wide on desktop
  const tall = Math.min(2.2, Math.max(0.5, innerHeight / innerWidth))
  const squash = tall > 1 ? [tall * 4.5, 0.3] : [tall, 1 / tall]

  function build() {
    nodes = [{ id: 'me', kind: 'me', r: 9, reach: 26, x: 0, y: 0, vx: 0, vy: 0, label: name }]
    links = []
    channels.forEach((c, i) => {
      const a = i * GOLDEN
      const total = Math.min(c.n, MAX_LEAVES)
      // blocks sit around their channel in a sunflower spiral, newest closest in
      const leaves = []
      for (let j = 0; j < total; j++) {
        const d = 15 + 6.2 * Math.sqrt(j + 0.5)
        leaves.push([Math.cos(j * GOLDEN) * d, Math.sin(j * GOLDEN) * d])
      }
      nodes.push({
        id: c.s, kind: 'ch', label: c.t.toLowerCase(), n: c.n, leaves,
        r: 5 + Math.sqrt(c.n) * 0.3,
        reach: 20 + 6.2 * Math.sqrt(total + 0.5),
        // golden angle keeps the starting layout the same on every load
        x: Math.cos(a) * (320 + (i % 3) * 60),
        y: Math.sin(a) * (320 + (i % 3) * 60),
        vx: 0, vy: 0
      })
    })
    index = Object.fromEntries(nodes.map((n) => [n.id, n]))
    for (const n of nodes) {
      if (n.kind === 'ch') links.push({ a: 'me', b: n.id, kind: 'spoke', len: 150 + n.reach * 1.5 })
    }
    for (const [a, b, count] of threads) {
      if (index[a] && index[b]) links.push({ a, b, kind: 'thread', count, len: index[a].reach + index[b].reach + 30 })
    }
  }

  function tick() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        let dx = b.x - a.x, dy = b.y - a.y
        let d2 = dx * dx + dy * dy
        if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.5 }
        const d = Math.sqrt(d2)
        // push apart, and never let two clusters or their labels overlap
        let f = 5000 / d2
        const gap = a.reach + b.reach + 34
        if (d < gap) f += (gap - d) * 0.14
        const fx = (dx / d) * f, fy = (dy / d) * f
        a.vx -= fx; a.vy -= fy
        b.vx += fx; b.vy += fy
      }
    }
    for (const l of links) {
      const a = index[l.a], b = index[l.b]
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const pull = (d - l.len) * (l.kind === 'thread' ? 0.03 : 0.012)
      const fx = (dx / d) * pull, fy = (dy / d) * pull
      a.vx += fx; a.vy += fy
      b.vx -= fx; b.vy -= fy
    }
    for (const n of nodes) {
      if (n.kind === 'me' || n.held) { n.vx = 0; n.vy = 0; continue }
      n.vx -= n.x * 0.0015 * squash[0]
      n.vy -= n.y * 0.0015 * squash[1]
      n.vx *= 0.82; n.vy *= 0.82
      n.x += n.vx; n.y += n.vy
    }
  }

  function fit() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const n of nodes) {
      x0 = Math.min(x0, n.x - n.reach - 20); x1 = Math.max(x1, n.x + n.reach + 20)
      y0 = Math.min(y0, n.y - n.reach); y1 = Math.max(y1, n.y + n.reach + 40)
    }
    const bottom = w < 520 ? 50 : 20
    k = Math.min((w - 24) / (x1 - x0), (h2 - 24 - bottom) / (y1 - y0), 1.3)
    tx = w / 2 - ((x0 + x1) / 2) * k
    ty = (h2 - bottom) / 2 - ((y0 + y1) / 2) * k
  }

  function wrap(text, max) {
    const lines = ['']
    for (const word of text.split(' ')) {
      const cur = lines[lines.length - 1]
      if (cur && (cur + ' ' + word).length > max) lines.push(word)
      else lines[lines.length - 1] = cur ? cur + ' ' + word : word
    }
    // no single word left alone on the last line
    if (lines.length > 1 && lines[lines.length - 1].split(' ').length === 1) {
      const prev = lines[lines.length - 2].split(' ')
      if (prev.length > 1) {
        lines[lines.length - 1] = prev.pop() + ' ' + lines[lines.length - 1]
        lines[lines.length - 2] = prev.join(' ')
      }
    }
    return lines.slice(0, 3)
  }

  const same = (a, b) => a && b && a.node === b.node && a.leaf === b.leaf

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h2)
    ctx.translate(tx, ty)
    ctx.scale(k, k)
    ctx.lineCap = 'round'
    const hot = pinned || hover

    // me to each channel, and pink between channels that share blocks
    for (const l of links) {
      const a = index[l.a], b = index[l.b]
      const lit = selected && (l.a === selected || l.b === selected)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      if (l.kind === 'thread') {
        ctx.lineWidth = (1.2 + Math.log2(l.count) * 0.6) / Math.min(k, 1)
        ctx.strokeStyle = colors.thread
      } else {
        ctx.lineWidth = (lit ? 1.4 : 0.9) / Math.min(k, 1)
        ctx.strokeStyle = lit ? colors.muted : colors.line
      }
      ctx.stroke()
    }

    // channel to each of its blocks
    ctx.lineWidth = 0.5
    ctx.strokeStyle = colors.line
    ctx.beginPath()
    for (const n of nodes) {
      if (n.kind !== 'ch') continue
      for (const [dx, dy] of n.leaves) {
        ctx.moveTo(n.x, n.y)
        ctx.lineTo(n.x + dx, n.y + dy)
      }
    }
    ctx.stroke()

    // block nodes
    ctx.fillStyle = colors.muted
    ctx.beginPath()
    for (const n of nodes) {
      if (n.kind !== 'ch') continue
      for (const [dx, dy] of n.leaves) {
        ctx.moveTo(n.x + dx + 2.3, n.y + dy)
        ctx.arc(n.x + dx, n.y + dy, 2.3, 0, 7)
      }
    }
    ctx.fill()
    if (hot && hot.leaf != null) {
      const [dx, dy] = hot.node.leaves[hot.leaf]
      ctx.beginPath()
      ctx.moveTo(hot.node.x, hot.node.y)
      ctx.lineTo(hot.node.x + dx, hot.node.y + dy)
      ctx.lineWidth = 1.2
      ctx.strokeStyle = colors.thread
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(hot.node.x + dx, hot.node.y + dy, 4.5, 0, 7)
      ctx.fillStyle = colors.thread
      ctx.fill()
    }

    // channel nodes and labels
    // labels stay between 10 and 14 pixels on screen however far you zoom
    const size = Math.min(Math.max(12, 10 / k), 14 / k)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const n of nodes) {
      const active = (hot && hot.node === n && hot.leaf == null) || n.id === selected
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, 7)
      ctx.fillStyle = active || n.kind === 'me' ? colors.thread : colors.ink
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = colors.bg
      ctx.stroke()

      // zoomed far out, small channels keep their name for when you point at them
      if (n.kind === 'ch' && n.reach * k < 20 && !active) continue

      const lines = wrap(n.label, 18)
      const top = n.y + (n.kind === 'me' ? n.r + 6 : n.reach + 4)
      ctx.font = (active || n.kind === 'me' ? '600 ' : '500 ') + size + 'px ' + family
      // a soft halo so labels stay readable over lines
      ctx.lineWidth = 4
      ctx.lineJoin = 'round'
      ctx.strokeStyle = colors.bg
      ctx.fillStyle = active ? colors.thread : colors.ink
      lines.forEach((line, i) => {
        ctx.strokeText(line, n.x, top + i * size * 1.25)
        ctx.fillText(line, n.x, top + i * size * 1.25)
      })
      if (n.kind === 'ch') {
        ctx.font = '400 ' + size * 0.85 + 'px ' + family
        ctx.fillStyle = colors.muted
        ctx.fillText(n.n, n.x, top + lines.length * size * 1.25)
      }
    }
  }

  function loop() {
    raf = 0
    if (heat > 0) {
      tick()
      heat -= 1
      if (pinned) place(pinned)
    }
    draw()
    if (heat > 0) raf = requestAnimationFrame(loop)
  }

  function warm(amount) {
    if (calm) {
      for (let i = 0; i < amount; i++) tick()
      heat = 0
    } else {
      heat = Math.max(heat, amount)
    }
    if (!raf) raf = requestAnimationFrame(loop)
  }

  function resize() {
    const box = canvas.getBoundingClientRect()
    if (!box.width || !box.height) return
    w = box.width; h2 = box.height
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h2 * dpr)
    if (!fitted) { fit(); fitted = true }
    draw()
  }

  // what is under the pointer: a block, a channel, or nothing
  function at(px, py) {
    const x = (px - tx) / k, y = (py - ty) / k
    const slack = Math.max(4, 7 / k)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = x - n.x, dy = y - n.y
      const d2 = dx * dx + dy * dy
      if (d2 < (n.r + slack) ** 2) return { node: n, leaf: null }
      if (n.kind !== 'ch' || d2 > (n.reach + slack) ** 2) continue
      let best = null, bestD = slack * slack
      n.leaves.forEach(([lx, ly], j) => {
        const d = (dx - lx) ** 2 + (dy - ly) ** 2
        if (d < bestD) { bestD = d; best = j }
      })
      if (best != null) return { node: n, leaf: best }
    }
    return null
  }

  // the little card that shows which block a node is
  const parts = {
    img: peek.querySelector('img'),
    title: peek.querySelector('b'),
    host: peek.querySelector('span'),
    link: peek.querySelector('a')
  }

  function place(hit) {
    const [dx, dy] = hit.node.leaves[hit.leaf]
    const px = (hit.node.x + dx) * k + tx, py = (hit.node.y + dy) * k + ty
    peek.style.left = Math.max(8, Math.min(px + 14, w - 236)) + 'px'
    peek.style.top = Math.max(8, Math.min(py + 14, h2 - peek.offsetHeight - 8)) + 'px'
  }

  function fill(hit) {
    const b = info[hit.node.id] && info[hit.node.id][hit.leaf]
    parts.img.hidden = !(b && b.img)
    if (b && b.img && parts.img.getAttribute('src') !== b.img) parts.img.src = b.img
    parts.title.textContent = b ? b.title || (b.text ? b.text.slice(0, 90) : 'untitled') : 'loading…'
    parts.host.textContent = b ? b.host || 'in ' + hit.node.label : 'in ' + hit.node.label
    parts.link.hidden = !b
    if (b) parts.link.href = SITE + '/block/' + b.id
    peek.hidden = false
    place(hit)
  }

  function show(hit) {
    fill(hit)
    const slug = hit.node.id
    const page = Math.floor(hit.leaf / PER_PAGE) + 1
    const key = slug + ':' + page
    if (asked[key]) return
    asked[key] = true
    loadPage(slug, page)
      .then((res) => {
        const list = info[slug] || (info[slug] = [])
        res.blocks.forEach((b, i) => { list[(page - 1) * PER_PAGE + i] = b })
        const now = pinned || hover
        if (same(now, hit)) fill(hit)
      })
      .catch(() => {
        asked[key] = false
        if (same(pinned || hover, hit)) parts.title.textContent = 'could not reach are.na'
      })
  }

  function unpin() {
    pinned = null
    peek.classList.remove('pinned')
    peek.hidden = true
  }

  // pointer handling: drag a channel, drag the background, pinch or scroll to zoom
  const touches = new Map()
  let drag = null
  let moved = 0
  let pinch = 0

  function local(e) {
    const box = canvas.getBoundingClientRect()
    return [e.clientX - box.left, e.clientY - box.top]
  }

  function zoomAt(px, py, factor) {
    const next = Math.min(5, Math.max(0.15, k * factor))
    tx = px - ((px - tx) / k) * next
    ty = py - ((py - ty) / k) * next
    k = next
    if (pinned) place(pinned)
  }

  on('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId)
    const [px, py] = local(e)
    touches.set(e.pointerId, [px, py])
    if (touches.size === 2) {
      const [p, q] = [...touches.values()]
      pinch = Math.hypot(p[0] - q[0], p[1] - q[1])
      if (drag && drag.node) drag.node.held = false
      drag = null
      return
    }
    const hit = at(px, py)
    const grab = hit && hit.leaf == null && hit.node.kind === 'ch' ? hit.node : null
    drag = { node: grab, hit, px, py }
    moved = 0
    if (grab) grab.held = true
    canvas.classList.add('grabbing')
  })

  on('pointermove', (e) => {
    const [px, py] = local(e)
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [px, py])
    if (touches.size === 2) {
      const [p, q] = [...touches.values()]
      const d = Math.hypot(p[0] - q[0], p[1] - q[1])
      if (pinch) zoomAt((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, d / pinch)
      pinch = d
      draw()
      return
    }
    if (drag) {
      const dx = px - drag.px, dy = py - drag.py
      moved += Math.abs(dx) + Math.abs(dy)
      drag.px = px; drag.py = py
      if (drag.node) {
        drag.node.x += dx / k
        drag.node.y += dy / k
        warm(40)
      } else {
        tx += dx; ty += dy
        if (pinned) place(pinned)
        draw()
      }
      return
    }
    if (e.pointerType === 'touch') return
    const hit = at(px, py)
    if (same(hit, hover) || (!hit && !hover)) return
    hover = hit
    canvas.classList.toggle('over', !!hit && hit.node.kind !== 'me')
    if (!pinned) {
      if (hit && hit.leaf != null) show(hit)
      else peek.hidden = true
    }
    draw()
  })

  function release(e) {
    touches.delete(e.pointerId)
    pinch = 0
    canvas.classList.remove('grabbing')
    if (!drag) return
    const { node, hit } = drag
    if (node) node.held = false
    drag = null
    if (moved > 6) return
    // a click: pin a block's card, open a channel, or let go of whatever was pinned
    if (hit && hit.leaf != null) {
      pinned = hit
      peek.classList.add('pinned')
      show(hit)
    } else {
      unpin()
      if (hit && hit.node.kind === 'ch') onOpen(hit.node.id)
    }
    draw()
  }
  on('pointerup', release)
  on('pointercancel', release)
  on('pointerleave', () => {
    hover = null
    if (!pinned) peek.hidden = true
    draw()
  })

  on('wheel', (e) => {
    e.preventDefault()
    const [px, py] = local(e)
    zoomAt(px, py, Math.exp(-e.deltaY * 0.0015))
    draw()
  }, { passive: false })

  function recolor() {
    readColors()
    draw()
  }

  readColors()
  build()
  // settle before the first frame so the page opens at rest
  for (let i = 0; i < 500; i++) tick()
  observer = new ResizeObserver(resize)
  observer.observe(canvas)
  scheme.addEventListener('change', recolor)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (w) recolor() })

  return {
    destroy() {
      observer.disconnect()
      gone.abort()
      scheme.removeEventListener('change', recolor)
      cancelAnimationFrame(raf)
    },
    select(slug) {
      selected = slug
      const n = slug && index[slug]
      // slide the view over if the drawer would cover the open channel
      if (n && w > 760) {
        const free = w - 560
        const sx = n.x * k + tx
        if (sx > free - 70) tx -= sx - free / 2
      }
      if (w) draw()
    }
  }
}
