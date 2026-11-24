import { getSite } from '@/lib/arena'
import GraphView from '@/components/GraphView'

export const revalidate = 3600

export default async function Home() {
  const site = await getSite()
  return <GraphView site={site} />
}
