'use client';

import { Building2 } from 'lucide-react';
import SolutionPage from '@/components/common/SolutionPage';

export default function EnterprisePage() {
  return (
    <SolutionPage
      solutionKey="enterprise"
      icon={Building2}
      color="bg-gradient-to-b from-slate-100 to-white"
    />
  );
}
