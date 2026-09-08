import { prisma } from '../lib/prisma.js';

export class InvoiceNumberService {
  /**
   * Generates a unique, transaction-safe invoice number for a given restaurant (e.g. DP-2026-000001)
   */
  static async generateInvoiceNumber(restaurantId: string, tx?: any): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `DP-${currentYear}-`;

    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Find highest/latest invoice number for restaurant in current year
      const latestBill = await db.bill.findFirst({
        where: {
          restaurantId,
          invoiceNumber: { startsWith: prefix },
        },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      let nextIndex = 1;
      if (latestBill && latestBill.invoiceNumber) {
        const match = latestBill.invoiceNumber.match(/DP-\d+-(\d+)/i);
        if (match && match[1]) {
          nextIndex = parseInt(match[1], 10) + 1;
        } else {
          const count = await db.bill.count({ where: { restaurantId } });
          nextIndex = count + 1;
        }
      } else {
        const count = await db.bill.count({ where: { restaurantId } });
        nextIndex = count + 1;
      }

      const candidateIndex = nextIndex + attempt;
      const formattedInvoice = `${prefix}${String(candidateIndex).padStart(6, '0')}`;

      const existing = await db.bill.findUnique({
        where: {
          restaurantId_invoiceNumber: {
            restaurantId,
            invoiceNumber: formattedInvoice,
          },
        },
      });

      if (!existing) {
        return formattedInvoice;
      }
    }

    // High concurrency fallback using timestamp suffix
    const timestampSuffix = Date.now().toString().slice(-6);
    return `${prefix}${timestampSuffix}`;
  }
}
