import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAuth } from './contexts/AppContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import ToastContainer from './components/ui/ToastContainer';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EpisodesPage = lazy(() => import('./pages/EpisodesPage'));
const EpisodeDetailPage = lazy(() => import('./pages/EpisodeDetailPage'));
const EditorialHubPage = lazy(() => import('./pages/EditorialHubPage'));
const MediaLibraryPage = lazy(() => import('./pages/MediaLibraryPage'));
const SponsorsPage = lazy(() => import('./pages/SponsorsPage'));
const SponsorDetailPage = lazy(() => import('./pages/SponsorDetailPage'));
const SponsorReportsPage = lazy(() => import('./pages/SponsorReportsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PodigeePage = lazy(() => import('./pages/PodigeePage'));
const BrandingPage = lazy(() => import('./pages/BrandingPage'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-obsidian-900">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">PodCore wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>} />
        <Route path="episodes" element={<Suspense fallback={<LoadingSpinner />}><EpisodesPage /></Suspense>} />
        <Route path="episodes/:id" element={<Suspense fallback={<LoadingSpinner />}><EpisodeDetailPage /></Suspense>} />
        <Route path="editorial" element={<Suspense fallback={<LoadingSpinner />}><EditorialHubPage /></Suspense>} />
        <Route path="media" element={<Suspense fallback={<LoadingSpinner />}><MediaLibraryPage /></Suspense>} />
        <Route path="sponsors" element={<Suspense fallback={<LoadingSpinner />}><SponsorsPage /></Suspense>} />
        <Route path="sponsors/:id" element={<Suspense fallback={<LoadingSpinner />}><SponsorDetailPage /></Suspense>} />
        <Route path="sponsors/reports" element={<Suspense fallback={<LoadingSpinner />}><SponsorReportsPage /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<LoadingSpinner />}><PodigeePage /></Suspense>} />
        <Route path="branding" element={<Suspense fallback={<LoadingSpinner />}><BrandingPage /></Suspense>} />
        <Route path="admin" element={<Suspense fallback={<LoadingSpinner />}><AdminPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<LoadingSpinner />}><SettingsPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
