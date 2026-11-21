# BookFlow AI — Final Release Checklist

Use this checklist as a release gate. A source-code checkbox does not mean the feature has been verified against a live database or browser.

## A. Local setup and build

- [ ] Install backend dependencies with `cd backend && npm install`.
- [ ] Run backend unit/security tests with `npm test` and record the actual result.
- [ ] Install frontend dependencies with `cd frontend && npm install`.
- [ ] Run `npm run build` from `frontend/` and confirm `dist/` is produced without errors.
- [ ] Run both apps locally with MongoDB configured; check `/health`.
- [ ] Confirm no real `.env` file, API key, token, SMTP password, MongoDB password, or user data is committed.

## B. Core business flows

- [ ] Registration, login, logout, token refresh and session invalidation.
- [ ] Create/update/archive services and staff; staff schedules and leave.
- [ ] Availability checks, booking creation, overlap rejection and time-zone boundaries.
- [ ] Appointment status changes, reschedule, cancellation and booking-management approval flow.
- [ ] Public booking from a signed-out/incognito window; customer match/create in the correct business.
- [ ] Customer search, profile, appointment history and customer summary.
- [ ] Offers, coupon validation, discount calculation and usage-limit behavior.
- [ ] Loyalty earning on completed appointments, redemption cap/minimum, transaction ledger and cancellation return.
- [ ] Dashboard, analytics, notifications and organization settings.
- [ ] Subscription status/entitlements and Super Admin plan management.

## C. AI and integrations

- [ ] Test all seven AI capabilities with a valid Groq key and inspect response metadata.
- [ ] Test missing/invalid Groq key, provider timeout/rate limit and labelled fallback paths.
- [ ] Configure SMTP and test verification, reset, booking confirmation, cancellation update and reminder email.
- [ ] Confirm reminder time and timezone; ensure exactly one scheduler instance runs.
- [ ] Verify Socket.IO authentication, event delivery and cross-organization isolation with two test organizations.

## D. Security and data isolation

- [ ] Test every role against every protected write route; deny actions outside assigned permissions.
- [ ] Verify every organization-owned query and mutation is tenant-scoped with two independent test businesses.
- [ ] Test suspended organization access-token and refresh-token rejection.
- [ ] Test login/recovery/public-booking/global rate limits and bounded request sizes.
- [ ] Confirm logs redact reset tokens, verification tokens, access tokens and private booking-management tokens.
- [ ] Verify CORS allows only the intended frontend origin.
- [ ] Test concurrent booking requests for the same slot; do not treat the current pre-insert check as race-proof.
- [ ] Review guest booking ownership verification and coupon concurrency limitations before using real customer data.
- [ ] Confirm database backups, retention and restore procedure.

## E. Responsive UI and accessibility

- [ ] Review key pages at 320px, 375px, 768px, 1024px and desktop widths.
- [ ] Check public booking, login/register, dashboard, appointments, customers, loyalty, offers, AI, subscription and Super Admin pages.
- [ ] Complete keyboard-only tests for modal focus trap, Escape, focus restoration and navigation.
- [ ] Review contrast, visible focus, form labels, validation messages and screen-reader announcements.
- [ ] Check browser console/network for runtime errors and failed API/socket requests.

## F. Production deployment

- [ ] Create MongoDB Atlas database user and network rules.
- [ ] Deploy backend with `NODE_ENV=production`, valid Mongo URI, two different 32+ character JWT secrets, HTTPS `CLIENT_URL` and correct `TRUST_PROXY`.
- [ ] Deploy frontend with production `VITE_API_URL`, `VITE_SOCKET_URL` and matching work-email policy.
- [ ] Verify SPA deep links work after refresh.
- [ ] Configure SMTP and Groq only if those capabilities are required for the demo.
- [ ] Bootstrap platform Super Admin through the one-time backend CLI; remove temporary bootstrap secrets.
- [ ] Complete post-deployment smoke tests and inspect provider logs.
- [ ] Keep one backend instance while the in-process reminder cron is active.

## G. Portfolio handover

- [ ] Update screenshots with the final deployed UI (do not use sample data containing real customer information).
- [ ] Add deployed frontend/API URLs and test/demo credentials only if they are safe, intentionally public, and rotated/limited.
- [ ] Walk through architecture, tenancy/RBAC, booking engine, AI/fallback behavior, loyalty ledger and demo subscription entitlements.
- [ ] Clearly label demo subscriptions as non-payment plans.
- [ ] Document remaining production blockers; do not claim commercial/SaaS-grade readiness until resolved.

## Current known limitations (do not hide these)

1. Browser + live MongoDB end-to-end test coverage has not yet been demonstrated by the automated unit suite.
2. The reminder job runs inside the API process; multiple replicas can duplicate jobs. Its schedule follows the server timezone, not each organization's timezone.
3. Appointment overlap checking is not an atomic distributed reservation; simultaneous requests can race.
4. Guest booking OTP/ownership verification is not implemented.
5. Coupon concurrency protection and cancellation/refund edge cases need further hardening.
6. Fine-grained role/route authorization and email-verification enforcement require a complete policy review.
7. No payment gateway/recurring billing is connected; subscription plans are for demo/testing only.
