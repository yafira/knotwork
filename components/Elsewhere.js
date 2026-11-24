// other people's channels that hold blocks from this channel

import { channelUrl } from '@/lib/shared'

export default function Elsewhere({ list }) {
  if (!list || !list.length) return null
  return (
    <div className="elsewhere">
      <span className="label">also kept by others</span>
      <ul>
        {list.map((o) => (
          <li key={o.s}>
            <a href={channelUrl(o.s, o.bySlug)} target="_blank" rel="noopener">
              {o.t.toLowerCase()}
            </a>
            <span>
              {o.by ? 'by ' + o.by + ' · ' : ''}
              {o.n} {o.n === 1 ? 'block' : 'blocks'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
