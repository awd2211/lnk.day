'use client';

import { Users } from 'lucide-react';
import ProductPage from '@/components/common/ProductPage';

export default function LinkInBioPage() {
  return (
    <ProductPage
      productKey="linkInBio"
      icon={Users}
      color="bg-gradient-to-b from-purple-50 to-white"
    />
  );
}
