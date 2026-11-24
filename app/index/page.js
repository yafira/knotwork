import { getSite } from '@/lib/arena'
import ChannelGrid from '@/components/ChannelGrid'

export const revalidate = 3600
export const metadata = { title: 'index' }

export default async function Index() {
  const site = await getSite()
  return (
    <section className="index">
      <ChannelGrid channels={site.channels} />
    </section>
  )
}
