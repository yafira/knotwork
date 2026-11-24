'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { SITE, when, count, threadsFor } from '@/lib/shared'
import Blocks from '@/components/Blocks'
import Note from '@/components/Note'
import Elsewhere from '@/components/Elsewhere'

export default function Drawer({ site, slug, onOpen, onClose }) {
  const closeRef = useRef(null)
  const channel = site.channels.find((c) => c.s === slug)

  useEffect(() => {
    if (closeRef.current) closeRef.current.focus({ preventScroll: true })
    const key = (e) => {
      if (e.key === 'Escape') onClose()
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [slug])

  if (!channel) return null

  const names = Object.fromEntries(site.channels.map((c) => [c.s, c.t.toLowerCase()]))
  const shared = threadsFor(slug, site.threads).filter((t) => names[t.slug])

  return (
    <aside className="panel" aria-label="channel">
      <div className="phead">
        <div className="row">
          <h2>{channel.t.toLowerCase()}</h2>
          <button className="close" ref={closeRef} onClick={onClose} aria-label="close channel">
            ×
          </button>
        </div>
        {channel.d && <p>{channel.d}</p>}
        <Note text={site.notes && site.notes[slug]} />
        <div className="meta">
          <span>{count(channel.n)}</span>
          <span>started {when(channel.c)}</span>
          <span>updated {when(channel.u)}</span>
          <Link href={'/c/' + slug}>open as a page</Link>
          <Link href={'/drift?c=' + slug}>drift through it</Link>
          <a href={SITE + '/' + site.user + '/' + slug} target="_blank" rel="noopener">
            open on are.na ↗
          </a>
        </div>
        {shared.length > 0 && (
          <div className="shared">
            {shared.map((t) => (
              <button key={t.slug} onClick={() => onOpen(t.slug)}>
                shares {t.count} with {names[t.slug]}
              </button>
            ))}
          </div>
        )}
        <Elsewhere list={site.outsideBy && site.outsideBy[slug]} />
      </div>
      <div className="pbody">
        <Blocks key={slug} slug={slug} initial={null} />
      </div>
    </aside>
  )
}
