import { AppLayout } from '@/components/layout/AppLayout';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}

export { Layout };
export default Layout;
