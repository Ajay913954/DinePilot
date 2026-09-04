import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { restaurantApi } from '../services/api';
import { Utensils, MapPin, Clock, Phone, Mail, Calendar, Sparkles, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const PublicRestaurantPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      restaurantApi
        .getBySlug(slug)
        .then((res) => {
          setRestaurant(res.restaurant);
          setError(null);
        })
        .catch((err) => {
          setError(err.message || 'Restaurant not found.');
          setRestaurant(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <span className="text-sm">Loading restaurant profile...</span>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card glass className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Restaurant Not Found</h2>
          <p className="text-sm text-slate-400">
            The requested restaurant profile does not exist or may have been updated.
          </p>
          <Link to="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Brand Navbar */}
      <header className="glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Utensils className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">DinePilot</span>
        </Link>

        <Link to="/login">
          <Button variant="outline" size="sm">Partner Sign In</Button>
        </Link>
      </header>

      {/* Main Public Profile Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Banner Card */}
        <Card glass className="p-8 sm:p-12 relative overflow-hidden space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
              <Utensils className="w-3.5 h-3.5" />
              <span>{restaurant.cuisineType}</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              {restaurant.name}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{restaurant.address}, {restaurant.city}, {restaurant.state}, {restaurant.country}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Opening Hours</p>
                <p className="text-xs font-bold text-white">{restaurant.openingTime} – {restaurant.closingTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Phone</p>
                <p className="text-xs font-bold text-white">{restaurant.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Contact Email</p>
                <p className="text-xs font-bold text-white">{restaurant.email}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Guest Experience Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card glass className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Table Reservations</h3>
              <p className="text-xs text-slate-400">Online table booking engine</p>
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-slate-900 text-xs font-semibold text-amber-400 border border-amber-500/20">
              Reservations coming soon
            </div>
          </Card>

          <Card glass className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Digital Menu</h3>
              <p className="text-xs text-slate-400">Interactive dining menu & specials</p>
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-slate-900 text-xs font-semibold text-amber-400 border border-amber-500/20">
              Menu coming soon
            </div>
          </Card>
        </div>

      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 border-t border-slate-900">
        Powered by DinePilot AI Restaurant Engine
      </footer>
    </div>
  );
};
