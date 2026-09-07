'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const SESSION_KEY = 'hasSeenPromo';

interface PromoConfig {
  isActive: boolean;
  imageUrl: string | null;
  targetUrl: string | null;
}

/**
 * Promotional popup for the storefront.
 *
 * Behavior:
 *  - Fetches `/api/promo` on mount; renders only when `isActive` and an image
 *    URL are present.
 *  - Shows **once per browser session**: closing it stores
 *    `sessionStorage['hasSeenPromo'] = 'true'`, so navigation between pages
 *    does not re-open it.
 *  - Clicking the image navigates to `targetUrl` when configured.
 */
export function PromoModal() {
  const [promo, setPromo] = useState<PromoConfig | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return;

    fetch('/api/promo')
      .then((r) => r.json())
      .then((data) => {
        const p = data?.promo as PromoConfig | undefined;
        if (p?.isActive && p.imageUrl) {
          setPromo(p);
          // Small delay so the page paints first — less jarring UX
          setTimeout(() => setVisible(true), 600);
        }
      })
      .catch(() => {
        // Silently skip: promo is non-critical
      });
  }, []);

  const close = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setVisible(false);
  };

  if (!visible || !promo?.imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-neutral-dark/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Promotion"
      onClick={close}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close promotion"
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-11 h-11 bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-white transition-colors"
        >
          <X className="w-6 h-6 text-neutral-dark" />
        </button>

        {promo.targetUrl ? (
          <a href={promo.targetUrl} onClick={close}>
            <img src={promo.imageUrl} alt="Promotion" className="w-full h-auto object-cover" />
          </a>
        ) : (
          <img src={promo.imageUrl} alt="Promotion" className="w-full h-auto object-cover" />
        )}
      </div>
    </div>
  );
}
