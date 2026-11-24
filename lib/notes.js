// channel notes. one plain text file per channel in the notes folder,
// named after the channel, like notes/alt os.md or notes/tender-circuits.txt

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'notes')

// "Alt OS.md", "alt-os.txt" and "alt os" all come out as "alt-os"
const simple = (text) =>
  text
    .toLowerCase()
    .replace(/\.(md|txt)$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export async function readNotes(channels) {
  let files = []
  try {
    files = await readdir(DIR)
  } catch (err) {
    return {}
  }
  const notes = {}
  for (const file of files) {
    if (!/\.(md|txt)$/i.test(file) || file.toLowerCase() === 'readme.md') continue
    const key = simple(file)
    // match the full slug, or the channel's title
    const channel = channels.find((c) => simple(c.s) === key || simple(c.t) === key)
    if (!channel) continue
    const text = (await readFile(path.join(DIR, file), 'utf8')).trim()
    if (text) notes[channel.s] = text
  }
  return notes
}
