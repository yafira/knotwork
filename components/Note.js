// a channel note: paragraphs split on blank lines, links made clickable

const URL_RE = /(https?:\/\/[^\s)]+)/g

function Linked({ text }) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} target="_blank" rel="noopener">
        {part.replace(/^https?:\/\/(www\.)?/, '')}
      </a>
    ) : (
      part
    )
  )
}

export default function Note({ text }) {
  if (!text) return null
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="note">
      {paras.map((p, i) => (
        <p key={i}>
          <Linked text={p} />
        </p>
      ))}
    </div>
  )
}
