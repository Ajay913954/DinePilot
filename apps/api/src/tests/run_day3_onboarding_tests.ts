import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { prisma } from '../lib/prisma.js';

async function runDay3OnboardingTests() {
  console.log('================================================');
  console.log('🧪 RUNNING DAY 3: ONBOARDING & TENANT TESTS');
  console.log('================================================\n');

  const testUserAEmail = `owner.a.${Date.now()}@dinepilot-test.com`;
  const testUserBEmail = `owner.b.${Date.now()}@dinepilot-test.com`;
  const password = 'Password123!';

  try {
    // 1. Create Users
    console.log('[Test 1]: Creating test users A & B...');
    const userA = await AuthService.register({
      firstName: 'Marco',
      lastName: 'Polo',
      email: testUserAEmail,
      password,
      confirmPassword: password,
    });

    const userB = await AuthService.register({
      firstName: 'Luigi',
      lastName: 'Mario',
      email: testUserBEmail,
      password,
      confirmPassword: password,
    });
    console.log('✅ PASS: Test users created');

    // 2. Test Onboarding Creation & Transaction
    console.log('\n[Test 2]: Onboarding Restaurant A for User A...');
    const restaurantA = await RestaurantService.createRestaurantOnboarding(userA.user.id, {
      name: 'The Spice House',
      cuisineType: 'North Indian',
      phone: '+91 98765 43210',
      email: 'contact@spicehouse.com',
      address: '123 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      timezone: 'Asia/Kolkata',
      openingTime: '10:00',
      closingTime: '23:00',
      tableCount: 15,
      avgSeatingCapacity: 60,
    });

    if (!restaurantA.id || restaurantA.slug !== 'the-spice-house') {
      throw new Error(`FAIL: Unexpected restaurant slug: ${restaurantA.slug}`);
    }
    console.log('✅ PASS: Restaurant A created with slug:', restaurantA.slug);

    // 3. Test Duplicate Slug Collision Resolution
    console.log('\n[Test 3]: Onboarding Restaurant B for User B with identical name (Slug Collision test)...');
    const restaurantB = await RestaurantService.createRestaurantOnboarding(userB.user.id, {
      name: 'The Spice House',
      cuisineType: 'North Indian',
      phone: '+91 98765 43211',
      email: 'contact@spicehouse2.com',
      address: '456 Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      timezone: 'Asia/Kolkata',
      openingTime: '10:00',
      closingTime: '23:00',
      tableCount: 20,
      avgSeatingCapacity: 80,
    });

    if (restaurantB.slug !== 'the-spice-house-1' && restaurantB.slug !== 'the-spice-house-2') {
      throw new Error(`FAIL: Duplicate slug collision resolution failed. Slug was: ${restaurantB.slug}`);
    }
    console.log('✅ PASS: Duplicate slug correctly resolved to:', restaurantB.slug);

    // 4. Test Multi-Tenant Access Boundaries
    console.log('\n[Test 4]: Verifying multi-tenant isolation...');
    const userAMembership = await RestaurantService.requireRestaurantAccess(userA.user.id, restaurantA.id);
    if (userAMembership.role !== 'OWNER') {
      throw new Error('FAIL: User A role is not OWNER!');
    }
    console.log('✅ PASS: User A verified as OWNER of Restaurant A');

    try {
      await RestaurantService.requireRestaurantAccess(userA.user.id, restaurantB.id);
      throw new Error('SECURITY VIOLATION: User A was able to access Restaurant B!');
    } catch (err: any) {
      if (err.statusCode === 403 || err.code === 'FORBIDDEN') {
        console.log('✅ PASS: User A correctly forbidden from accessing Restaurant B');
      } else {
        throw err;
      }
    }

    // 5. Test Public Page Data Retrieval & Masking
    console.log('\n[Test 5]: Testing public restaurant page data retrieval by slug...');
    const publicProfile = await RestaurantService.getBySlug(restaurantA.slug);
    if (!publicProfile.name || publicProfile.slug !== restaurantA.slug) {
      throw new Error('FAIL: Invalid public profile payload');
    }
    if ('passwordHash' in publicProfile || 'sessions' in publicProfile || 'internalNotes' in publicProfile) {
      throw new Error('SECURITY VIOLATION: Private internal fields exposed in public route!');
    }
    console.log('✅ PASS: Public profile data sanitized correctly:', publicProfile.name);

    // Cleanup
    console.log('\n[Cleanup]: Removing test database records...');
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.user.id, userB.user.id] } },
    });

    console.log('\n================================================');
    console.log('🎉 ALL DAY 3 ONBOARDING & TENANT TESTS PASSED!');
    console.log('================================================\n');
  } catch (error: any) {
    console.error('❌ DAY 3 TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDay3OnboardingTests();
