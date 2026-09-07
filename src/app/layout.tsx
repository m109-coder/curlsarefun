import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Curls Are Fun - Your Curly Hair Guru',
  description: '20 years of experience transforming curly hair with expertise, education, and premium products.',
  keywords: ['curly hair', 'hair salon', 'New York', 'Boston', 'Los Angeles', 'curly hair products'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-body overflow-x-hidden`}>
        {children}
      </body>
    </html>
  )
}
