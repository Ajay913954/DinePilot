import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { RestaurantService } from './restaurant.service.js';
import { normalizePhone } from '../utils/phone.utils.js';
import { ReservationStatus } from '@prisma/client';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  MergeCustomerInput,
  CustomerQueryInput,
} from '@dinepilot/validation';
import { CustomerClassification, CustomerProfile, CustomerStats, CustomerListItem } from '@dinepilot/types';

const INACTIVE_THRESHOLD_DAYS = 90;

export class CustomerService {
  /**
   * Helper to compute customer classification
   */
  static calculateClassification(
    isVip: boolean,
    completedCount: number,
    lastVisitDate: Date | null
  ): CustomerClassification {
    if (isVip) return 'VIP';
    if (completedCount === 0) return 'NEW';

    if (lastVisitDate) {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastVisitDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > INACTIVE_THRESHOLD_DAYS) {
        return 'INACTIVE';
      }
    }

    return 'RETURNING';
  }

  /**
   * Helper to compute full stats for a customer
   */
  static calculateCustomerStats(reservations: any[]): CustomerStats {
    const totalReservations = reservations.length;
    const completedReservations = reservations.filter((r) => r.status === ReservationStatus.COMPLETED);
    const completedVisits = completedReservations.length;
    
    const now = new Date();
    const upcomingReservations = reservations.filter(
      (r) =>
        (r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.PENDING) &&
        new Date(r.reservationDate) >= now
    ).length;

    const cancelledReservations = reservations.filter((r) => r.status === ReservationStatus.CANCELLED).length;
    const noShows = reservations.filter((r) => r.status === ReservationStatus.NO_SHOW).length;

    // Last Visit: latest completed reservation date
    const sortedCompleted = [...completedReservations].sort(
      (a, b) => new Date(b.reservationDate).getTime() - new Date(a.reservationDate).getTime()
    );
    const lastVisit = sortedCompleted.length > 0 ? sortedCompleted[0].reservationDate.toISOString() : null;

    // Next Visit: earliest upcoming reservation date
    const sortedUpcoming = reservations
      .filter(
        (r) =>
          (r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.PENDING) &&
          new Date(r.reservationDate) >= now
      )
      .sort((a, b) => new Date(a.reservationDate).getTime() - new Date(b.reservationDate).getTime());
    const nextVisit = sortedUpcoming.length > 0 ? sortedUpcoming[0].reservationDate.toISOString() : null;

    // Average party size across completed reservations (or all if 0 completed)
    const partySource = completedVisits > 0 ? completedReservations : reservations;
    const totalGuests = partySource.reduce((sum, r) => sum + r.guestCount, 0);
    const avgPartySize = partySource.length > 0 ? Math.round((totalGuests / partySource.length) * 10) / 10 : 0;

    return {
      totalReservations,
      completedVisits,
      upcomingReservations,
      cancelledReservations,
      noShows,
      lastVisit,
      nextVisit,
      avgPartySize,
    };
  }

  /**
   * List customers with pagination, search, classification filters, & tags
   */
  static async getCustomers(userId: string, query: CustomerQueryInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      restaurantId: restaurant.id,
    };

    if (query.isVip !== undefined) {
      where.isVip = query.isVip;
    }

    if (query.tagId) {
      where.tags = {
        some: {
          tagId: query.tagId,
        },
      };
    }

    if (query.search) {
      const search = query.search.trim();
      const normalizedSearchPhone = normalizePhone(search);
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { phone: { contains: normalizedSearchPhone } },
      ];
    }

    // Fetch matching customers with reservations & tags for classification
    const customers = await prisma.customer.findMany({
      where,
      include: {
        reservations: {
          select: {
            id: true,
            reservationDate: true,
            status: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Map customers to item representations and compute classifications
    const items: CustomerListItem[] = customers.map((c) => {
      const completed = c.reservations.filter((r) => r.status === ReservationStatus.COMPLETED);
      const completedCount = completed.length;
      const sortedCompleted = [...completed].sort(
        (a, b) => new Date(b.reservationDate).getTime() - new Date(a.reservationDate).getTime()
      );
      const lastVisitDate = sortedCompleted.length > 0 ? new Date(sortedCompleted[0].reservationDate) : null;
      
      const now = new Date();
      const upcomingCount = c.reservations.filter(
        (r) =>
          (r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.PENDING) &&
          new Date(r.reservationDate) >= now
      ).length;

      const classification = this.calculateClassification(c.isVip, completedCount, lastVisitDate);

      return {
        id: c.id,
        restaurantId: c.restaurantId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        isVip: c.isVip,
        classification,
        visitsCount: completedCount,
        lastVisit: lastVisitDate ? lastVisitDate.toISOString() : null,
        upcomingCount,
        tags: c.tags.map((t) => ({
          id: t.tag.id,
          name: t.tag.name,
          createdAt: t.tag.createdAt.toISOString(),
        })),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    // Filter by classification if requested
    let filteredItems = items;
    if (query.classification) {
      filteredItems = items.filter((item) => item.classification === query.classification);
    }

    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    return {
      customers: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single Customer Profile by ID
   */
  static async getCustomerById(userId: string, customerId: string): Promise<CustomerProfile> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        restaurantId: restaurant.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        reservations: {
          include: {
            table: true,
          },
          orderBy: [{ reservationDate: 'desc' }, { startTime: 'desc' }],
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const stats = this.calculateCustomerStats(customer.reservations);
    const lastVisitDate = stats.lastVisit ? new Date(stats.lastVisit) : null;
    const classification = this.calculateClassification(customer.isVip, stats.completedVisits, lastVisitDate);

    return {
      id: customer.id,
      restaurantId: customer.restaurantId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.toISOString() : null,
      notes: customer.notes,
      isVip: customer.isVip,
      preferredSeating: customer.preferredSeating,
      dietaryPreference: customer.dietaryPreference,
      specialOccasion: customer.specialOccasion,
      classification,
      tags: customer.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        createdAt: t.tag.createdAt.toISOString(),
      })),
      stats,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  /**
   * Get Customer Reservation History
   */
  static async getCustomerReservations(userId: string, customerId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    // Verify ownership
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, restaurantId: restaurant.id },
    });

    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const reservations = await prisma.reservation.findMany({
      where: { customerId, restaurantId: restaurant.id },
      include: { table: true },
      orderBy: [{ reservationDate: 'desc' }, { startTime: 'desc' }],
    });

    return reservations;
  }

  /**
   * Create a new Customer
   */
  static async createCustomer(userId: string, input: CreateCustomerInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const normalized = normalizePhone(input.phone);

    // Check for existing customer with same phone in tenant
    const existing = await prisma.customer.findUnique({
      where: {
        restaurantId_phone: {
          restaurantId: restaurant.id,
          phone: normalized,
        },
      },
    });

    if (existing) {
      throw new AppError(
        `Customer with phone number ${normalized} already exists in this restaurant.`,
        409,
        'DUPLICATE_CUSTOMER'
      );
    }

    const customer = await prisma.customer.create({
      data: {
        restaurantId: restaurant.id,
        name: input.name.trim(),
        phone: normalized,
        email: input.email?.trim() || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        notes: input.notes?.trim() || null,
        isVip: input.isVip || false,
        preferredSeating: input.preferredSeating?.trim() || null,
        dietaryPreference: input.dietaryPreference?.trim() || null,
        specialOccasion: input.specialOccasion?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: 'CUSTOMER_CREATED',
        entity: 'Customer',
        entityId: customer.id,
        details: `Created customer profile for ${customer.name} (${customer.phone})`,
      },
    });

    return customer;
  }

  /**
   * Update Customer details
   */
  static async updateCustomer(userId: string, customerId: string, input: UpdateCustomerInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existing = await prisma.customer.findFirst({
      where: { id: customerId, restaurantId: restaurant.id },
    });

    if (!existing) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    let phone = existing.phone;
    if (input.phone) {
      phone = normalizePhone(input.phone);
      if (phone !== existing.phone) {
        const phoneConflict = await prisma.customer.findUnique({
          where: {
            restaurantId_phone: {
              restaurantId: restaurant.id,
              phone,
            },
          },
        });
        if (phoneConflict && phoneConflict.id !== customerId) {
          throw new AppError(
            `Another customer with phone number ${phone} already exists.`,
            409,
            'DUPLICATE_CUSTOMER'
          );
        }
      }
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(phone !== existing.phone && { phone }),
        ...(input.email !== undefined && { email: input.email?.trim() || null }),
        ...(input.dateOfBirth !== undefined && {
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
        ...(input.isVip !== undefined && { isVip: input.isVip }),
        ...(input.preferredSeating !== undefined && { preferredSeating: input.preferredSeating?.trim() || null }),
        ...(input.dietaryPreference !== undefined && { dietaryPreference: input.dietaryPreference?.trim() || null }),
        ...(input.specialOccasion !== undefined && { specialOccasion: input.specialOccasion?.trim() || null }),
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: 'CUSTOMER_UPDATED',
        entity: 'Customer',
        entityId: customerId,
        details: `Updated customer profile for ${updated.name}`,
      },
    });

    return updated;
  }

  /**
   * Safe Customer Delete / Archive
   */
  static async deleteCustomer(userId: string, customerId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existing = await prisma.customer.findFirst({
      where: { id: customerId, restaurantId: restaurant.id },
      include: { reservations: true },
    });

    if (!existing) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx) => {
      // Unlink customerId from reservations to preserve reservation history safely
      await tx.reservation.updateMany({
        where: { customerId },
        data: { customerId: null },
      });

      // Delete customer tag assignments
      await tx.customerTagAssignment.deleteMany({
        where: { customerId },
      });

      // Delete customer record
      const deleted = await tx.customer.delete({
        where: { id: customerId },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'CUSTOMER_DELETED',
          entity: 'Customer',
          entityId: customerId,
          details: `Deleted customer ${existing.name} (${existing.phone})`,
        },
      });

      return deleted;
    });
  }

  /**
   * Safe Transactional Customer Merge
   */
  static async mergeCustomers(userId: string, payload: MergeCustomerInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const { primaryCustomerId, secondaryCustomerId } = payload;
    if (primaryCustomerId === secondaryCustomerId) {
      throw new AppError('Primary and secondary customer cannot be the same account.', 400, 'INVALID_MERGE');
    }

    const [primary, secondary] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: primaryCustomerId, restaurantId: restaurant.id },
        include: { tags: true },
      }),
      prisma.customer.findFirst({
        where: { id: secondaryCustomerId, restaurantId: restaurant.id },
        include: { tags: true },
      }),
    ]);

    if (!primary || !secondary) {
      throw new AppError('One or both customers were not found in this restaurant.', 404, 'CUSTOMER_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Reassign all reservations from secondary to primary
      await tx.reservation.updateMany({
        where: { customerId: secondaryCustomerId },
        data: { customerId: primaryCustomerId },
      });

      // 2. Reassign tags from secondary to primary
      const primaryTagIds = new Set(primary.tags.map((t) => t.tagId));
      for (const secTag of secondary.tags) {
        if (!primaryTagIds.has(secTag.tagId)) {
          await tx.customerTagAssignment.create({
            data: {
              customerId: primaryCustomerId,
              tagId: secTag.tagId,
            },
          });
        }
      }

      // 3. Combine internal notes
      let combinedNotes = primary.notes || '';
      if (secondary.notes) {
        combinedNotes = combinedNotes
          ? `${combinedNotes}\n[Merged Note]: ${secondary.notes}`
          : `[Merged Note]: ${secondary.notes}`;
      }

      // 4. Update primary customer properties (VIP flag, notes, email/DOB if missing)
      const updatedPrimary = await tx.customer.update({
        where: { id: primaryCustomerId },
        data: {
          isVip: primary.isVip || secondary.isVip,
          notes: combinedNotes || null,
          email: primary.email || secondary.email,
          dateOfBirth: primary.dateOfBirth || secondary.dateOfBirth,
          preferredSeating: primary.preferredSeating || secondary.preferredSeating,
          dietaryPreference: primary.dietaryPreference || secondary.dietaryPreference,
          specialOccasion: primary.specialOccasion || secondary.specialOccasion,
        },
      });

      // 5. Remove tag assignments & delete secondary customer
      await tx.customerTagAssignment.deleteMany({
        where: { customerId: secondaryCustomerId },
      });

      await tx.customer.delete({
        where: { id: secondaryCustomerId },
      });

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'CUSTOMER_MERGED',
          entity: 'Customer',
          entityId: primaryCustomerId,
          details: `Merged customer ${secondary.name} (${secondary.phone}) into ${primary.name} (${primary.phone})`,
        },
      });

      return updatedPrimary;
    });
  }

  /**
   * Add Tag to Customer
   */
  static async addTagToCustomer(userId: string, customerId: string, tagName: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const cleanTagName = tagName.trim();
    if (!cleanTagName) {
      throw new AppError('Tag name cannot be empty.', 400, 'INVALID_TAG');
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, restaurantId: restaurant.id },
    });

    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Upsert CustomerTag for restaurant
    const tag = await prisma.customerTag.upsert({
      where: {
        restaurantId_name: {
          restaurantId: restaurant.id,
          name: cleanTagName,
        },
      },
      create: {
        restaurantId: restaurant.id,
        name: cleanTagName,
      },
      update: {},
    });

    // Create assignment if not existing
    await prisma.customerTagAssignment.upsert({
      where: {
        customerId_tagId: {
          customerId,
          tagId: tag.id,
        },
      },
      create: {
        customerId,
        tagId: tag.id,
      },
      update: {},
    });

    return tag;
  }

  /**
   * Remove Tag from Customer
   */
  static async removeTagFromCustomer(userId: string, customerId: string, tagId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const assignment = await prisma.customerTagAssignment.findUnique({
      where: {
        customerId_tagId: {
          customerId,
          tagId,
        },
      },
    });

    if (assignment) {
      await prisma.customerTagAssignment.delete({
        where: {
          customerId_tagId: {
            customerId,
            tagId,
          },
        },
      });
    }

    return { success: true };
  }

  /**
   * Real PostgreSQL Customer Overview Metrics for Dashboard
   */
  static async getDashboardCustomerMetrics(restaurantId: string) {
    const allCustomers = await prisma.customer.findMany({
      where: { restaurantId },
      include: {
        reservations: {
          select: { status: true },
        },
      },
    });

    const totalCustomers = allCustomers.length;
    const vipCustomers = allCustomers.filter((c) => c.isVip).length;

    let newCustomers = 0;
    let returningCustomers = 0;

    allCustomers.forEach((c) => {
      const completedCount = c.reservations.filter((r) => r.status === ReservationStatus.COMPLETED).length;
      if (completedCount === 0) {
        newCustomers++;
      } else if (completedCount > 1) {
        returningCustomers++;
      }
    });

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      vipCustomers,
    };
  }
}
