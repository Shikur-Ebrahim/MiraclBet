'use client';

import { useEffect } from 'react';

export function PromoCapture() {
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const code = params.get('ref') || params.get('promo') || params.get('code') || params.get('promocode');
      if (code) {
        const clean = code.trim().toUpperCase();
        if (clean.length >= 3 && clean.length <= 10) {
          localStorage.setItem('miraclbet_promo_code', clean);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return null;
}
