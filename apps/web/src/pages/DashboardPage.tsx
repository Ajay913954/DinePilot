import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { restaurantApi, reservationApi, tableApi, customerApi } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar, Users, Grid3X3, Star, Sparkles, Settings, ExternalLink, PlusCircle, Clock, CheckCircle2, UserCheck, UserPlus } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [restaurant, setRestaurant] = useState<any>(null);
  const [todayReservations, setTodayReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [restRes, resvRes, tblRes, custRes] = await Promise.all([
          restaurantApi.getMe(),
          reservationApi.getReservations({ date: todayStr }),
          tableApi.getTables(),
          customerApi.getCustomerStats().catch(() => ({ stats: { totalCustomers: 0, newCustomers: 0, returningCustomers: 0, vipCustomers: 0 } })),
        ]);

        setRestaurant(restRes.restaurant);
        setTodayReservations(resvRes.reservations || []);
        setTables(tblRes.tables || []);
        setCustomerStats(custRes.stats || null);
      } catch (err) {
        console.error('Dashboard data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [todayStr]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const pendingCount = todayReservations.filter(r => r.status === 'PENDING').length;
  const confirmedCount = todayReservations.filter(r => r.status === 'CONFIRMED').length;
  const seatedCount = todayReservations.filter(r => r.status === 'SEATED').length;
  const totalGuests = todayReservations
    .filter(r => ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED'].includes(r.status))
    .reduce((acc, r) => acc + r.guestCount, 0);

  const availableTables = tables.filter(t => t.status === 'AVAILABLE').length;
  const totalTables = tables.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 glass-panel rounded-3xl border border-amber-500/20 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Tenant: {restaurant?.name || 'Loading...'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {getGreeting()}, {user?.firstName}!
          </h1>
          <p className="text-sm text-slate-300">
            DinePilot reservation & seating engine active for{' '}
            <span className="font-semibold text-amber-400">{restaurant?.name || 'your restaurant'}</span>.
          </p>
        </div>

        <div className="shrink-0 z-10">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
            <p className="text-slate-400 font-medium">Cuisine Profile</p>
            <p className="text-white font-bold text-sm">{restaurant?.cuisineType || 'Bistro'}</p>
            <p className="text-[10px] text-slate-500">{restaurant?.city}, {restaurant?.state}</p>
          </div>
        </div>
      </div>

      {/* Live Operational Metrics Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Today's Operational Metrics</h2>
          <span className="text-xs text-amber-400 font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            Live PostgreSQL Queries
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Today's Reservations */}
          <Card glass className="p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Today's Bookings</span>
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{todayReservations.length}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              {pendingCount} Pending • {confirmedCount} Confirmed • {seatedCount} Seated
            </p>
          </Card>

          {/* Card 2: Expected Guests */}
          <Card glass className="p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Expected Guests</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-extrabold text-blue-400">{totalGuests}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              Total covers scheduled for today
            </p>
          </Card>

          {/* Card 3: Seating & Table Availability */}
          <Card glass className="p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Available Tables</span>
              <Grid3X3 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-400">
              {availableTables} <span className="text-sm font-normal text-slate-400">/ {totalTables}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Operational dining room capacity
            </p>
          </Card>

          {/* Card 4: Real Customer CRM Metrics */}
          <Link to="/customers">
            <Card glass className="p-6 relative overflow-hidden group border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Customer CRM</span>
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-extrabold text-purple-400">
                {customerStats?.totalCustomers || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                {customerStats?.vipCustomers || 0} VIP • {customerStats?.returningCustomers || 0} Returning
              </p>
            </Card>
          </Link>

        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/reservations">
            <Card glass className="p-4 flex items-center justify-between hover:border-amber-500/40 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">+ New Reservation</h3>
                  <p className="text-[11px] text-slate-400">Book & check availability</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/tables">
            <Card glass className="p-4 flex items-center justify-between hover:border-amber-500/40 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Grid3X3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manage Tables</h3>
                  <p className="text-[11px] text-slate-400">View capacity & statuses</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/settings">
            <Card glass className="p-4 flex items-center justify-between hover:border-amber-500/40 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Restaurant Settings</h3>
                  <p className="text-[11px] text-slate-400">Operating hours & profile</p>
                </div>
              </div>
            </Card>
          </Link>

          {restaurant?.slug && (
            <Link to={`/r/${restaurant.slug}`} target="_blank" rel="noopener noreferrer">
              <Card glass className="p-4 flex items-center justify-between hover:border-amber-500/40 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Public Profile</h3>
                    <p className="text-[11px] text-slate-400">View customer page</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </div>

    </div>
  );
};
