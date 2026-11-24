import './globals.css'
import { getSite } from '@/lib/arena'
import { SITE } from '@/lib/shared'
import Nav from '@/components/Nav'

export const revalidate = 3600

export const metadata = {
  title: { default: 'yafira ᝰ · are.na', template: '%s · yafira ᝰ' },
  description: 'a map of the channels yafira keeps on are.na'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
}

export default async function RootLayout({ children }) {
  const site = await getSite()
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
        />
      </head>
      <body>
        <header className="bar">
          <h1>{site.name}</h1>
          <span className="counts">
            {site.channels.length} channels · {site.total} blocks
          </span>
          <span className="spacer" />
          <Nav />
          <a className="out" href={SITE + '/' + site.user} target="_blank" rel="noopener">
            are.na ↗
          </a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
