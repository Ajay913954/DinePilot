import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { MenuService } from '../services/menu.service.js';
import { CustomerService } from '../services/customer.service.js';
import { TableService } from '../services/table.service.js';
import { ReservationService } from '../services/reservation.service.js';
import { OrderService } from '../services/order.service.js';
import { OrderNumberService } from '../services/order-number.service.js';
import { Role, OrderStatus, OrderSource } from '@prisma/client';

async function runDay7OrderTests() {
  console.log('================================================');
  console.log('🧪 RUNNING DAY 7: ORDERS & ORDER MANAGEMENT TESTS');
  console.log('================================================\n');

  const timestamp = Date.now();

  try {
    // 0. Setup Tenants & Staff Users
    console.log('[Setup]: Setting up test users, restaurants, tables & menu...');
    const userA = await AuthService.register({
      firstName: 'Order_Owner',
      lastName: 'A',
      email: `order_owner_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const userB = await AuthService.register({
      firstName: 'Order_Owner',
      lastName: 'B',
      email: `order_owner_b_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const staffA = await AuthService.register({
      firstName: 'Staff',
      lastName: 'MemberA',
      email: `staff_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const restA = await RestaurantService.createRestaurantOnboarding(userA.user.id, {
      name: `Grand Palace Rest A ${timestamp}`,
      phone: '+91 98765 33333',
      email: `rest_order_a_${timestamp}@test.com`,
      address: '100 Royalty Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'North Indian',
      openingTime: '10:00',
      closingTime: '23:00',
      tableCount: 5,
      avgSeatingCapacity: 20,
    });

    const restB = await RestaurantService.createRestaurantOnboarding(userB.user.id, {
      name: `Cafe Breeze Rest B ${timestamp}`,
      phone: '+91 98765 44444',
      email: `rest_order_b_${timestamp}@test.com`,
      address: '200 Ocean View',
      city: 'Goa',
      state: 'Goa',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Continental',
      openingTime: '08:00',
      closingTime: '22:00',
      tableCount: 4,
      avgSeatingCapacity: 16,
    });

    // Add StaffA to RestA
    await prisma.restaurantUser.create({
      data: {
        userId: staffA.user.id,
        restaurantId: restA.id,
        role: Role.STAFF,
      },
    });

    // Create Tables for RestA & RestB
    const tableA1 = await TableService.createTable(userA.user.id, {
      tableNumber: 'T1',
      capacity: 4,
      location: 'INDOOR',
    });

    const tableB1 = await TableService.createTable(userB.user.id, {
      tableNumber: 'TB1',
      capacity: 2,
      location: 'OUTDOOR',
    });

    // Create Customers for RestA & RestB
    const customerA = await CustomerService.createCustomer(userA.user.id, {
      name: 'Rahul Sharma',
      phone: '+91 98111 22222',
      email: 'rahul@test.com',
      isVip: true,
    });

    const customerB = await CustomerService.createCustomer(userB.user.id, {
      name: 'Priya Singh',
      phone: '+91 98333 44444',
      email: 'priya@test.com',
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDateStr = tomorrow.toISOString().split('T')[0];

    // Create Reservation for RestA
    const reservationA = await ReservationService.createReservation(userA.user.id, {
      date: futureDateStr,
      startTime: '19:00',
      guestCount: 4,
      customerName: 'Rahul Sharma',
      customerPhone: '+91 98111 22222',
      tableId: tableA1.id,
      customerId: customerA.id,
    });

    // Create Menu Items for RestA
    const categoryA = await MenuService.createCategory(userA.user.id, {
      name: 'Main Course',
    });

    const itemPaneer = await MenuService.createMenuItem(userA.user.id, {
      categoryId: categoryA.id,
      name: 'Paneer Tikka',
      price: 349,
      isAvailable: true,
      isActive: true,
    });

    const itemButterChicken = await MenuService.createMenuItem(userA.user.id, {
      categoryId: categoryA.id,
      name: 'Butter Chicken',
      price: 449,
      isAvailable: true,
      isActive: true,
    });

    const itemNaan = await MenuService.createMenuItem(userA.user.id, {
      categoryId: categoryA.id,
      name: 'Butter Naan',
      price: 99,
      isAvailable: true,
      isActive: true,
    });

    const itemUnavailable = await MenuService.createMenuItem(userA.user.id, {
      categoryId: categoryA.id,
      name: 'Special Biryani',
      price: 599,
      isAvailable: false,
      isActive: true,
    });

    const itemInactive = await MenuService.createMenuItem(userA.user.id, {
      categoryId: categoryA.id,
      name: 'Seasonal Juice',
      price: 150,
      isAvailable: true,
      isActive: false,
    });

    // Create Menu Item for RestB
    const categoryB = await MenuService.createCategory(userB.user.id, {
      name: 'Beverages',
    });

    const itemRestB = await MenuService.createMenuItem(userB.user.id, {
      categoryId: categoryB.id,
      name: 'Espresso',
      price: 199,
    });

    console.log('✅ PASS: Setup completed successfully');

    // 1. Order Creation & Snapshot Pricing Test
    console.log('\n[Test 1]: Testing Order Creation, Snapshot Pricing & Decimal Totals...');
    const order1 = await OrderService.createOrder(userA.user.id, {
      customerId: customerA.id,
      tableId: tableA1.id,
      reservationId: reservationA.id,
      source: 'DASHBOARD',
      notes: 'Customer prefers medium spicy',
      items: [
        { menuItemId: itemPaneer.id, quantity: 2, notes: 'Extra mint chutney' }, // 349 * 2 = 698
        { menuItemId: itemButterChicken.id, quantity: 1 }, // 449 * 1 = 449
        { menuItemId: itemNaan.id, quantity: 2 }, // 99 * 2 = 198
      ],
    });

    // Subtotal: 698 + 449 + 198 = 1345
    if (order1.subtotal !== 1345 || order1.totalAmount !== 1345) {
      throw new Error(`Expected total 1345, got subtotal=${order1.subtotal}, total=${order1.totalAmount}`);
    }

    if (order1.items[0].itemNameSnapshot !== 'Paneer Tikka' || order1.items[0].unitPriceSnapshot !== 349) {
      throw new Error('Price snapshot mismatch on order item');
    }

    console.log(`✅ PASS: Order #${order1.orderNumber} created with correct Decimal total ₹${order1.totalAmount}`);

    // 2. Historical Price Invariance Test (Critical Business Requirement)
    console.log('\n[Test 2]: Testing Menu Price Invariance (Menu price change after order creation)...');
    await MenuService.updateMenuItem(userA.user.id, itemPaneer.id, {
      price: 399, // Raised from 349 to 399
    });

    const fetchedOrder1 = await OrderService.getOrderById(userA.user.id, order1.id);
    if (fetchedOrder1.subtotal !== 1345 || fetchedOrder1.items[0].unitPriceSnapshot !== 349) {
      throw new Error(`Historical price corrupted! Expected ₹349, got ₹${fetchedOrder1.items[0].unitPriceSnapshot}`);
    }
    console.log('✅ PASS: Historical order totals remained strictly unchanged after menu price modification');

    // 3. Unavailable & Inactive Menu Item Rejection
    console.log('\n[Test 3]: Testing Unavailable & Inactive Item Rejection...');
    try {
      await OrderService.createOrder(userA.user.id, {
        items: [{ menuItemId: itemUnavailable.id, quantity: 1 }],
      });
      throw new Error('Should have rejected unavailable item');
    } catch (err: any) {
      if (err.code !== 'ITEM_UNAVAILABLE') throw err;
      console.log('  - Blocked ordering unavailable menu item (ITEM_UNAVAILABLE)');
    }

    try {
      await OrderService.createOrder(userA.user.id, {
        items: [{ menuItemId: itemInactive.id, quantity: 1 }],
      });
      throw new Error('Should have rejected inactive item');
    } catch (err: any) {
      if (err.code !== 'ITEM_INACTIVE') throw err;
      console.log('  - Blocked ordering inactive menu item (ITEM_INACTIVE)');
    }
    console.log('✅ PASS: Unavailable and inactive items safely rejected');

    // 4. Cross-tenant Security Boundary Enforcement
    console.log('\n[Test 4]: Testing Cross-Tenant Security Boundaries...');
    // User A trying to order User B's menu item
    try {
      await OrderService.createOrder(userA.user.id, {
        items: [{ menuItemId: itemRestB.id, quantity: 1 }],
      });
      throw new Error('Should have rejected cross-tenant menu item');
    } catch (err: any) {
      if (err.code !== 'INVALID_MENU_ITEM') throw err;
      console.log('  - Blocked cross-tenant menu item order attempt');
    }

    // User A trying to link User B's table
    try {
      await OrderService.createOrder(userA.user.id, {
        tableId: tableB1.id,
        items: [{ menuItemId: itemPaneer.id, quantity: 1 }],
      });
      throw new Error('Should have rejected cross-tenant table linkage');
    } catch (err: any) {
      if (err.code !== 'INVALID_TABLE') throw err;
      console.log('  - Blocked cross-tenant table linkage attempt');
    }

    // User A trying to link User B's customer
    try {
      await OrderService.createOrder(userA.user.id, {
        customerId: customerB.id,
        items: [{ menuItemId: itemPaneer.id, quantity: 1 }],
      });
      throw new Error('Should have rejected cross-tenant customer linkage');
    } catch (err: any) {
      if (err.code !== 'INVALID_CUSTOMER') throw err;
      console.log('  - Blocked cross-tenant customer linkage attempt');
    }
    console.log('✅ PASS: Strict multi-tenant isolation enforced on all entity relationships');

    // 5. Order Status Lifecycle State Engine Validation
    console.log('\n[Test 5]: Testing Order Status Transition Engine...');
    // Current status: PLACED
    const orderPlaced = await OrderService.getOrderById(userA.user.id, order1.id);
    if (orderPlaced.status !== OrderStatus.PLACED) throw new Error('Expected PLACED status');

    // Transition: PLACED -> CONFIRMED
    const orderConfirmed = await OrderService.updateOrderStatus(userA.user.id, order1.id, {
      status: OrderStatus.CONFIRMED,
    });
    if (orderConfirmed.status !== OrderStatus.CONFIRMED || !orderConfirmed.confirmedAt) {
      throw new Error('Expected CONFIRMED status with confirmedAt timestamp');
    }

    // Transition: CONFIRMED -> PREPARING
    const orderPreparing = await OrderService.updateOrderStatus(userA.user.id, order1.id, {
      status: OrderStatus.PREPARING,
    });
    if (orderPreparing.status !== OrderStatus.PREPARING || !orderPreparing.preparingAt) {
      throw new Error('Expected PREPARING status');
    }

    // Transition: PREPARING -> READY
    const orderReady = await OrderService.updateOrderStatus(userA.user.id, order1.id, {
      status: OrderStatus.READY,
    });
    if (orderReady.status !== OrderStatus.READY || !orderReady.readyAt) {
      throw new Error('Expected READY status');
    }

    // Transition: READY -> SERVED
    const orderServed = await OrderService.updateOrderStatus(userA.user.id, order1.id, {
      status: OrderStatus.SERVED,
    });
    if (orderServed.status !== OrderStatus.SERVED || !orderServed.servedAt) {
      throw new Error('Expected SERVED status');
    }

    // Transition: SERVED -> COMPLETED
    const orderCompleted = await OrderService.updateOrderStatus(userA.user.id, order1.id, {
      status: OrderStatus.COMPLETED,
    });
    if (orderCompleted.status !== OrderStatus.COMPLETED || !orderCompleted.completedAt) {
      throw new Error('Expected COMPLETED status');
    }

    console.log('✅ PASS: Full status lifecycle (PLACED -> CONFIRMED -> PREPARING -> READY -> SERVED -> COMPLETED) executed cleanly');

    // 6. Invalid Transition Rejection
    console.log('\n[Test 6]: Testing Invalid Status Transition Rejections...');
    // Attempting COMPLETED -> PREPARING
    try {
      await OrderService.updateOrderStatus(userA.user.id, order1.id, {
        status: OrderStatus.PREPARING,
      });
      throw new Error('Should have rejected transition from COMPLETED');
    } catch (err: any) {
      if (err.code !== 'ORDER_FINALIZED') throw err;
      console.log('  - Blocked status jump from COMPLETED (ORDER_FINALIZED)');
    }

    // Create a draft order and try jumping DRAFT -> COMPLETED
    const draftOrder = await OrderService.createOrder(userA.user.id, {
      items: [{ menuItemId: itemNaan.id, quantity: 1 }],
    });
    try {
      await OrderService.updateOrderStatus(userA.user.id, draftOrder.id, {
        status: OrderStatus.COMPLETED,
      });
      throw new Error('Should have rejected DRAFT -> COMPLETED');
    } catch (err: any) {
      if (err.code !== 'INVALID_STATUS_TRANSITION') throw err;
      console.log('  - Blocked illegal status jump DRAFT -> COMPLETED');
    }
    console.log('✅ PASS: Invalid status transitions safely blocked');

    // 7. Completed Order Immutability Test
    console.log('\n[Test 7]: Testing Completed Order Immutability...');
    try {
      await OrderService.addOrderItem(userA.user.id, order1.id, {
        menuItemId: itemNaan.id,
        quantity: 1,
      });
      throw new Error('Should have rejected adding item to completed order');
    } catch (err: any) {
      if (err.code !== 'ORDER_FINALIZED') throw err;
      console.log('  - Blocked adding item to completed order (ORDER_FINALIZED)');
    }

    try {
      await OrderService.updateOrder(userA.user.id, order1.id, {
        discountAmount: 100,
      });
      throw new Error('Should have rejected modifying discount on completed order');
    } catch (err: any) {
      if (err.code !== 'ORDER_FINALIZED') throw err;
      console.log('  - Blocked modifying discount on completed order (ORDER_FINALIZED)');
    }
    console.log('✅ PASS: Completed orders are completely immutable against unauthorized alterations');

    // 8. Order Cancellation & Exclusion from Customer Spend
    console.log('\n[Test 8]: Testing Order Cancellation & Customer Spend Exclusion...');
    // Create an order for Customer A and cancel it
    const orderToCancel = await OrderService.createOrder(userA.user.id, {
      customerId: customerA.id,
      items: [{ menuItemId: itemButterChicken.id, quantity: 2 }], // 449 * 2 = 898
    });

    const cancelledOrder = await OrderService.cancelOrder(userA.user.id, orderToCancel.id, {
      reason: 'Customer cancelled due to emergency',
    });

    if (cancelledOrder.status !== OrderStatus.CANCELLED || !cancelledOrder.cancelledAt) {
      throw new Error('Expected CANCELLED status');
    }

    // Check Customer A Profile Stats
    const customerProfile = await CustomerService.getCustomerById(userA.user.id, customerA.id);
    if (customerProfile.stats.completedOrders !== 1 || customerProfile.stats.totalOrderValue !== 1345) {
      throw new Error(
        `Cancelled order included in spend! Expected 1 completed order (₹1345), got completedOrders=${customerProfile.stats.completedOrders}, totalOrderValue=${customerProfile.stats.totalOrderValue}`
      );
    }
    console.log(`✅ PASS: Order #${cancelledOrder.orderNumber} cancelled cleanly and strictly excluded from customer spend (Total Spend: ₹${customerProfile.stats.totalOrderValue})`);

    // 9. STAFF Role Permission Tests
    console.log('\n[Test 9]: Testing Role Permissions (STAFF vs OWNER/MANAGER)...');
    // Staff creates order
    const staffOrder = await OrderService.createOrder(staffA.user.id, {
      items: [{ menuItemId: itemPaneer.id, quantity: 1 }],
    });

    // Staff tries to apply manual discount -> Blocked
    try {
      await OrderService.updateOrder(staffA.user.id, staffOrder.id, {
        discountAmount: 50,
      });
      throw new Error('STAFF should not be allowed to apply manual discounts');
    } catch (err: any) {
      if (err.code !== 'DISCOUNT_RESTRICTED') throw err;
      console.log('  - Blocked STAFF manual discount application (DISCOUNT_RESTRICTED)');
    }
    console.log('✅ PASS: Role authorization rules enforced for operational vs administrative actions');

    // 10. Server-side Order Search, Filter & Metrics Tests
    console.log('\n[Test 10]: Testing Server-Side Order Search, Filtering & Metrics...');
    const searchResult = await OrderService.getOrders(userA.user.id, {
      search: order1.orderNumber,
    });
    if (searchResult.data.length !== 1 || searchResult.data[0].id !== order1.id) {
      throw new Error('Search by order number failed');
    }

    const dashboardMetrics = await OrderService.getOrderDashboardStats(userA.user.id);
    if (dashboardMetrics.completedOrdersCount < 1) {
      throw new Error('Dashboard metrics missing completed order count');
    }
    console.log(`✅ PASS: Server-side search & metrics verified (Today Gross Value: ₹${dashboardMetrics.todayOrderValue}, Active Orders: ${dashboardMetrics.activeOrdersCount})`);

    // 11. Audit Log Verification
    console.log('\n[Test 11]: Testing Audit Log Recording...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { restaurantId: restA.id, entity: 'Order' },
    });
    if (auditLogs.length < 4) {
      throw new Error(`Expected at least 4 order audit logs, found ${auditLogs.length}`);
    }
    console.log(`✅ PASS: Audit log recording verified (${auditLogs.length} audit entries captured)`);

    // Cleanup
    console.log('\n[Cleanup]: Cleaning up test records...');
    await prisma.orderItem.deleteMany({
      where: { order: { restaurantId: { in: [restA.id, restB.id] } } },
    });
    await prisma.order.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.reservation.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.menuItem.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.menuCategory.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.customer.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.table.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.auditLog.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.restaurantUser.deleteMany({
      where: { restaurantId: { in: [restA.id, restB.id] } },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restA.id, restB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.user.id, userB.user.id, staffA.user.id] } },
    });

    console.log('\n================================================');
    console.log('🎉 ALL DAY 7 ORDER & FINANCIAL TESTS PASSED!');
    console.log('================================================\n');
  } catch (error) {
    console.error('\n❌ DAY 7 ORDER TEST FAILED:', error);
    process.exit(1);
  }
}

runDay7OrderTests();
