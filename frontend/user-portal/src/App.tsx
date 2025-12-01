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
const BillingPage = lazy(() => import('@/pages/BillingPage'));
const ABTestPage = lazy(() => import('@/pages/ABTestPage'));
const ABTestDetailPage = lazy(() => import('@/pages/ABTestDetailPage'));
const RedirectRulesPage = lazy(() => import('@/pages/RedirectRulesPage'));
const DeepLinksPage = lazy(() => import('@/pages/DeepLinksPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const FoldersPage = lazy(() => import('@/pages/FoldersPage'));
const SavedSearchesPage = lazy(() => import('@/pages/SavedSearchesPage'));
const GoalsPage = lazy(() => import('@/pages/GoalsPage'));
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage'));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'));
const DataStreamsPage = lazy(() => import('@/pages/DataStreamsPage'));
const CampaignTemplatesPage = lazy(() => import('@/pages/CampaignTemplatesPage'));
const AutomationPage = lazy(() => import('@/pages/AutomationPage'));
const RealtimeAnalyticsPage = lazy(() => import('@/pages/RealtimeAnalyticsPage'));
const AnalyticsReportsPage = lazy(() => import('@/pages/AnalyticsReportsPage'));
const ApiKeysPage = lazy(() => import('@/pages/ApiKeysPage'));
const BioLinkPublicPage = lazy(() => import('@/pages/BioLinkPublicPage'));

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
          {/* Public Bio Link page - no auth required */}
          <Route path="/u/:username" element={<BioLinkPublicPage />} />
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
            path="/links/:id/edit"
            element={
              <ProtectedRoute>
                <LinkDetailPage editMode />
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
            path="/analytics/realtime"
            element={
              <ProtectedRoute>
                <RealtimeAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/reports"
            element={
              <ProtectedRoute>
                <AnalyticsReportsPage />
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
            path="/pages"
            element={
              <ProtectedRoute>
                <BioLinksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pages/:id/edit"
            element={
              <ProtectedRoute>
                <BioLinkEditorPage />
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
            path="/qr-codes"
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
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ab-tests"
            element={
              <ProtectedRoute>
                <ABTestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ab-tests/:id"
            element={
              <ProtectedRoute>
                <ABTestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/redirect-rules"
            element={
              <ProtectedRoute>
                <RedirectRulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deep-links"
            element={
              <ProtectedRoute>
                <DeepLinksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deeplinks"
            element={
              <ProtectedRoute>
                <DeepLinksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy"
            element={
              <ProtectedRoute>
                <PrivacyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/folders"
            element={
              <ProtectedRoute>
                <FoldersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved-searches"
            element={
              <ProtectedRoute>
                <SavedSearchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/integrations"
            element={
              <ProtectedRoute>
                <IntegrationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/data-streams"
            element={
              <ProtectedRoute>
                <DataStreamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaign-templates"
            element={
              <ProtectedRoute>
                <CampaignTemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/automation"
            element={
              <ProtectedRoute>
                <AutomationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/api-keys"
            element={
              <ProtectedRoute>
                <ApiKeysPage />
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
