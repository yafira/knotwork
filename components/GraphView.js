'use client'

import { useEffect, useRef, useState } from 'react'
import { createGraph } from '@/lib/graph'
import Drawer from '@/components/Drawer'
import { fetchPage } from '@/components/Blocks'

// whether other people's channels are showing. remembered per browser
function readOthers() {
  try {
    return localStorage.getItem('show-others') !== '0'
  } catch (err) {
    return true
  }
}

// the open channel lives in the url as ?c=slug so a link to it can be shared
function slugFromUrl() {
  return new URLSearchParams(location.search).get('c')
}

export default function GraphView({ site }) {
  const canvasRef = useRef(null)
  const peekRef = useRef(null)
  const graph = useRef(null)
  const [open, setOpen] = useState(null)
  const [others, setOthers] = useState(true)
  const hasOthers = site.outside && site.outside.length > 0

  function show(slug) {
    const url = slug ? '/?c=' + slug : '/'
    if (location.pathname + location.search !== url) history.pushState(null, '', url)
    setOpen(slug)
  }

  useEffect(() => {
    graph.current = createGraph({
      canvas: canvasRef.current,
      peek: peekRef.current,
      name: site.name,
      channels: site.channels,
      threads: site.threads,
      outside: site.outside || [],
      showOutside: readOthers(),
      onOpen: show,
      loadPage: fetchPage
    })
    setOthers(readOthers())
    const back = () => setOpen(slugFromUrl())
    addEventListener('popstate', back)
    back()
    return () => {
      removeEventListener('popstate', back)
      graph.current.destroy()
      graph.current = null
    }
  }, [])

  useEffect(() => {
    if (graph.current) graph.current.select(open)
  }, [open])

  function toggleOthers() {
    const next = !others
    setOthers(next)
    try { localStorage.setItem('show-others', next ? '1' : '0') } catch (err) {}
    if (graph.current) graph.current.setOutside(next)
  }

  return (
    <section className="graph" aria-label="graph of channels">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="a graph with a node for each channel, a smaller node for each block inside it, and hollow nodes for other people\'s channels that hold the same blocks. the index view lists the channels as links."
      />
      <div className="legend">
        <span>
          <i className="dot big" />
          channel
        </span>
        <span>
          <i className="dot" />
          block inside it
        </span>
        <span>
          <i className="key pink" />
          my channels that share blocks
        </span>
        {hasOthers && (
          <button className="others" aria-pressed={others} onClick={toggleOthers}>
            <i className="dot hollow" />
            other people's channels holding my blocks
            <em>{others ? 'on' : 'off'}</em>
          </button>
        )}
        <span className="hint">drag to move · scroll to zoom · click a node</span>
      </div>
      <div className="peek" ref={peekRef} hidden>
        <img alt="" hidden />
        <b />
        <span />
        <span className="links">
          <a className="out" target="_blank" rel="noopener" hidden>
            open on are.na ↗
          </a>
          <a className="drift" hidden>
            drift from here
          </a>
        </span>
      </div>
      {open && (
        <Drawer
          site={site}
          slug={open}
          onOpen={show}
          onClose={() => show(null)}
        />
      )}
    </section>
  )
}
