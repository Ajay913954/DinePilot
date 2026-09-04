import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { prisma } from '../lib/prisma.js';
import { hashToken } from '../utils/auth.js';

async function runSecurityAndTenantTests() {
  console.log('================================================');
  console.log('🧪 RUNNING SECURITY & MULTI-TENANT ISOLATION TESTS');
  console.log('================================================\n');

  const userAEmail = `user.tenantA.${Date.now()}@dinepilot-test.com`;
  const userBEmail = `user.tenantB.${Date.now()}@dinepilot-test.com`;
  const password = 'Password123!';

  try {
    // 1. Create User A and User B
    console.log('[Test 1]: Registering User A & User B...');
    const userARes = await AuthService.register({
      firstName: 'Owner',
      lastName: 'A',
      email: userAEmail,
      password,
      confirmPassword: password,
    });

    const userBRes = await AuthService.register({
      firstName: 'Owner',
      lastName: 'B',
      email: userBEmail,
      password,
      confirmPassword: password,
    });

    // Verify Password Hash & Token security
    console.log('[Test 2]: Verifying payload & database security (No raw tokens / passwords)...');
    if ('passwordHash' in userARes.user || 'password' in userARes.user) {
      throw new Error('SECURITY VIOLATION: Password returned in user payload!');
    }

    const rawToken = userARes.token;
    const sessionInDb = await prisma.session.findFirst({
      where: { userId: userARes.user.id },
    });

    if (!sessionInDb) {
      throw new Error('FAIL: Session record not found in database');
    }

    if (sessionInDb.tokenHash === rawToken) {
      throw new Error('SECURITY VIOLATION: Raw session token stored unhashed in database!');
    }

    if (sessionInDb.tokenHash !== hashToken(rawToken)) {
      throw new Error('FAIL: Session token hash does not match SHA256 expectation');
    }
    console.log('✅ PASS: Password hash & raw tokens are strictly isolated');

    // 3. Create Restaurant for User A
    console.log('\n[Test 3]: Onboarding Restaurant for User A...');
    const restaurantA = await RestaurantService.createRestaurantOnboarding(userARes.user.id, {
      name: 'Trattoria Bella A',
      phone: '+1 555-0101',
      email: userAEmail,
      address: '123 Main St',
      city: 'Rome',
      state: 'RM',
      country: 'Italy',
      timezone: 'Europe/Rome',
      cuisineType: 'Italian',
      openingTime: '09:00',
      closingTime: '22:00',
      tableCount: 10,
      avgSeatingCapacity: 40,
    });

    // 4. Test User A Access
    console.log('\n[Test 4]: Verifying User A access to Restaurant A...');
    const userAMembership = await RestaurantService.requireRestaurantAccess(userARes.user.id, restaurantA.id);
    if (!userAMembership) {
      throw new Error('FAIL: User A denied access to their own restaurant!');
    }
    console.log('✅ PASS: User A successfully accessed Restaurant A');

    // 5. Test Tenant Isolation: User B trying to access Restaurant A
    console.log('\n[Test 5]: Testing Multi-Tenant Isolation (User B accessing Restaurant A)...');
    try {
      await RestaurantService.requireRestaurantAccess(userBRes.user.id, restaurantA.id);
      throw new Error('SECURITY VIOLATION: User B accessed Restaurant A data!');
    } catch (err: any) {
      if (err.statusCode === 403 || err.code === 'FORBIDDEN') {
        console.log('✅ PASS: Multi-tenant isolation verified (403 Forbidden correctly returned)');
      } else {
        throw err;
      }
    }

    // Cleanup
    await prisma.restaurant.delete({ where: { id: restaurantA.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userARes.user.id, userBRes.user.id] } } });

    console.log('\n================================================');
    console.log('🎉 ALL SECURITY & TENANT ISOLATION TESTS PASSED!');
    console.log('================================================\n');
  } catch (error: any) {
    console.error('❌ SECURITY & TENANT TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSecurityAndTenantTests();
