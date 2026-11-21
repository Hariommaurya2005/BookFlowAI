# Day 9 — Customer Loyalty & Rewards

## Implemented

- Added tenant-scoped loyalty transaction ledger with unique idempotency keys.
- Added current and lifetime loyalty point balances to customer records.
- Automatically awards 5 points per full ₹100 of net appointment spend when an appointment is marked completed.
- Prevents repeat point awards for the same completed appointment.
- Added a Loyalty & Rewards workspace page with balance overview, participating customers, latest transactions and customer history.
- Added point redemption against a pending or confirmed appointment belonging to the selected customer and organization.
- Redemption is limited to a minimum of 100 points and at most 20% of the appointment's current payable amount; 1 point equals ₹1 discount.
- Returns redeemed points when an appointment is cancelled through supported business or public booking cancellation flows.
- Added backend unit tests for earn and redemption calculation rules.

## Loyalty policy

- Earn: 5 points per full ₹100 of net payable amount after existing offer discounts.
- Redeem: 1 point = ₹1, minimum 100 points, maximum 20% of the appointment's current payable amount.
- Points are credited only on completion; booking creation alone does not earn points.
- Redemption is available only for pending/confirmed appointments. Cancelled appointments return redeemed points.

## Verification performed for this ZIP

- Backend unit tests: **75/75 passed** (includes 5 new loyalty rule tests).
- Backend JavaScript syntax checks: passed for all backend source and test files.
- Frontend JS/JSX syntax parse: **43/43 files passed** with zero parser diagnostics.
- Frontend Vite production build: not run; dependency installation timed out and the package cache does not contain the required dependencies.
- Live MongoDB / browser verification: must be completed by the user locally.

## User-side test sequence

1. Open Loyalty & Rewards from the sidebar.
2. Complete an appointment worth at least ₹100 and confirm its status is Completed.
3. Refresh Loyalty & Rewards and verify the customer receives 5 points per full ₹100.
4. Verify changing/re-saving an already completed appointment does not award points twice.
5. Create a pending/confirmed appointment for that customer and redeem at least 100 points.
6. Confirm the booking payable amount is reduced by the points value and the activity ledger records the redemption.
7. Cancel the appointment and confirm redeemed points return once.
8. Sign in to another organization and verify the first organization's balances and history are not visible.

## Not included

- Automated expiry of unused points.
- Configurable per-business loyalty rules or reward tiers.
- Customer-facing self-service loyalty wallet / public booking redemption.
- Payment gateway integration (deliberately deferred).
