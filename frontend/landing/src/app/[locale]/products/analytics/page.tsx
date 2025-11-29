'use client';

import { BarChart3 } from 'lucide-react';
import ProductPage from '@/components/common/ProductPage';

export default function AnalyticsPage() {
  return (
    <ProductPage
      productKey="analytics"
      icon={BarChart3}
      color="bg-gradient-to-b from-green-50 to-white"
    />
  );
}
