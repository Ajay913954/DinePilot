import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  Star, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  UserPlus, 
  AlertCircle,
  GitMerge,
  Phone,
  Mail,
  Calendar,
  Tag as TagIcon,
  Trash2,
  Edit2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { customerApi } from '../services/api';
import { CustomerListItem, CustomerClassification } from '@dinepilot/types';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classification, setClassification] = useState<string>('ALL');
  const [isVipFilter, setIsVipFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Add Customer Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    notes: '',
    isVip: false,
    preferredSeating: '',
    dietaryPreference: '',
    specialOccasion: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Merge Form state
  const [mergePrimaryId, setMergePrimaryId] = useState('');
  const [mergeSecondaryId, setMergeSecondaryId] = useState('');
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Handle Search Debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Customers Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customers', debouncedSearch, classification, isVipFilter, page],
    queryFn: () =>
      customerApi.getCustomers({
        search: debouncedSearch || undefined,
        classification: classification !== 'ALL' ? classification : undefined,
        isVip: isVipFilter,
        page,
        limit: 10,
      }),
  });

  // Create Customer Mutation
  const createMutation = useMutation({
    mutationFn: (input: typeof formData) => customerApi.createCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        notes: '',
        isVip: false,
        preferredSeating: '',
        dietaryPreference: '',
        specialOccasion: '',
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create customer.');
    },
  });

  // Merge Customers Mutation
  const mergeMutation = useMutation({
    mutationFn: (payload: { primaryCustomerId: string; secondaryCustomerId: string }) =>
      customerApi.mergeCustomers(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsMergeModalOpen(false);
      setMergePrimaryId('');
      setMergeSecondaryId('');
      setMergeError(null);
    },
    onError: (err: any) => {
      setMergeError(err.message || 'Failed to merge customers.');
    },
  });

  // Delete Customer Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const customers: CustomerListItem[] = data?.customers || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const getClassificationBadge = (cls: CustomerClassification) => {
    switch (cls) {
      case 'VIP':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400" /> VIP
          </span>
        );
      case 'RETURNING':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Returning
          </span>
        );
      case 'NEW':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <UserPlus className="w-3 h-3" /> New
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Customer Directory & CRM</h1>
              <p className="text-sm text-slate-400">
                Manage guest profiles, classifications, preferences, and visit history
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMergeModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium text-sm transition flex items-center gap-2"
          >
            <GitMerge className="w-4 h-4 text-emerald-400" /> Merge Accounts
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Search & Classification Filters */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          {/* Classification Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['ALL', 'NEW', 'RETURNING', 'VIP', 'INACTIVE'].map((cls) => (
              <button
                key={cls}
                onClick={() => {
                  setClassification(cls);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  classification === cls
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cls === 'ALL' ? 'All Customers' : cls}
              </button>
            ))}

            <button
              onClick={() => {
                setIsVipFilter((prev) => (prev === true ? undefined : true));
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                isVipFilter === true
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Star className="w-3 h-3" /> VIP Only
            </button>
          </div>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
            <p>Loading guest profiles from PostgreSQL...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-400 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p>{(error as any)?.message || 'Failed to load customers'}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm hover:bg-slate-700"
            >
              Try Again
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-300">No Customers Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Customers automatically appear here when guests reserve tables, or you can manually create a customer profile.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Phone & Email</th>
                  <th className="px-6 py-4">Classification</th>
                  <th className="px-6 py-4 text-center">Visits</th>
                  <th className="px-6 py-4">Last Visit</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-800/30 transition cursor-pointer group"
                    onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                  >
                    {/* Name & VIP Star */}
                    <td className="px-6 py-4 font-medium text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{customer.name}</span>
                        {customer.isVip && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Classification */}
                    <td className="px-6 py-4">
                      {getClassificationBadge(customer.classification)}
                    </td>

                    {/* Visit Count */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                        {customer.visitsCount}
                      </span>
                    </td>

                    {/* Last Visit */}
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {customer.lastVisit ? (
                        new Date(customer.lastVisit).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      ) : (
                        <span className="text-slate-600">No visits yet</span>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags && customer.tags.length > 0 ? (
                          customer.tags.map((t) => (
                            <span
                              key={t.id}
                              className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 rounded border border-slate-700"
                            >
                              {t.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete customer ${customer.name}?`)) {
                              deleteMutation.mutate(customer.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing Page <span className="text-slate-200 font-medium">{pagination.page}</span> of{' '}
              <span className="text-slate-200 font-medium">{pagination.totalPages}</span> ({pagination.total} total guests)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Create Customer Profile
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                createMutation.mutate(formData);
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="rahul@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Seating</label>
                  <input
                    type="text"
                    placeholder="e.g. Window, Quiet booth"
                    value={formData.preferredSeating}
                    onChange={(e) => setFormData({ ...formData, preferredSeating: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dietary Preference</label>
                  <input
                    type="text"
                    placeholder="e.g. Vegetarian, Gluten-free"
                    value={formData.dietaryPreference}
                    onChange={(e) => setFormData({ ...formData, dietaryPreference: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Internal Notes (Staff Only)</label>
                <textarea
                  rows={2}
                  placeholder="Regular Sunday guest. Prefers outdoor table."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVipCheck"
                  checked={formData.isVip}
                  onChange={(e) => setFormData({ ...formData, isVip: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="isVipCheck" className="text-xs font-semibold text-amber-400 cursor-pointer flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> Mark as VIP Customer
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Customers Modal */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-emerald-400" /> Merge Duplicate Accounts
              </h3>
              <button
                onClick={() => setIsMergeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Merging transfers all reservations, notes, and tags from the secondary customer into the primary customer, then safely removes the duplicate.
            </p>

            {mergeError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mergeError}</span>
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Customer (Keep) *</label>
                <select
                  value={mergePrimaryId}
                  onChange={(e) => setMergePrimaryId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none"
                >
                  <option value="">Select Primary Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Secondary Customer (Merge & Remove) *</label>
                <select
                  value={mergeSecondaryId}
                  onChange={(e) => setMergeSecondaryId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none"
                >
                  <option value="">Select Secondary Customer...</option>
                  {customers
                    .filter((c) => c.id !== mergePrimaryId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  disabled={!mergePrimaryId || !mergeSecondaryId || mergeMutation.isPending}
                  onClick={() => {
                    setMergeError(null);
                    mergeMutation.mutate({
                      primaryCustomerId: mergePrimaryId,
                      secondaryCustomerId: mergeSecondaryId,
                    });
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {mergeMutation.isPending ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
