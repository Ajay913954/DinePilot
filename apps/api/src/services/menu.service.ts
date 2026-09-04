import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { RestaurantService } from './restaurant.service.js';
import { Prisma } from '@prisma/client';
import {
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  MenuItemQueryInput,
} from '@dinepilot/validation';
import { MenuStats, PublicMenu, MenuItem as MenuItemType } from '@dinepilot/types';

export class MenuService {
  /**
   * Helper to ensure restaurant has a primary Menu container
   */
  static async getOrCreateRestaurantMenu(restaurantId: string) {
    let menu = await prisma.menu.findUnique({
      where: { restaurantId },
    });

    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          restaurantId,
          name: 'Main Menu',
          isActive: true,
        },
      });
    }

    return menu;
  }

  /**
   * Fetch all Categories for restaurant
   */
  static async getCategories(userId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const menu = await this.getOrCreateRestaurantMenu(restaurant.id);

    const categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId: restaurant.id,
        menuId: menu.id,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      menuId: c.menuId,
      restaurantId: c.restaurantId,
      name: c.name,
      description: c.description,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      itemCount: c._count.items,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Create new Menu Category
   */
  static async createCategory(userId: string, input: CreateMenuCategoryInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const menu = await this.getOrCreateRestaurantMenu(restaurant.id);

    // Check duplicate category name
    const existing = await prisma.menuCategory.findUnique({
      where: {
        menuId_name: {
          menuId: menu.id,
          name: input.name.trim(),
        },
      },
    });

    if (existing) {
      throw new AppError(`Category '${input.name}' already exists in your menu.`, 409, 'DUPLICATE_CATEGORY');
    }

    // Determine max displayOrder
    const maxOrder = await prisma.menuCategory.aggregate({
      where: { menuId: menu.id },
      _max: { displayOrder: true },
    });

    const displayOrder =
      input.displayOrder !== undefined
        ? input.displayOrder
        : maxOrder._max.displayOrder !== null
        ? maxOrder._max.displayOrder + 1
        : 0;

    const category = await prisma.menuCategory.create({
      data: {
        menuId: menu.id,
        restaurantId: restaurant.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        displayOrder,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: 'MENU_CATEGORY_CREATED',
        entity: 'MenuCategory',
        entityId: category.id,
        details: `Created menu category '${category.name}'`,
      },
    });

    return category;
  }

  /**
   * Update Menu Category
   */
  static async updateCategory(userId: string, categoryId: string, input: UpdateMenuCategoryInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existing = await prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId: restaurant.id },
    });

    if (!existing) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    if (input.name && input.name.trim() !== existing.name) {
      const conflict = await prisma.menuCategory.findUnique({
        where: {
          menuId_name: {
            menuId: existing.menuId,
            name: input.name.trim(),
          },
        },
      });
      if (conflict && conflict.id !== categoryId) {
        throw new AppError(`Category '${input.name}' already exists.`, 409, 'DUPLICATE_CATEGORY');
      }
    }

    const updated = await prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    return updated;
  }

  /**
   * Delete Category safely
   */
  static async deleteCategory(userId: string, categoryId: string, force: boolean = false) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId: restaurant.id },
      include: { _count: { select: { items: true } } },
    });

    if (!category) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    if (category._count.items > 0 && !force) {
      throw new AppError(
        `Category '${category.name}' contains ${category._count.items} menu items. Delete or move items before removing category.`,
        400,
        'CATEGORY_HAS_ITEMS'
      );
    }

    const deleted = await prisma.menuCategory.delete({
      where: { id: categoryId },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: 'MENU_CATEGORY_DELETED',
        entity: 'MenuCategory',
        entityId: categoryId,
        details: `Deleted menu category '${category.name}'`,
      },
    });

    return deleted;
  }

  /**
   * Reorder Categories transactionally
   */
  static async reorderCategories(userId: string, categoryIds: string[]) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existingCategories = await prisma.menuCategory.findMany({
      where: {
        restaurantId: restaurant.id,
        id: { in: categoryIds },
      },
    });

    if (existingCategories.length !== categoryIds.length) {
      throw new AppError('One or more categories do not belong to this restaurant.', 400, 'INVALID_REORDER');
    }

    return await prisma.$transaction(
      categoryIds.map((id, index) =>
        prisma.menuCategory.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );
  }

  /**
   * Fetch Menu Items with filters
   */
  static async getMenuItems(userId: string, query: MenuItemQueryInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const where: any = {
      restaurantId: restaurant.id,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isAvailable !== undefined) {
      where.isAvailable = query.isAvailable;
    }

    if (query.isVegetarian !== undefined) {
      where.isVegetarian = query.isVegetarian;
    }

    if (query.isVegan !== undefined) {
      where.isVegan = query.isVegan;
    }

    if (query.isSpicy !== undefined) {
      where.isSpicy = query.isSpicy;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: [{ categoryId: 'asc' }, { displayOrder: 'asc' }],
    });

    return items.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      menuId: item.menuId,
      restaurantId: item.restaurantId,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isSpicy: item.isSpicy,
      preparationTimeMinutes: item.preparationTimeMinutes,
      displayOrder: item.displayOrder,
      categoryName: item.category.name,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  /**
   * Get Single Menu Item by ID
   */
  static async getMenuItemById(userId: string, itemId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: restaurant.id },
      include: { category: { select: { name: true } } },
    });

    if (!item) {
      throw new AppError('Menu item not found.', 404, 'MENU_ITEM_NOT_FOUND');
    }

    return {
      id: item.id,
      categoryId: item.categoryId,
      menuId: item.menuId,
      restaurantId: item.restaurantId,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isSpicy: item.isSpicy,
      preparationTimeMinutes: item.preparationTimeMinutes,
      displayOrder: item.displayOrder,
      categoryName: item.category.name,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  /**
   * Create Menu Item with Decimal price precision
   */
  static async createMenuItem(userId: string, input: CreateMenuItemInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    // Verify category ownership
    const category = await prisma.menuCategory.findFirst({
      where: { id: input.categoryId, restaurantId: restaurant.id },
    });

    if (!category) {
      throw new AppError('Category does not exist in this restaurant.', 404, 'CATEGORY_NOT_FOUND');
    }

    const maxOrder = await prisma.menuItem.aggregate({
      where: { categoryId: input.categoryId },
      _max: { displayOrder: true },
    });

    const displayOrder =
      input.displayOrder !== undefined
        ? input.displayOrder
        : maxOrder._max.displayOrder !== null
        ? maxOrder._max.displayOrder + 1
        : 0;

    const item = await prisma.menuItem.create({
      data: {
        categoryId: input.categoryId,
        menuId: category.menuId,
        restaurantId: restaurant.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        price: new Prisma.Decimal(input.price),
        imageUrl: input.imageUrl?.trim() || null,
        isAvailable: input.isAvailable !== undefined ? input.isAvailable : true,
        isActive: input.isActive !== undefined ? input.isActive : true,
        isVegetarian: input.isVegetarian || false,
        isVegan: input.isVegan || false,
        isSpicy: input.isSpicy || false,
        preparationTimeMinutes: input.preparationTimeMinutes || null,
        displayOrder,
      },
      include: {
        category: { select: { name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: 'MENU_ITEM_CREATED',
        entity: 'MenuItem',
        entityId: item.id,
        details: `Created menu item '${item.name}' (₹${item.price})`,
      },
    });

    return {
      id: item.id,
      categoryId: item.categoryId,
      menuId: item.menuId,
      restaurantId: item.restaurantId,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isSpicy: item.isSpicy,
      preparationTimeMinutes: item.preparationTimeMinutes,
      displayOrder: item.displayOrder,
      categoryName: item.category.name,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  /**
   * Update Menu Item
   */
  static async updateMenuItem(userId: string, itemId: string, input: UpdateMenuItemInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: restaurant.id },
    });

    if (!existing) {
      throw new AppError('Menu item not found.', 404, 'MENU_ITEM_NOT_FOUND');
    }

    if (input.categoryId && input.categoryId !== existing.categoryId) {
      const category = await prisma.menuCategory.findFirst({
        where: { id: input.categoryId, restaurantId: restaurant.id },
      });
      if (!category) {
        throw new AppError('Target category not found.', 404, 'CATEGORY_NOT_FOUND');
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.name && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.price !== undefined && { price: new Prisma.Decimal(input.price) }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl?.trim() || null }),
        ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.isVegetarian !== undefined && { isVegetarian: input.isVegetarian }),
        ...(input.isVegan !== undefined && { isVegan: input.isVegan }),
        ...(input.isSpicy !== undefined && { isSpicy: input.isSpicy }),
        ...(input.preparationTimeMinutes !== undefined && { preparationTimeMinutes: input.preparationTimeMinutes }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      },
      include: {
        category: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      categoryId: updated.categoryId,
      menuId: updated.menuId,
      restaurantId: updated.restaurantId,
      name: updated.name,
      description: updated.description,
      price: Number(updated.price),
      imageUrl: updated.imageUrl,
      isAvailable: updated.isAvailable,
      isActive: updated.isActive,
      isVegetarian: updated.isVegetarian,
      isVegan: updated.isVegan,
      isSpicy: updated.isSpicy,
      preparationTimeMinutes: updated.preparationTimeMinutes,
      displayOrder: updated.displayOrder,
      categoryName: updated.category.name,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Toggle Dish Operational Availability
   */
  static async toggleItemAvailability(userId: string, itemId: string, isAvailable: boolean) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: restaurant.id },
    });

    if (!existing) {
      throw new AppError('Menu item not found.', 404, 'MENU_ITEM_NOT_FOUND');
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });

    return {
      id: updated.id,
      isAvailable: updated.isAvailable,
      isActive: updated.isActive,
    };
  }

  /**
   * Delete Menu Item
   */
  static async deleteMenuItem(userId: string, itemId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: restaurant.id },
    });

    if (!existing) {
      throw new AppError('Menu item not found.', 404, 'MENU_ITEM_NOT_FOUND');
    }

    const deleted = await prisma.menuItem.delete({
      where: { id: itemId },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: 'MENU_ITEM_DELETED',
        entity: 'MenuItem',
        entityId: itemId,
        details: `Deleted menu item '${existing.name}'`,
      },
    });

    return deleted;
  }

  /**
   * Reorder Menu Items in a Category
   */
  static async reorderMenuItems(userId: string, categoryId: string, itemIds: string[]) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId: restaurant.id },
    });

    if (!category) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    const existingItems = await prisma.menuItem.findMany({
      where: {
        categoryId,
        restaurantId: restaurant.id,
        id: { in: itemIds },
      },
    });

    if (existingItems.length !== itemIds.length) {
      throw new AppError('One or more menu items do not belong to this category.', 400, 'INVALID_REORDER');
    }

    return await prisma.$transaction(
      itemIds.map((id, index) =>
        prisma.menuItem.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );
  }

  /**
   * Sanitized Public Menu Contract by Slug (/r/:slug/menu)
   */
  static async getPublicMenuBySlug(slug: string): Promise<PublicMenu> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        slug: true,
        cuisineType: true,
      },
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const menu = await prisma.menu.findFirst({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
      },
    });

    if (!menu) {
      return {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          cuisineType: restaurant.cuisineType,
        },
        categories: [],
      };
    }

    const categories = await prisma.menuCategory.findMany({
      where: {
        menuId: menu.id,
        restaurantId: restaurant.id,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          where: {
            isActive: true,
            isAvailable: true,
          },
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isAvailable: true,
            isVegetarian: true,
            isVegan: true,
            isSpicy: true,
            preparationTimeMinutes: true,
          },
        },
      },
    });

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        cuisineType: restaurant.cuisineType,
      },
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        items: cat.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable,
          isVegetarian: item.isVegetarian,
          isVegan: item.isVegan,
          isSpicy: item.isSpicy,
          preparationTimeMinutes: item.preparationTimeMinutes,
        })),
      })),
    };
  }

  /**
   * Real PostgreSQL Menu Dashboard Metrics
   */
  static async getDashboardMenuMetrics(restaurantId: string): Promise<MenuStats> {
    const [totalCategories, totalItems, availableItems, vegetarianItems] = await Promise.all([
      prisma.menuCategory.count({ where: { restaurantId, isActive: true } }),
      prisma.menuItem.count({ where: { restaurantId, isActive: true } }),
      prisma.menuItem.count({ where: { restaurantId, isActive: true, isAvailable: true } }),
      prisma.menuItem.count({ where: { restaurantId, isActive: true, isVegetarian: true } }),
    ]);

    return {
      totalCategories,
      totalItems,
      availableItems,
      unavailableItems: totalItems - availableItems,
      vegetarianItems,
    };
  }
}
