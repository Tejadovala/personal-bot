import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import NewPrototypePage from './pages/NewPrototypePage';
import EditorPage from './pages/EditorPage';
import SharePage from './pages/SharePage';
import BillingPage from './pages/BillingPage';

function ProtectedRoute({ children }) {
  const { user, token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-6 h-6 border-2 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/verify" element={<AuthPage />} />
        <Route path="/share/:shareId" element={<SharePage />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/new" element={
          <ProtectedRoute><NewPrototypePage /></ProtectedRoute>
        } />
        <Route path="/editor/:id" element={
          <ProtectedRoute><EditorPage /></ProtectedRoute>
        } />
        <Route path="/billing" element={
          <ProtectedRoute><BillingPage /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
