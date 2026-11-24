// server side are.na fetching. next caches every response for an hour,
// so visitors never touch are.na's rate limit

import snapshot from '@/data/snapshot.json'
import connections from '@/data/connections.json'
import { USER, PER_PAGE, slim, slimPage, slimChannel } from '@/lib/shared'
import { readNotes } from '@/lib/notes'

const API = process.env.ARENA_API || 'https://api.are.na/v3'
const HOUR = 3600

// an are.na personal access token raises the rate limit. optional, see the readme
const headers = process.env.ARENA_TOKEN ? { Authorization: 'Bearer ' + process.env.ARENA_TOKEN } : {}

// how many other people's channels the graph draws, and the drawer lists per channel
const GRAPH_OUTSIDE = 24
const DRAWER_OUTSIDE = 6

async function arena(path) {
  const res = await fetch(API + path, { headers, next: { revalidate: HOUR } })
  if (!res.ok) throw new Error('are.na answered ' + res.status)
  return res.json()
}

// channels come live from are.na, with the snapshot filling in thumbnails
// and standing in for everything if are.na can't be reached
export async function getSite() {
  let channels = snapshot.channels
  try {
    const res = await arena('/users/' + USER + '/contents?type=Channel&per=100')
    const live = res.data.filter((c) => c.owner && c.owner.slug === USER)
    if (live.length) {
      const old = Object.fromEntries(snapshot.channels.map((c) => [c.s, c]))
      channels = live.map((c) => ({
        s: c.slug,
        t: c.title,
        d: ((c.description && c.description.plain) || '').trim(),
        n: c.counts.contents,
        u: c.updated_at.slice(0, 10),
        c: c.created_at.slice(0, 10),
        th: old[c.slug] ? old[c.slug].th : []
      }))
    }
  } catch (err) {
    // snapshot it is
  }
  const mine = new Set(channels.map((c) => c.s))
  const outside = connections.outside || []

  // for each of my channels, the other people's channels that share the most blocks with it
  const outsideBy = {}
  for (const o of outside) {
    for (const [slug, n] of Object.entries(o.with)) {
      if (!mine.has(slug)) continue
      ;(outsideBy[slug] = outsideBy[slug] || []).push({ s: o.s, t: o.t, by: o.by, bySlug: o.bySlug, n })
    }
  }
  for (const slug in outsideBy) {
    outsideBy[slug] = outsideBy[slug].sort((a, b) => b.n - a.n).slice(0, DRAWER_OUTSIDE)
  }

  return {
    user: USER,
    name: snapshot.name,
    channels,
    threads: snapshot.threads,
    total: channels.reduce((sum, c) => sum + c.n, 0),
    outside: outside.slice(0, GRAPH_OUTSIDE).map((o) => ({
      ...o,
      with: Object.fromEntries(Object.entries(o.with).filter(([slug]) => mine.has(slug)))
    })),
    outsideCount: outside.length,
    outsideBy,
    notes: await readNotes(channels)
  }
}

// how many channels a block lives in, from the last connections sync
function withAlso(page) {
  const counts = connections.counts || {}
  for (const b of page.blocks) if (counts[b.id]) b.also = counts[b.id]
  return page
}

export async function getBlocks(slug, page = 1, per = PER_PAGE) {
  const res = await arena('/channels/' + slug + '/contents?per=' + per + '&page=' + page)
  return withAlso(slimPage(res))
}

export async function getBlock(id) {
  const page = withAlso({ blocks: [slim(await arena('/blocks/' + id))] })
  return page.blocks[0]
}

// every public channel a block is saved in, mine and other people's
export async function getConnections(id) {
  const res = await arena('/blocks/' + id + '/connections?per=100')
  return res.data.map(slimChannel)
}
