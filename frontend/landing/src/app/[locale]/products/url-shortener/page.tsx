'use client';

import { Link2 } from 'lucide-react';
import ProductPage from '@/components/common/ProductPage';

export default function URLShortenerPage() {
  return (
    <ProductPage
      productKey="urlShortener"
      icon={Link2}
      color="bg-gradient-to-b from-orange-50 to-white"
    />
  );
}
