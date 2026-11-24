import { getSite } from '@/lib/arena'
import Drift from '@/components/Drift'

export const revalidate = 3600
export const metadata = { title: 'drift' }

export default async function DriftPage() {
  const site = await getSite()
  return <Drift site={{ user: site.user, channels: site.channels.map((c) => ({ s: c.s, t: c.t, n: c.n })) }} />
}
