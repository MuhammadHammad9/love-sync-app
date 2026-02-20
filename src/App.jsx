import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';

import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import NotificationToast from './components/NotificationToast';
import ReloadPrompt from './components/ReloadPrompt';

import './index.css';

// Lazy load pages
const Auth = React.lazy(() => import('./pages/Auth'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const ProfileSetup = React.lazy(() => import('./pages/ProfileSetup'));

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

function AppContent() {
  const { notification, removeNotification } = useAuth();

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/profile-setup"
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <AnimatePresence>
        {notification && (
          <NotificationToast
            notification={notification}
            onClose={removeNotification}
          />
        )}
      </AnimatePresence>
      <ReloadPrompt />
    </>
  );
}

export default App;
