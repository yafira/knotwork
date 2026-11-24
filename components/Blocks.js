'use client'

import { useEffect, useRef, useState } from 'react'
import { SITE, PER_PAGE, slimPage } from '@/lib/shared'

// ask our own server first. if that fails, go to are.na directly
export async function fetchPage(slug, page) {
  try {
    const res = await fetch('/api/channel/' + slug + '?page=' + page)
    if (res.ok) return await res.json()
  } catch (err) {}
  const res = await fetch('https://api.are.na/v3/channels/' + slug + '/contents?per=' + PER_PAGE + '&page=' + page)
  if (res.status === 429) throw new Error('are.na is asking for a breather. try again in a minute.')
  if (!res.ok) throw new Error('could not reach are.na. try again in a bit.')
  return slimPage(await res.json())
}

function Block({ b }) {
  return (
    <a className="block" href={SITE + '/block/' + b.id} target="_blank" rel="noopener">
      {b.img ? (
        <img
          src={b.img}
          srcSet={b.img2 ? b.img + ' 1x, ' + b.img2 + ' 2x' : undefined}
          alt={b.title}
          loading="lazy"
          style={b.ar ? { aspectRatio: b.ar } : undefined}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        b.text && <div className="text">{b.text}</div>
      )}
      {(b.title || b.host) && (
        <div className="cap">
          {b.title && <b>{b.title}</b>}
          {b.host && <span>{b.host}</span>}
        </div>
      )}
    </a>
  )
}

export default function Blocks({ slug, initial, onLoaded }) {
  const [blocks, setBlocks] = useState(initial ? initial.blocks : [])
  const [next, setNext] = useState(initial ? initial.next : 1)
  const [status, setStatus] = useState(initial ? 'idle' : 'loading')
  const [error, setError] = useState('')
  const alive = useRef(true)
  // pages already asked for, so the same page is never fetched twice.
  // react runs effects twice in dev, which used to load page 1 twice
  const asked = useRef(new Set(initial ? [1] : []))
  const loaded = useRef(onLoaded)
  loaded.current = onLoaded

  async function load(page) {
    if (asked.current.has(page)) return
    asked.current.add(page)
    setStatus('loading')
    try {
      const res = await fetchPage(slug, page)
      if (!alive.current) return
      // skip any block already on screen
      setBlocks((old) => {
        const seen = new Set(old.map((b) => b.id))
        return old.concat(res.blocks.filter((b) => !seen.has(b.id)))
      })
      setNext(res.next)
      setStatus('idle')
    } catch (err) {
      asked.current.delete(page)
      if (!alive.current) return
      setError(err.message.startsWith('are.na') || err.message.startsWith('could') ? err.message : 'could not reach are.na. check your connection.')
      setStatus('error')
    }
  }

  useEffect(() => {
    alive.current = true
    if (!initial) load(1)
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (blocks.length && loaded.current) loaded.current(blocks)
  }, [blocks])

  return (
    <>
      <div className="blocks">
        {blocks.map((b) => (
          <Block key={b.id} b={b} />
        ))}
      </div>
      {status === 'loading' && <p className="status">loading from are.na…</p>}
      {status === 'idle' && blocks.length === 0 && <p className="status">this channel is empty.</p>}
      {status === 'idle' && next && (
        <button className="more" onClick={() => load(next)}>
          load more
        </button>
      )}
      {status === 'error' && (
        <>
          <p className="status">{error}</p>
          <button className="retry" onClick={() => load(next || 1)}>
            try again
          </button>
        </>
      )}
    </>
  )
}
