import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  orderApi,
  menuApi,
  customerApi,
  tableApi,
  reservationApi,
} from '../services/api';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Users,
  Utensils,
  ChevronRight,
  AlertCircle,
  FileText,
  Trash2,
  Edit2,
  Calendar,
  X,
  Tag,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  PLACED: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  CONFIRMED: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  PREPARING: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  READY: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  SERVED: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  CANCELLED: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
};

const NEXT_STATUS_MAP: Record<string, { label: string; status: string; style: string }[]> = {
  DRAFT: [{ label: 'Place Order', status: 'PLACED', style: 'bg-blue-600 hover:bg-blue-700 text-white' }],
  PLACED: [{ label: 'Confirm Order', status: 'CONFIRMED', style: 'bg-indigo-600 hover:bg-indigo-700 text-white' }],
  CONFIRMED: [{ label: 'Start Preparing', status: 'PREPARING', style: 'bg-amber-600 hover:bg-amber-700 text-white' }],
  PREPARING: [{ label: 'Mark Ready', status: 'READY', style: 'bg-purple-600 hover:bg-purple-700 text-white' }],
  READY: [{ label: 'Mark Served', status: 'SERVED', style: 'bg-teal-600 hover:bg-teal-700 text-white' }],
  SERVED: [{ label: 'Complete Order', status: 'COMPLETED', style: 'bg-emerald-600 hover:bg-emerald-700 text-white' }],
  COMPLETED: [],
  CANCELLED: [],
};

