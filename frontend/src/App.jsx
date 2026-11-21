import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { ProtectedRoute, PublicRoute, SuperAdminOnly, BusinessUserOnly, OwnerOnly } from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

// App pages
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Customers from './pages/Customers';
import Loyalty from './pages/Loyalty';
import CustomerDetail from './pages/CustomerDetail';
import Staff from './pages/Staff';
import Services from './pages/Services';
import Offers from './pages/Offers';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';
import PublicBooking from './pages/PublicBooking';
import BookingManagement from './pages/BookingManagement';
import PlatformAdminDashboard from './pages/PlatformAdminDashboard';
import Subscription from './pages/Subscription';

function HomeRedirect() {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'super_admin' ? '/platform-admin' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public */}
            <Route path="/book/:slug" element={<PublicBooking />} />
            <Route path="/booking/manage" element={<BookingManagement />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/platform-admin" element={<SuperAdminOnly><PlatformAdminDashboard /></SuperAdminOnly>} />
                <Route path="/dashboard" element={<BusinessUserOnly><Dashboard /></BusinessUserOnly>} />
                <Route path="/appointments" element={<BusinessUserOnly><Appointments /></BusinessUserOnly>} />
                <Route path="/customers" element={<BusinessUserOnly><Customers /></BusinessUserOnly>} />
                <Route path="/loyalty" element={<BusinessUserOnly><Loyalty /></BusinessUserOnly>} />
                <Route path="/customers/:id" element={<BusinessUserOnly><CustomerDetail /></BusinessUserOnly>} />
                <Route path="/staff" element={<BusinessUserOnly><Staff /></BusinessUserOnly>} />
                <Route path="/services" element={<BusinessUserOnly><Services /></BusinessUserOnly>} />
                <Route path="/offers" element={<BusinessUserOnly><Offers /></BusinessUserOnly>} />
                <Route path="/analytics" element={<BusinessUserOnly><Analytics /></BusinessUserOnly>} />
                <Route path="/notifications" element={<BusinessUserOnly><Notifications /></BusinessUserOnly>} />
                <Route path="/ai-assistant" element={<BusinessUserOnly><AIAssistant /></BusinessUserOnly>} />
                <Route path="/settings" element={<BusinessUserOnly><Settings /></BusinessUserOnly>} />
                <Route path="/subscription" element={<OwnerOnly><Subscription /></OwnerOnly>} />
              </Route>
            </Route>

            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
