'use client'

import { useState } from 'react'
import Link from 'next/link'
import { thumb, when, count } from '@/lib/shared'

function Thumb({ src }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return <span className="empty" />
  return <img src={thumb(src)} alt="" loading="lazy" onError={() => setBroken(true)} />
}

export default function ChannelGrid({ channels }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('recent')

  const term = q.trim().toLowerCase()
  const list = channels.filter((c) => !term || (c.t + ' ' + c.d).toLowerCase().includes(term))
  if (sort === 'recent') list.sort((a, b) => b.u.localeCompare(a.u))
  if (sort === 'size') list.sort((a, b) => b.n - a.n)
  if (sort === 'az') list.sort((a, b) => a.t.localeCompare(b.t))

  return (
    <>
      <div className="tools">
        <input
          id="q"
          type="search"
          placeholder="search channels"
          aria-label="search channels"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select id="sort" aria-label="sort channels" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">recently updated</option>
          <option value="size">most blocks</option>
          <option value="az">a to z</option>
        </select>
      </div>
      <ul className="grid">
        {list.map((c) => (
          <li key={c.s}>
            <Link className="card" href={'/c/' + c.s}>
              <div className="strip">
                {[0, 1, 2].map((i) => (
                  <Thumb key={i} src={c.th[i]} />
                ))}
              </div>
              <h2>{c.t.toLowerCase()}</h2>
              {c.d && <p>{c.d}</p>}
              <span className="meta">
                {count(c.n)} · updated {when(c.u)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="none">no channels match that search.</p>}
    </>
  )
}
