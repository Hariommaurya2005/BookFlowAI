import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, UserCheck, Wrench,
  BarChart3, Bell, Settings, Sparkles, LogOut, Zap, X, Tag, Shield, CreditCard, Gift,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/loyalty', icon: Gift, label: 'Loyalty & Rewards' },
  { to: '/staff', icon: UserCheck, label: 'Staff' },
  { to: '/services', icon: Wrench, label: 'Services' },
  { to: '/offers', icon: Tag, label: 'Offers & Coupons' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/ai-assistant', icon: Sparkles, label: 'AI Assistant', featured: true },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNavItems = user?.role === 'super_admin'
    ? [{ to: '/platform-admin', icon: Shield, label: 'Platform Console' }]
    : (user?.role === 'business_owner' ? [...navItems, { to: '/subscription', icon: CreditCard, label: 'Subscription' }] : navItems);

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <button
        aria-label="Close navigation"
        tabIndex={mobileOpen ? 0 : -1}
        className={`sidebar-backdrop ${mobileOpen ? 'is-open' : ''}`}
        onClick={onClose}
      />
      <aside id="app-primary-navigation" className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Main navigation">
        <div className="app-sidebar-brand flex items-center gap-3 px-5 h-navbar shrink-0">
          <div className="app-sidebar-logo grid place-items-center w-10 h-10 rounded-xl shrink-0">
            <Zap size={19} className="text-white" fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-white text-sm leading-none tracking-tight">BookFlow <span className="text-violet-300">AI</span></p>
            <p className="app-sidebar-org text-xs mt-1.5 truncate max-w-[172px]">{user?.role === 'super_admin' ? 'Platform administration' : (organization?.name || 'Business workspace')}</p>
          </div>
          <button onClick={onClose} className="md:hidden grid place-items-center w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300" aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="px-5 pt-6 pb-2 text-[10px] font-bold uppercase tracking-[.17em] text-slate-500">{user?.role === 'super_admin' ? 'Platform' : 'Workspace'}</div>
        <nav className="flex-1 px-3 pb-4 overflow-y-auto" aria-label="Workspace pages">
          {visibleNavItems.map(({ to, icon: Icon, label, featured }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''} ${featured ? 'app-nav-ai' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span className="flex-1">{label}</span>
              {featured && <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-1 rounded-md bg-violet-400/15 text-violet-200">AI</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mx-4 mb-4 p-3 rounded-xl border border-white/[.08] bg-white/[.045]">
          <div className="flex items-center gap-2 mb-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.1)]"/><span className="text-[10px] uppercase tracking-[.14em] text-slate-400 font-bold">Workspace status</span></div>
          <p className="text-xs text-slate-300 leading-relaxed">{user?.role === 'super_admin' ? 'Manage business access and platform administration.' : 'Keep your team and appointments moving in one place.'}</p>
        </div>

        <div className="app-sidebar-user p-4 shrink-0 relative z-[1]">
          <div className="flex items-center gap-3 mb-3">
            <div className="app-avatar grid place-items-center w-9 h-9 rounded-xl text-white text-xs font-extrabold shrink-0">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Workspace user'}</p>
              <p className="text-xs text-slate-400 capitalize mt-0.5">{user?.role?.replace('_', ' ') || 'Member'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="app-logout w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
