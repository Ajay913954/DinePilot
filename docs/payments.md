# DinePilot — Day 8: Payments & Billing Foundation Architecture

This document describes the design, domain model, security, concurrency control, idempotency, and future gateway integration strategy for **DinePilot Payments & Billing Foundation**.

---

## 1. Architectural Blueprint

DinePilot models the financial domain following strict tenant-isolated principles:

```text
Restaurant
   └── Order (Order Financial Snapshot)
          └── Bill / Invoice (Sequential DP-YYYY-XXXXXX)
                 └── Payment(s) [1..N] (CASH, UPI, CARD, BANK_TRANSFER, OTHER)
```

### Core Relationships & Domain Rules
1. **One Active Bill Per Order**: An order corresponds to exactly one financial bill (`orderId` unique constraint).
2. **Snapshot Integrity**: The bill stores financial snapshots (`subtotal`, `discountAmount`, `taxAmount`, `serviceChargeAmount`, `totalAmount`) derived from Day 7 order snapshots. Historical bills are never computed from mutable menu prices.
3. **Exact Monetary Precision**: All monetary values are handled using `Prisma.Decimal` and database `Decimal(10, 2)` types. Floating-point arithmetic is strictly prohibited.
4. **Multiple Payments**: A single bill supports multiple payments (e.g. ₹1,000 CASH + ₹1,000 UPI for a ₹2,000 order).
5. **Strict Payment Status Counting**: Only successful payments (`status === SUCCESS`) contribute toward `amountPaid`. `PENDING`, `PROCESSING`, `FAILED`, and `CANCELLED` payments do not increase paid amounts.

---

## 2. Domain Data Models

### Enums

#### `PaymentMethod`
- `CASH`: Cash / Physical currency
- `UPI`: Unified Payments Interface (GPay, PhonePe, Paytm)
- `CARD`: Credit / Debit card via POS terminal
- `BANK_TRANSFER`: NEFT / IMPS / Wire transfer
- `OTHER`: Other operational payments

#### `PaymentStatus`
- `PENDING`: Payment initiated, awaiting confirmation
- `PROCESSING`: Processing with payment provider/bank
- `SUCCESS`: Payment confirmed and collected
- `FAILED`: Transaction declined or failed
- `CANCELLED`: Payment cancelled before completion
- `REFUNDED`: Fully refunded
- `PARTIALLY_REFUNDED`: Partially refunded

#### `BillStatus`
- `OPEN`: Bill issued, zero payments recorded (`amountPaid === 0`)
- `PARTIALLY_PAID`: `0 < amountPaid < totalAmount`
- `PAID`: `amountPaid === totalAmount`, `amountDue === 0`
- `VOID`: Bill voided/cancelled

---

## 3. Invoice Number Generation

Invoice numbers follow a production-grade format:
`DP-YYYY-XXXXXX` (e.g., `DP-2026-000001`)

### Key Properties:
- **Tenant-Scoped Uniqueness**: Enforced via `@@unique([restaurantId, invoiceNumber])`.
- **Concurrency Safety**: Sequential generation executes inside database transactions with lock re-checks and retry loops.
- **No Client Dependencies**: Invoice numbers are server-generated; frontend inputs are ignored.

---

## 4. Financial Calculations & State Machines

### Amount Calculations
```text
amountPaid = sum(Payment.amount WHERE status == 'SUCCESS')
amountDue = max(0, totalAmount - amountPaid)
```

### Overpayment Protection
Payments attempting to pay more than current `amountDue` are rejected with error `PAYMENT_EXCEEDS_DUE`.

### Payment Status State Machine
Allowed transitions:
```text
PENDING → PROCESSING → SUCCESS
PENDING → FAILED
PENDING → CANCELLED
PROCESSING → SUCCESS
PROCESSING → FAILED
PROCESSING → CANCELLED
SUCCESS → REFUNDED / PARTIALLY_REFUNDED
```
*Note*: Direct manual payment recording produces `SUCCESS` records via authorized backend operations. Invalid state transitions (such as `FAILED → SUCCESS`) are rejected.

---

## 5. Idempotency & Concurrency Control

### Idempotency Protection
Clients can submit an `idempotencyKey` parameter with payment creation requests.
- Requests matching an existing `(restaurantId, idempotencyKey)` combination return the existing payment record without creating duplicate payments.
- Guaranteed via `@@unique([restaurantId, idempotencyKey])`.

### Transactional Concurrency
All payment additions and bill status updates execute inside `prisma.$transaction` calls with strict isolation to ensure parallel payments cannot overpay a bill under race conditions.

---

## 6. Authorization & Tenant Isolation

- **Tenant Isolation**: Every database query is scoped by `restaurantId = session.restaurantId`.
- **Role Permissions**:
  - `OWNER`: Full administrative access to bills, payments, metrics, and settings.
  - `MANAGER`: Can view billing/payments, record manual payments, and update payment statuses.
  - `STAFF`: Can view relevant payment data and record permitted manual payments. STAFF cannot alter historical billing totals or delete payment logs.

---

## 7. Gateway-Ready Adapter Architecture

Future payment gateways (Razorpay, Stripe, UPI webhooks) integrate into the clean adapter abstraction interface (`PaymentGatewayAdapter`):

```ts
export interface PaymentGatewayAdapter {
  providerName: string;
  createPayment(params: { amount: number; currency: string; orderId: string; metadata?: Record<string, any> }): Promise<{ gatewayReference: string; clientSecret?: string }>;
  verifyPayment(params: { transactionReference: string; gatewayReference: string }): Promise<{ success: boolean; status: PaymentStatus }>;
  refundPayment(params: { paymentId: string; amount: number; reason?: string }): Promise<{ refundReference: string; status: string }>;
}
```

---

## 8. Deferred Features

The following capabilities are explicitly postponed to future dedicated modules:
- Live external gateway API calls & webhooks (Razorpay / Stripe / UPI)
- Automatic bank reconciliation
- Full refund gateway workflows
- Subscription billing engine for DinePilot SaaS subscriptions
- GST compliance / legal tax engine
- Settlement & payout management
