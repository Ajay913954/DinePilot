import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Grid3X3, 
  UtensilsCrossed, 
  ShoppingBag,
  Bot, 
  Megaphone, 
  Star, 
  BarChart3, 
  Settings, 
  CreditCard,
  Utensils,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, setMobileOpen }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, active: true },
    { label: 'Orders', path: '/orders', icon: ShoppingBag, active: true },
    { label: 'Reservations', path: '/reservations', icon: Calendar, active: true },
    { label: 'Customers', path: '/customers', icon: Users, active: true },
    { label: 'Tables', path: '/tables', icon: Grid3X3, active: true },
    { label: 'Menu', path: '/menu', icon: UtensilsCrossed, active: true },
    { label: 'AI Assistant', path: '/ai-assistant', icon: Bot, active: false },
    { label: 'Marketing', path: '/marketing', icon: Megaphone, active: false },
    { label: 'Reviews', path: '/reviews', icon: Star, active: false },
    { label: 'Analytics', path: '/analytics', icon: BarChart3, active: false },
    { label: 'Settings', path: '/settings', icon: Settings, active: true },
    { label: 'Billing', path: '/billing', icon: CreditCard, active: false },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900/90 border-r border-slate-800 text-slate-300 w-64 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Utensils className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-tight leading-none">DinePilot</span>
            <span className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase mt-1">AI Business Partner</span>
          </div>
        </Link>
        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isCurrent = location.pathname === item.path;
          const Icon = item.icon;

          if (item.active) {
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          }

          // Inactive / Coming Soon Items
          return (
            <div
              key={item.label}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-500 opacity-60 cursor-not-allowed group relative"
              title="Coming Soon in future Day releases"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-500" />
                <span>{item.label}</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                Soon
              </span>
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-semibold text-white truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'Restaurant Owner'}
            </span>
            <span className="text-[10px] text-amber-400 font-mono tracking-wider">
              {user?.role || 'OWNER'}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen && setMobileOpen(false)}
          />
          <div className="relative z-10 w-64 flex-shrink-0 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
