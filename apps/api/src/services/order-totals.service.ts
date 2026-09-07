import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

export interface OrderItemCalculationInput {
  unitPriceSnapshot: Prisma.Decimal | number | string;
  quantity: number;
}

export interface RestaurantTaxConfig {
  taxEnabled?: boolean;
  taxRate?: Prisma.Decimal | number | null;
  serviceChargeRate?: Prisma.Decimal | number | null;
}

export interface CalculatedOrderTotals {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  serviceChargeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
}

export class OrderTotalsService {
  /**
   * Calculate exact Decimal order totals
   */
  static calculateOrderTotals(
    items: OrderItemCalculationInput[],
    discountInput: number = 0,
    config: RestaurantTaxConfig = {}
  ): CalculatedOrderTotals {
    let subtotalDecimal = new Prisma.Decimal(0);

    for (const item of items) {
      const price = new Prisma.Decimal(item.unitPriceSnapshot.toString());
      const qty = new Prisma.Decimal(item.quantity);
      if (qty.lessThanOrEqualTo(0)) {
        throw new AppError('Item quantity must be a positive integer.', 400, 'INVALID_QUANTITY');
      }
      const lineTotal = price.mul(qty);
      subtotalDecimal = subtotalDecimal.add(lineTotal);
    }

    // Discount validation
    const requestedDiscount = new Prisma.Decimal(discountInput.toString());
    if (requestedDiscount.lessThan(0)) {
      throw new AppError('Discount amount cannot be negative.', 400, 'INVALID_DISCOUNT');
    }

    if (requestedDiscount.greaterThan(subtotalDecimal)) {
      throw new AppError(
        `Discount (₹${requestedDiscount.toFixed(2)}) cannot exceed subtotal (₹${subtotalDecimal.toFixed(2)}).`,
        400,
        'DISCOUNT_EXCEEDS_SUBTOTAL'
      );
    }

    const discountAmountDecimal = requestedDiscount;
    const netBase = subtotalDecimal.sub(discountAmountDecimal);

    // Tax calculation
    let taxAmountDecimal = new Prisma.Decimal(0);
    if (config.taxEnabled && config.taxRate) {
      const rate = new Prisma.Decimal(config.taxRate.toString());
      if (rate.greaterThan(0)) {
        taxAmountDecimal = netBase.mul(rate).div(100);
      }
    }

    // Service charge calculation
    let serviceChargeAmountDecimal = new Prisma.Decimal(0);
    if (config.serviceChargeRate) {
      const rate = new Prisma.Decimal(config.serviceChargeRate.toString());
      if (rate.greaterThan(0)) {
        serviceChargeAmountDecimal = netBase.mul(rate).div(100);
      }
    }

    // Rounding to 2 decimal places using standard financial rounding
    const round2 = (val: Prisma.Decimal) => new Prisma.Decimal(val.toFixed(2));

    const finalSubtotal = round2(subtotalDecimal);
    const finalDiscount = round2(discountAmountDecimal);
    const finalTax = round2(taxAmountDecimal);
    const finalServiceCharge = round2(serviceChargeAmountDecimal);
    const finalTotal = round2(finalSubtotal.sub(finalDiscount).add(finalTax).add(finalServiceCharge));

    return {
      subtotal: finalSubtotal,
      discountAmount: finalDiscount,
      taxAmount: finalTax,
      serviceChargeAmount: finalServiceCharge,
      totalAmount: finalTotal,
    };
  }
}
