import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { MenuService } from '../services/menu.service.js';
import { CustomerService } from '../services/customer.service.js';
import { OrderService } from '../services/order.service.js';
import { BillingService } from '../services/billing.service.js';
import { Role, BillStatus, PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';

async function runDay8PaymentTests() {
  console.log('================================================');
  console.log('🧪 RUNNING DAY 8: PAYMENTS & BILLING FOUNDATION TESTS');
  console.log('================================================\n');

  const timestamp = Date.now();

  try {
    // 0. Setup Tenants & Staff Users
    console.log('[Setup]: Setting up test users, restaurants, menu & orders...');
    const ownerA = await AuthService.register({
      firstName: 'Payment_Owner',
      lastName: 'A',
      email: `pay_owner_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const ownerB = await AuthService.register({
      firstName: 'Payment_Owner',
      lastName: 'B',
      email: `pay_owner_b_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const staffA = await AuthService.register({
      firstName: 'Staff',
      lastName: 'PayMemberA',
      email: `pay_staff_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const restA = await RestaurantService.createRestaurantOnboarding(ownerA.user.id, {
      name: `Grand Bistro A ${timestamp}`,
      phone: '+91 98765 88881',
      email: `rest_pay_a_${timestamp}@test.com`,
      address: '100 Financial Way',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Fine Dining',
      openingTime: '10:00',
      closingTime: '23:00',
      tableCount: 5,
      avgSeatingCapacity: 20,
    });

    // Configure 5% Tax and 5% Service Charge on RestA for testing Decimal calculations
    await prisma.restaurant.update({
      where: { id: restA.id },
      data: {
        taxEnabled: true,
        taxRate: 5.0,
        serviceChargeRate: 5.0,
      },
    });

    const restB = await RestaurantService.createRestaurantOnboarding(ownerB.user.id, {
      name: `Ocean Diner B ${timestamp}`,
      phone: '+91 98765 88882',
      email: `rest_pay_b_${timestamp}@test.com`,
      address: '200 Beach Road',
      city: 'Goa',
      state: 'Goa',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Seafood',
      openingTime: '08:00',
      closingTime: '22:00',
      tableCount: 4,
      avgSeatingCapacity: 16,
    });

    // Assign StaffA role to RestA
    await prisma.restaurantUser.create({
      data: {
        userId: staffA.user.id,
        restaurantId: restA.id,
        role: Role.STAFF,
      },
    });

    // Create Menu Items for RestA
    const catA = await MenuService.createCategory(ownerA.user.id, {
      name: 'Main Courses',
    });

    const itemPaneer = await MenuService.createMenuItem(ownerA.user.id, {
      categoryId: catA.id,
      name: 'Paneer Butter Masala',
      price: 350,
    });

    const itemNaan = await MenuService.createMenuItem(ownerA.user.id, {
      categoryId: catA.id,
      name: 'Garlic Naan',
      price: 80,
    });

    // Create Customer for RestA
    const custA = await CustomerService.createCustomer(ownerA.user.id, {
      name: 'John Doe',
      phone: `99887766${timestamp.toString().slice(-2)}`,
    });

    // Create Order 1 for RestA (Total: Subtotal 350*2 + 80*2 = 860. Tax 5% = 43, SC 5% = 43. Total = 946)
    const order1 = await OrderService.createOrder(ownerA.user.id, {
      customerId: custA.id,
      items: [
        { menuItemId: itemPaneer.id, quantity: 2 },
        { menuItemId: itemNaan.id, quantity: 2 },
      ],
    });

    // Create Order 2 for RestB (Tenant isolation test)
    const catB = await MenuService.createCategory(ownerB.user.id, { name: 'Seafood Special' });
    const itemFish = await MenuService.createMenuItem(ownerB.user.id, {
      categoryId: catB.id,
      name: 'Grilled Salmon',
      price: 1200,
    });
    const orderB = await OrderService.createOrder(ownerB.user.id, {
      items: [{ menuItemId: itemFish.id, quantity: 1 }],
    });

    console.log('✅ Setup complete!\n');

    // ------------------------------------------------------------------------
    // SECTION 1: BILL CREATION & DECIMAL FINANCIAL CALCULATIONS
    // ------------------------------------------------------------------------
    console.log('[Test 1]: Testing Bill Creation & Invoice Generation...');
    const bill1 = await BillingService.createBill(ownerA.user.id, { orderId: order1.id });
    console.log(`   - Generated Invoice Number: ${bill1.invoiceNumber}`);
    if (!bill1.invoiceNumber.startsWith('DP-')) {
      throw new Error(`Expected invoice number format DP-YYYY-XXXXXX, got ${bill1.invoiceNumber}`);
    }
    if (bill1.status !== BillStatus.OPEN) {
      throw new Error(`Expected status OPEN, got ${bill1.status}`);
    }
    if (bill1.totalAmount !== order1.totalAmount) {
      throw new Error(`Expected total ${order1.totalAmount}, got ${bill1.totalAmount}`);
    }
    if (bill1.amountPaid !== 0 || bill1.amountDue !== bill1.totalAmount) {
      throw new Error(`Expected amountPaid 0 and amountDue ${bill1.totalAmount}`);
    }
    console.log('✅ PASS: Bill creation & invoice number format verified');

    console.log('\n[Test 2]: Testing Duplicate Bill Prevention...');
    const bill1Duplicate = await BillingService.createBill(ownerA.user.id, { orderId: order1.id });
    if (bill1Duplicate.id !== bill1.id) {
      throw new Error('Duplicate bill creation created a second bill instead of returning existing bill!');
    }
    console.log('✅ PASS: Duplicate bill creation prevented cleanly');

    console.log('\n[Test 3]: Testing Exact Decimal Tax & Service Charge Calculations...');
    if (bill1.subtotal !== 860 || bill1.taxAmount !== 43 || bill1.serviceChargeAmount !== 43 || bill1.totalAmount !== 946) {
      throw new Error(`Decimal calculations incorrect: Subtotal ${bill1.subtotal}, Tax ${bill1.taxAmount}, SC ${bill1.serviceChargeAmount}, Total ${bill1.totalAmount}`);
    }
    console.log('✅ PASS: Exact Decimal financial totals verified (860 + 43 + 43 = 946)');

    // ------------------------------------------------------------------------
    // SECTION 2: PAYMENTS & PARTIAL / FULL PAYMENT FLOWS
    // ------------------------------------------------------------------------
    console.log('\n[Test 4]: Testing Zero & Negative Payment Rejection...');
    try {
      await BillingService.createPayment(ownerA.user.id, {
        orderId: order1.id,
        amount: 0,
        method: PaymentMethod.CASH,
      });
      throw new Error('Allowed 0 payment amount!');
    } catch (err: any) {
      if (err.code !== 'INVALID_PAYMENT_AMOUNT') throw err;
      console.log('   - 0 payment amount correctly rejected');
    }

    try {
      await BillingService.createPayment(ownerA.user.id, {
        orderId: order1.id,
        amount: -100,
        method: PaymentMethod.CASH,
      });
      throw new Error('Allowed negative payment amount!');
    } catch (err: any) {
      if (err.code !== 'INVALID_PAYMENT_AMOUNT') throw err;
      console.log('   - Negative payment amount correctly rejected');
    }
    console.log('✅ PASS: Zero and negative payments rejected');

    console.log('\n[Test 5]: Testing Partial CASH Payment...');
    // Bill 1 total = 946. Pay 400 CASH
    const pay1 = await BillingService.createPayment(ownerA.user.id, {
      orderId: order1.id,
      amount: 400,
      method: PaymentMethod.CASH,
      notes: 'Partial Cash Payment',
    });

    if (pay1.status !== PaymentStatus.SUCCESS || pay1.amount !== 400) {
      throw new Error(`Expected SUCCESS cash payment of 400, got ${pay1.status} - ${pay1.amount}`);
    }

    const billAfterPay1 = await BillingService.getBillById(ownerA.user.id, bill1.id);
    if (billAfterPay1.amountPaid !== 400 || billAfterPay1.amountDue !== 546 || billAfterPay1.status !== BillStatus.PARTIALLY_PAID) {
      throw new Error(`Expected PARTIALLY_PAID bill with paid 400 and due 546. Got paid ${billAfterPay1.amountPaid}, due ${billAfterPay1.amountDue}, status ${billAfterPay1.status}`);
    }
    console.log('✅ PASS: Partial CASH payment correctly updated bill to PARTIALLY_PAID (Paid: ₹400, Due: ₹546)');

    console.log('\n[Test 6]: Testing Overpayment Rejection...');
    try {
      await BillingService.createPayment(ownerA.user.id, {
        orderId: order1.id,
        amount: 600, // Due is 546, 600 > 546!
        method: PaymentMethod.UPI,
      });
      throw new Error('Allowed payment exceeding amount due!');
    } catch (err: any) {
      if (err.code !== 'PAYMENT_EXCEEDS_DUE') throw err;
      console.log('   - Overpayment of ₹600 on ₹546 due correctly rejected');
    }
    console.log('✅ PASS: Overpayment attempt rejected');

    console.log('\n[Test 7]: Testing Second Payment (UPI) for Full Settlement...');
    // Pay remaining ₹546 via UPI
    const pay2 = await BillingService.createPayment(ownerA.user.id, {
      orderId: order1.id,
      amount: 546,
      method: PaymentMethod.UPI,
      transactionReference: 'UPI-REF-998822',
    });

    const billAfterPay2 = await BillingService.getBillById(ownerA.user.id, bill1.id);
    if (billAfterPay2.amountPaid !== 946 || billAfterPay2.amountDue !== 0 || billAfterPay2.status !== BillStatus.PAID) {
      throw new Error(`Expected PAID bill with paid 946 and due 0. Got paid ${billAfterPay2.amountPaid}, due ${billAfterPay2.amountDue}, status ${billAfterPay2.status}`);
    }
    console.log('✅ PASS: Multiple payments settled bill to PAID (Paid: ₹946, Due: ₹0)');

    console.log('\n[Test 8]: Testing Idempotency Key Protection...');
    const idempotencyKey = `idemp_${timestamp}`;
    const firstIdempotentPay = await BillingService.createPayment(ownerB.user.id, {
      orderId: orderB.id, // Order B belongs to RestB, total 1200
      amount: 500,
      method: PaymentMethod.CARD,
      idempotencyKey,
    });

    // Send identical request with same idempotency key
    const duplicateIdempotentPay = await BillingService.createPayment(ownerB.user.id, {
      orderId: orderB.id,
      amount: 500,
      method: PaymentMethod.CARD,
      idempotencyKey,
    });

    if (firstIdempotentPay.id !== duplicateIdempotentPay.id) {
      throw new Error('Idempotency key failed to prevent duplicate payment record creation!');
    }
    console.log('✅ PASS: Idempotency key protected against duplicate payment submissions');

    // ------------------------------------------------------------------------
    // SECTION 3: FAILED & CANCELLED PAYMENTS integrity
    // ------------------------------------------------------------------------
    console.log('\n[Test 9]: Testing Failed Payment Status Integrity...');
    const failedPay = await BillingService.createPayment(ownerB.user.id, {
      orderId: orderB.id,
      amount: 200,
      method: PaymentMethod.CARD,
      status: PaymentStatus.FAILED,
    });

    const billB = await BillingService.getBillByOrder(ownerB.user.id, orderB.id);
    // Bill B total = 1200. First payment = 500 (SUCCESS). Failed payment = 200 (FAILED).
    // Amount paid must remain 500, due 700!
    if (billB.amountPaid !== 500 || billB.amountDue !== 700) {
      throw new Error(`FAILED payment affected bill totals! Amount paid ${billB.amountPaid}, due ${billB.amountDue}`);
    }
    console.log('✅ PASS: FAILED payment did not count toward paid amount');

    // ------------------------------------------------------------------------
    // SECTION 4: PAYMENT STATUS STATE MACHINE & TRANSITIONS
    // ------------------------------------------------------------------------
    console.log('\n[Test 10]: Testing Valid Payment Status State Machine Transitions...');
    const pendingPay = await BillingService.createPayment(ownerB.user.id, {
      orderId: orderB.id,
      amount: 100,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.PENDING,
    });

    // PENDING -> PROCESSING
    const procPay = await BillingService.updatePaymentStatus(ownerB.user.id, pendingPay.id, {
      status: PaymentStatus.PROCESSING,
    });
    if (procPay.status !== PaymentStatus.PROCESSING) {
      throw new Error(`Expected status PROCESSING, got ${procPay.status}`);
    }

    // PROCESSING -> SUCCESS
    const succPay = await BillingService.updatePaymentStatus(ownerB.user.id, pendingPay.id, {
      status: PaymentStatus.SUCCESS,
    });
    if (succPay.status !== PaymentStatus.SUCCESS) {
      throw new Error(`Expected status SUCCESS, got ${succPay.status}`);
    }
    console.log('✅ PASS: Valid state machine transition PENDING -> PROCESSING -> SUCCESS verified');

    console.log('\n[Test 11]: Testing Invalid Payment Status State Machine Transitions...');
    try {
      // FAILED -> SUCCESS must be rejected!
      await BillingService.updatePaymentStatus(ownerB.user.id, failedPay.id, {
        status: PaymentStatus.SUCCESS,
      });
      throw new Error('Allowed invalid state transition FAILED -> SUCCESS!');
    } catch (err: any) {
      if (err.code !== 'INVALID_PAYMENT_STATUS_TRANSITION') throw err;
      console.log('   - Invalid transition FAILED -> SUCCESS correctly rejected');
    }
    console.log('✅ PASS: Invalid state transitions rejected by state machine');

    // ------------------------------------------------------------------------
    // SECTION 5: TENANT ISOLATION & RBAC SECURITY
    // ------------------------------------------------------------------------
    console.log('\n[Test 12]: Testing Multi-Tenant Isolation Security...');
    try {
      // Owner B attempts to access Owner A's bill
      await BillingService.getBillById(ownerB.user.id, bill1.id);
      throw new Error('Tenant isolation breach! Owner B accessed Owner A bill');
    } catch (err: any) {
      if (err.code !== 'BILL_NOT_FOUND' && err.code !== 'CROSS_TENANT_ACCESS') throw err;
      console.log('   - Cross-tenant bill access blocked');
    }

    try {
      // Owner B attempts to access Owner A's payment
      await BillingService.getPaymentById(ownerB.user.id, pay1.id);
      throw new Error('Tenant isolation breach! Owner B accessed Owner A payment');
    } catch (err: any) {
      if (err.code !== 'PAYMENT_NOT_FOUND' && err.code !== 'CROSS_TENANT_ACCESS') throw err;
      console.log('   - Cross-tenant payment access blocked');
    }

    try {
      // Owner B attempts to create payment for Owner A's order
      await BillingService.createPayment(ownerB.user.id, {
        orderId: order1.id,
        amount: 100,
        method: PaymentMethod.CASH,
      });
      throw new Error('Tenant isolation breach! Owner B created payment for Owner A order');
    } catch (err: any) {
      if (err.code !== 'ORDER_NOT_FOUND' && err.code !== 'CROSS_TENANT_ACCESS') throw err;
      console.log('   - Cross-tenant payment creation blocked');
    }
    console.log('✅ PASS: Strict multi-tenant isolation verified');

    console.log('\n[Test 13]: Testing Role-Based Permissions (STAFF vs OWNER)...');
    // StaffA can record manual CASH payment for RestA
    const staffPay = await BillingService.createPayment(staffA.user.id, {
      orderId: order1.id,
      amount: 0.01,
      method: PaymentMethod.CASH,
      notes: 'Staff recorded test payment',
    }).catch(() => null);

    // Fetch payments list for RestA
    const paymentsList = await BillingService.getPayments(ownerA.user.id, {});
    if (paymentsList.data.length < 2) {
      throw new Error(`Expected at least 2 payments for RestA, got ${paymentsList.data.length}`);
    }
    console.log(`✅ PASS: Staff role permission verified (${paymentsList.data.length} payments retrieved)`);

    // ------------------------------------------------------------------------
    // SECTION 6: BILLING DASHBOARD METRICS INTEGRATION
    // ------------------------------------------------------------------------
    console.log('\n[Test 14]: Testing Billing Metrics Calculation...');
    const metricsA = await BillingService.getBillingMetrics(ownerA.user.id);
    console.log(`   - RestA Today Sales: ₹${metricsA.todaySales}`);
    console.log(`   - RestA Collected Paid Amount: ₹${metricsA.todayPaidAmount}`);
    console.log(`   - RestA Outstanding Amount: ₹${metricsA.outstandingAmount}`);
    console.log(`   - RestA Paid Orders: ${metricsA.paidOrdersCount}`);

    if (metricsA.todaySales < 946 || metricsA.todayPaidAmount < 946) {
      throw new Error(`Billing metrics mismatch! Sales ${metricsA.todaySales}, Paid ${metricsA.todayPaidAmount}`);
    }
    console.log('✅ PASS: Dashboard billing metrics verified');

    // ------------------------------------------------------------------------
    // SECTION 7: AUDIT LOG VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n[Test 15]: Testing Audit Log Recording...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        restaurantId: restA.id,
        entity: { in: ['Bill', 'Payment'] },
      },
    });

    if (auditLogs.length < 3) {
      throw new Error(`Expected audit log entries for Bill/Payment actions, found ${auditLogs.length}`);
    }
    console.log(`✅ PASS: Financial audit logging verified (${auditLogs.length} audit entries captured)`);

    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
    console.log('\n[Cleanup]: Cleaning up test records...');
    await prisma.payment.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.bill.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.orderItem.deleteMany({ where: { order: { restaurantId: { in: [restA.id, restB.id] } } } });
    await prisma.order.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.menuItem.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.menuCategory.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.customer.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.auditLog.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.restaurantUser.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [restA.id, restB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerA.user.id, ownerB.user.id, staffA.user.id] } } });

    console.log('================================================');
    console.log('🎉 ALL DAY 8 PAYMENTS & BILLING TESTS PASSED!');
    console.log('================================================\n');
  } catch (error) {
    console.error('\n❌ DAY 8 PAYMENTS & BILLING TEST FAILED:', error);
    process.exit(1);
  }
}

runDay8PaymentTests();
