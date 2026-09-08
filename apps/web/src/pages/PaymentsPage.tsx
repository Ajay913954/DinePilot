import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  DollarSign,
  ArrowUpRight,
  Filter,
  X,
  Printer,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { billingApi, orderApi } from '../services/api';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  // Record Payment Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordError, setRecordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptBill, setReceiptBill] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchPaymentsData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, metricsRes] = await Promise.all([
        billingApi.getPayments({
          page,
          limit: 15,
          search: search || undefined,
          method: methodFilter || undefined,
          status: statusFilter || undefined,
        }),
        billingApi.getBillingMetrics().catch(() => null),
      ]);

      setPayments(paymentsRes.data || []);
      setPagination(paymentsRes.pagination || null);
      if (metricsRes) setMetrics(metricsRes);
    } catch (err: any) {
      console.error('Failed to fetch payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, [page, methodFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPaymentsData();
  };

  const handleOpenRecordModal = async () => {
    setIsRecordModalOpen(true);
    setRecordError(null);
    setSelectedOrderId('');
    setSelectedOrderDetails(null);
    setPaymentAmount('');
    setTransactionRef('');
    setPaymentNotes('');

    try {
      const ordersRes = await orderApi.getOrders({ limit: 50 });
      // Filter orders eligible for payment (not cancelled)
      const eligible = (ordersRes.data || []).filter(
        (o: any) => o.status !== 'CANCELLED' && (o.amountDue === undefined || o.amountDue > 0)
      );
      setActiveOrders(eligible);
    } catch (err) {
      console.error('Failed to fetch active orders for payment modal:', err);
    }
  };

  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setSelectedOrderDetails(null);
      setPaymentAmount('');
      return;
    }

    try {
      const billRes = await billingApi.getBillByOrder(orderId);
      setSelectedOrderDetails(billRes);
      setPaymentAmount(billRes.amountDue);
    } catch (err) {
      const order = activeOrders.find((o) => o.id === orderId);
      if (order) {
        setSelectedOrderDetails({ totalAmount: order.totalAmount, amountDue: order.amountDue ?? order.totalAmount });
        setPaymentAmount(order.amountDue ?? order.totalAmount);
      }
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setRecordError('Please select an order');
      return;
    }

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setRecordError('Payment amount must be greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    setRecordError(null);

    try {
      await billingApi.createPayment({
        orderId: selectedOrderId,
        amount: Number(paymentAmount),
        method: paymentMethod,
        transactionReference: transactionRef || undefined,
        notes: paymentNotes || undefined,
      });

      setIsRecordModalOpen(false);
      fetchPaymentsData();
    } catch (err: any) {
      setRecordError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReceipt = async (orderId: string) => {
    try {
      const bill = await billingApi.getBillByOrder(orderId);
      setReceiptBill(bill);
      setIsReceiptModalOpen(true);
    } catch (err) {
      console.error('Failed to load bill for receipt:', err);
    }
  };

  const formatCurrency = (amount: number | string | undefined) => {
    const val = Number(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'UPI':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'CARD':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'BANK_TRANSFER':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'REFUNDED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-amber-400" />
            Payments & Billing
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Financial ledger, multi-method payment recording, and invoice snapshot management.
          </p>
        </div>

        <button
          onClick={handleOpenRecordModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Metrics Banner */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Today's Sales</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{formatCurrency(metrics.todaySales)}</div>
            <div className="text-[11px] text-slate-400">Total Billed Order Value</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Collected Amount</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{formatCurrency(metrics.todayPaidAmount)}</div>
            <div className="text-[11px] text-slate-400">Confirmed Successful Payments</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Outstanding Amount</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">{formatCurrency(metrics.outstandingAmount)}</div>
            <div className="text-[11px] text-slate-400">Pending & Partial Dues</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Payment Breakdown</span>
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                {metrics.paidOrdersCount} Paid
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                {metrics.partiallyPaidOrdersCount} Partial
              </span>
            </div>
            <div className="text-[11px] text-slate-400">{metrics.unbilledOrdersCount} Unbilled Active Orders</div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, order #, or customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={() => fetchPaymentsData()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Payment ID</th>
                <th className="py-3.5 px-6">Order</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Method</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Date / Time</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No payment records found. Record a payment to populate your financial ledger.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-400">
                      <div>#{p.id.slice(0, 8)}...</div>
                      {p.transactionReference && (
                        <div className="text-[10px] text-slate-500">Ref: {p.transactionReference}</div>
                      )}
                    </td>

                    <td className="py-4 px-6 font-medium text-white">
                      #{p.order?.orderNumber || 'ORD-???'}
                    </td>

                    <td className="py-4 px-6">
                      {p.customer ? (
                        <div>
                          <div className="text-white font-medium">{p.customer.name}</div>
                          <div className="text-xs text-slate-400">{p.customer.phone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Walk-in Customer</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${getMethodBadgeClass(p.method)}`}>
                        {p.method}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-bold text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${getStatusBadgeClass(p.status)}`}>
                        {p.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                        {p.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleViewReceipt(p.orderId)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 text-xs font-semibold transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total entries)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 shadow-2xl relative space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Manual Payment</h3>
                  <p className="text-xs text-slate-400">Record cash, UPI, card, or transfer payment against an order</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recordError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recordError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              {/* Select Order */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Order *</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">-- Choose Order --</option>
                  {activeOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.orderNumber} - {o.customerName || 'Walk-in'} (Total: ₹{o.totalAmount} | Due: ₹{o.amountDue ?? o.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Due Summary */}
              {selectedOrderDetails && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Order Total:</span>
                    <span className="font-semibold text-white">{formatCurrency(selectedOrderDetails.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Amount Paid So Far:</span>
                    <span className="font-semibold text-emerald-400">{formatCurrency(selectedOrderDetails.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-1 mt-1">
                    <span>Current Amount Due:</span>
                    <span className="text-amber-400">{formatCurrency(selectedOrderDetails.amountDue)}</span>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="CASH">CASH (Physical Currency)</option>
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="CARD">CARD (POS Terminal)</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/IMPS)</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                  required
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500/50 font-mono font-bold"
                />
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Transaction Reference (Optional)</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI Ref / Txn ID #982312"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notes / Internal Reference (Optional)</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any staff operational notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm & Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {isReceiptModalOpen && receiptBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl relative space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-white text-base">Receipt Preview</span>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Content */}
            <div id="receipt-print-area" className="bg-slate-900 p-6 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-black text-base text-white tracking-wider uppercase">DINEPILOT RESTAURANT</h4>
                <p className="text-[10px] text-slate-400">Invoice: {receiptBill.invoiceNumber}</p>
                <p className="text-[10px] text-slate-400">
                  Date: {new Date(receiptBill.issuedAt).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-amber-400 font-bold">Order #{receiptBill.order?.orderNumber}</p>
              </div>

              <div className="border-t border-b border-slate-800 py-2 space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Customer:</span>
                  <span>{receiptBill.order?.customerName || 'Walk-in Guest'}</span>
                </div>
                {receiptBill.order?.customerPhone && (
                  <div className="flex justify-between text-slate-400">
                    <span>Phone:</span>
                    <span>{receiptBill.order.customerPhone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receiptBill.subtotal)}</span>
                </div>

                {receiptBill.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(receiptBill.discountAmount)}</span>
                  </div>
                )}

                {receiptBill.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Tax / GST</span>
                    <span>{formatCurrency(receiptBill.taxAmount)}</span>
                  </div>
                )}

                {receiptBill.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Service Charge</span>
                    <span>{formatCurrency(receiptBill.serviceChargeAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-white border-t border-slate-800 pt-2">
                  <span>TOTAL AMOUNT</span>
                  <span>{formatCurrency(receiptBill.totalAmount)}</span>
                </div>

                <div className="flex justify-between text-emerald-400 font-bold pt-1">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(receiptBill.amountPaid)}</span>
                </div>

                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Amount Due</span>
                  <span>{formatCurrency(receiptBill.amountDue)}</span>
                </div>
              </div>

              {/* Payment History */}
              {receiptBill.payments && receiptBill.payments.length > 0 && (
                <div className="border-t border-slate-800 pt-3 space-y-1">
                  <div className="font-bold text-white text-[11px]">Payment Transactions:</div>
                  {receiptBill.payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-[10px] text-slate-400">
                      <span>
                        {p.method} ({p.status})
                      </span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-slate-800">
                Thank you for dining with us! Powered by DinePilot AI.
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
