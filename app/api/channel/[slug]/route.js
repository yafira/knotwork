import { getBlocks } from '@/lib/arena'

// the browser asks here for more blocks, so the answer comes from the cache and not straight from are.na
export async function GET(request, { params }) {
  const { slug } = await params
  const page = Number(new URL(request.url).searchParams.get('page') || 1)
  if (!/^[a-z0-9_-]+$/i.test(slug) || !Number.isInteger(page) || page < 1 || page > 200) {
    return Response.json({ error: 'bad request' }, { status: 400 })
  }
  try {
    return Response.json(await getBlocks(slug, page))
  } catch (err) {
    return Response.json({ error: 'are.na did not answer' }, { status: 502 })
  }
}
