import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTableSchema, CreateTableInput } from '@dinepilot/validation';
import { tableApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Grid3X3, Plus, Utensils, MapPin, CheckCircle2, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export const TablesPage: React.FC = () => {
  const { showToast } = useToast();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateTableInput>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      location: 'INDOOR',
      status: 'AVAILABLE',
      capacity: 4,
      isActive: true,
    },
  });

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await tableApi.getTables(true);
      setTables(res.tables || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tables.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const openAddModal = () => {
    setEditingTable(null);
    reset({
      tableNumber: '',
      name: '',
      capacity: 4,
      location: 'INDOOR',
      status: 'AVAILABLE',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (table: any) => {
    setEditingTable(table);
    setValue('tableNumber', table.tableNumber);
    setValue('name', table.name || '');
    setValue('capacity', table.capacity);
    setValue('location', table.location);
    setValue('status', table.status);
    setValue('isActive', table.isActive);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CreateTableInput) => {
    try {
      setIsSubmitting(true);
      if (editingTable) {
        await tableApi.updateTable(editingTable.id, data);
        showToast(`Table ${data.tableNumber} updated successfully!`, 'success');
      } else {
        await tableApi.createTable(data);
        showToast(`Table ${data.tableNumber} created successfully!`, 'success');
      }
      setIsModalOpen(false);
      fetchTables();
    } catch (err: any) {
      showToast(err.message || 'Failed to save table.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (table: any) => {
    if (!window.confirm(`Are you sure you want to deactivate Table ${table.tableNumber}?`)) return;
    try {
      await tableApi.deleteTable(table.id);
      showToast(`Table ${table.tableNumber} deactivated.`, 'success');
      fetchTables();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate table.', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'RESERVED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'OCCUPIED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'CLEANING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Grid3X3 className="w-7 h-7 text-amber-400" />
            Tables
          </h1>
          <p className="text-sm text-slate-400">
            Manage your restaurant seating layout and operational statuses.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          leftIcon={<Plus className="w-4 h-4 text-slate-950" />}
        >
          Add Table
        </Button>
      </div>

      {/* Summary Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card glass className="p-4 space-y-1">
          <p className="text-xs text-slate-400">Total Tables</p>
          <p className="text-2xl font-bold text-white">{tables.filter(t => t.isActive).length}</p>
        </Card>
        <Card glass className="p-4 space-y-1">
          <p className="text-xs text-slate-400">Available</p>
          <p className="text-2xl font-bold text-emerald-400">
            {tables.filter(t => t.isActive && t.status === 'AVAILABLE').length}
          </p>
        </Card>
        <Card glass className="p-4 space-y-1">
          <p className="text-xs text-slate-400">Occupied / Reserved</p>
          <p className="text-2xl font-bold text-amber-400">
            {tables.filter(t => t.isActive && (t.status === 'OCCUPIED' || t.status === 'RESERVED')).length}
          </p>
        </Card>
        <Card glass className="p-4 space-y-1">
          <p className="text-xs text-slate-400">Total Capacity</p>
          <p className="text-2xl font-bold text-blue-400">
            {tables.filter(t => t.isActive).reduce((acc, t) => acc + t.capacity, 0)} seats
          </p>
        </Card>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm">Loading tables...</p>
        </div>
      ) : tables.length === 0 ? (
        /* Empty State */
        <Card glass className="p-12 text-center space-y-4 max-w-md mx-auto">
          <Grid3X3 className="w-12 h-12 text-amber-400 mx-auto opacity-80" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No tables yet</h3>
            <p className="text-xs text-slate-400">
              Configure your dining room seating to enable reservations and availability.
            </p>
          </div>
          <Button variant="primary" onClick={openAddModal} leftIcon={<Plus className="w-4 h-4 text-slate-950" />}>
            Add your first table
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tables.map((table) => (
            <Card
              key={table.id}
              glass
              className={`p-6 space-y-4 relative overflow-hidden transition-all duration-200 hover:border-amber-500/30 ${
                !table.isActive ? 'opacity-50 grayscale' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold text-white">
                  Table {table.tableNumber}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(table)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Edit Table"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {table.isActive && (
                    <button
                      onClick={() => handleDelete(table)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Deactivate Table"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {table.name && (
                <p className="text-xs text-slate-400 font-medium">{table.name}</p>
              )}

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1 text-slate-300 font-semibold">
                  <Utensils className="w-3.5 h-3.5 text-amber-400" />
                  {table.capacity} Seats
                </span>

                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {table.location}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(table.status)}`}>
                  {table.status}
                </span>

                {!table.isActive && (
                  <span className="text-[10px] text-rose-400 font-semibold uppercase">
                    Inactive
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card glass className="w-full max-w-md p-6 space-y-6 relative border-amber-500/30">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                {editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Add New Table'}
              </h3>
              <p className="text-xs text-slate-400">Set table capacity and operational location.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Table Number"
                placeholder="e.g. 1, 02, T-5"
                error={errors.tableNumber?.message}
                {...register('tableNumber')}
              />

              <Input
                label="Display Name / Description (Optional)"
                placeholder="e.g. Window Booth"
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                label="Seating Capacity"
                type="number"
                min={1}
                max={50}
                error={errors.capacity?.message}
                {...register('capacity')}
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Location</label>
                <select
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  {...register('location')}
                >
                  <option value="INDOOR">Indoor</option>
                  <option value="OUTDOOR">Outdoor</option>
                  <option value="PRIVATE">Private Dining Room</option>
                  <option value="BAR">Bar Seating</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Operational Status</label>
                <select
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  {...register('status')}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="CLEANING">Cleaning</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Table'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
