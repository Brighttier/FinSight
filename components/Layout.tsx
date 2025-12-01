import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PieChart,
  CreditCard,
  TrendingUp,
  Receipt,
  Settings,
  LogOut,
  Landmark,
  PlusCircle,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
        ${isActive
          ? 'bg-primary text-primary-foreground font-medium shadow-md'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'} />
      <span className="text-sm">{label}</span>
    </NavLink>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (err: any) {
      toast.error('Failed to log out');
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50/50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-slate-200 bg-white sm:flex">
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900 tracking-tight">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              FS
            </div>
            FinSight
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="flex flex-col gap-1.5 space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overview
            </div>
            <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem to="/pnl" icon={PieChart} label="P&L Statement" />
            <SidebarItem to="/forecast" icon={TrendingUp} label="Forecasting" />

            <div className="px-3 mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Management
            </div>
            <SidebarItem to="/costs/new" icon={PlusCircle} label="Manual Entry" />
            <SidebarItem to="/subscriptions" icon={CreditCard} label="Subscriptions" />
            <SidebarItem to="/contractors" icon={Users} label="Contractors" />
            <SidebarItem to="/profit-share" icon={Landmark} label="Profit Share" />
            <SidebarItem to="/receipts" icon={Receipt} label="Receipts" />
          </nav>
        </div>

        <div className="border-t border-slate-100 p-4">
            <SidebarItem to="/settings" icon={Settings} label="Settings" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors mt-1"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Log out</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 sm:ml-64 transition-all">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
            <h1 className="text-lg font-semibold text-slate-800">
             Financial Intelligence Dashboard
            </h1>
            <div className="ml-auto flex items-center gap-4">
                <div className="text-xs text-slate-500 hidden md:block">
                  {user?.email}
                </div>
                <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-600">
                  {getUserInitials()}
                </div>
            </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
};
