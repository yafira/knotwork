import { getBlock } from '@/lib/arena'

// one block, for drift links that start from a particular block
export async function GET(request, { params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return Response.json({ error: 'bad request' }, { status: 400 })
  try {
    return Response.json(await getBlock(id))
  } catch (err) {
    return Response.json({ error: 'are.na did not answer' }, { status: 502 })
  }
}
