import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSite, getBlocks } from '@/lib/arena'
import { SITE, when, count, threadsFor } from '@/lib/shared'
import Blocks from '@/components/Blocks'

export const revalidate = 3600

// nothing is built ahead of time. each channel page is made on its first visit, then cached
export function generateStaticParams() {
  return []
}

async function find(params) {
  const { slug } = await params
  const site = await getSite()
  return { site, channel: site.channels.find((c) => c.s === slug) }
}

export async function generateMetadata({ params }) {
  const { channel } = await find(params)
  if (!channel) return {}
  return { title: channel.t.toLowerCase(), description: channel.d || undefined }
}

export default async function Channel({ params }) {
  const { site, channel } = await find(params)
  if (!channel) notFound()

  // if are.na is slow or says no, the browser asks again on its own
  let first = null
  try {
    first = await getBlocks(channel.s, 1)
  } catch (err) {}

  const names = Object.fromEntries(site.channels.map((c) => [c.s, c.t.toLowerCase()]))
  const shared = threadsFor(channel.s, site.threads).filter((t) => names[t.slug])

  return (
    <article className="page">
      <header className="chead">
        <Link className="back" href="/index">
          ← all channels
        </Link>
        <h2>{channel.t.toLowerCase()}</h2>
        {channel.d && <p>{channel.d}</p>}
        <div className="meta">
          <span>{count(channel.n)}</span>
          <span>started {when(channel.c)}</span>
          <span>updated {when(channel.u)}</span>
          <a href={SITE + '/' + site.user + '/' + channel.s} target="_blank" rel="noopener">
            open on are.na ↗
          </a>
        </div>
        {shared.length > 0 && (
          <div className="shared">
            {shared.map((t) => (
              <Link key={t.slug} href={'/c/' + t.slug}>
                shares {t.count} with {names[t.slug]}
              </Link>
            ))}
          </div>
        )}
      </header>
      <Blocks slug={channel.s} initial={first} />
    </article>
  )
}
