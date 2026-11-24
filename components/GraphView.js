'use client'

import { useEffect, useRef, useState } from 'react'
import { createGraph } from '@/lib/graph'
import Drawer from '@/components/Drawer'
import { fetchPage } from '@/components/Blocks'

// the open channel lives in the url as ?c=slug so a link to it can be shared
function slugFromUrl() {
  return new URLSearchParams(location.search).get('c')
}

export default function GraphView({ site }) {
  const canvasRef = useRef(null)
  const peekRef = useRef(null)
  const graph = useRef(null)
  const [open, setOpen] = useState(null)

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
      onOpen: show,
      loadPage: fetchPage
    })
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

  return (
    <section className="graph" aria-label="graph of channels">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="a graph with a node for each channel and a smaller node for each block inside it. the index view lists the same channels as links."
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
          channels that share blocks
        </span>
        <span className="hint">drag to move · scroll to zoom · click a channel or a block</span>
      </div>
      <div className="peek" ref={peekRef} hidden>
        <img alt="" hidden />
        <b />
        <span />
        <a target="_blank" rel="noopener" hidden>
          open on are.na ↗
        </a>
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
