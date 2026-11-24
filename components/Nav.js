'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="toggle" aria-label="view">
      <Link href="/" aria-current={path === '/' ? 'page' : undefined}>
        graph
      </Link>
      <Link href="/index" aria-current={path === '/index' || path.startsWith('/c/') ? 'page' : undefined}>
        index
      </Link>
    </nav>
  )
}
