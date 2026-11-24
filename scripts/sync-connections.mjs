// finds every channel each of my blocks is saved in, mine and other people's,
// and writes data/connections.json. run: npm run sync:connections
//
// it asks are.na about every block one at a time, so with no token it takes
// around 35 minutes. set ARENA_TOKEN to an are.na personal access token to go faster.
// it saves progress as it goes, so you can stop it and run it again to carry on

import { readFile, writeFile } from 'node:fs/promises'

const USER = 'yafira'
const API = 'https://api.are.na/v3'
const PROGRESS = new URL('../data/.connections-progress.json', import.meta.url)
const OUT = new URL('../data/connections.json', import.meta.url)
const token = process.env.ARENA_TOKEN
const wait = token ? 400 : 2100
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(path) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(API + path, token ? { headers: { Authorization: 'Bearer ' + token } } : {})
    if (res.status === 429) {
      console.log('  rate limited, waiting 30s')
      await sleep(30000)
      continue
    }
    if (!res.ok) throw new Error(res.status + ' ' + path)
    await sleep(wait)
    return res.json()
  }
  throw new Error('gave up on ' + path)
}

// turn raw block -> channels lists into what the site reads
export function summarize(blocks, conn) {
  const counts = {}
  const outside = {}
  for (const id of Object.keys(conn)) {
    const rows = conn[id]
    if (rows.length > 1) counts[id] = rows.length
    for (const [slug, title, ownerSlug, ownerName] of rows) {
      if (ownerSlug === USER) continue
      const o = (outside[slug] = outside[slug] || { s: slug, t: title, by: ownerName, bySlug: ownerSlug, n: 0, with: {} })
      o.n += 1
      for (const mine of blocks[id] || []) o.with[mine] = (o.with[mine] || 0) + 1
    }
  }
  return {
    synced: new Date().toISOString().slice(0, 10),
    outside: Object.values(outside).sort((a, b) => b.n - a.n || a.t.localeCompare(b.t)),
    counts
  }
}

async function main() {
  let state = { blocks: null, conn: {} }
  try {
    state = JSON.parse(await readFile(PROGRESS, 'utf8'))
    console.log('carrying on from last time,', Object.keys(state.conn).length, 'blocks done')
  } catch (err) {}

  if (!state.blocks) {
    state.blocks = {}
    const list = await get('/users/' + USER + '/contents?type=Channel&per=100')
    for (const c of list.data.filter((c) => c.owner.slug === USER)) {
      let page = 1
      while (page) {
        const res = await get('/channels/' + c.slug + '/contents?per=100&page=' + page)
        for (const b of res.data) {
          if (b.base_type === 'Block') (state.blocks[b.id] = state.blocks[b.id] || []).push(c.slug)
        }
        page = res.meta.next_page
      }
      console.log(c.title)
    }
    await writeFile(PROGRESS, JSON.stringify(state))
  }

  const ids = Object.keys(state.blocks).filter((id) => !state.conn[id])
  console.log(ids.length, 'blocks left to ask about')
  let n = 0
  for (const id of ids) {
    let page = 1
    let rows = []
    while (page) {
      const res = await get('/blocks/' + id + '/connections?per=100&page=' + page)
      rows = rows.concat(
        res.data.map((c) => [c.slug, c.title, c.owner ? c.owner.slug : '', c.owner ? c.owner.name || c.owner.slug : ''])
      )
      page = res.meta.next_page
    }
    state.conn[id] = rows
    n += 1
    if (n % 25 === 0) {
      await writeFile(PROGRESS, JSON.stringify(state))
      console.log('  ' + n + ' / ' + ids.length)
    }
  }
  await writeFile(PROGRESS, JSON.stringify(state))

  const out = summarize(state.blocks, state.conn)
  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log('wrote data/connections.json:', out.outside.length, "other people's channels")
}

// only run when called directly, so summarize can be imported
if (import.meta.url === 'file://' + process.argv[1]) main()
