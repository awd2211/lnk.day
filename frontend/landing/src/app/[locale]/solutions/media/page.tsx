'use client';

import { Newspaper } from 'lucide-react';
import SolutionPage from '@/components/common/SolutionPage';

export default function MediaPage() {
  return (
    <SolutionPage
      solutionKey="media"
      icon={Newspaper}
      color="bg-gradient-to-b from-violet-50 to-white"
    />
  );
}
