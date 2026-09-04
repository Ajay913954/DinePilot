import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { CustomerService } from '../services/customer.service.js';
import { ReservationService } from '../services/reservation.service.js';
import { TableService } from '../services/table.service.js';
import { normalizePhone } from '../utils/phone.utils.js';
import { ReservationStatus, Role } from '@prisma/client';

async function runDay5CustomerCrmTests() {
  console.log('================================================');
  console.log('🧪 RUNNING DAY 5: CUSTOMER CRM & INTELLIGENCE TESTS');
  console.log('================================================\n');

  const timestamp = Date.now();

  try {
    // 0. Setup Test Users & Tenants
    console.log('[Test 0]: Setting up test users and restaurants...');
    const userA = await AuthService.register({
      firstName: 'CRM_Owner',
      lastName: 'A',
      email: `crm_owner_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const userB = await AuthService.register({
      firstName: 'CRM_Owner',
      lastName: 'B',
      email: `crm_owner_b_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const restA = await RestaurantService.createRestaurantOnboarding(userA.user.id, {
      name: `CRM Bistro A ${timestamp}`,
      phone: '+91 98765 00001',
      email: `rest_a_${timestamp}@test.com`,
      address: '123 CRM Street',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Italian',
      openingTime: '10:00',
      closingTime: '23:00',
      tableCount: 5,
      avgSeatingCapacity: 20,
    });

    const restB = await RestaurantService.createRestaurantOnboarding(userB.user.id, {
      name: `CRM Bistro B ${timestamp}`,
      phone: '+91 98765 00002',
      email: `rest_b_${timestamp}@test.com`,
      address: '456 CRM Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Indian',
      openingTime: '10:00',
      closingTime: '23:00',
      tableCount: 5,
      avgSeatingCapacity: 20,
    });

    console.log('✅ PASS: Setup completed successfully');

    // 1. Phone Normalization Utility Test
    console.log('\n[Test 1]: Testing Phone Normalization Strategy...');
    const p1 = normalizePhone('+91 98765 43210');
    const p2 = normalizePhone('919876543210');
    const p3 = normalizePhone('09876543210');
    const p4 = normalizePhone('9876543210');

    if (p1 !== '+919876543210' || p2 !== '+919876543210' || p3 !== '+919876543210' || p4 !== '+919876543210') {
      throw new Error(`FAIL: Phone normalization failed. Values: ${p1}, ${p2}, ${p3}, ${p4}`);
    }
    console.log('✅ PASS: All Indian phone variations normalized to canonical E.164 (+919876543210)');

    // 2. Customer Creation & Deduplication
    console.log('\n[Test 2]: Testing Customer Creation & Phone Deduplication...');
    const cust1 = await CustomerService.createCustomer(userA.user.id, {
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      email: 'rahul@test.com',
      notes: 'Prefers window seating',
      isVip: false,
    });

    if (cust1.phone !== '+919876543210') {
      throw new Error(`FAIL: Customer phone not normalized correctly: ${cust1.phone}`);
    }

    try {
      await CustomerService.createCustomer(userA.user.id, {
        name: 'Rahul Duplicate',
        phone: '9876543210', // identical normalized phone
      });
      throw new Error('FAIL: Duplicate phone customer creation should have failed');
    } catch (err: any) {
      if (err.code !== 'DUPLICATE_CUSTOMER') {
        throw err;
      }
      console.log('✅ PASS: Duplicate customer creation correctly blocked (409 DUPLICATE_CUSTOMER)');
    }

    // 3. Customer Classification & Stats Calculation
    console.log('\n[Test 3]: Testing Customer Classification Engine...');
    const profileInitial = await CustomerService.getCustomerById(userA.user.id, cust1.id);
    if (profileInitial.classification !== 'NEW') {
      throw new Error(`FAIL: Initial customer classification should be NEW, got: ${profileInitial.classification}`);
    }
    console.log('✅ PASS: New customer correctly classified as NEW');

    // Create table & reservation for Customer 1
    const table1 = await TableService.createTable(userA.user.id, {
      tableNumber: 'T10',
      capacity: 4,
      location: 'INDOOR',
    });

    const resv1 = await ReservationService.createReservation(userA.user.id, {
      customerName: 'Rahul Sharma',
      customerPhone: '+91 98765 43210',
      date: '2026-09-10',
      startTime: '19:00',
      durationMinutes: 90,
      guestCount: 2,
      tableId: table1.id,
    });

    // Mark reservation COMPLETED
    await ReservationService.updateStatus(userA.user.id, resv1.id, ReservationStatus.CONFIRMED);
    await ReservationService.updateStatus(userA.user.id, resv1.id, ReservationStatus.SEATED);
    await ReservationService.updateStatus(userA.user.id, resv1.id, ReservationStatus.COMPLETED);

    const profileAfterVisit = await CustomerService.getCustomerById(userA.user.id, cust1.id);
    if (profileAfterVisit.stats.completedVisits !== 1) {
      throw new Error(`FAIL: Completed visits count incorrect: ${profileAfterVisit.stats.completedVisits}`);
    }
    console.log('✅ PASS: Real completed visit stats calculated from PostgreSQL');

    // 4. Tag Creation, Assignment & Deletion
    console.log('\n[Test 4]: Testing Customer Tag Management...');
    const tagVip = await CustomerService.addTagToCustomer(userA.user.id, cust1.id, 'VIP Guest');
    const tagVeg = await CustomerService.addTagToCustomer(userA.user.id, cust1.id, 'Vegetarian');

    let profileTagged = await CustomerService.getCustomerById(userA.user.id, cust1.id);
    if (profileTagged.tags.length !== 2) {
      throw new Error(`FAIL: Tag assignment failed. Expected 2 tags, got ${profileTagged.tags.length}`);
    }

    // Remove one tag
    await CustomerService.removeTagFromCustomer(userA.user.id, cust1.id, tagVeg.id);
    profileTagged = await CustomerService.getCustomerById(userA.user.id, cust1.id);
    if (profileTagged.tags.length !== 1 || profileTagged.tags[0].name !== 'VIP Guest') {
      throw new Error('FAIL: Tag removal failed');
    }
    console.log('✅ PASS: Tag creation, assignment, and removal verified');

    // 5. VIP Toggle & Notes Update
    console.log('\n[Test 5]: Testing VIP Status & Staff Notes...');
    await CustomerService.updateCustomer(userA.user.id, cust1.id, {
      isVip: true,
      notes: 'Loves red wine and window table.',
    });

    const profileVip = await CustomerService.getCustomerById(userA.user.id, cust1.id);
    if (!profileVip.isVip || profileVip.classification !== 'VIP') {
      throw new Error('FAIL: VIP flag or classification not updated to VIP');
    }
    if (profileVip.notes !== 'Loves red wine and window table.') {
      throw new Error('FAIL: Staff notes update failed');
    }
    console.log('✅ PASS: VIP status toggle and internal staff notes updated');

    // 6. Safe Transactional Customer Merge
    console.log('\n[Test 6]: Testing Transactional Customer Merge Operation...');
    const cust2 = await CustomerService.createCustomer(userA.user.id, {
      name: 'Rahul S. (Duplicate)',
      phone: '+91 99999 88888',
      email: 'rahul.secondary@test.com',
      notes: 'Secondary account notes',
    });

    // Create reservation for secondary customer
    const resv2 = await ReservationService.createReservation(userA.user.id, {
      customerName: 'Rahul S.',
      customerPhone: '+91 99999 88888',
      date: '2026-09-12',
      startTime: '20:00',
      durationMinutes: 90,
      guestCount: 4,
      tableId: table1.id,
    });

    // Execute Merge: Secondary into Primary
    await CustomerService.mergeCustomers(userA.user.id, {
      primaryCustomerId: cust1.id,
      secondaryCustomerId: cust2.id,
    });

    // Verify reservation reassignment
    const mergedHistory = await CustomerService.getCustomerReservations(userA.user.id, cust1.id);
    const reassignedResv = mergedHistory.find((r) => r.id === resv2.id);
    if (!reassignedResv) {
      throw new Error('FAIL: Secondary customer reservation was not reassigned to primary customer');
    }

    // Verify secondary customer record deletion
    try {
      await CustomerService.getCustomerById(userA.user.id, cust2.id);
      throw new Error('FAIL: Secondary customer record should have been deleted');
    } catch (err: any) {
      if (err.code !== 'CUSTOMER_NOT_FOUND') throw err;
    }
    console.log('✅ PASS: Customer merge transaction verified (reservations reassigned, duplicate deleted)');

    // 7. Multi-Tenant Security Isolation
    console.log('\n[Test 7]: Verifying Multi-Tenant Isolation...');
    try {
      await CustomerService.getCustomerById(userB.user.id, cust1.id);
      throw new Error('FAIL: User B should be forbidden from accessing User A customer');
    } catch (err: any) {
      if (err.code !== 'CUSTOMER_NOT_FOUND' && err.code !== 'FORBIDDEN') {
        throw err;
      }
      console.log('✅ PASS: User B correctly forbidden from accessing User A customer data');
    }

    // 8. Search & Pagination Test
    console.log('\n[Test 8]: Testing Server-side Search & Pagination...');
    const searchResult = await CustomerService.getCustomers(userA.user.id, {
      search: 'Rahul',
      page: 1,
      limit: 10,
    });

    if (searchResult.customers.length === 0) {
      throw new Error('FAIL: Search for "Rahul" returned 0 results');
    }
    console.log('✅ PASS: Server-side search & pagination returned expected records');

    // 9. Cleanup
    console.log('\n[Cleanup]: Cleaning up test records...');
    await prisma.reservation.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.table.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.customerTagAssignment.deleteMany({});
    await prisma.customerTag.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.customer.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [restA.id, restB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.user.id, userB.user.id] } } });

    console.log('\n================================================');
    console.log('🎉 ALL DAY 5 CUSTOMER CRM & INTELLIGENCE TESTS PASSED!');
    console.log('================================================\n');
  } catch (err: any) {
    console.error('\n❌ DAY 5 TEST FAILED:', err);
    process.exit(1);
  }
}

runDay5CustomerCrmTests();
