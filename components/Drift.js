'use client'

// drift: one block at a time, moving on every few seconds.
// the next block usually comes from the same channel. sometimes the walk crosses
// into another channel that holds the same block, and now and then it jumps

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SITE, channelUrl } from '@/lib/shared'
import { fetchPage } from '@/components/Blocks'

const PACE = 12000
const PER = 60
const CROSS = 0.5
const JUMP = 0.12
const TRAIL = 10

const pick = (list) => list[Math.floor(Math.random() * list.length)]

export default function Drift({ site }) {
  const [steps, setSteps] = useState([])
  const [pos, setPos] = useState(-1)
  const [playing, setPlaying] = useState(true)
  const [wander, setWander] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cache = useRef({ pages: {}, totals: {}, homes: {} })
  const started = useRef(false)
  const live = useRef({ steps, pos, wander })
  live.current = { steps, pos, wander }

  const mine = Object.fromEntries(site.channels.map((c) => [c.s, { s: c.s, t: c.t, mine: true, by: '', bySlug: site.user }]))

  // a random one of my channels, bigger channels more likely
  function someChannel(not) {
    const list = site.channels.filter((c) => c.n > 0 && c.s !== not)
    let r = Math.random() * list.reduce((sum, c) => sum + c.n, 0)
    for (const c of list) {
      r -= c.n
      if (r <= 0) return mine[c.s]
    }
    return mine[list[0].s]
  }

  async function page(slug, n) {
    const key = slug + ':' + n
    if (!cache.current.pages[key]) {
      const res = await fetchPage(slug, n)
      cache.current.pages[key] = res
      if (res.total) cache.current.totals[slug] = res.total
    }
    return cache.current.pages[key]
  }

  async function randomBlock(slug, avoid) {
    let total = cache.current.totals[slug] || (mine[slug] && site.channels.find((c) => c.s === slug).n)
    if (!total) total = (await page(slug, 1)).total || PER
    for (let tries = 0; tries < 4; tries++) {
      const i = Math.floor(Math.random() * total)
      const res = await page(slug, Math.floor(i / PER) + 1)
      const chosen = res.blocks[i % PER]
      if (chosen && !avoid.has(chosen.id)) return chosen
      const list = res.blocks.filter((b) => !avoid.has(b.id))
      if (list.length) return pick(list)
    }
    throw new Error('this channel has nothing new to show')
  }

  // every channel a block lives in, from our own server
  async function homes(id) {
    if (!cache.current.homes[id]) {
      try {
        const res = await fetch('/api/connections/' + id)
        cache.current.homes[id] = res.ok ? await res.json() : []
      } catch (err) {
        cache.current.homes[id] = []
      }
    }
    return cache.current.homes[id]
  }

  async function first() {
    const q = new URLSearchParams(location.search)
    const b = q.get('b')
    const c = q.get('c')
    let channel = (c && mine[c]) || null
    let block = null
    if (b && /^\d+$/.test(b)) {
      try {
        const res = await fetch('/api/block/' + b)
        if (res.ok) block = await res.json()
      } catch (err) {}
      if (block && !channel) {
        const where = await homes(block.id)
        channel = where.find((w) => w.mine) || where[0] || null
      }
    }
    if (!channel) channel = someChannel()
    if (!block) block = await randomBlock(channel.s, new Set())
    return { block, channel, how: 'start' }
  }

  async function next(from, recent) {
    const avoid = new Set(recent)
    const where = (await homes(from.block.id)).filter((w) => w.s !== from.channel.s && (w.mine || live.current.wander))
    const r = Math.random()
    let channel = from.channel
    let how = 'stay'
    if (where.length && r < CROSS) {
      channel = pick(where)
      how = 'cross'
    } else if (r > 1 - JUMP) {
      channel = someChannel(from.channel.s)
      how = 'jump'
    }
    try {
      return { block: await randomBlock(channel.s, avoid), channel, how }
    } catch (err) {
      // a dead end. jump somewhere of mine instead
      const somewhere = someChannel(from.channel.s)
      return { block: await randomBlock(somewhere.s, avoid), channel: somewhere, how: 'jump' }
    }
  }

  async function advance() {
    const { steps: list, pos: at } = live.current
    // stepping forward through steps already taken
    if (at < list.length - 1) return setPos(at + 1)
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const step = list.length ? await next(list[at], list.slice(-TRAIL * 2).map((s) => s.block.id)) : await first()
      setSteps((old) => old.concat(step))
      setPos((p) => p + 1)
    } catch (err) {
      setError('could not reach are.na. it may be asking for a breather, try again in a minute.')
      setPlaying(false)
    }
    setBusy(false)
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    try {
      setWander(localStorage.getItem('drift-wander') === '1')
    } catch (err) {}
    advance()
  }, [])

  // keep the address pointing at what's on screen, so it can be shared
  useEffect(() => {
    const step = steps[pos]
    if (step) history.replaceState(null, '', '/drift?b=' + step.block.id + '&c=' + step.channel.s)
  }, [pos, steps])

  // move on by itself while playing
  useEffect(() => {
    if (!playing || busy || error || pos < 0) return
    const t = setTimeout(advance, PACE)
    return () => clearTimeout(t)
  }, [playing, busy, error, pos])

  useEffect(() => {
    const key = (e) => {
      if (e.target.closest && e.target.closest('input, textarea, select')) return
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
      if (e.key === 'ArrowRight') advance()
      if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 1))
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  })

  function toggleWander() {
    const on = !wander
    setWander(on)
    try { localStorage.setItem('drift-wander', on ? '1' : '0') } catch (err) {}
  }

  const step = steps[pos]
  const b = step && step.block
  const ch = step && step.channel
  const chHref = ch && (ch.mine ? '/c/' + ch.s : channelUrl(ch.s, ch.bySlug))
  const how =
    step &&
    {
      start: 'starting in',
      stay: 'still in',
      cross: 'crossed through a shared block into',
      jump: 'jumped to'
    }[step.how]
  const trail = steps.slice(Math.max(0, steps.length - TRAIL))
  const offset = Math.max(0, steps.length - TRAIL)

  return (
    <section className="drift" aria-label="drift">
      <div className="dstage">
        {!step && !error && <p className="status">finding somewhere to start…</p>}
        {step && (
          <figure key={b.id + ':' + pos} className="dblock">
            {b.img ? (
              <img
                src={b.img2 || b.img}
                alt={b.title}
                style={b.ar ? { aspectRatio: b.ar, width: 'min(100%, calc(60vh * ' + b.ar + '))' } : undefined}
              />
            ) : b.text ? (
              <blockquote>{b.text}</blockquote>
            ) : (
              <div className="dlink">{b.title || 'untitled'}</div>
            )}
            <figcaption>
              {b.title && (b.img || b.text) && <b>{b.title}</b>}
              {b.host && <span>{b.host}</span>}
              <span className="where">
                {how}{' '}
                {ch.mine ? (
                  <Link href={chHref}>{ch.t.toLowerCase()}</Link>
                ) : (
                  <a href={chHref} target="_blank" rel="noopener">
                    {ch.t.toLowerCase()}
                  </a>
                )}
                {!ch.mine && ch.by && <> by {ch.by}</>}
              </span>
              <a href={SITE + '/block/' + b.id} target="_blank" rel="noopener">
                open on are.na ↗
              </a>
            </figcaption>
          </figure>
        )}
        {error && <p className="status">{error}</p>}
      </div>

      <div className="dbar">
        <div className="dprogress" aria-hidden="true">
          {step && playing && !busy && !error && <i key={pos} style={{ animationDuration: PACE + 'ms' }} />}
        </div>
        <div className="dcontrols">
          <button id="drift-back" onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos <= 0}>
            ← back
          </button>
          <button id="drift-play" onClick={() => (error ? (setError(''), setPlaying(true), advance()) : setPlaying((p) => !p))}>
            {error ? 'try again' : playing ? 'pause' : 'drift'}
          </button>
          <button id="drift-next" onClick={advance} disabled={busy}>
            {busy ? 'finding…' : 'next →'}
          </button>
          <label className="wander">
            <input id="drift-wander" type="checkbox" checked={wander} onChange={toggleWander} />
            wander into other people's channels
          </label>
        </div>
        {trail.length > 1 && (
          <ol className="trail" aria-label="where the drift has been">
            {trail.map((s, i) => (
              <li key={offset + i} className={offset + i === pos ? 'here' : ''} data-how={s.how}>
                <button onClick={() => setPos(offset + i)}>{s.channel.t.toLowerCase()}</button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
