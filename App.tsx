import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PnL from './pages/PnL';
import ManualEntry from './pages/ManualEntry';
import Forecast from './pages/Forecast';
import Subscriptions from './pages/Subscriptions';
import ProfitShare from './pages/ProfitShare';
import Settings from './pages/Settings';
import Receipts from './pages/Receipts';
import Contractors from './pages/Contractors';
import Team from './pages/Team';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/pnl" element={<PnL />} />
                    <Route path="/costs/new" element={<ManualEntry />} />
                    <Route path="/forecast" element={<Forecast />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/profit-share" element={<ProfitShare />} />
                    <Route path="/receipts" element={<Receipts />} />
                    <Route path="/contractors" element={<Contractors />} />
                    <Route path="/team" element={<Team />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f8fafc',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f8fafc',
            },
          },
        }}
      />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
