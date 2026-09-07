import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service.js';
import { sendSuccess } from '../utils/response.js';
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  addOrderItemSchema,
  updateOrderItemSchema,
  cancelOrderSchema,
  orderQuerySchema,
} from '@dinepilot/validation';

export class OrderController {
  /**
   * GET /api/orders
   */
  static getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = orderQuerySchema.parse(req.query);
      const result = await OrderService.getOrders(req.user!.id, query);
      return sendSuccess(res, result, 'Orders fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders/stats
   */
  static getOrderDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await OrderService.getOrderDashboardStats(req.user!.id);
      return sendSuccess(res, stats, 'Order metrics fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders/:id
   */
  static getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await OrderService.getOrderById(req.user!.id, req.params.id as string);
      return sendSuccess(res, order, 'Order fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders
   */
  static createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createOrderSchema.parse(req.body);
      const order = await OrderService.createOrder(req.user!.id, body);
      return sendSuccess(res, order, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/orders/:id
   */
  static updateOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateOrderSchema.parse(req.body);
      const order = await OrderService.updateOrder(req.user!.id, req.params.id as string, body);
      return sendSuccess(res, order, 'Order updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/orders/:id/status
   */
  static updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateOrderStatusSchema.parse(req.body);
      const order = await OrderService.updateOrderStatus(req.user!.id, req.params.id as string, body);
      return sendSuccess(res, order, `Order status updated to '${order.status}'`);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/items
   */
  static addOrderItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = addOrderItemSchema.parse(req.body);
      const order = await OrderService.addOrderItem(req.user!.id, req.params.id as string, body);
      return sendSuccess(res, order, 'Item added to order successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/orders/:id/items/:itemId
   */
  static updateOrderItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateOrderItemSchema.parse(req.body);
      const order = await OrderService.updateOrderItem(
        req.user!.id,
        req.params.id as string,
        req.params.itemId as string,
        body
      );
      return sendSuccess(res, order, 'Order item updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/orders/:id/items/:itemId
   */
  static removeOrderItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await OrderService.removeOrderItem(
        req.user!.id,
        req.params.id as string,
        req.params.itemId as string
      );
      return sendSuccess(res, order, 'Item removed from order successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/cancel
   */
  static cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = cancelOrderSchema.parse(req.body);
      const order = await OrderService.cancelOrder(req.user!.id, req.params.id as string, body);
      return sendSuccess(res, order, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  };
}
