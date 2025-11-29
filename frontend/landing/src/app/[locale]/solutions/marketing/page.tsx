'use client';

import { Megaphone } from 'lucide-react';
import SolutionPage from '@/components/common/SolutionPage';

export default function MarketingPage() {
  return (
    <SolutionPage
      solutionKey="marketing"
      icon={Megaphone}
      color="bg-gradient-to-b from-orange-50 to-white"
    />
  );
}
