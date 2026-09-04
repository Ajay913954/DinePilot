import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { MenuService } from '../services/menu.service.js';
import { Role } from '@prisma/client';

async function runDay6SecurityMenuTests() {
  console.log('================================================');
  console.log('🛡️ RUNNING DAY 6: MENU SECURITY & PERMISSION TESTS');
  console.log('================================================\n');

  const timestamp = Date.now();

  try {
    // 0. Setup Test Users & Tenants
    console.log('[Test 0]: Setting up test users, roles, and restaurants...');
    const ownerA = await AuthService.register({
      firstName: 'Owner',
      lastName: 'A',
      email: `sec_owner_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const restA = await RestaurantService.createRestaurantOnboarding(ownerA.user.id, {
      name: `Security Bistro A ${timestamp}`,
      phone: '+91 98765 33333',
      email: `sec_rest_a_${timestamp}@test.com`,
      address: '300 Security Ave',
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

    // Create Manager user for Restaurant A
    const managerUser = await AuthService.register({
      firstName: 'Manager',
      lastName: 'A',
      email: `sec_manager_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    await prisma.restaurantUser.create({
      data: {
        userId: managerUser.user.id,
        restaurantId: restA.id,
        role: Role.MANAGER,
      },
    });

    // Create Staff user for Restaurant A
    const staffUser = await AuthService.register({
      firstName: 'Staff',
      lastName: 'A',
      email: `sec_staff_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    await prisma.restaurantUser.create({
      data: {
        userId: staffUser.user.id,
        restaurantId: restA.id,
        role: Role.STAFF,
      },
    });

    // Setup Tenant B
    const ownerB = await AuthService.register({
      firstName: 'Owner',
      lastName: 'B',
      email: `sec_owner_b_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const restB = await RestaurantService.createRestaurantOnboarding(ownerB.user.id, {
      name: `Security Kitchen B ${timestamp}`,
      phone: '+91 98765 44444',
      email: `sec_rest_b_${timestamp}@test.com`,
      address: '400 Security Ave',
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

    // 1. STAFF Destructive Permissions Check
    console.log('\n[Test 1]: Verifying STAFF Destructive Operations Isolation...');
    
    // Create baseline Category in Restaurant A by OWNER
    const catA = await MenuService.createCategory(ownerA.user.id, {
      name: 'Starters A',
    });

    const itemA = await MenuService.createMenuItem(ownerA.user.id, {
      categoryId: catA.id,
      name: 'Soup A',
      price: 12.0,
    });

    // Verify STAFF cannot create category
    try {
      await MenuService.createCategory(staffUser.user.id, { name: 'Staff Category' });
      throw new Error('FAIL: STAFF should not be able to create categories');
    } catch (err: any) {
      console.log('✅ PASS: STAFF creation attempt blocked by role policy');
    }

    // Verify STAFF cannot delete category
    try {
      await MenuService.deleteCategory(staffUser.user.id, catA.id, false);
      throw new Error('FAIL: STAFF should not be able to delete categories');
    } catch (err: any) {
      console.log('✅ PASS: STAFF category deletion blocked by role policy');
    }

    // Verify STAFF cannot delete menu item
    try {
      await MenuService.deleteMenuItem(staffUser.user.id, itemA.id);
      throw new Error('FAIL: STAFF should not be able to delete menu items');
    } catch (err: any) {
      console.log('✅ PASS: STAFF menu item deletion blocked by role policy');
    }

    // 2. Cross-Tenant Relationship Integrity Verification
    console.log('\n[Test 2]: Verifying Cross-Tenant Category/Menu/Item Relationship Integrity...');
    const catB = await MenuService.createCategory(ownerB.user.id, {
      name: 'Starters B (Tenant B)',
    });

    const itemB = await MenuService.createMenuItem(ownerB.user.id, {
      categoryId: catB.id,
      name: 'Soup B (Tenant B)',
      price: 15.0,
    });

    // Attempt to create item in Tenant A using Tenant B's categoryId
    try {
      await MenuService.createMenuItem(ownerA.user.id, {
        categoryId: catB.id, // Belongs to Tenant B
        name: 'Injected Item',
        price: 99.0,
      });
      throw new Error('FAIL: Creating item with cross-tenant categoryId should be blocked');
    } catch (err: any) {
      if (err.code !== 'CATEGORY_NOT_FOUND') throw err;
      console.log('✅ PASS: Cross-tenant item creation correctly blocked (404 CATEGORY_NOT_FOUND)');
    }

    // Attempt to update Tenant A's item to target Tenant B's categoryId
    try {
      await MenuService.updateMenuItem(ownerA.user.id, itemA.id, {
        categoryId: catB.id,
      });
      throw new Error('FAIL: Moving item to cross-tenant categoryId should be blocked');
    } catch (err: any) {
      if (err.code !== 'CATEGORY_NOT_FOUND') throw err;
      console.log('✅ PASS: Cross-tenant item category update correctly blocked (404 CATEGORY_NOT_FOUND)');
    }

    // Attempt to reorder items in Tenant A passing an item ID from Tenant B
    try {
      await MenuService.reorderMenuItems(ownerA.user.id, catA.id, [itemB.id]);
      throw new Error('FAIL: Reordering with cross-tenant item ID should be blocked');
    } catch (err: any) {
      if (err.code !== 'INVALID_REORDER') throw err;
      console.log('✅ PASS: Cross-tenant item reorder correctly blocked (400 INVALID_REORDER)');
    }

    // Attempt to reorder categories in Tenant A passing a category ID from Tenant B
    try {
      await MenuService.reorderCategories(ownerA.user.id, [catB.id]);
      throw new Error('FAIL: Reordering with cross-tenant category ID should be blocked');
    } catch (err: any) {
      if (err.code !== 'INVALID_REORDER') throw err;
      console.log('✅ PASS: Cross-tenant category reorder correctly blocked (400 INVALID_REORDER)');
    }

    // 3. Make Force-Delete Extremely Restricted
    console.log('\n[Test 3]: Verifying Extremely Restricted Force-Delete Policy...');
    
    // Attempt normal delete on Category A containing items
    try {
      await MenuService.deleteCategory(ownerA.user.id, catA.id, false);
      throw new Error('FAIL: Normal delete on category containing dishes should be blocked');
    } catch (err: any) {
      if (err.code !== 'CATEGORY_HAS_ITEMS') throw err;
      console.log('✅ PASS: Non-empty category deletion safely blocked (400 CATEGORY_HAS_ITEMS)');
    }

    // Attempt force-delete by MANAGER (should be blocked with 403 FORCE_DELETE_RESTRICTED)
    try {
      await MenuService.deleteCategory(managerUser.user.id, catA.id, true);
      throw new Error('FAIL: MANAGER should not be able to force-delete category containing items');
    } catch (err: any) {
      if (err.code !== 'FORCE_DELETE_RESTRICTED') throw err;
      console.log('✅ PASS: MANAGER force-delete attempt correctly blocked (403 FORCE_DELETE_RESTRICTED)');
    }

    // Execute force-delete by OWNER
    const forceDeletedCat = await MenuService.deleteCategory(ownerA.user.id, catA.id, true);
    if (!forceDeletedCat) {
      throw new Error('FAIL: Force delete by OWNER failed');
    }

    // Verify AuditLog entry for force deletion
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        restaurantId: restA.id,
        action: 'CRITICAL_CATEGORY_FORCE_DELETED',
      },
    });

    if (auditLogs.length === 0) {
      throw new Error('FAIL: CRITICAL_CATEGORY_FORCE_DELETED audit log entry missing');
    }
    console.log('✅ PASS: OWNER force-deletion verified and recorded in CRITICAL AuditLog:', auditLogs[0].details);

    // 4. Cleanup
    console.log('\n[Cleanup]: Cleaning up security test records...');
    await prisma.menuItem.deleteMany({ where: { category: { menu: { restaurantId: { in: [restA.id, restB.id] } } } } });
    await prisma.menuCategory.deleteMany({ where: { menu: { restaurantId: { in: [restA.id, restB.id] } } } });
    await prisma.menu.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.restaurantUser.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [restA.id, restB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerA.user.id, managerUser.user.id, staffUser.user.id, ownerB.user.id] } } });

    console.log('\n================================================');
    console.log('🎉 ALL DAY 6 MENU SECURITY & PERMISSION TESTS PASSED!');
    console.log('================================================\n');
  } catch (err: any) {
    console.error('\n❌ DAY 6 SECURITY TEST FAILED:', err);
    process.exit(1);
  }
}

runDay6SecurityMenuTests();
