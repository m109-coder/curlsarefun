import { CartProvider } from '@/context/CartContext'
import { CartDrawer } from '@/components/shop/CartDrawer'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <Footer />
      </div>
      <MobileBottomNav />
      <CartDrawer />
    </CartProvider>
  )
}