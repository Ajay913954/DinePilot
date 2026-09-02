import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';

async function runOnboardingTests() {
  console.log('================================================');
  console.log('🧪 RUNNING RESTAURANT ONBOARDING & OWNER ROLE TESTS');
  console.log('================================================\n');

  const testEmail = `owner.onboard.${Date.now()}@dinepilot-test.com`;
  const testPassword = 'Password123!';

  try {
    // 1. Create User
    console.log('[Test 1]: Registering test owner user...');
    const userRes = await AuthService.register({
      firstName: 'Marco',
      lastName: 'Rossi',
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    });
    console.log('✅ PASS: User created successfully:', userRes.user.id);

    // 2. Perform Onboarding
    console.log('\n[Test 2]: Performing multi-step restaurant onboarding...');
    const restaurant = await RestaurantService.createRestaurantOnboarding(userRes.user.id, {
      name: 'La Trattoria Bistro',
      cuisineType: 'Italian',
      phone: '+1 555-987-6543',
      email: 'info@latrattoria.com',
      address: '456 Olive Way',
      city: 'Florence',
      state: 'Tuscany',
      country: 'Italy',
      timezone: 'Europe/Rome',
      openingTime: '11:00',
      closingTime: '23:00',
      tableCount: 15,
      avgSeatingCapacity: 60,
    });

    if (!restaurant || !restaurant.id || !restaurant.slug) {
      throw new Error('Onboarding failed: Restaurant record missing id or slug');
    }
    console.log('✅ PASS: Restaurant created with slug:', restaurant.slug);

    // 3. Verify OWNER Role Relationship in DB
    console.log('\n[Test 3]: Verifying RestaurantUser relationship & OWNER role assignment...');
    const rel = await prisma.restaurantUser.findUnique({
      where: {
        userId_restaurantId: {
          userId: userRes.user.id,
          restaurantId: restaurant.id,
        },
      },
    });

    if (!rel || rel.role !== Role.OWNER) {
      throw new Error(`Role assignment failed: expected OWNER, got ${rel?.role}`);
    }
    console.log('✅ PASS: RestaurantUser relationship verified with role: OWNER');

    // 4. Test User Tenant Lookup
    console.log('\n[Test 4]: Fetching user active restaurant tenant details...');
    const activeRest = await RestaurantService.getUserRestaurant(userRes.user.id);
    if (!activeRest || activeRest.id !== restaurant.id) {
      throw new Error('Tenant lookup failed');
    }
    console.log('✅ PASS: Active tenant successfully retrieved for authenticated user');

    // Clean up test data
    await prisma.restaurant.delete({ where: { id: restaurant.id } });
    await prisma.user.delete({ where: { id: userRes.user.id } });

    console.log('\n================================================');
    console.log('🎉 ALL ONBOARDING & TENANT TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================\n');
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runOnboardingTests();
