import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Dashboard } from '@/pages/Dashboard';
import { NewNegotiation } from '@/pages/NewNegotiation';
import { AssistantPage } from '@/pages/AssistantPage';
import { NegotiationArena } from '@/pages/NegotiationArena';
import { ReportPage } from '@/pages/ReportPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Application Routes */}
      <Route path="/app" element={<ProtectedLayout />}>
        {/* Redirect /app to /app/new by default */}
        <Route index element={<Navigate to="/app/new" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="new" element={<NewNegotiation />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="negotiations/:id" element={<NegotiationArena />} />
        <Route path="reports/:id" element={<ReportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
