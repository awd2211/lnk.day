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
        <Route path="moderation" element={<ContentModerationPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="system" element={<SystemPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
