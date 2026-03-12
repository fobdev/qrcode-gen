import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QR — Generator',
  description: 'Generate QR codes instantly. No dependencies, no tracking.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
