import { getConnections } from '@/lib/arena'

// every public channel a block lives in. drift uses this to find its next step
export async function GET(request, { params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return Response.json({ error: 'bad request' }, { status: 400 })
  try {
    return Response.json(await getConnections(id))
  } catch (err) {
    return Response.json({ error: 'are.na did not answer' }, { status: 502 })
  }
}
