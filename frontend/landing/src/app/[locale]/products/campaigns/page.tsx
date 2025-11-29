'use client';

import { Megaphone } from 'lucide-react';
import ProductPage from '@/components/common/ProductPage';

export default function CampaignsPage() {
  return (
    <ProductPage
      productKey="campaigns"
      icon={Megaphone}
      color="bg-gradient-to-b from-rose-50 to-white"
    />
  );
}
