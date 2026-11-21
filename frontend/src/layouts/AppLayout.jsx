import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';

export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  return (
    <div className="app-frame flex bg-background overflow-hidden">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Navbar mobileNavOpen={mobileNavOpen} onMenuClick={() => setMobileNavOpen((open) => !open)} />
        <main className="app-main min-w-0 min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-7">
          <div key={pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
