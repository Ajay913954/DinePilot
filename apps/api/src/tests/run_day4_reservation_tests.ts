import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { TableService } from '../services/table.service.js';
import { AvailabilityService } from '../services/availability.service.js';
import { ReservationService } from '../services/reservation.service.js';
import { prisma } from '../lib/prisma.js';

async function runDay4ReservationTests() {
  console.log('================================================');
  console.log('🧪 RUNNING DAY 4: TABLES, AVAILABILITY & CONCURRENCY TESTS');
  console.log('================================================\n');

  const testUserAEmail = `owner.resvA.${Date.now()}@dinepilot-test.com`;
  const testUserBEmail = `owner.resvB.${Date.now()}@dinepilot-test.com`;
  const password = 'Password123!';

  // Future valid date string (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDateStr = tomorrow.toISOString().split('T')[0];

  try {
    // 1. Setup Test Users & Restaurant Context
    console.log('[Test 1]: Creating test users & restaurants...');
    const userA = await AuthService.register({
      firstName: 'Marco',
      lastName: 'Chef',
      email: testUserAEmail,
      password,
      confirmPassword: password,
    });

    const userB = await AuthService.register({
      firstName: 'Luigi',
      lastName: 'Manager',
      email: testUserBEmail,
      password,
      confirmPassword: password,
    });

    const restaurantA = await RestaurantService.createRestaurantOnboarding(userA.user.id, {
      name: 'Trattoria Roma A',
      cuisineType: 'Italian',
      phone: '+91 99999 11111',
      email: testUserAEmail,
      address: '100 Via Roma',
      city: 'Rome',
      state: 'RM',
      country: 'Italy',
      timezone: 'Europe/Rome',
      openingTime: '08:00',
      closingTime: '23:30',
      tableCount: 10,
      avgSeatingCapacity: 40,
    });

    const restaurantB = await RestaurantService.createRestaurantOnboarding(userB.user.id, {
      name: 'Pizzeria Napoli B',
      cuisineType: 'Italian',
      phone: '+91 99999 22222',
      email: testUserBEmail,
      address: '200 Via Napoli',
      city: 'Naples',
      state: 'NA',
      country: 'Italy',
      timezone: 'Europe/Rome',
      openingTime: '08:00',
      closingTime: '23:30',
      tableCount: 10,
      avgSeatingCapacity: 40,
    });
    console.log('✅ PASS: Users & Restaurants created');

    // 2. Table CRUD & Duplicate Number Prevention
    console.log('\n[Test 2]: Testing Table CRUD & Duplicate Table Number blocking...');
    const table1 = await TableService.createTable(userA.user.id, {
      tableNumber: '1',
      capacity: 2,
      location: 'INDOOR',
    });

    const table2 = await TableService.createTable(userA.user.id, {
      tableNumber: '2',
      capacity: 4,
      location: 'INDOOR',
    });

    const table3 = await TableService.createTable(userA.user.id, {
      tableNumber: '3',
      capacity: 6,
      location: 'OUTDOOR',
    });

    try {
      await TableService.createTable(userA.user.id, {
        tableNumber: '1',
        capacity: 4,
      });
      throw new Error('FAIL: Duplicate table number was allowed!');
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'TABLE_NUMBER_EXISTS') {
        console.log('✅ PASS: Duplicate table number correctly blocked (409 Conflict)');
      } else {
        throw err;
      }
    }

    // 3. Availability Engine: Capacity Matching & Operating Hours
    console.log('\n[Test 3]: Testing Availability Engine (Capacity & Hours)...');
    
    // Test Closed Hours
    try {
      await AvailabilityService.checkAvailability({
        restaurantId: restaurantA.id,
        date: futureDateStr,
        startTime: '02:00', // 2 AM (closed)
        guestCount: 2,
      });
      throw new Error('FAIL: Closed hours booking allowed!');
    } catch (err: any) {
      if (err.code === 'RESTAURANT_CLOSED') {
        console.log('✅ PASS: Closed operating hours correctly rejected');
      } else {
        throw err;
      }
    }

    // Test Smallest Suitable Capacity Auto-Assignment (2 guests -> Table 1 with 2 seats)
    const availResult2Guests = await AvailabilityService.checkAvailability({
      restaurantId: restaurantA.id,
      date: futureDateStr,
      startTime: '19:00',
      guestCount: 2,
    });
    if (availResult2Guests.assignedTable?.tableNumber !== '1') {
      throw new Error(`FAIL: Expected Table 1 (2 seats) for 2 guests, got Table ${availResult2Guests.assignedTable?.tableNumber}`);
    }
    console.log('✅ PASS: Smallest capacity table correctly auto-assigned (Table 1 for 2 guests)');

    // 4. Double-Booking Overlap Prevention & Time Range Conflict Logic
    console.log('\n[Test 4]: Testing Double-Booking Overlap Logic...');
    // Create base reservation: Table 1, 19:00 - 20:30 (90 mins)
    const resv1 = await ReservationService.createReservation(userA.user.id, {
      customerName: 'Rahul Sharma',
      customerPhone: '+91 98765 00001',
      date: futureDateStr,
      startTime: '19:00',
      guestCount: 2,
      tableId: table1.id,
    });

    // Attempt overlapping reservation on Table 1 (19:30 - 21:00) -> Must fail for Table 1
    try {
      await AvailabilityService.checkAvailability({
        restaurantId: restaurantA.id,
        date: futureDateStr,
        startTime: '19:30',
        guestCount: 2,
        tableId: table1.id,
      });
      throw new Error('FAIL: Overlapping time slot on Table 1 was allowed!');
    } catch (err: any) {
      if (err.code === 'RESERVATION_CONFLICT' || err.statusCode === 409) {
        console.log('✅ PASS: Overlapping time conflict on Table 1 correctly rejected (19:30 slot conflict)');
      } else {
        throw err;
      }
    }

    // Test non-conflicting slots on Table 1:
    // Slot 17:30 - 19:00 (ends right as resv1 starts)
    const availBefore = await AvailabilityService.checkAvailability({
      restaurantId: restaurantA.id,
      date: futureDateStr,
      startTime: '17:30',
      guestCount: 2,
      tableId: table1.id,
    });
    if (!availBefore.available) throw new Error('FAIL: Non-overlapping slot before existing reservation rejected');

    // Slot 20:30 - 22:00 (starts right as resv1 ends)
    const availAfter = await AvailabilityService.checkAvailability({
      restaurantId: restaurantA.id,
      date: futureDateStr,
      startTime: '20:30',
      guestCount: 2,
      tableId: table1.id,
    });
    if (!availAfter.available) throw new Error('FAIL: Non-overlapping slot after existing reservation rejected');
    console.log('✅ PASS: Adjacent non-overlapping time slots (17:30 & 20:30) correctly allowed');

    // 5. Concurrent Booking Race Condition Test
    console.log('\n[Test 5]: Testing Concurrent Race Condition Protection...');
    const testSlotTime = '21:30';
    
    const [resultA, resultB] = await Promise.allSettled([
      ReservationService.createReservation(userA.user.id, {
        customerName: 'Concurrent Guest 1',
        customerPhone: '+91 98765 00002',
        date: futureDateStr,
        startTime: testSlotTime,
        guestCount: 2,
        tableId: table1.id,
      }),
      ReservationService.createReservation(userA.user.id, {
        customerName: 'Concurrent Guest 2',
        customerPhone: '+91 98765 00003',
        date: futureDateStr,
        startTime: testSlotTime,
        guestCount: 2,
        tableId: table1.id,
      }),
    ]);

    const fulfilledCount = [resultA, resultB].filter(r => r.status === 'fulfilled').length;
    const rejectedCount = [resultA, resultB].filter(r => r.status === 'rejected').length;

    if (fulfilledCount !== 1 || rejectedCount !== 1) {
      throw new Error(`FAIL: Concurrency protection failed! Fulfilled: ${fulfilledCount}, Rejected: ${rejectedCount}`);
    }
    console.log('✅ PASS: Concurrency race condition protection verified (1 succeeded, 1 rejected with conflict)');

    // 6. Reservation Status Lifecycle Transitions
    console.log('\n[Test 6]: Testing Reservation Status Transitions...');
    let resv = resv1;
    resv = await ReservationService.updateStatus(userA.user.id, resv.id, 'CONFIRMED' as any);
    if (resv.status !== 'CONFIRMED') throw new Error('FAIL: Status not updated to CONFIRMED');

    resv = await ReservationService.updateStatus(userA.user.id, resv.id, 'SEATED' as any);
    if (resv.status !== 'SEATED') throw new Error('FAIL: Status not updated to SEATED');

    resv = await ReservationService.updateStatus(userA.user.id, resv.id, 'COMPLETED' as any);
    if (resv.status !== 'COMPLETED') throw new Error('FAIL: Status not updated to COMPLETED');

    try {
      await ReservationService.updateStatus(userA.user.id, resv.id, 'PENDING' as any);
      throw new Error('FAIL: Invalid status transition COMPLETED -> PENDING was allowed!');
    } catch (err: any) {
      if (err.code === 'INVALID_STATUS_TRANSITION' || err.statusCode === 400) {
        console.log('✅ PASS: Invalid status transition (COMPLETED -> PENDING) correctly blocked');
      } else {
        throw err;
      }
    }

    // 7. Multi-Tenant Isolation
    console.log('\n[Test 7]: Verifying multi-tenant isolation...');
    try {
      await ReservationService.getReservationById(userB.user.id, resv.id);
      throw new Error('SECURITY VIOLATION: User B accessed User A reservation!');
    } catch (err: any) {
      if (err.statusCode === 404 || err.code === 'RESERVATION_NOT_FOUND') {
        console.log('✅ PASS: User B forbidden from accessing User A reservation');
      } else {
        throw err;
      }
    }

    // Cleanup
    console.log('\n[Cleanup]: Cleaning up test records...');
    await prisma.reservation.deleteMany({ where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } } });
    await prisma.table.deleteMany({ where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } } });
    await prisma.customer.deleteMany({ where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [restaurantA.id, restaurantB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.user.id, userB.user.id] } } });

    console.log('\n================================================');
    console.log('🎉 ALL DAY 4 RESERVATION & CONCURRENCY TESTS PASSED!');
    console.log('================================================\n');
  } catch (error: any) {
    console.error('❌ DAY 4 TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDay4ReservationTests();
