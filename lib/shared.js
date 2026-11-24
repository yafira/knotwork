// small helpers used on both the server and in the browser

export const USER = 'yafira'
export const SITE = 'https://www.are.na'
export const PER_PAGE = 60

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function when(date) {
  const [y, m] = date.split('-')
  return months[+m - 1] + ' ' + y
}

export function count(n) {
  return n + (n === 1 ? ' block' : ' blocks')
}

// are.na thumbnail urls are a base64 recipe, rebuilt here from block id + filename
export function thumb(key, size = 400) {
  const [id, file] = key.split('/')
  const spec = {
    bucket: 'arena_images',
    key: id + '/original_' + file,
    edits: {
      resize: { width: size, height: size, fit: 'inside', withoutEnlargement: true },
      webp: { quality: 75 },
      jpeg: { quality: 75 },
      rotate: null
    }
  }
  return 'https://images.are.na/' + btoa(JSON.stringify(spec))
}

// which other channels share blocks with this one
export function threadsFor(slug, threads) {
  return threads
    .filter((t) => t[0] === slug || t[1] === slug)
    .map((t) => ({ slug: t[0] === slug ? t[1] : t[0], count: t[2] }))
}

// keep only what the page draws from an are.na block
export function slim(b) {
  const text = b.content && (typeof b.content === 'string' ? b.content : b.content.plain || b.content.markdown)
  return {
    id: b.id,
    type: b.type,
    title: b.title || '',
    img: b.image && b.image.small ? b.image.small.src : null,
    img2: b.image && b.image.small ? b.image.small.src_2x : null,
    ar: (b.image && b.image.aspect_ratio) || null,
    host: b.source && b.source.provider ? b.source.provider.name.replace(/^www\./, '') : '',
    text: text || ''
  }
}

export function slimPage(res) {
  return {
    blocks: res.data.filter((b) => b.base_type === 'Block').map(slim),
    next: res.meta.next_page || null,
    total: res.meta.total_count || 0
  }
}

// a channel's page on are.na. owner slug first when we know it
export function channelUrl(slug, owner) {
  return SITE + '/' + (owner || 'channel') + '/' + slug
}

// keep only what the page needs from an are.na channel
export function slimChannel(c) {
  return {
    s: c.slug,
    t: c.title,
    by: c.owner ? c.owner.name || c.owner.slug : '',
    bySlug: c.owner ? c.owner.slug : '',
    mine: !!(c.owner && c.owner.slug === USER)
  }
}
