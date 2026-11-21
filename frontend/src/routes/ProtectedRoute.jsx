import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export const PublicRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Outlet />;
  return <Navigate to={user?.role === 'super_admin' ? '/platform-admin' : '/dashboard'} replace />;
};

export const SuperAdminOnly = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'super_admin' ? children : <Navigate to="/dashboard" replace />;
};

export const BusinessUserOnly = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role !== 'super_admin' ? children : <Navigate to="/platform-admin" replace />;
};

export const OwnerOnly = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'business_owner' ? children : <Navigate to={user?.role === 'super_admin' ? '/platform-admin' : '/dashboard'} replace />;
};
