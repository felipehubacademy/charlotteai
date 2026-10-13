'use client';
// Guarda o código do link de afiliado (?aff=) sem mudar nada na página.
import { useEffect } from 'react';
import { captureAffiliateFromUrl } from '@/lib/affiliateTracking';

export default function AffiliateCapture() {
  useEffect(() => { captureAffiliateFromUrl(); }, []);
  return null;
}
