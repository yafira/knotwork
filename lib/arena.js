// server side are.na fetching. next caches every response for an hour,
// so visitors never touch are.na's rate limit

import snapshot from '@/data/snapshot.json'
import { USER, PER_PAGE, slimPage } from '@/lib/shared'

const API = process.env.ARENA_API || 'https://api.are.na/v3'
const HOUR = 3600

async function arena(path) {
  const res = await fetch(API + path, { next: { revalidate: HOUR } })
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
  return {
    user: USER,
    name: snapshot.name,
    channels,
    threads: snapshot.threads,
    total: channels.reduce((sum, c) => sum + c.n, 0)
  }
}

export async function getBlocks(slug, page = 1) {
  const res = await arena('/channels/' + slug + '/contents?per=' + PER_PAGE + '&page=' + page)
  return slimPage(res)
}
