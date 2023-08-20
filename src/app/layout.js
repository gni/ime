import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Image Metadata Generator',
  description: "Easily extract and view the embedded metadata from your images. Whether it's EXIF, IPTC, or XMP; get detailed insights in seconds.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
