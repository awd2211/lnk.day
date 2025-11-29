'use client';

import { QrCode } from 'lucide-react';
import ProductPage from '@/components/common/ProductPage';

export default function QRCodesPage() {
  return (
    <ProductPage
      productKey="qrCodes"
      icon={QrCode}
      color="bg-gradient-to-b from-blue-50 to-white"
    />
  );
}
