import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';

// Critical pages - load immediately
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';

// Lazy loaded pages - code split for smaller initial bundle
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LinksPage = lazy(() => import('@/pages/LinksPage'));
const LinkDetailPage = lazy(() => import('@/pages/LinkDetailPage'));
const TemplatesPage = lazy(() => import('@/pages/TemplatesPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const BioLinksPage = lazy(() => import('@/pages/BioLinksPage'));
const BioLinkEditorPage = lazy(() => import('@/pages/BioLinkEditorPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const QRPage = lazy(() => import('@/pages/QRPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const DomainsPage = lazy(() => import('@/pages/DomainsPage'));
const SSOPage = lazy(() => import('@/pages/SSOPage'));
const WebhooksPage = lazy(() => import('@/pages/WebhooksPage'));
const CampaignsPage = lazy(() => import('@/pages/CampaignsPage'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/links"
            element={
              <ProtectedRoute>
                <LinksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/links/:id"
            element={
              <ProtectedRoute>
                <LinkDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bio-links"
            element={
              <ProtectedRoute>
                <BioLinksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bio-links/:id/edit"
            element={
              <ProtectedRoute>
                <BioLinkEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr"
            element={
              <ProtectedRoute>
                <QRPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <TeamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/domains"
            element={
              <ProtectedRoute>
                <DomainsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sso"
            element={
              <ProtectedRoute>
                <SSOPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/webhooks"
            element={
              <ProtectedRoute>
                <WebhooksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <CampaignsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
