# Day 9 — Loyalty & Rewards Setup / Test Guide

## Start the project

Use the existing Day 8 `.env` files and MongoDB configuration.

Terminal 1 — backend:

```bash
cd bookflow/backend
npm install
npm run dev
```

Terminal 2 — frontend:

```bash
cd bookflow/frontend
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with an existing business-owner or receptionist account.

## Verify loyalty earning

1. Open Appointments and create or use a confirmed appointment with a valid customer.
2. Complete the visit and change the appointment status to **Completed**.
3. Open **Loyalty & Rewards** in the sidebar.
4. Find the customer and verify the earned points appear in the balance and activity ledger.
5. Repeat the completed status update. The same appointment must not award points a second time.

Earning rule: **5 points for every full ₹100 of the appointment's net payable amount**. For example, ₹1,250 earns 60 points; fractional hundreds are not rounded up.

## Verify redemption and cancellation refund

1. Make sure the customer has at least 100 points.
2. Create another pending or confirmed appointment for that same customer.
3. Open Loyalty & Rewards → Manage points for the customer.
4. Select the appointment and redeem points. Minimum is 100 points; 1 point equals ₹1 discount; the discount cannot exceed 20% of the appointment's current payable amount.
5. Verify the appointment payable amount is reduced and a redemption transaction is recorded.
6. Cancel the appointment through the business appointment controls or supported public cancellation flow.
7. Verify the redeemed points are returned once and a refund transaction is recorded.

Example: For a ₹500 appointment and at least 100 available points, the customer may redeem 100 points (₹100), which is the 20% cap.

## Important notes

- Only completed appointments earn points; creating or confirming an appointment does not.
- Points are calculated on the net payable appointment amount after any existing offer discount.
- Redemption is currently managed by authenticated business users; a public self-service wallet is not part of Day 9.
- Existing customer records start with a zero loyalty balance until qualifying appointments are completed.
- The rules are fixed defaults in this implementation, not configurable per organization yet.
- Payment gateway integration remains intentionally deferred.
