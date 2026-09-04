import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { restaurantApi, menuApi } from '../services/api';
import { Utensils, MapPin, Clock, Phone, Mail, Calendar, Sparkles, AlertCircle, Leaf, Flame } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PublicMenu, PublicMenuCategory } from '@dinepilot/types';

export const PublicRestaurantPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuData, setMenuData] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    if (slug) {
      setLoading(true);
      Promise.all([
        restaurantApi.getBySlug(slug),
        menuApi.getPublicMenu(slug).catch(() => null),
      ])
        .then(([restRes, publicMenuRes]) => {
          setRestaurant(restRes.restaurant);
          setMenuData(publicMenuRes);
          setError(null);
        })
        .catch((err) => {
          setError(err.message || 'Restaurant not found.');
          setRestaurant(null);
          setMenuData(null);
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
        <span className="text-sm">Loading restaurant profile & digital menu...</span>
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

  const categories: PublicMenuCategory[] = menuData?.categories || [];

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

        {/* Digital Menu Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Utensils className="w-6 h-6 text-amber-400" /> Digital Menu & Specials
              </h2>
              <p className="text-xs text-slate-400">Freshly prepared culinary dishes</p>
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setActiveCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                      activeCategoryFilter === cat.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {categories.length === 0 ? (
            <Card glass className="p-8 text-center text-slate-400 space-y-2">
              <Utensils className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No Digital Menu Available</p>
              <p className="text-xs text-slate-500">The restaurant has not published any menu categories yet.</p>
            </Card>
          ) : (
            <div className="space-y-8">
              {categories
                .filter((cat) => activeCategoryFilter === 'ALL' || activeCategoryFilter === cat.id)
                .map((cat) => (
                  <div key={cat.id} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h3 className="text-xl font-extrabold text-amber-400 tracking-tight">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <span className="text-xs text-slate-400">{cat.description}</span>
                      )}
                    </div>

                    {cat.items.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No available dishes in this category.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cat.items.map((dish) => (
                          <Card
                            key={dish.id}
                            glass
                            className="p-4 flex gap-4 items-start hover:border-amber-500/30 transition-all duration-300"
                          >
                            {/* Dish Image */}
                            {dish.imageUrl && (
                              <div className="w-20 h-20 shrink-0 rounded-xl bg-slate-900 overflow-hidden border border-slate-800">
                                <img
                                  src={dish.imageUrl}
                                  alt={dish.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            {/* Dish Details */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm text-slate-100">{dish.name}</h4>
                                <span className="font-extrabold text-sm text-amber-400 shrink-0">
                                  ₹{dish.price.toFixed(2)}
                                </span>
                              </div>

                              {dish.description && (
                                <p className="text-xs text-slate-400 line-clamp-2">{dish.description}</p>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                {dish.isVegetarian && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 rounded flex items-center gap-0.5">
                                    <Leaf className="w-2.5 h-2.5" /> Veg
                                  </span>
                                )}
                                {dish.isVegan && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                                    Vegan
                                  </span>
                                )}
                                {dish.isSpicy && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5" /> Spicy
                                  </span>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 border-t border-slate-900">
        Powered by DinePilot AI Restaurant Engine
      </footer>
    </div>
  );
};
