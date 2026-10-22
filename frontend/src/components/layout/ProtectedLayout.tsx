import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, Swords } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';

export const ProtectedLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { toggleMobileSidebar } = useUIStore();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#080b14] text-slate-100">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile TopBar */}
        <header className="md:hidden h-14 bg-[#0d1117] border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-20">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 focus-ring"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              Negotiation Arena
            </span>
          </div>

          <ThemeToggle />
        </header>

        <div className="hidden md:flex h-12 shrink-0 items-center justify-end px-6">
          <ThemeToggle />
        </div>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-[#080b14] relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
