/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { CalendarProvider } from './CalendarContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? (
    <CalendarProvider>
      <Dashboard />
    </CalendarProvider>
  ) : (
    <Login />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