export const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Queries
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['orderStats'],
    queryFn: orderApi.getOrderStats,
    refetchInterval: 10000,
  });

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders', activeTab, searchQuery, sourceFilter],
    queryFn: () =>
      orderApi.getOrders({
        search: searchQuery || undefined,
        status: activeTab === 'ACTIVE' ? undefined : activeTab !== 'ALL' ? activeTab : undefined,
        source: sourceFilter || undefined,
      }),
    refetchInterval: 5000,
  });

  const { data: selectedOrder, isLoading: isDetailLoading } = useQuery({
    queryKey: ['orderDetail', selectedOrderId],
    queryFn: () => (selectedOrderId ? orderApi.getOrderById(selectedOrderId) : null),
    enabled: !!selectedOrderId,
  });

  // Filters for active orders
  const ordersList = (ordersData?.data || []).filter((o: any) => {
    if (activeTab === 'ACTIVE') {
      return ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'].includes(o.status);
    }
    return true;
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      orderApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      queryClient.invalidateQueries({ queryKey: ['orderDetail', selectedOrderId] });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      orderApi.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      queryClient.invalidateQueries({ queryKey: ['orderDetail', selectedOrderId] });
    },
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header & Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Restaurant Orders
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time order management, kitchen status tracking & financial summaries
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Order
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Today's Orders
            </p>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
              {statsData?.todayOrdersCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Today's Order Value
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{(statsData?.todayOrderValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Active Orders
            </p>
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {statsData?.activeOrdersCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Completed Orders
            </p>
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {statsData?.completedOrdersCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Cancelled Orders
            </p>
            <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {statsData?.cancelledOrdersCount || 0}
            </h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl w-full md:w-auto">
            {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Source Filter */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search order #, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sources</option>
              <option value="DASHBOARD">Dashboard</option>
              <option value="WEBSITE">Website</option>
              <option value="QR">QR Code</option>
              <option value="PHONE">Phone</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
        {isOrdersLoading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading orders...
          </div>
        ) : ordersList.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No orders found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create your first order to start tracking restaurant sales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Table / Location</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {ordersList.map((order: any) => {
                  const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.DRAFT;
                  const nextActions = NEXT_STATUS_MAP[order.status] || [];

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        #{order.orderNumber}
                        <div className="text-[11px] font-normal text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                        {order.tableNumber ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold">
                            <Utensils className="w-3.5 h-3.5 text-indigo-500" />
                            Table {order.tableNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs font-normal">Takeaway / Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-900 dark:text-white">
                        {order.customerName ? (
                          <div>
                            <div className="font-semibold text-xs">{order.customerName}</div>
                            <div className="text-[11px] text-gray-400">{order.customerPhone}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs font-normal">Walk-in Guest</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                          {order.source}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300 font-medium">
                        {order.itemCount} items
                      </td>
                      <td className="py-4 px-4 font-extrabold text-gray-900 dark:text-white">
                        ₹{order.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {nextActions.map((action) => (
                            <button
                              key={action.status}
                              onClick={() =>
                                updateStatusMutation.mutate({ id: order.id, status: action.status })
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all ${action.style}`}
                            >
                              {action.label}
                            </button>
                          ))}

                          <button
                            onClick={() => setSelectedOrderId(order.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal / Drawer */}
      {selectedOrderId && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onUpdateStatus={(status) => updateStatusMutation.mutate({ id: selectedOrder.id, status })}
          onCancelOrder={(reason) => cancelOrderMutation.mutate({ id: selectedOrder.id, reason })}
        />
      )}

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <CreateOrderModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Order Detail Modal                             */
/* -------------------------------------------------------------------------- */
const OrderDetailModal: React.FC<{
  order: any;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
  onCancelOrder: (reason?: string) => void;
}> = ({ order, onClose, onUpdateStatus, onCancelOrder }) => {
  const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.DRAFT;
  const nextActions = NEXT_STATUS_MAP[order.status] || [];
  const isFinalized = order.status === 'COMPLETED' || order.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 h-full shadow-2xl overflow-y-auto p-6 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Order #{order.orderNumber}
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Placed at {new Date(order.createdAt).toLocaleString()} via {order.source}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Customer & Table Details */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl text-xs">
            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px]">Table</span>
              <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">
                {order.table ? `Table ${order.table.tableNumber} (${order.table.capacity} seats)` : 'Walk-in / Takeaway'}
              </p>
            </div>
            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px]">Customer</span>
              <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">
                {order.customer ? order.customer.name : 'Walk-in Guest'}
              </p>
              {order.customer?.phone && (
                <p className="text-gray-400 text-[11px]">{order.customer.phone}</p>
              )}
            </div>
          </div>

          {/* Order Items Table */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Order Items ({order.items?.length || 0})
            </h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60 border border-gray-100 dark:border-gray-700/60 rounded-xl overflow-hidden">
              {order.items?.map((item: any) => (
                <div key={item.id} className="p-3 bg-white dark:bg-gray-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {item.quantity} × {item.itemNameSnapshot}
                    </div>
                    <div className="text-xs text-gray-400">₹{item.unitPriceSnapshot.toFixed(2)} each</div>
                    {item.notes && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                  <div className="font-extrabold text-sm text-gray-900 dark:text-white">
                    ₹{item.lineTotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-white">₹{order.subtotal.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount</span>
                <span className="font-semibold">-₹{order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{order.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {order.serviceChargeAmount > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Service Charge</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{order.serviceChargeAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-base font-extrabold text-gray-900 dark:text-white">
              <span>Total Bill Amount</span>
              <span className="text-indigo-600 dark:text-indigo-400">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Status Controls */}
        <div className="border-t border-gray-100 dark:border-gray-700/60 pt-4 space-y-3">
          {isFinalized ? (
            <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-xl text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              Order is finalized and immutable.
            </div>
          ) : (
            <div className="flex gap-3">
              {nextActions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => onUpdateStatus(action.status)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${action.style}`}
                >
                  {action.label}
                </button>
              ))}

              <button
                onClick={() => onCancelOrder()}
                className="px-4 py-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 transition-colors"
              >
                Cancel Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Create Order Modal                             */
/* -------------------------------------------------------------------------- */
const CreateOrderModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderItems, setOrderItems] = useState<{ menuItemId: string; quantity: number; notes?: string; name: string; price: number }[]>([]);

  // Fetch dependencies
  const { data: menuData } = useQuery({ queryKey: ['menuItems'], queryFn: () => menuApi.getMenuItems({ isAvailable: true }) });
  const { data: customersData } = useQuery({ queryKey: ['customers'], queryFn: () => customerApi.getCustomers({}) });
  const { data: tablesData } = useQuery({ queryKey: ['tables'], queryFn: () => tableApi.getTables() });

  const createMutation = useMutation({
    mutationFn: (payload: any) => orderApi.createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      onClose();
    },
  });

  const menuItems = menuData?.items || [];
  const customers = customersData?.customers || [];
  const tables = tablesData?.tables || [];

  const handleAddItem = (item: any) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) => (i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { menuItemId: item.id, quantity: 1, name: item.name, price: item.price }];
    });
  };

  const handleRemoveItem = (menuItemId: string) => {
    setOrderItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const handleUpdateQty = (menuItemId: string, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as any
    );
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;

    createMutation.mutate({
      customerId: selectedCustomerId || undefined,
      tableId: selectedTableId || undefined,
      notes: orderNotes || undefined,
      source: 'DASHBOARD',
      items: orderItems.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        notes: i.notes || undefined,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-500" />
            Create New Restaurant Order
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Customer, Table & Menu Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer (Optional)</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Customer (Walk-in)</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.isVip ? '⭐ VIP' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Table (Optional)</label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full p-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Table (Takeaway / Unassigned)</option>
                {tables.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    Table {t.tableNumber} ({t.capacity} seats) - {t.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Available Menu Items</label>
              <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-100 dark:border-gray-700 rounded-xl p-2">
                {menuItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No active menu items available</p>
                ) : (
                  menuItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-gray-400">₹{item.price.toFixed(2)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItem(item)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Order Summary</h3>
              {orderItems.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-12">
                  Select menu items from the left to build the order
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {orderItems.map((item) => (
                    <div key={item.menuItemId} className="p-2 bg-white dark:bg-gray-800 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-gray-400">₹{item.price} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleUpdateQty(item.menuItemId, -1)} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-bold">
                          -
                        </button>
                        <span className="font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => handleUpdateQty(item.menuItemId, 1)} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-bold">
                          +
                        </button>
                        <button type="button" onClick={() => handleRemoveItem(item.menuItemId)} className="text-rose-500 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
              <div className="flex justify-between font-extrabold text-base text-gray-900 dark:text-white">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={orderItems.length === 0 || createMutation.isPending}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all"
              >
                {createMutation.isPending ? 'Creating Order...' : 'Submit & Place Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
