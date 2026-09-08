import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service.js';
import { sendSuccess } from '../utils/response.js';
import {
  createBillSchema,
  createPaymentSchema,
  updatePaymentStatusSchema,
  billQuerySchema,
  paymentQuerySchema,
} from '@dinepilot/validation';

export class BillingController {
  /**
   * GET /api/bills
   */
  static getBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = billQuerySchema.parse(req.query);
      const result = await BillingService.getBills(req.user!.id, query);
      return sendSuccess(res, result, 'Bills fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/bills/metrics
   */
  static getBillingMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await BillingService.getBillingMetrics(req.user!.id);
      return sendSuccess(res, metrics, 'Billing metrics fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/bills/order/:orderId
   */
  static getBillByOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bill = await BillingService.getBillByOrder(req.user!.id, req.params.orderId as string);
      return sendSuccess(res, bill, 'Order bill fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/bills/:id
   */
  static getBillById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bill = await BillingService.getBillById(req.user!.id, req.params.id as string);
      return sendSuccess(res, bill, 'Bill details fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/bills
   */
  static createBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createBillSchema.parse(req.body);
      const bill = await BillingService.createBill(req.user!.id, body);
      return sendSuccess(res, bill, 'Bill generated successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/payments
   */
  static getPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = paymentQuerySchema.parse(req.query);
      const result = await BillingService.getPayments(req.user!.id, query);
      return sendSuccess(res, result, 'Payments fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/payments/order/:orderId
   */
  static getOrderPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await BillingService.getOrderPayments(req.user!.id, req.params.orderId as string);
      return sendSuccess(res, payments, 'Order payments fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/payments/:id
   */
  static getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await BillingService.getPaymentById(req.user!.id, req.params.id as string);
      return sendSuccess(res, payment, 'Payment details fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/payments
   */
  static createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createPaymentSchema.parse(req.body);
      const payment = await BillingService.createPayment(req.user!.id, body);
      return sendSuccess(res, payment, 'Payment recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/payments/:id/status
   */
  static updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updatePaymentStatusSchema.parse(req.body);
      const payment = await BillingService.updatePaymentStatus(req.user!.id, req.params.id as string, body);
      return sendSuccess(res, payment, 'Payment status updated successfully');
    } catch (error) {
      next(error);
    }
  };
}
