import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={`${inter.className} overflow-x-hidden`}>
        {children}
      </body>
    </html>
  )
}