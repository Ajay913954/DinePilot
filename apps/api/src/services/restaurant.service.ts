import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { RestaurantOnboardingInputSchema, RestaurantUpdateInput } from '@dinepilot/validation';
import { Role } from '@prisma/client';

export class RestaurantService {
  /**
   * Create restaurant & assign OWNER role to user
   */
  static async createRestaurantOnboarding(userId: string, input: RestaurantOnboardingInputSchema) {
    // Check if user already owns a restaurant
    const existingRelationship = await prisma.restaurantUser.findFirst({
      where: { userId },
      include: { restaurant: true },
    });

    if (existingRelationship) {
      return existingRelationship.restaurant;
    }

    // Generate unique slug
    let baseSlug = input.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!baseSlug) baseSlug = 'restaurant';

    let slug = baseSlug;
    let count = 1;
    while (await prisma.restaurant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: input.name.trim(),
          slug,
          phone: input.phone.trim(),
          email: input.email.toLowerCase().trim(),
          address: input.address.trim(),
          city: input.city.trim(),
          state: input.state.trim(),
          country: input.country.trim(),
          timezone: input.timezone.trim(),
          cuisineType: input.cuisineType.trim(),
          openingTime: input.openingTime || '09:00',
          closingTime: input.closingTime || '22:00',
          tableCount: input.tableCount || 10,
          avgSeatingCapacity: input.avgSeatingCapacity || 40,
        },
      });

      await tx.restaurantUser.create({
        data: {
          userId,
          restaurantId: restaurant.id,
          role: Role.OWNER,
        },
      });

      return restaurant;
    });

    return result;
  }

  /**
   * Fetch all restaurants associated with a user
   */
  static async getUserRestaurants(userId: string) {
    const memberships = await prisma.restaurantUser.findMany({
      where: { userId },
      include: {
        restaurant: true,
      },
    });

    return memberships.map((m) => ({
      ...m.restaurant,
      role: m.role,
    }));
  }

  /**
   * Verify whether a user has permission to access a specific restaurant
   */
  static async requireRestaurantAccess(userId: string, restaurantId: string) {
    const membership = await prisma.restaurantUser.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    });

    if (!membership) {
      throw new AppError('Forbidden. You do not have access to this restaurant.', 403, 'FORBIDDEN');
    }

    return membership;
  }

  /**
   * Fetch authenticated user's active restaurant
   */
  static async getUserRestaurant(userId: string) {
    const restaurantUser = await prisma.restaurantUser.findFirst({
      where: { userId },
      include: {
        restaurant: true,
      },
    });

    if (!restaurantUser) {
      return null;
    }

    return {
      ...restaurantUser.restaurant,
      role: restaurantUser.role,
    };
  }

  /**
   * Update active restaurant settings
   */
  static async updateRestaurant(userId: string, input: RestaurantUpdateInput) {
    const restaurantUser = await prisma.restaurantUser.findFirst({
      where: { userId, role: Role.OWNER },
    });

    if (!restaurantUser) {
      throw new AppError('Restaurant not found or unauthorized to edit settings.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurantUser.restaurantId },
      data: {
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email.toLowerCase().trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        country: input.country.trim(),
        timezone: input.timezone.trim(),
        cuisineType: input.cuisineType.trim(),
      },
    });

    return updated;
  }

  /**
   * Fetch public restaurant details by slug (unauthenticated route)
   */
  static async getBySlug(slug: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        state: true,
        country: true,
        timezone: true,
        cuisineType: true,
        openingTime: true,
        closingTime: true,
      },
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found.', 404, 'RESTAURANT_NOT_FOUND');
    }

    return restaurant;
  }
}
