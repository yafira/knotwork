# knotwork

my are.na channels as a website. a graph view where every block is a node, an index view, and a page per channel.

## run it

```
npm install
npm run dev
```

then open http://localhost:3000

## what's on it

- `/` the graph. my channels, every block as a small dot, pink lines between channels that share blocks, and hollow nodes around the outside for other people's channels that hold my blocks (switch those off in the legend)
- `/index` all channels as cards
- `/c/[slug]` one channel, with my note on it and which other people's channels keep its blocks
- `/drift` one block at a time, moving on every 12 seconds. usually it stays in the same channel, sometimes it crosses through a shared block into another, now and then it jumps. tick "wander" to let it go into other people's channels. space pauses, arrows step

## channel notes

write a note for any channel in the `notes` folder, one file per channel named after it. see `notes/README.md`.

## how it stays in sync

- channel names, counts and blocks come live from are.na and are cached for an hour
- thumbnails on the index and the pink threads in the graph come from `data/snapshot.json`
- `npm run sync` rebuilds that snapshot. it takes about a minute and a half, then commit the file
- `npm run sync:connections` finds which other people's channels hold my blocks and writes `data/connections.json`. it asks about every block, so it takes around 35 minutes. you can stop it and run it again to carry on
- optional: set `ARENA_TOKEN` to an are.na personal access token (in `.env.local`, and in the host's settings when deployed). it raises are.na's rate limit for the site and makes the connections sync much faster

## where things are

- `app/` pages: `/` graph, `/index` grid, `/c/[slug]` channel, `/drift`, and `/api/` routes for blocks and connections
- `components/` the react pieces
- `lib/graph.js` the canvas graph, `lib/arena.js` are.na fetching, `lib/notes.js` reads the notes folder, `lib/shared.js` helpers
- to point it at a different are.na user, change `USER` in `lib/shared.js`, `scripts/sync.mjs` and `scripts/sync-connections.mjs`, then run both syncs
