'use client';

import { ShoppingBag } from 'lucide-react';
import SolutionPage from '@/components/common/SolutionPage';

export default function RetailPage() {
  return (
    <SolutionPage
      solutionKey="retail"
      icon={ShoppingBag}
      color="bg-gradient-to-b from-emerald-50 to-white"
    />
  );
}
