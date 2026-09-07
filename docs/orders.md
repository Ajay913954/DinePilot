# DinePilot — Day 7 Order Management System Specification

## Overview

The **Order Management System** forms the central operational and financial engine of DinePilot SaaS. It connects Customers, Tables, Reservations, and Menu Items into a unified Order lifecycle with snapshot pricing, strict Decimal money handling, status transition state machine validation, multi-tenant security isolation, role-based authorization, and real-time customer spend integration.

---

## Architecture Diagram

```text
Customer (Optional)
       ↓
Table / Reservation (Optional)
       ↓
Menu Catalog Items
       ↓
Order & OrderItems (Price Snapshots)
       ↓
Order Status Lifecycle (PLACED → CONFIRMED → PREPARING → READY → SERVED → COMPLETED)
       ↓
Bill Calculation (Subtotal, Discount, Tax, Service Charge, Total)
       ↓
Customer CRM Spend Aggregation (Completed Orders Only)
       ↓
Future Payment Module Linkage
```

---

## 1. Data Models (Prisma)

### Order
- **id**: UUID string `@id`
- **restaurantId**: Foreign key to `Restaurant`
- **customerId**: Optional foreign key to `Customer`
- **reservationId**: Optional foreign key to `Reservation`
- **tableId**: Optional foreign key to `Table`
- **orderNumber**: Server-generated human-friendly string (e.g. `ORD-000001`), unique per restaurant
- **status**: `OrderStatus` enum (`DRAFT`, `PLACED`, `CONFIRMED`, `PREPARING`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`)
- **source**: `OrderSource` enum (`DASHBOARD`, `WEBSITE`, `QR`, `WHATSAPP`, `AI`, `PHONE`, `OTHER`)
- **notes**: Optional string
- **subtotal**: Decimal (10, 2)
- **discountAmount**: Decimal (10, 2)
- **taxAmount**: Decimal (10, 2)
- **serviceChargeAmount**: Decimal (10, 2)
- **totalAmount**: Decimal (10, 2)
- **completedAt**, **confirmedAt**, **preparingAt**, **readyAt**, **servedAt**, **cancelledAt**: Nullable timestamps
- **createdAt**, **updatedAt**: Timestamps

### OrderItem
- **id**: UUID string `@id`
- **orderId**: Foreign key to `Order` (Cascade)
- **menuItemId**: Foreign key to `MenuItem` (Restrict)
- **itemNameSnapshot**: String (persisted item name at time of ordering)
- **unitPriceSnapshot**: Decimal (10, 2) (persisted unit price at time of ordering)
- **quantity**: Positive integer
- **lineTotal**: Decimal (10, 2)
- **notes**: Optional item preparation note

---

## 2. Snapshot Pricing & Financial Integrity

When a menu item is added to an order, the server retrieves the current `MenuItem` from the database and writes:
- `itemNameSnapshot = MenuItem.name`
- `unitPriceSnapshot = MenuItem.price`
- `lineTotal = unitPriceSnapshot * quantity`

> **Key Invariance Principle**: If a restaurant manager updates a menu item price tomorrow (e.g. from ₹349 to ₹399), all existing historical orders retain their original ₹349 price snapshot and subtotal, preserving accounting and audit accuracy.

All monetary calculations use `Prisma.Decimal` arithmetic to avoid floating-point inaccuracies.

### Formula
```text
subtotal = Sum(OrderItem.lineTotal)
netBase = subtotal - discountAmount
taxAmount = taxEnabled ? netBase * (taxRate / 100) : 0
serviceChargeAmount = netBase * (serviceChargeRate / 100)
totalAmount = subtotal - discountAmount + taxAmount + serviceChargeAmount
```

---

## 3. Order Status Lifecycle State Engine

Order status transitions are strictly governed by `OrderStatusService`:

```text
DRAFT
 ├── PLACED
 └── CANCELLED

PLACED
 ├── CONFIRMED
 └── CANCELLED

CONFIRMED
 ├── PREPARING
 └── CANCELLED

PREPARING
 ├── READY
 └── CANCELLED (OWNER / MANAGER only)

READY
 └── SERVED

SERVED
 └── COMPLETED
```

- Invalid jumps (e.g., `DRAFT → COMPLETED`, `COMPLETED → PREPARING`, `CANCELLED → CONFIRMED`) are rejected with `400 AppError ('INVALID_STATUS_TRANSITION')`.
- Finalized orders (`COMPLETED` or `CANCELLED`) are completely immutable against unauthorized item additions, removals, quantity edits, or discount changes.

---

## 4. Multi-Tenant Security & Relationship Security

1. **Query Filtering**: All order queries filter by authenticated `restaurantId` from session context.
2. **Cross-Tenant Validation**: When creating or updating an order, `customerId`, `tableId`, `reservationId`, and `menuItemId` are validated to ensure they belong to the authenticated restaurant tenant. Cross-tenant linkage attempts throw 400 validation errors (`INVALID_CUSTOMER`, `INVALID_TABLE`, `INVALID_RESERVATION`, `INVALID_MENU_ITEM`).

---

## 5. Role Authorization & Audit Logging

- **OWNER**: Full management, manual discounts, state transitions, cancellations, audit access.
- **MANAGER**: Operational order management, manual discounts, state transitions, cancellations.
- **STAFF**: Create orders, add/remove items on active orders, update kitchen statuses (`PLACED` → `CONFIRMED` → `PREPARING` → `READY` → `SERVED`). Unrestricted manual discounts or advanced cancellations are restricted.
- **Audit Logs**: Recorded for `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_STATUS_CHANGED`, `ORDER_CANCELLED`, `ORDER_DISCOUNT_APPLIED`, `ORDER_ITEM_ADDED`, `ORDER_ITEM_UPDATED`, `ORDER_ITEM_REMOVED`.

---

## 6. Customer CRM Integration

Completed orders automatically aggregate into `CustomerStats`:
- `completedOrders`: Count of orders with status `COMPLETED`
- `totalOrderValue`: Sum of `totalAmount` for completed orders
- `avgOrderValue`: `totalOrderValue / completedOrders`

Cancelled or active orders are strictly excluded from customer spend metrics.

---

## 7. Future Payment Gateway Architecture

Day 7 orders represent the bill amount. Future modules will link `Order` to `Payment` records (Razorpay/Stripe/UPI). Currently, payment status is denoted as `Pending / Payment Module Integration Ready`.
