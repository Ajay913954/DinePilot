import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { restaurantUpdateSchema, RestaurantUpdateInput, changePasswordSchema, ChangePasswordInput } from '@dinepilot/validation';
import { Building2, User as UserIcon, Shield, Save, LogOut, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { restaurantApi } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user, logout, refetchUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'restaurant' | 'account' | 'security'>('restaurant');
  const [isSavingRest, setIsSavingRest] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Restaurant Profile Form
  const restForm = useForm<RestaurantUpdateInput>({
    resolver: zodResolver(restaurantUpdateSchema),
  });

  // Security / Password Form
  const passForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    restaurantApi.getMe().then((res) => {
      if (res.restaurant) {
        restForm.reset({
          name: res.restaurant.name || '',
          phone: res.restaurant.phone || '',
          email: res.restaurant.email || '',
          address: res.restaurant.address || '',
          city: res.restaurant.city || '',
          state: res.restaurant.state || '',
          country: res.restaurant.country || '',
          timezone: res.restaurant.timezone || 'UTC',
          cuisineType: res.restaurant.cuisineType || '',
        });
      }
    });
  }, [restForm]);

  const onSaveRestaurant = async (data: RestaurantUpdateInput) => {
    try {
      setIsSavingRest(true);
      await restaurantApi.updateMe(data);
      showToast('Restaurant profile updated successfully!', 'success');
      await refetchUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to update restaurant profile.', 'error');
    } finally {
      setIsSavingRest(false);
    }
  };

  const onChangePassword = async (_data: ChangePasswordInput) => {
    try {
      setIsChangingPass(true);
      // Simulate password change success for Day 1
      showToast('Password updated successfully!', 'success');
      passForm.reset();
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-slate-400">
          Manage your restaurant profile, account details, and security parameters.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'restaurant'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Restaurant Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'account'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Account Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security</span>
        </button>
      </div>

      {/* Tab 1: Restaurant Profile */}
      {activeTab === 'restaurant' && (
        <Card glass className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Restaurant Information</h3>
            <p className="text-xs text-slate-400">Update your public dining info and location specs.</p>
          </div>

          <form onSubmit={restForm.handleSubmit(onSaveRestaurant)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Restaurant name"
                error={restForm.formState.errors.name?.message}
                {...restForm.register('name')}
              />
              <Input
                label="Cuisine type"
                error={restForm.formState.errors.cuisineType?.message}
                {...restForm.register('cuisineType')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone number"
                error={restForm.formState.errors.phone?.message}
                {...restForm.register('phone')}
              />
              <Input
                label="Contact email"
                type="email"
                error={restForm.formState.errors.email?.message}
                {...restForm.register('email')}
              />
            </div>

            <Input
              label="Street address"
              error={restForm.formState.errors.address?.message}
              {...restForm.register('address')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                error={restForm.formState.errors.city?.message}
                {...restForm.register('city')}
              />
              <Input
                label="State"
                error={restForm.formState.errors.state?.message}
                {...restForm.register('state')}
              />
              <Input
                label="Country"
                error={restForm.formState.errors.country?.message}
                {...restForm.register('country')}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSavingRest}
                leftIcon={<Save className="w-4 h-4 text-slate-950" />}
              >
                {isSavingRest ? 'Saving...' : 'Save Restaurant Profile'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Account Profile */}
      {activeTab === 'account' && (
        <Card glass className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Personal User Account</h3>
            <p className="text-xs text-slate-400">Your profile credentials as restaurant owner.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First name"
                defaultValue={user?.firstName || ''}
                readOnly
                className="opacity-75 bg-slate-950 cursor-not-allowed"
              />
              <Input
                label="Last name"
                defaultValue={user?.lastName || ''}
                readOnly
                className="opacity-75 bg-slate-950 cursor-not-allowed"
              />
            </div>

            <Input
              label="Email address"
              defaultValue={user?.email || ''}
              readOnly
              className="opacity-75 bg-slate-950 cursor-not-allowed"
            />

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <p className="text-white font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Assigned Tenant Role: <span className="text-amber-400">{user?.role || 'OWNER'}</span>
              </p>
              <p>Account created on {new Date(user?.createdAt || Date.now()).toLocaleDateString()}.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Security */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card glass className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Change Password</h3>
              <p className="text-xs text-slate-400">Ensure your account uses a strong, unique password.</p>
            </div>

            <form onSubmit={passForm.handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
              <Input
                label="Current password"
                type="password"
                leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                error={passForm.formState.errors.currentPassword?.message}
                {...passForm.register('currentPassword')}
              />

              <Input
                label="New password"
                type="password"
                leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                error={passForm.formState.errors.newPassword?.message}
                {...passForm.register('newPassword')}
              />

              <Input
                label="Confirm new password"
                type="password"
                leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                error={passForm.formState.errors.confirmNewPassword?.message}
                {...passForm.register('confirmNewPassword')}
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isChangingPass}
              >
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>

          <Card glass className="p-6 sm:p-8 space-y-4 border-rose-900/30">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Active Session</h3>
              <p className="text-xs text-slate-400">Sign out of your current session on this device.</p>
            </div>

            <div>
              <Button
                variant="danger"
                onClick={() => logout()}
                leftIcon={<LogOut className="w-4 h-4 text-white" />}
              >
                Log Out of DinePilot
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
