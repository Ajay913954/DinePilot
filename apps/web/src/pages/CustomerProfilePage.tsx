import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  Utensils,
  Heart,
  FileText,
  Tag as TagIcon,
  Plus,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Edit2,
  RefreshCw,
  AlertCircle,
  Award,
  Sparkles
} from 'lucide-react';
import { customerApi } from '../services/api';
import { CustomerProfile, CustomerClassification } from '@dinepilot/types';

export const CustomerProfilePage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [notesInput, setNotesInput] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Profile Edit state
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferredSeating: '',
    dietaryPreference: '',
    specialOccasion: '',
  });

  // Fetch Customer Profile Query
  const { data: profileData, isLoading, isError, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerApi.getCustomerById(customerId!),
    enabled: !!customerId,
  });

  // Fetch Customer Reservation History
  const { data: historyData } = useQuery({
    queryKey: ['customerReservations', customerId],
    queryFn: () => customerApi.getCustomerReservations(customerId!),
    enabled: !!customerId,
  });

  const customer: CustomerProfile | undefined = profileData?.customer;
  const reservations = historyData?.reservations || [];

  // Update Customer Mutation
  const updateMutation = useMutation({
    mutationFn: (input: any) => customerApi.updateCustomer(customerId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setIsEditingNotes(false);
      setIsEditProfileModalOpen(false);
    },
  });

  // Add Tag Mutation
  const addTagMutation = useMutation({
    mutationFn: (tagName: string) => customerApi.addTag(customerId!, tagName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setNewTagInput('');
    },
  });

  // Remove Tag Mutation
  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => customerApi.removeTag(customerId!, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    },
  });

  React.useEffect(() => {
    if (customer) {
      setNotesInput(customer.notes || '');
      setEditFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        preferredSeating: customer.preferredSeating || '',
        dietaryPreference: customer.dietaryPreference || '',
        specialOccasion: customer.specialOccasion || '',
      });
    }
  }, [customer]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
        <p>Loading guest profile details...</p>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="p-12 text-center text-red-400 space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto" />
        <p>{(error as any)?.message || 'Customer profile not found.'}</p>
        <button
          onClick={() => navigate('/dashboard/customers')}
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Confirmed</span>;
      case 'SEATED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Seated</span>;
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
      case 'NO_SHOW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700">No-Show</span>;
      default:
        return null;
    }
  };

  const suggestedTags = ['VIP', 'Birthday', 'Corporate', 'Family', 'Regular', 'Vegetarian', 'Large Group'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => navigate('/dashboard/customers')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customer Directory
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-inner">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-100">{customer.name}</h1>
                {customer.isVip && (
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> VIP Guest
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {customer.email}
                  </span>
                )}
                <span className="text-slate-500">
                  Customer since {new Date(customer.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateMutation.mutate({ isVip: !customer.isVip })}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                customer.isVip
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Star className={`w-4 h-4 ${customer.isVip ? 'fill-amber-400' : ''}`} />
              {customer.isVip ? 'Remove VIP' : 'Mark VIP'}
            </button>

            <button
              onClick={() => setIsEditProfileModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-400">Total Bookings</span>
          <p className="text-2xl font-bold text-slate-100">{customer.stats.totalReservations}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-emerald-400">Completed Visits</span>
          <p className="text-2xl font-bold text-emerald-400">{customer.stats.completedVisits}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-blue-400">Upcoming</span>
          <p className="text-2xl font-bold text-blue-400">{customer.stats.upcomingReservations}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-rose-400">Cancelled</span>
          <p className="text-2xl font-bold text-rose-400">{customer.stats.cancelledReservations}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-400">No-Shows</span>
          <p className="text-2xl font-bold text-slate-300">{customer.stats.noShows}</p>
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Intelligence, Notes & Tags */}
        <div className="space-y-6 lg:col-span-1">
          {/* Customer Intelligence Card */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Guest Intelligence
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Classification:</span>
                <span className="font-semibold text-emerald-400">{customer.classification}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Completed Orders:</span>
                <span className="font-semibold text-indigo-400">{customer.stats.completedOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Order Value:</span>
                <span className="font-semibold text-emerald-400">₹{(customer.stats.totalOrderValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Avg Order Value:</span>
                <span className="font-semibold text-emerald-400">₹{(customer.stats.avgOrderValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Avg Party Size:</span>
                <span className="font-semibold text-slate-200">{customer.stats.avgPartySize} guests</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Visit:</span>
                <span className="font-semibold text-slate-200">
                  {customer.stats.lastVisit
                    ? new Date(customer.stats.lastVisit).toLocaleDateString()
                    : 'None yet'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Next Booking:</span>
                <span className="font-semibold text-blue-400">
                  {customer.stats.nextVisit
                    ? new Date(customer.stats.nextVisit).toLocaleDateString()
                    : 'None scheduled'}
                </span>
              </div>
            </div>

            {/* Dining Preferences */}
            <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Preferences & Requirements:</span>
              <div className="space-y-1.5 text-slate-400">
                <p>🪑 Seating: <span className="text-slate-200 font-medium">{customer.preferredSeating || 'No preference'}</span></p>
                <p>🥗 Dietary: <span className="text-slate-200 font-medium">{customer.dietaryPreference || 'None specified'}</span></p>
                <p>🎉 Occasion: <span className="text-slate-200 font-medium">{customer.specialOccasion || 'None'}</span></p>
              </div>
            </div>
          </div>

          {/* Internal Notes Card */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Internal Notes
              </h3>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Edit Note
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Add internal staff notes e.g. prefers table near window, birthday in Dec..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ notes: notesInput })}
                    disabled={updateMutation.isPending}
                    className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg font-medium"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {customer.notes || <span className="text-slate-500 italic">No internal staff notes recorded yet.</span>}
              </p>
            )}
          </div>

          {/* Customer Tags Manager */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <TagIcon className="w-4 h-4 text-emerald-400" /> Customer Tags
            </h3>

            {/* Current Tags */}
            <div className="flex flex-wrap gap-2">
              {customer.tags && customer.tags.length > 0 ? (
                customer.tags.map((t) => (
                  <span
                    key={t.id}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg flex items-center gap-1.5"
                  >
                    {t.name}
                    <button
                      onClick={() => removeTagMutation.mutate(t.id)}
                      className="hover:text-red-400 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No tags assigned yet.</span>
              )}
            </div>

            {/* Suggested Tags Quick Add */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Quick Add Tag:</span>
              <div className="flex flex-wrap gap-1.5">
                {suggestedTags.map((tag) => {
                  const isAssigned = customer.tags.some((t) => t.name.toLowerCase() === tag.toLowerCase());
                  if (isAssigned) return null;
                  return (
                    <button
                      key={tag}
                      onClick={() => addTagMutation.mutate(tag)}
                      className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition"
                    >
                      + {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Tag Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTagInput.trim()) {
                  addTagMutation.mutate(newTagInput.trim());
                }
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                placeholder="Custom tag name..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg"
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Reservation Timeline History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" /> Reservation History Timeline
              </span>
              <span className="text-xs font-normal text-slate-400">
                {reservations.length} Total Records
              </span>
            </h3>

            {reservations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-700" />
                <p className="text-sm">No reservations recorded for this customer yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((res: any) => (
                  <div
                    key={res.id}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl space-y-2 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">
                          {new Date(res.reservationDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                          {res.startTime} - {res.endTime}
                        </span>
                      </div>
                      <div>{getStatusBadge(res.status)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400">
                      <div>
                        👥 Guests: <span className="text-slate-200 font-medium">{res.guestCount}</span>
                      </div>
                      <div>
                        🪑 Table: <span className="text-slate-200 font-medium">{res.table?.tableNumber || 'Unassigned'}</span>
                      </div>
                      <div>
                        📱 Source: <span className="text-slate-200 font-medium">{res.source}</span>
                      </div>
                      <div>
                        ⏱ Duration: <span className="text-slate-200 font-medium">{res.durationMinutes} mins</span>
                      </div>
                    </div>

                    {res.specialRequest && (
                      <div className="text-xs bg-slate-900/90 p-2 rounded border border-slate-800 text-amber-300">
                        💬 Special Request: {res.specialRequest}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" /> Edit Guest Profile
              </h3>
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(editFormData);
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Seating</label>
                  <input
                    type="text"
                    value={editFormData.preferredSeating}
                    onChange={(e) => setEditFormData({ ...editFormData, preferredSeating: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dietary Preference</label>
                  <input
                    type="text"
                    value={editFormData.dietaryPreference}
                    onChange={(e) => setEditFormData({ ...editFormData, dietaryPreference: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
