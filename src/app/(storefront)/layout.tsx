import { CartProvider } from '@/context/CartContext'
import { CartDrawer } from '@/components/shop/CartDrawer'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PromoModal } from '@/components/promo/PromoModal'

/**
 * Public storefront layout.
 *
 * Wraps every public page in `CartProvider` (cart state + localStorage
 * persistence) and mounts the shared Header, Footer, slide-out CartDrawer,
 * and the once-per-session PromoModal.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <CartDrawer />
      <PromoModal />
    </CartProvider>
  )
}