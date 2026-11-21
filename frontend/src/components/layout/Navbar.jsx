import { useLocation, Link } from 'react-router-dom';
import { Bell, Menu, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../../services/api';

const titles = {
  '/dashboard': { title: 'Dashboard', eyebrow: 'YOUR BUSINESS AT A GLANCE' },
  '/appointments': { title: 'Appointments', eyebrow: 'KEEP EVERY VISIT ON TRACK' },
  '/customers': { title: 'Customers', eyebrow: 'BUILD LONG-TERM RELATIONSHIPS' },
  '/loyalty': { title: 'Loyalty & Rewards', eyebrow: 'REWARD EVERY COMPLETED VISIT' },
  '/staff': { title: 'Staff', eyebrow: 'YOUR TEAM, IN SYNC' },
  '/services': { title: 'Services', eyebrow: 'WHAT YOUR BUSINESS OFFERS' },
  '/offers': { title: 'Offers & Coupons', eyebrow: 'GROW REPEAT BOOKINGS' },
  '/analytics': { title: 'Analytics', eyebrow: 'TURN ACTIVITY INTO INSIGHT' },
  '/notifications': { title: 'Notifications', eyebrow: 'STAY UP TO DATE' },
  '/settings': { title: 'Settings', eyebrow: 'YOUR WORKSPACE PREFERENCES' },
  '/subscription': { title: 'Subscription', eyebrow: 'MANAGE YOUR DEMO PLAN' },
  '/ai-assistant': { title: 'AI Assistant', eyebrow: 'A SMARTER WAY TO SCHEDULE' },
  '/platform-admin': { title: 'Platform Console', eyebrow: 'BOOKFLOW PLATFORM ADMINISTRATION' },
};

export default function Navbar({ onMenuClick = () => {}, mobileNavOpen = false }) {
  const { pathname } = useLocation();
  const { user, organization } = useAuth();
  const [unread, setUnread] = useState(0);
  const page = Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] || { title: 'BookFlow AI', eyebrow: 'BUSINESS WORKSPACE' };

  useEffect(() => {
    let isMounted = true;
    if (user?.role === 'super_admin') { setUnread(0); return () => { isMounted = false; }; }
    api.get('/notifications?limit=1')
      .then(({ data }) => { if (isMounted) setUnread(data.data?.unread || 0); })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [pathname, user?.role]);

  return (
    <header className="app-navbar h-navbar flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-7 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={onMenuClick} className="md:hidden grid place-items-center w-10 h-10 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-primary-700" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} aria-controls="app-primary-navigation"><Menu size={19} /></button>
        <div className="min-w-0">
          <p className="hidden sm:block text-[9px] uppercase tracking-[.15em] font-extrabold text-primary-600 mb-1">{page.eyebrow}</p>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 leading-tight truncate tracking-tight">{page.title}</h1>
          <p className="sm:hidden text-[10px] text-slate-400 truncate">{user?.role === 'super_admin' ? 'Platform administration' : (organization?.name || 'Business workspace')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {user?.role !== 'super_admin' && <>
          <Link to="/ai-assistant" aria-label="Open AI assistant" title="AI assistant" className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-primary-100 bg-primary-50/70 text-primary-700 text-xs font-bold hover:bg-primary-100 transition-colors">
            <Sparkles size={15} /> <span>Ask AI</span>
          </Link>
          <Link to="/notifications" aria-label="Notifications" className="relative grid place-items-center w-10 h-10 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-primary-50 hover:text-primary-700 transition-colors">
            <Bell size={18} />
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-extrabold border-2 border-white">{unread > 9 ? '9+' : unread}</span>}
          </Link>
        </>}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l sm:border-slate-200">
          <div className="app-avatar grid place-items-center w-9 h-9 rounded-xl text-white text-xs font-extrabold">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
          <div className="hidden lg:block min-w-0 max-w-[155px]">
            <p className="text-xs font-bold text-slate-700 truncate">{user?.name || 'Workspace user'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Signed in'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
