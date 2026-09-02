import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  restaurantStep1Schema, 
  restaurantStep2Schema, 
  restaurantStep3Schema,
  RestaurantStep1Input,
  RestaurantStep2Input,
  RestaurantStep3Input,
  RestaurantOnboardingInputSchema
} from '@dinepilot/validation';
import { Utensils, MapPin, Clock, CheckCircle2, ChevronRight, ChevronLeft, Building2, Phone, Mail, Globe, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { restaurantApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Consolidated Onboarding Form Data State
  const [formData, setFormData] = useState<Partial<RestaurantOnboardingInputSchema>>({
    openingTime: '09:00',
    closingTime: '22:00',
    tableCount: 10,
    avgSeatingCapacity: 40,
    country: 'United States',
    timezone: 'UTC',
  });

  // Step 1 Form
  const step1Form = useForm<RestaurantStep1Input>({
    resolver: zodResolver(restaurantStep1Schema),
    defaultValues: {
      name: formData.name || '',
      cuisineType: formData.cuisineType || '',
      phone: formData.phone || '',
      email: formData.email || '',
    },
  });

  // Step 2 Form
  const step2Form = useForm<RestaurantStep2Input>({
    resolver: zodResolver(restaurantStep2Schema),
    defaultValues: {
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      country: formData.country || 'United States',
      timezone: formData.timezone || 'UTC',
    },
  });

  // Step 3 Form
  const step3Form = useForm<RestaurantStep3Input>({
    resolver: zodResolver(restaurantStep3Schema),
    defaultValues: {
      openingTime: formData.openingTime || '09:00',
      closingTime: formData.closingTime || '22:00',
      tableCount: formData.tableCount || 10,
      avgSeatingCapacity: formData.avgSeatingCapacity || 40,
    },
  });

  const handleStep1Submit = (data: RestaurantStep1Input) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: RestaurantStep2Input) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleStep3Submit = async (data: RestaurantStep3Input) => {
    const completeData = {
      ...formData,
      ...data,
    } as RestaurantOnboardingInputSchema;

    try {
      setIsSubmitting(true);
      await restaurantApi.createOnboarding(completeData);
      await refetchUser();
      showToast('Restaurant onboarding completed!', 'success');
      setCurrentStep(4);
    } catch (err: any) {
      showToast(err.message || 'Failed to create restaurant. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Onboarding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-semibold text-amber-400 border border-amber-500/20">
            <Utensils className="w-4 h-4 text-amber-400" />
            <span>Step {currentStep} of 4</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to DinePilot
          </h1>
          <p className="text-slate-400 text-sm">
            Let's get your restaurant ready.
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 px-2">
          {[
            { step: 1, label: 'Info' },
            { step: 2, label: 'Location' },
            { step: 3, label: 'Settings' },
            { step: 4, label: 'Ready' }
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                  currentStep >= item.step ? 'gradient-brand glow-amber' : 'bg-slate-800'
                }`}
              />
              <span className={`text-[11px] font-medium ${currentStep >= item.step ? 'text-amber-400' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Wizard Card Container */}
        <Card glass className="p-6 sm:p-10 relative overflow-hidden">
          
          {/* STEP 1: Restaurant Info */}
          {currentStep === 1 && (
            <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  Restaurant Information
                </h3>
                <p className="text-xs text-slate-400">Tell us basic details about your dining establishment.</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Restaurant name"
                  placeholder="e.g. La Trattoria Bistro"
                  leftIcon={<Building2 className="w-4 h-4 text-slate-500" />}
                  error={step1Form.formState.errors.name?.message}
                  {...step1Form.register('name')}
                />

                <Input
                  label="Cuisine type"
                  placeholder="e.g. Italian, Modern Bistro, Seafood, Steakhouse"
                  leftIcon={<Utensils className="w-4 h-4 text-slate-500" />}
                  error={step1Form.formState.errors.cuisineType?.message}
                  {...step1Form.register('cuisineType')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone number"
                    placeholder="+1 (555) 000-1234"
                    leftIcon={<Phone className="w-4 h-4 text-slate-500" />}
                    error={step1Form.formState.errors.phone?.message}
                    {...step1Form.register('phone')}
                  />
                  <Input
                    label="Restaurant email"
                    type="email"
                    placeholder="contact@latrattoria.com"
                    leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
                    error={step1Form.formState.errors.email?.message}
                    {...step1Form.register('email')}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" variant="primary" rightIcon={<ChevronRight className="w-4 h-4 text-slate-950" />}>
                  Continue to Location
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: Location */}
          {currentStep === 2 && (
            <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  Location & Timezone
                </h3>
                <p className="text-xs text-slate-400">Where is your dining venue located?</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Address"
                  placeholder="123 Culinary Boulevard"
                  leftIcon={<MapPin className="w-4 h-4 text-slate-500" />}
                  error={step2Form.formState.errors.address?.message}
                  {...step2Form.register('address')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    placeholder="New York"
                    error={step2Form.formState.errors.city?.message}
                    {...step2Form.register('city')}
                  />
                  <Input
                    label="State / Province"
                    placeholder="NY"
                    error={step2Form.formState.errors.state?.message}
                    {...step2Form.register('state')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Country"
                    placeholder="United States"
                    leftIcon={<Globe className="w-4 h-4 text-slate-500" />}
                    error={step2Form.formState.errors.country?.message}
                    {...step2Form.register('country')}
                  />
                  <Input
                    label="Timezone"
                    placeholder="America/New_York or UTC"
                    leftIcon={<Clock className="w-4 h-4 text-slate-500" />}
                    error={step2Form.formState.errors.timezone?.message}
                    {...step2Form.register('timezone')}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                  Back
                </Button>
                <Button type="submit" variant="primary" rightIcon={<ChevronRight className="w-4 h-4 text-slate-950" />}>
                  Continue to Settings
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Restaurant Settings */}
          {currentStep === 3 && (
            <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Capacity & Operating Hours
                </h3>
                <p className="text-xs text-slate-400">Configure your initial table capacity and daily operating hours.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Opening time"
                    type="time"
                    error={step3Form.formState.errors.openingTime?.message}
                    {...step3Form.register('openingTime')}
                  />
                  <Input
                    label="Closing time"
                    type="time"
                    error={step3Form.formState.errors.closingTime?.message}
                    {...step3Form.register('closingTime')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Number of tables"
                    type="number"
                    min={1}
                    leftIcon={<Utensils className="w-4 h-4 text-slate-500" />}
                    error={step3Form.formState.errors.tableCount?.message}
                    {...step3Form.register('tableCount')}
                  />
                  <Input
                    label="Average seating capacity"
                    type="number"
                    min={1}
                    leftIcon={<Users className="w-4 h-4 text-slate-500" />}
                    error={step3Form.formState.errors.avgSeatingCapacity?.message}
                    {...step3Form.register('avgSeatingCapacity')}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  rightIcon={<CheckCircle2 className="w-4 h-4 text-slate-950" />}
                >
                  {isSubmitting ? 'Creating restaurant...' : 'Complete Onboarding'}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center py-8 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">
                  Your restaurant is ready!
                </h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Congratulations! Your restaurant account has been configured with complete owner privileges.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  rightIcon={<ChevronRight className="w-5 h-5 text-slate-950" />}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
};
