import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Leaf,
  Flame,
  AlertCircle,
  RefreshCw,
  Grid,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react';
import { menuApi } from '../services/api';
import { MenuCategory, MenuItem, MenuStats } from '@dinepilot/types';

export const MenuPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [vegOnly, setVegOnly] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '', isActive: true });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    isAvailable: true,
    isActive: true,
    isVegetarian: false,
    isVegan: false,
    isSpicy: false,
    preparationTimeMinutes: '',
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => menuApi.getCategories(),
  });

  const { data: itemData, isLoading: itemLoading } = useQuery({
    queryKey: ['menuItems', selectedCategory, search, availableOnly, vegOnly, veganOnly, spicyOnly],
    queryFn: () =>
      menuApi.getMenuItems({
        categoryId: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        search: search || undefined,
        isAvailable: availableOnly ? true : undefined,
        isVegetarian: vegOnly ? true : undefined,
        isVegan: veganOnly ? true : undefined,
        isSpicy: spicyOnly ? true : undefined,
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['menuStats'],
    queryFn: () => menuApi.getMenuStats(),
  });

  const categories: MenuCategory[] = catData?.categories || [];
  const items: MenuItem[] = itemData?.items || [];
  const stats: MenuStats = statsData?.stats || {
    totalCategories: 0,
    totalItems: 0,
    availableItems: 0,
    unavailableItems: 0,
    vegetarianItems: 0,
  };

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (input: typeof categoryFormData) => menuApi.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      queryClient.invalidateQueries({ queryKey: ['menuStats'] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '', isActive: true });
    },
    onError: (err: any) => setFormError(err.message || 'Failed to save category.'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: typeof categoryFormData }) =>
      menuApi.updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    },
    onError: (err: any) => setFormError(err.message || 'Failed to update category.'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => menuApi.deleteCategory(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuStats'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to delete category.'),
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: (ids: string[]) => menuApi.reorderCategories(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menuCategories'] }),
  });

  // Item Mutations
  const createItemMutation = useMutation({
    mutationFn: (input: any) => menuApi.createMenuItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      queryClient.invalidateQueries({ queryKey: ['menuStats'] });
      setIsItemModalOpen(false);
      setEditingItem(null);
      resetItemForm();
    },
    onError: (err: any) => setFormError(err.message || 'Failed to save menu item.'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => menuApi.updateMenuItem(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuStats'] });
      setIsItemModalOpen(false);
      setEditingItem(null);
      resetItemForm();
    },
    onError: (err: any) => setFormError(err.message || 'Failed to update menu item.'),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      menuApi.toggleItemAvailability(id, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuStats'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => menuApi.deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      queryClient.invalidateQueries({ queryKey: ['menuStats'] });
    },
  });

  const resetItemForm = () => {
    setItemFormData({
      categoryId: categories.length > 0 ? categories[0].id : '',
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      isAvailable: true,
      isActive: true,
      isVegetarian: false,
      isVegan: false,
      isSpicy: false,
      preparationTimeMinutes: '',
    });
    setFormError(null);
  };

  const handleMoveCategory = (index: number, direction: 'UP' | 'DOWN') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;

    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    reorderCategoriesMutation.mutate(newCategories.map((c) => c.id));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Menu & Restaurant Catalog</h1>
              <p className="text-sm text-slate-400">
                Single source of truth for your digital menu, prices, and dish availability
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium text-sm transition flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-amber-400" /> Preview Menu
          </button>

          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryFormData({ name: '', description: '', isActive: true });
              setFormError(null);
              setIsCategoryModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium text-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-400" /> Add Category
          </button>

          <button
            onClick={() => {
              if (categories.length === 0) {
                alert('Please create at least one category before adding dishes.');
                return;
              }
              setEditingItem(null);
              resetItemForm();
              setIsItemModalOpen(true);
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Dish / Item
          </button>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-400">Categories</span>
          <p className="text-2xl font-bold text-slate-100">{stats.totalCategories}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-amber-400">Total Dishes</span>
          <p className="text-2xl font-bold text-amber-400">{stats.totalItems}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-emerald-400">Available Now</span>
          <p className="text-2xl font-bold text-emerald-400">{stats.availableItems}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-rose-400">Out of Stock</span>
          <p className="text-2xl font-bold text-rose-400">{stats.unavailableItems}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs font-medium text-green-400">Vegetarian Dishes</span>
          <p className="text-2xl font-bold text-green-400">{stats.vegetarianItems}</p>
        </div>
      </div>

      {/* Search & Dietary Filters Bar */}
      <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                vegOnly
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-green-400" /> Veg
            </button>

            <button
              onClick={() => setVeganOnly(!veganOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                veganOnly
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              🌱 Vegan
            </button>

            <button
              onClick={() => setSpicyOnly(!spicyOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                spicyOnly
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" /> Spicy
            </button>

            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                availableOnly
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              Available Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Categories & Items */}
      {catLoading || itemLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
          <p>Loading restaurant menu catalog...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Utensils className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-200">Your Menu is Empty</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Create your first category (e.g. Starters, Main Course, Beverages) and start adding dishes.
          </p>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryFormData({ name: '', description: '', isActive: true });
              setIsCategoryModalOpen(true);
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" /> Create First Category
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat, catIdx) => {
            const catItems = items.filter((item) => item.categoryId === cat.id);

            return (
              <div
                key={cat.id}
                className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
              >
                {/* Category Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        disabled={catIdx === 0}
                        onClick={() => handleMoveCategory(catIdx, 'UP')}
                        className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        title="Move Category Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={catIdx === categories.length - 1}
                        onClick={() => handleMoveCategory(catIdx, 'DOWN')}
                        className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        title="Move Category Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-100">{cat.name}</h2>
                        <span className="text-xs font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {catItems.length} items
                        </span>
                        {!cat.isActive && (
                          <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            Inactive Category
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        resetItemForm();
                        setItemFormData((prev) => ({ ...prev, categoryId: cat.id }));
                        setIsItemModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Dish
                    </button>

                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryFormData({
                          name: cat.name,
                          description: cat.description || '',
                          isActive: cat.isActive,
                        });
                        setFormError(null);
                        setIsCategoryModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (catItems.length > 0) {
                          alert(`Category '${cat.name}' contains ${catItems.length} items. Please remove or move dishes before deleting category.`);
                          return;
                        }
                        if (window.confirm(`Delete category '${cat.name}'?`)) {
                          deleteCategoryMutation.mutate({ id: cat.id });
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items Grid */}
                {catItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    No dishes added to this category yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 bg-slate-950/80 border rounded-2xl space-y-3 transition group relative ${
                          item.isAvailable
                            ? 'border-slate-800/80 hover:border-slate-700'
                            : 'border-slate-800/40 opacity-75'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Dish Image / Placeholder */}
                          <div className="w-20 h-20 shrink-0 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Utensils className="w-7 h-7 text-slate-700" />
                            )}
                          </div>

                          {/* Dish Name & Price */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="font-bold text-sm text-slate-100 truncate group-hover:text-amber-400 transition">
                                {item.name}
                              </h3>
                              <span className="font-extrabold text-sm text-amber-400 shrink-0">
                                ₹{item.price.toFixed(2)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-2">
                              {item.description || 'No description provided.'}
                            </p>
                          </div>
                        </div>

                        {/* Badges & Prep time */}
                        <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                          <div className="flex items-center gap-1.5">
                            {item.isVegetarian && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 rounded flex items-center gap-0.5">
                                <Leaf className="w-2.5 h-2.5" /> Veg
                              </span>
                            )}
                            {item.isVegan && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                                Vegan
                              </span>
                            )}
                            {item.isSpicy && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" /> Spicy
                              </span>
                            )}
                            {item.preparationTimeMinutes && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-slate-600" /> {item.preparationTimeMinutes} min
                              </span>
                            )}
                          </div>

                          {/* Availability Toggle Switch */}
                          <button
                            onClick={() =>
                              toggleAvailabilityMutation.mutate({
                                id: item.id,
                                isAvailable: !item.isAvailable,
                              })
                            }
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1 ${
                              item.isAvailable
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            }`}
                          >
                            {item.isAvailable ? (
                              <>
                                <Check className="w-3 h-3" /> Available
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" /> Out of Stock
                              </>
                            )}
                          </button>
                        </div>

                        {/* Dish Action Overlay */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-900">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setItemFormData({
                                categoryId: item.categoryId,
                                name: item.name,
                                description: item.description || '',
                                price: String(item.price),
                                imageUrl: item.imageUrl || '',
                                isAvailable: item.isAvailable,
                                isActive: item.isActive,
                                isVegetarian: item.isVegetarian,
                                isVegan: item.isVegan,
                                isSpicy: item.isSpicy,
                                preparationTimeMinutes: item.preparationTimeMinutes ? String(item.preparationTimeMinutes) : '',
                              });
                              setFormError(null);
                              setIsItemModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-amber-400 transition"
                            title="Edit Dish"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Delete dish '${item.name}'?`)) {
                                deleteItemMutation.mutate(item.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Delete Dish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Grid className="w-5 h-5 text-amber-400" />
                {editingCategory ? 'Edit Menu Category' : 'Create Menu Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                if (editingCategory) {
                  updateCategoryMutation.mutate({ id: editingCategory.id, input: categoryFormData });
                } else {
                  createCategoryMutation.mutate(categoryFormData);
                }
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starters, Main Course, Desserts"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Appetizers, soups, and small plates"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="catActiveCheck"
                  checked={categoryFormData.isActive}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="catActiveCheck" className="text-xs text-slate-300 cursor-pointer">
                  Active (Visible in public menu)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm disabled:opacity-50"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Dish Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-400" />
                {editingItem ? 'Edit Dish / Item' : 'Add New Dish / Item'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                const payload = {
                  ...itemFormData,
                  price: parseFloat(itemFormData.price),
                  preparationTimeMinutes: itemFormData.preparationTimeMinutes
                    ? parseInt(itemFormData.preparationTimeMinutes)
                    : undefined,
                };

                if (editingItem) {
                  updateItemMutation.mutate({ id: editingItem.id, input: payload });
                } else {
                  createItemMutation.mutate(payload);
                }
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category *</label>
                <select
                  required
                  value={itemFormData.categoryId}
                  onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dish Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Paneer Tikka"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="349.00"
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Char-grilled cottage cheese marinated in Indian spices"
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={itemFormData.imageUrl}
                    onChange={(e) => setItemFormData({ ...itemFormData, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Prep Time (minutes)</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={itemFormData.preparationTimeMinutes}
                    onChange={(e) => setItemFormData({ ...itemFormData, preparationTimeMinutes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Dietary Flags */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block">Dietary & Flavor Attributes:</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-green-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemFormData.isVegetarian}
                      onChange={(e) => setItemFormData({ ...itemFormData, isVegetarian: e.target.checked })}
                      className="w-4 h-4 accent-green-500 rounded"
                    />
                    🌱 Vegetarian
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-emerald-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemFormData.isVegan}
                      onChange={(e) => setItemFormData({ ...itemFormData, isVegan: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    Plant-based Vegan
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-rose-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemFormData.isSpicy}
                      onChange={(e) => setItemFormData({ ...itemFormData, isSpicy: e.target.checked })}
                      className="w-4 h-4 accent-rose-500 rounded"
                    />
                    🌶 Spicy
                  </label>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemFormData.isAvailable}
                    onChange={(e) => setItemFormData({ ...itemFormData, isAvailable: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  Operational Available
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemFormData.isActive}
                    onChange={(e) => setItemFormData({ ...itemFormData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  Public Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                  {editingItem ? 'Update Dish' : 'Save Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Menu Live Preview Drawer */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Live Customer View</span>
                <h2 className="text-xl font-bold text-slate-100">Digital Menu Preview</h2>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {categories
                .filter((c) => c.isActive)
                .map((cat) => {
                  const catItems = items.filter((item) => item.categoryId === cat.id && item.isActive && item.isAvailable);
                  return (
                    <div key={cat.id} className="space-y-3">
                      <h3 className="text-lg font-bold text-amber-400 border-b border-slate-800/80 pb-1">
                        {cat.name}
                      </h3>
                      {catItems.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No available dishes in this category.</p>
                      ) : (
                        <div className="space-y-3">
                          {catItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-start gap-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                                  {item.isVegetarian && <span className="text-[10px] text-green-400">🌱 Veg</span>}
                                  {item.isSpicy && <span className="text-[10px] text-rose-400">🌶 Spicy</span>}
                                </div>
                                {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                              </div>
                              <span className="font-bold text-amber-400 text-sm shrink-0">₹{item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
