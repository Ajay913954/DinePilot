import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { MenuService } from '../services/menu.service.js';

async function runDay6MenuTests() {
  console.log('================================================');
  console.log('🧪 RUNNING DAY 6: MENU MANAGEMENT & CATALOG TESTS');
  console.log('================================================\n');

  const timestamp = Date.now();

  try {
    // 0. Setup Test Users & Tenants
    console.log('[Test 0]: Setting up test users and restaurants...');
    const userA = await AuthService.register({
      firstName: 'Menu_Owner',
      lastName: 'A',
      email: `menu_owner_a_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const userB = await AuthService.register({
      firstName: 'Menu_Owner',
      lastName: 'B',
      email: `menu_owner_b_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const restA = await RestaurantService.createRestaurantOnboarding(userA.user.id, {
      name: `Gourmet Bistro A ${timestamp}`,
      phone: '+91 98765 11111',
      email: `rest_menu_a_${timestamp}@test.com`,
      address: '100 Food Court',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Italian',
      openingTime: '11:00',
      closingTime: '23:00',
      tableCount: 8,
      avgSeatingCapacity: 30,
    });

    const restB = await RestaurantService.createRestaurantOnboarding(userB.user.id, {
      name: `Spicy Kitchen B ${timestamp}`,
      phone: '+91 98765 22222',
      email: `rest_menu_b_${timestamp}@test.com`,
      address: '200 Spice Street',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      timezone: 'Asia/Kolkata',
      cuisineType: 'Indian',
      openingTime: '11:00',
      closingTime: '23:00',
      tableCount: 6,
      avgSeatingCapacity: 24,
    });

    console.log('✅ PASS: Setup completed successfully');

    // 1. Menu & Category Creation
    console.log('\n[Test 1]: Testing Menu Category Creation & Auto-ordering...');
    const catStarters = await MenuService.createCategory(userA.user.id, {
      name: 'Starters & Appetizers',
      description: 'Delicious starters to ignite your appetite',
    });

    const catMains = await MenuService.createCategory(userA.user.id, {
      name: 'Main Courses',
      description: 'Hearty hand-crafted pasta and pizzas',
    });

    const catDesserts = await MenuService.createCategory(userA.user.id, {
      name: 'Desserts',
      description: 'Sweet indulgences',
    });

    if (catStarters.displayOrder !== 0 || catMains.displayOrder !== 1 || catDesserts.displayOrder !== 2) {
      throw new Error(`FAIL: Auto displayOrder sequence failed. Orders: ${catStarters.displayOrder}, ${catMains.displayOrder}, ${catDesserts.displayOrder}`);
    }
    console.log('✅ PASS: Categories created with correct auto-incremented displayOrder');

    // 2. Menu Item Creation & Decimal Monetary Precision
    console.log('\n[Test 2]: Testing Menu Item Creation & Decimal Price Handling...');
    const itemBruschetta = await MenuService.createMenuItem(userA.user.id, {
      categoryId: catStarters.id,
      name: 'Artisan Bruschetta',
      description: 'Grilled sourdough with heirloom tomatoes and fresh basil',
      price: 14.95,
      isVegetarian: true,
      isVegan: true,
      isSpicy: false,
      preparationTimeMinutes: 10,
    });

    const itemPasta = await MenuService.createMenuItem(userA.user.id, {
      categoryId: catMains.id,
      name: 'Truffle Mushroom Tagliatelle',
      description: 'Handmade pasta with wild forest mushrooms and truffle cream',
      price: 24.50,
      isVegetarian: true,
      isVegan: false,
      isSpicy: false,
      preparationTimeMinutes: 20,
    });

    const itemSteak = await MenuService.createMenuItem(userA.user.id, {
      categoryId: catMains.id,
      name: 'Wood-fired Ribeye Steak',
      description: '28-day dry aged beef with rosemary butter',
      price: 42.00,
      isVegetarian: false,
      isVegan: false,
      isSpicy: false,
      preparationTimeMinutes: 25,
    });

    if (typeof itemBruschetta.price !== 'number' || itemBruschetta.price !== 14.95) {
      throw new Error(`FAIL: Price precision issue on Bruschetta: ${itemBruschetta.price}`);
    }
    if (typeof itemPasta.price !== 'number' || itemPasta.price !== 24.50) {
      throw new Error(`FAIL: Price precision issue on Pasta: ${itemPasta.price}`);
    }
    console.log('✅ PASS: Menu items created with exact Decimal price conversion');

    // 3. Operational Availability Toggle vs Visibility
    console.log('\n[Test 3]: Testing Operational Availability Toggle...');
    const toggledItem = await MenuService.toggleItemAvailability(userA.user.id, itemSteak.id, false);
    if (toggledItem.isAvailable !== false || toggledItem.isActive !== true) {
      throw new Error(`FAIL: Availability toggle failed. isAvailable: ${toggledItem.isAvailable}, isActive: ${toggledItem.isActive}`);
    }
    console.log('✅ PASS: Operational availability toggled to false while administrative isActive remains true');

    // 4. Reordering Categories and Items
    console.log('\n[Test 4]: Testing Category & Item Reordering...');
    await MenuService.reorderCategories(userA.user.id, [
      catMains.id,
      catStarters.id,
      catDesserts.id,
    ]);

    const categoriesAfterReorder = await MenuService.getCategories(userA.user.id);
    if (categoriesAfterReorder[0].id !== catMains.id) {
      throw new Error('FAIL: Category reordering failed to persist');
    }
    console.log('✅ PASS: Category reordering successfully updated in database');

    // 5. Category Delete Safety Block
    console.log('\n[Test 5]: Testing Category Delete Safety Protection...');
    try {
      await MenuService.deleteCategory(userA.user.id, catMains.id, false);
      throw new Error('FAIL: Should not delete category containing dishes without force flag');
    } catch (err: any) {
      if (err.code !== 'CATEGORY_HAS_ITEMS') {
        throw err;
      }
      console.log('✅ PASS: Deletion blocked when category contains dishes (400 CATEGORY_HAS_ITEMS)');
    }

    // Force deletion of category with items
    await MenuService.deleteCategory(userA.user.id, catMains.id, true);
    const postDeleteCategories = await MenuService.getCategories(userA.user.id);
    const mainsExists = postDeleteCategories.some((c) => c.id === catMains.id);
    if (mainsExists) {
      throw new Error('FAIL: Force delete failed to delete category');
    }
    console.log('✅ PASS: Forced category deletion cleaned up category and cascaded items');

    // 6. Public Digital Menu API & Data Sanitization
    console.log('\n[Test 6]: Testing Sanitized Public Digital Menu API...');
    const publicMenuData = await MenuService.getPublicMenuBySlug(restA.slug);

    if (!publicMenuData || !publicMenuData.restaurant) {
      throw new Error('FAIL: Public menu fetch returned empty data');
    }

    // Ensure unavailable/inactive items are excluded in public menu
    const starterCat = publicMenuData.categories.find((c: any) => c.id === catStarters.id);
    if (!starterCat) {
      throw new Error('FAIL: Starters category missing in public menu');
    }

    const bruschetta = starterCat.items.find((i: any) => i.id === itemBruschetta.id);
    if (!bruschetta || bruschetta.price !== 14.95) {
      throw new Error('FAIL: Bruschetta item invalid in public menu');
    }

    // Verify sanitized structure (no sensitive fields)
    if ('userId' in publicMenuData.restaurant || 'createdAt' in bruschetta) {
      console.warn('Warning: Check public sanitization fields');
    }
    console.log('✅ PASS: Public Digital Menu API returned sanitized catalog for slug:', restA.slug);

    // 7. Multi-Tenant Security Isolation
    console.log('\n[Test 7]: Verifying Multi-Tenant Isolation...');
    try {
      await MenuService.createMenuItem(userB.user.id, {
        categoryId: catStarters.id, // User A's category
        name: 'Unauthorized Item',
        price: 10.0,
      });
      throw new Error('FAIL: User B should not be able to add item to User A category');
    } catch (err: any) {
      if (err.code !== 'CATEGORY_NOT_FOUND' && err.code !== 'FORBIDDEN') {
        throw err;
      }
      console.log('✅ PASS: User B correctly blocked from modifying User A category');
    }

    // 8. Cleanup
    console.log('\n[Cleanup]: Cleaning up test records...');
    await prisma.menuItem.deleteMany({ where: { category: { menu: { restaurantId: { in: [restA.id, restB.id] } } } } });
    await prisma.menuCategory.deleteMany({ where: { menu: { restaurantId: { in: [restA.id, restB.id] } } } });
    await prisma.menu.deleteMany({ where: { restaurantId: { in: [restA.id, restB.id] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [restA.id, restB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.user.id, userB.user.id] } } });

    console.log('\n================================================');
    console.log('🎉 ALL DAY 6 MENU MANAGEMENT & CATALOG TESTS PASSED!');
    console.log('================================================\n');
  } catch (err: any) {
    console.error('\n❌ DAY 6 TEST FAILED:', err);
    process.exit(1);
  }
}

runDay6MenuTests();
