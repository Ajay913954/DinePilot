import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createReservationSchema, CreateReservationInput } from '@dinepilot/validation';
import { reservationApi, tableApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Users, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  AlertCircle, 
  X, 
  Eye, 
  Phone, 
  Mail, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

export const ReservationsPage: React.FC = () => {
  const { showToast } = useToast();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<any>(null);

  // New Reservation Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkingAvail, setCheckingAvail] = useState<boolean>(false);
  const [availabilityResult, setAvailabilityResult] = useState<any>(null);

  // Details Modal State
  const [activeReservation, setActiveReservation] = useState<any | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      date: todayStr,
      startTime: '19:00',
      guestCount: 2,
      durationMinutes: 90,
      source: 'DASHBOARD',
    },
  });

  const watchDate = watch('date');
  const watchStartTime = watch('startTime');
  const watchGuestCount = watch('guestCount');
  const watchTableId = watch('tableId');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await reservationApi.getReservations({
        date: selectedDate,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined,
      });
      setReservations(res.reservations || []);
      setPagination(res.pagination);
    } catch (err: any) {
      showToast(err.message || 'Failed to load reservations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [selectedDate, selectedStatus, searchQuery]);

  // Check Availability when date/time/guests change in Create Form
  useEffect(() => {
    if (isCreateOpen && watchDate && watchStartTime && watchGuestCount > 0) {
      const check = async () => {
        try {
          setCheckingAvail(true);
          const res = await reservationApi.checkAvailability({
            date: watchDate,
            startTime: watchStartTime,
            guestCount: Number(watchGuestCount),
            tableId: watchTableId || undefined,
          });
          setAvailabilityResult(res);
        } catch (err: any) {
          setAvailabilityResult({ available: false, error: err.message });
        } finally {
          setCheckingAvail(false);
        }
      };
      const timer = setTimeout(check, 300);
      return () => clearTimeout(timer);
    }
  }, [isCreateOpen, watchDate, watchStartTime, watchGuestCount, watchTableId]);

  const openCreateModal = () => {
    reset({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      date: selectedDate || todayStr,
      startTime: '19:00',
      guestCount: 2,
      durationMinutes: 90,
      specialRequest: '',
      source: 'DASHBOARD',
    });
    setAvailabilityResult(null);
    setIsCreateOpen(true);
  };

  const onCreateSubmit = async (data: CreateReservationInput) => {
    try {
      setIsSubmitting(true);
      await reservationApi.createReservation(data);
      showToast('Reservation created successfully!', 'success');
      setIsCreateOpen(false);
      fetchReservations();
    } catch (err: any) {
      showToast(err.message || 'Failed to create reservation.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (reservationId: string, action: 'confirm' | 'cancel' | 'seat' | 'complete' | 'no-show') => {
    try {
      if (action === 'confirm') await reservationApi.confirmReservation(reservationId);
      if (action === 'cancel') await reservationApi.cancelReservation(reservationId);
      if (action === 'seat') await reservationApi.seatReservation(reservationId);
      if (action === 'complete') await reservationApi.completeReservation(reservationId);
      if (action === 'no-show') await reservationApi.markNoShow(reservationId);

      showToast(`Reservation status updated to ${action.toUpperCase()}`, 'success');
      if (activeReservation) {
        const updated = await reservationApi.getReservationById(reservationId);
        setActiveReservation(updated.reservation);
      }
      fetchReservations();
    } catch (err: any) {
      showToast(err.message || 'Failed to update reservation status.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Confirmed</span>;
      case 'SEATED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">Seated</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
      case 'NO_SHOW':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">No-Show</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header & New Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-amber-400" />
            Reservations
          </h1>
          <p className="text-sm text-slate-400">
            Real-time table reservation management & guest scheduling engine.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4 text-slate-950" />}
        >
          New Reservation
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card glass className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
          {['ALL', 'PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === status
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </Card>

      {/* Reservations Table View */}
      <Card glass className="overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm">Loading reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <CalendarIcon className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No reservations for this date</h3>
              <p className="text-xs text-slate-400">
                There are no scheduled bookings matching your selected filters.
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4 text-slate-950" />}>
              Create Reservation
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-4">Time</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Guests</th>
                  <th className="p-4">Table</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Source</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{res.startTime}</span>
                        <span className="text-[10px] text-slate-500">({res.endTime})</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">{res.customerName}</p>
                        <p className="text-[11px] text-slate-400">{res.customerPhone}</p>
                      </div>
                    </td>

                    <td className="p-4 font-medium text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{res.guestCount} guests</span>
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {res.table ? (
                        <span className="font-semibold text-amber-400">
                          Table {res.table.tableNumber} ({res.table.capacity} seats)
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(res.status)}
                    </td>

                    <td className="p-4 text-slate-400 font-medium whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                        {res.source}
                      </span>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setActiveReservation(res)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {res.status === 'PENDING' && (
                        <button
                          onClick={() => handleStatusChange(res.id, 'confirm')}
                          className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-bold"
                        >
                          Confirm
                        </button>
                      )}

                      {res.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusChange(res.id, 'seat')}
                          className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-[11px] font-bold"
                        >
                          Seat
                        </button>
                      )}

                      {res.status === 'SEATED' && (
                        <button
                          onClick={() => handleStatusChange(res.id, 'complete')}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Reservation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card glass className="w-full max-w-lg p-6 space-y-6 relative border-amber-500/30 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                New Table Reservation
              </h3>
              <p className="text-xs text-slate-400">Select booking time, check live availability, and add guest info.</p>
            </div>

            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              
              {/* Date, Time & Guest Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Date"
                  type="date"
                  error={errors.date?.message}
                  {...register('date')}
                />
                <Input
                  label="Start Time"
                  type="time"
                  error={errors.startTime?.message}
                  {...register('startTime')}
                />
                <Input
                  label="Guests"
                  type="number"
                  min={1}
                  max={50}
                  error={errors.guestCount?.message}
                  {...register('guestCount')}
                />
              </div>

              {/* Live Availability Status Indicator */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                {checkingAvail ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>Checking live table availability...</span>
                  </div>
                ) : availabilityResult?.available ? (
                  <div className="space-y-1 text-emerald-400">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Table Available ({availabilityResult.availableTables.length} option(s))</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Best assignment: <strong className="text-amber-400">Table {availabilityResult.assignedTable?.tableNumber}</strong> ({availabilityResult.assignedTable?.capacity} seats, {availabilityResult.assignedTable?.location})
                    </p>
                  </div>
                ) : availabilityResult?.error ? (
                  <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{availabilityResult.error}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>No suitable tables available for this time slot.</span>
                  </div>
                )}
              </div>

              {/* Customer Information */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <Input
                  label="Customer Name"
                  placeholder="e.g. Rahul Sharma"
                  leftIcon={<Users className="w-4 h-4 text-slate-500" />}
                  error={errors.customerName?.message}
                  {...register('customerName')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Phone Number"
                    placeholder="+91 98765 43210"
                    leftIcon={<Phone className="w-4 h-4 text-slate-500" />}
                    error={errors.customerPhone?.message}
                    {...register('customerPhone')}
                  />
                  <Input
                    label="Email (Optional)"
                    type="email"
                    placeholder="rahul@example.com"
                    leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
                    error={errors.customerEmail?.message}
                    {...register('customerEmail')}
                  />
                </div>

                <Input
                  label="Special Requests / Seating Preferences (Optional)"
                  placeholder="e.g. Birthday celebration, High chair needed"
                  leftIcon={<MessageSquare className="w-4 h-4 text-slate-500" />}
                  error={errors.specialRequest?.message}
                  {...register('specialRequest')}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !availabilityResult?.available}
                >
                  {isSubmitting ? 'Creating...' : 'Create Reservation'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Reservation Details Modal */}
      {activeReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card glass className="w-full max-w-md p-6 space-y-6 relative border-amber-500/30">
            <button
              onClick={() => setActiveReservation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Reservation Details</h3>
                {getStatusBadge(activeReservation.status)}
              </div>
              <p className="text-xs text-slate-400">ID: {activeReservation.id}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-white font-bold text-sm">{activeReservation.customerName}</p>
                <p className="text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  {activeReservation.customerPhone}
                </p>
                {activeReservation.customerEmail && (
                  <p className="text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    {activeReservation.customerEmail}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <p className="text-slate-400 font-medium">Booking Time</p>
                  <p className="text-white font-bold">{activeReservation.startTime} - {activeReservation.endTime}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <p className="text-slate-400 font-medium">Assigned Table</p>
                  <p className="text-amber-400 font-bold">
                    {activeReservation.table ? `Table ${activeReservation.table.tableNumber}` : 'Unassigned'}
                  </p>
                </div>
              </div>

              {activeReservation.specialRequest && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <p className="text-slate-400 font-medium">Special Request</p>
                  <p className="text-slate-200">{activeReservation.specialRequest}</p>
                </div>
              )}
            </div>

            {/* Lifecycle Action Buttons */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 justify-end">
              {activeReservation.status === 'PENDING' && (
                <Button variant="primary" size="sm" onClick={() => handleStatusChange(activeReservation.id, 'confirm')}>
                  Confirm Booking
                </Button>
              )}
              {activeReservation.status === 'CONFIRMED' && (
                <Button variant="primary" size="sm" onClick={() => handleStatusChange(activeReservation.id, 'seat')}>
                  Seat Guests
                </Button>
              )}
              {activeReservation.status === 'SEATED' && (
                <Button variant="primary" size="sm" onClick={() => handleStatusChange(activeReservation.id, 'complete')}>
                  Complete Reservation
                </Button>
              )}
              {(activeReservation.status === 'PENDING' || activeReservation.status === 'CONFIRMED') && (
                <Button variant="danger" size="sm" onClick={() => handleStatusChange(activeReservation.id, 'cancel')}>
                  Cancel Reservation
                </Button>
              )}
              {activeReservation.status === 'CONFIRMED' && (
                <Button variant="outline" size="sm" onClick={() => handleStatusChange(activeReservation.id, 'no-show')}>
                  Mark No-Show
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
