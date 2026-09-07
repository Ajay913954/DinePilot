import { prisma } from '../lib/prisma.js';

export class OrderNumberService {
  /**
   * Generates a unique, human-friendly order number for a given restaurant (e.g. ORD-000001)
   */
  static async generateOrderNumber(restaurantId: string): Promise<string> {
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Find latest order for restaurant
      const latestOrder = await prisma.order.findFirst({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
        select: { orderNumber: true },
      });

      let nextIndex = 1;
      if (latestOrder && latestOrder.orderNumber) {
        const match = latestOrder.orderNumber.match(/ORD-(\d+)/i);
        if (match && match[1]) {
          nextIndex = parseInt(match[1], 10) + 1;
        } else {
          // Fallback if formatting was different
          const count = await prisma.order.count({ where: { restaurantId } });
          nextIndex = count + 1;
        }
      }

      // Add attempt offset if retrying due to concurrent race condition
      const candidateIndex = nextIndex + attempt;
      const formattedNumber = `ORD-${String(candidateIndex).padStart(6, '0')}`;

      // Check if candidate already exists
      const existing = await prisma.order.findUnique({
        where: {
          restaurantId_orderNumber: {
            restaurantId,
            orderNumber: formattedNumber,
          },
        },
      });

      if (!existing) {
        return formattedNumber;
      }
    }

    // High concurrency fallback using timestamp suffix
    const timestampSuffix = Date.now().toString().slice(-6);
    return `ORD-${timestampSuffix}`;
  }
}
