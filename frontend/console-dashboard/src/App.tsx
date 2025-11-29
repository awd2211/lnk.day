import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from '@/components/Layout';
import DashboardPage from '@/pages/DashboardPage';
import UsersPage from '@/pages/UsersPage';
import TeamsPage from '@/pages/TeamsPage';
import LinksPage from '@/pages/LinksPage';
import CampaignsPage from '@/pages/CampaignsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import SystemPage from '@/pages/SystemPage';
import LoginPage from '@/pages/LoginPage';
import SubscriptionsPage from '@/pages/SubscriptionsPage';
import ContentModerationPage from '@/pages/ContentModerationPage';
import AlertsPage from '@/pages/AlertsPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import BillingPage from '@/pages/BillingPage';
import ApiKeysPage from '@/pages/ApiKeysPage';
import WebhooksPage from '@/pages/WebhooksPage';
import ExportPage from '@/pages/ExportPage';
import DomainsPage from '@/pages/DomainsPage';
import QRCodesPage from '@/pages/QRCodesPage';
import DeepLinksPage from '@/pages/DeepLinksPage';
import PagesPage from '@/pages/PagesPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="domains" element={<DomainsPage />} />
        <Route path="qr-codes" element={<QRCodesPage />} />
        <Route path="deep-links" element={<DeepLinksPage />} />
        <Route path="pages" element={<PagesPage />} />
        <Route path="moderation" element={<ContentModerationPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="system" element={<SystemPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
