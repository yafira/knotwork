# arena-site

my are.na channels as a website. a graph view where every block is a node, an index view, and a page per channel.

## run it

```
npm install
npm run dev
```

then open http://localhost:3000

## how it stays in sync

- channel names, counts and blocks come live from are.na and are cached for an hour
- thumbnails on the index and the pink threads in the graph come from `data/snapshot.json`
- `npm run sync` rebuilds that snapshot. it takes about a minute and a half, then commit the file

## where things are

- `app/` pages: `/` graph, `/index` grid, `/c/[slug]` channel, `/api/channel/[slug]` block feed
- `components/` the react pieces
- `lib/graph.js` the canvas graph, `lib/arena.js` are.na fetching, `lib/shared.js` helpers
- to point it at a different are.na user, change `USER` in `lib/shared.js` and `scripts/sync.mjs`, then run the sync
