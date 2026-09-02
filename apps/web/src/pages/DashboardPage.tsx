import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { restaurantApi } from '../services/api';
import { Card } from '../components/ui/Card';
import { Calendar, Users, DollarSign, Star, Sparkles, Clock, AlertCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    restaurantApi.getMe().then((res) => {
      setRestaurant(res.restaurant);
    });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 glass-panel rounded-3xl border border-amber-500/20 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Day 1 SaaS Foundation</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {getGreeting()}, {user?.firstName}!
          </h1>
          <p className="text-sm text-slate-300">
            Welcome to your AI partner dashboard for{' '}
            <span className="font-semibold text-amber-400">{restaurant?.name || 'your restaurant'}</span>.
          </p>
        </div>

        <div className="shrink-0 z-10">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
            <p className="text-slate-400 font-medium">Cuisine Profile</p>
            <p className="text-white font-bold text-sm">{restaurant?.cuisineType || 'Bistro'}</p>
            <p className="text-[10px] text-slate-500">{restaurant?.city}, {restaurant?.country}</p>
          </div>
        </div>
      </div>

      {/* Feature Modules Placeholder Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Core Module Overview</h2>
          <span className="text-xs text-amber-400 font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            Day 1 Architecture Blueprint
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Today's Reservations", icon: Calendar, color: 'text-amber-400' },
            { title: 'Customers', icon: Users, color: 'text-blue-400' },
            { title: 'Revenue', icon: DollarSign, color: 'text-emerald-400' },
            { title: 'Reviews', icon: Star, color: 'text-purple-400' },
          ].map((card, idx) => (
            <Card key={idx} glass className="p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400">{card.title}</span>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>

              {/* Explicit Coming Soon Notice */}
              <div className="py-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Coming Soon
                </div>
                <p className="text-[11px] text-slate-500 font-medium px-2">
                  Module scheduled for upcoming Day releases.
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Day 1 System Notice Card */}
      <Card glass className="p-6 border-slate-800 space-y-3">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <h3 className="text-base font-bold text-white">Day 1 Platform Status</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your DinePilot foundation is active and connected to PostgreSQL via Prisma ORM. Authentication sessions are securely managed via HTTP-only cookies. Additional operational modules (WhatsApp AI, Table Reservation Engine, CRM, Marketing Automation) will be enabled in subsequent day modules.
        </p>
      </Card>

    </div>
  );
};
