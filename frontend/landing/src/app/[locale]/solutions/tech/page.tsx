'use client';

import { Cpu } from 'lucide-react';
import SolutionPage from '@/components/common/SolutionPage';

export default function TechPage() {
  return (
    <SolutionPage
      solutionKey="tech"
      icon={Cpu}
      color="bg-gradient-to-b from-cyan-50 to-white"
    />
  );
}
