# Day 8 — Demo Subscription System

## Added
- Demo subscription lifecycle stored on each organization: `trial`, `active`, `grace_period`, `expired`, and `suspended`.
- Free, Starter, and Pro plan catalog with server-side limits for active staff, services, monthly bookings, monthly AI requests, and active offers.
- Subscription status is resolved at request time; expired trials/periods move into grace when the configured grace date remains, then become expired.
- Monthly AI usage counter stored per organization and UTC calendar month, with compare-and-set increments to avoid concurrent over-counts.
- Subscription API: read current plan/usage and simulate selecting a demo plan (no payment processing).
- Business owner Subscription page with usage meters, current lifecycle state, plan limits, and explicit demo-only copy.
- Super Admin can assign demo plans and set lifecycle state/duration with a required reason; updates are recorded in the platform audit log.
- Plan entitlement guards on staff/service/booking/offer creation and AI routes. Advanced AI summaries/recommendations require Starter or Pro; Free includes base AI with a smaller monthly quota.
- Public booking page/slot endpoints and booking creation respect subscription status and monthly booking limits.
- Existing read APIs remain available for expired accounts; selected creation/AI/plan-limited write actions are restricted while expired. Existing appointment status/cancellation operations remain available so already-booked appointments can still be handled.
- Preserved the legacy `subscriptionPlan` and `subscriptionExpiry` fields for compatibility.

## Validation
- `npm test`: 70 tests passed in the workspace.
- All backend JavaScript files passed `node --check`.
- All frontend JS/JSX files passed TypeScript parser syntax checks.
- Relative imports and ZIP integrity checked.
- A full Vite production build and live MongoDB/browser integration still need to be verified on the user's PC.

## Not included
- No real payment gateway, card collection, billing provider, or real payment records.
- Subscription plan selection from the owner page is explicitly simulated for a portfolio/demo build.
- Final hardening: reactivating a paused offer now checks the plan's active-offer quota; deactivation remains permitted at quota.
