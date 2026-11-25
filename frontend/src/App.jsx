import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import { FacilityProvider } from './context/FacilityContext';
import Assets from './pages/Assets';
import Dashboard from './pages/Dashboard';
import Help from './pages/Help';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import WorkOrders from './pages/WorkOrders';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <FacilityProvider>
      <Layout />
    </FacilityProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
