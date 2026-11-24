// refreshes data/snapshot.json (thumbnails and the pink threads) from are.na. run: npm run sync
// needs node 18+, no installs. takes about a minute and a half
// because are.na allows 30 requests a minute without a login

import { writeFile } from 'node:fs/promises'

const USER = 'yafira'
const API = 'https://api.are.na/v3'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(path) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(API + path)
    if (res.status === 429) {
      console.log('  rate limited, waiting 20s')
      await sleep(20000)
      continue
    }
    if (!res.ok) throw new Error(res.status + ' ' + path)
    await sleep(2200)
    return res.json()
  }
  throw new Error('gave up on ' + path)
}

// the small thumbnail url can be rebuilt from block id + filename,
// so only keep images where that holds
function thumbUrl(key) {
  const [id, file] = key.split('/')
  const spec = {
    bucket: 'arena_images',
    key: id + '/original_' + file,
    edits: {
      resize: { width: 400, height: 400, fit: 'inside', withoutEnlargement: true },
      webp: { quality: 75 },
      jpeg: { quality: 75 },
      rotate: null
    }
  }
  return 'https://images.are.na/' + Buffer.from(JSON.stringify(spec)).toString('base64')
}

const me = await get('/users/' + USER)
const list = await get('/users/' + USER + '/contents?type=Channel&per=100')
// skip group channels, keep only the ones i own
const mine = list.data.filter((c) => c.owner.slug === USER)

const channels = []
const homes = {}

for (const c of mine) {
  let page = 1
  let blocks = []
  while (page) {
    const res = await get('/channels/' + c.slug + '/contents?per=100&page=' + page)
    blocks = blocks.concat(res.data)
    page = res.meta.next_page
  }
  console.log(c.title, blocks.length)

  const th = []
  for (const b of blocks) {
    if (!homes[b.id]) homes[b.id] = new Set()
    homes[b.id].add(c.slug)
    if (th.length < 3 && b.type === 'Image' && b.image?.filename) {
      const key = b.id + '/' + b.image.filename
      if (thumbUrl(key) === b.image.small?.src) th.push(key)
    }
  }

  channels.push({
    s: c.slug,
    t: c.title,
    d: (c.description?.plain || '').trim(),
    n: c.counts.contents,
    u: c.updated_at.slice(0, 10),
    c: c.created_at.slice(0, 10),
    th
  })
}

// two channels are threaded together when the same block lives in both
const pairs = {}
for (const set of Object.values(homes)) {
  const slugs = [...set]
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const key = slugs[i] + '|' + slugs[j]
      pairs[key] = (pairs[key] || 0) + 1
    }
  }
}
const threads = Object.entries(pairs)
  .map(([key, count]) => [...key.split('|'), count])
  .sort((a, b) => b[2] - a[2])

const seed = {
  user: USER,
  name: me.name.toLowerCase(),
  synced: new Date().toISOString().slice(0, 10),
  blocks: Object.keys(homes).length,
  channels,
  threads
}

await writeFile(new URL('../data/snapshot.json', import.meta.url), JSON.stringify(seed, null, 2) + '\n')
console.log('wrote data/snapshot.json:', channels.length, 'channels,', seed.blocks, 'blocks,', threads.length, 'threads')
