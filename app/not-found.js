import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="page">
      <p className="status">
        nothing lives at this address. <Link href="/index">see all channels</Link>
      </p>
    </section>
  )
}
