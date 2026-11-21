# BookFlow AI — Master Implementation Checklist

Status key: **Implemented** = code exists; **Automated tests passed** = relevant workspace tests passed; **Local verified** = user completed the browser/API test on their computer. These states must not be treated as interchangeable.

## Previously completed / current baseline

- [x] Existing MERN app audit and Day 1/Day 2 backups created.
- [x] Appointment time utilities for date parsing, interval conflict checks and past-slot checks.
- [x] Appointment status transition rules.
- [x] Groq backend service configured through server-side environment variables.
- [x] Public showcase email-policy configuration (`REQUIRE_WORK_EMAIL` and `VITE_REQUIRE_WORK_EMAIL`).
- [x] Dedicated customer AI summary UI action added.
- [x] User reported prior features were working locally; this is user-reported confirmation, not a new automated integration test.

## Day 3 — Public Customer Booking Portal

- [x] Organization public slug and enable/disable flag.
- [x] Existing organization slug backfill through Settings.
- [x] Public endpoint for safe business/service/staff data.
- [x] Public availability endpoint (specific staff or any available staff).
- [x] Public appointment creation with backend revalidation.
- [x] Customer auto-create/match by organization-scoped contact details.
- [x] Booking confirmation response and confirmation screen.
- [x] Owner/receptionist notification, confirmation email attempt and Socket.IO event.
- [x] Public booking rate limit.
- [x] Owner settings page to copy/open link and enable/disable booking.
- [x] Unit tests for public booking validation/slug helpers.
- [x] Automated backend suite passed in workspace: 36/36.
- [ ] User local verification: public booking URL and full booking journey.
- [ ] Frontend production build verified after Day 3 changes.
- [ ] Live SMTP confirmation verified (optional when SMTP is configured).
- [ ] Multi-instance atomic booking reservation / race-condition guarantee.
- [ ] Customer contact ownership verification (email/phone OTP).

## Day 4 — Currency and customer cancellation

- [x] Shared frontend INR currency formatter for service prices, dashboard revenue, analytics, customer spend, public booking and booking-management pages.
- [x] Shared backend INR formatting for transactional emails and AI insight text normalization.
- [x] Service API/model default to INR for the current India-focused portfolio product.
- [x] Organization-configurable cancellation notice window (1–720 hours, default 24).
- [x] Secure public booking-management link with random token; only SHA-256 token hash is stored.
- [x] Customer can request cancellation without a BookFlow account through the private management link.
- [x] Requests outside the notice window cancel automatically; requests inside the window remain scheduled pending owner approval.
- [x] Owner/receptionist cancellation request review endpoints and UI; approve/reject actions are audited.
- [x] Customer/owner notifications, cancellation status emails where customer email is available, and real-time refresh events.
- [x] Automated tests cover cancellation decision boundaries, token hashing/expiry, timezone conversion and INR formatting.
- [x] Backend unit suite in workspace: 46/46 passed after Day 4 updates.
- [x] Backend JavaScript syntax check and frontend JS/JSX parser check passed in workspace.
- [ ] User local browser verification for currency display and full cancellation lifecycle.
- [ ] Full Vite production build verification on the user's PC.
- [ ] Atomic reservation/compare-and-set protection for simultaneous cancellation/booking requests remains a production-hardening task.

## Remaining product features

### Offers & customer loyalty
- [x] Day 5 owner UI to create/edit/pause offers and coupon codes.
- [x] Percentage and fixed-amount discounts; minimum booking value, inclusive expiry date, global usage limit and per-customer redemption limit.
- [x] Optional service restrictions, first-visit eligibility and public-page visibility.
- [x] Public coupon validation endpoint and server-side discount recalculation at booking creation; frontend never decides the final price.
- [x] Discount metadata stored on the appointment and final price used for booking confirmation/management/email.
- [x] Public booking page displays eligible public offers and lets customers apply coupon codes.
- [x] Atomic global redemption counter reservation for offers with usage limits; releases the counter if appointment creation fails.
- [ ] User local verification: create offer, validate coupon and book with discount end-to-end.
- [ ] Strong concurrent per-customer redemption protection / transactional redemption (production-hardening).
- [ ] Completed-visit loyalty rewards and redemption tracking.
- [ ] Re-engagement rules and consent-aware messages.
- [ ] Offer/discount analytics and revenue reporting.

### Super Admin
- [x] Dedicated, server-authorized platform Super Admin area and conditional platform-only navigation.
- [x] CLI-only Super Admin bootstrap; public registration never accepts super_admin role.
- [x] Organization list with search/status filter, pagination, owner details and aggregate usage counts.
- [x] Platform overview metrics for organizations, users, appointments, customers and staff.
- [x] Suspend/reactivate workflow requiring a reason and platform audit history.
- [x] Existing access tokens and refresh-token requests are denied after their organization is suspended.
- [x] Platform tenant is marked separately and excluded from business organization listings.
- [x] Unit tests for admin pagination, filters, search escaping, and status payload validation.
- [ ] User local verification: bootstrap Super Admin and test admin endpoints/UI.
- [ ] Abuse/report review workflow with an actual report intake model (not implemented in this day).
- [x] Demo plan/entitlement management UI added to Super Admin (Day 8).
- [ ] Consider audit-log/status update atomicity or outbox pattern before commercial launch.
- [ ] Full Vite production build and live MongoDB/role integration verification.

### Demo subscriptions (no payment gateway yet)
- [x] Free, Starter and Pro demo plans.
- [x] Trial, active, grace-period, expired and suspended states; effective status resolves from dates.
- [x] Server-side plan entitlement middleware for plan-limited creation and AI actions.
- [x] Plan limits for active staff, active services, monthly bookings, monthly AI requests and active offers.
- [x] Owner Subscription page with plan status and usage meters; existing records remain readable after expiry.
- [x] Super Admin demo subscription assignment with reason-required platform audit logging.
- [x] Monthly AI usage counter with compare-and-set increments.
- [x] Subscription lifecycle pure-unit tests; current workspace backend suite: 70/70 passed.
- [ ] User local Vite build, MongoDB persistence and browser subscription/entitlement workflow verification.
- [ ] Actual payment gateway/recurring billing intentionally deferred.

### AI product features
- [x] Smart Appointment Assistant code and UI (live Groq verification pending).
- [x] Customer Summary code and dedicated UI actions (live Groq/browser verification pending).
- [x] Dashboard Business Insights panel with refresh/error/fallback state (local verification pending).
- [x] Staff AI Summary endpoint and staff-card action (local verification pending).
- [x] AI Offer Recommendations as reviewable drafts on Offers & Coupons page (local verification pending; no auto-create/send).
- [x] Public Booking AI Assistant for natural-language date/time slot suggestions (local verification pending; explicit booking confirmation still required).
- [x] Customer Retention Assistant with database-backed segments and recommendations (local verification pending; no automatic customer messages).
- [x] Separate prompts, schemas, input facts, and UI paths per AI task.
- [x] Placeholder Groq key is treated as unconfigured so fallback results are not mislabeled as live AI.
- [ ] Live Groq test for each feature with a real API key; rate-limit, malformed-output, timeout, and missing-key fallback verification.
- [ ] User-local browser tests for all AI buttons and public booking suggestion selection.

### UX, consistency and deployment
- [ ] Full visual sign-off across public booking and all authenticated pages (Day 11 responsive fixes are implemented; local device review pending).
- [x] Shared INR formatter for customer-facing money display; price values stay numeric in storage and APIs.
- [ ] Full keyboard/accessibility pass and reduced-motion consideration.
- [ ] Frontend production build verified.
- [ ] API and frontend integration tests for all major workflows.
- [ ] Socket.IO room isolation and event behavior verified locally.
- [ ] Email verification, confirmation and cron reminder flows verified with configured provider.
- [ ] Public demo deployed on free-tier hosting and smoke tested.
- [ ] README, architecture diagram, API docs, screenshots and demo instructions.
- [ ] Final security/regression review and interview walkthrough.

## Day 5 — Offers & Coupons

- [x] Offer model with organization-scoped unique coupon codes.
- [x] Owner-only create/update/pause APIs with audit logging.
- [x] Premium Offers & Coupons management page, service targeting, public visibility and usage indicators.
- [x] Public booking page promotion cards and coupon apply flow.
- [x] Backend eligibility checks for code/status/date window/service/minimum amount/first visit/per-customer cap.
- [x] Server-calculated percentage/fixed discounts, optional percentage cap and INR totals.
- [x] Coupon metadata on public booking records and discount-aware confirmation/management/email summary.
- [x] Pure offer-rule unit tests added; run status recorded in DAY5_CHANGELOG.md.
- [ ] User local Vite production build and browser end-to-end verification.

## Daily delivery policy

Each day includes a ZIP backup, per-day changelog, updated master checklist, tests actually run, tests pending and explicit user-side verification steps. Learning walkthrough starts after the relevant feature passes user-side testing.


## Day 6 — Distinct AI features wired to their UI

- [x] Staff Summary: separate endpoint, staff-scoped operational metrics and staff-card action.
- [x] Offer Recommendations: aggregate workspace facts, bounded draft recommendations and review-in-form action.
- [x] Public Booking AI: natural-language date/time parsing with real slot retrieval; no booking without normal customer confirmation.
- [x] Customer Retention Assistant: segment counts, at-risk customer list and consent-aware suggestions; no automated outreach.
- [x] Dashboard AI Insights panel error state fixed so API failure is shown rather than silently hiding the feature.
- [x] Updated AI feature contracts and Day 6 checklist.
- [x] Backend suite in workspace: 56/56 passed.
- [x] Backend syntax checks and JSX/TSX parser check passed.
- [ ] User-local Vite build, live Groq calls, browser interactions and public booking end-to-end test.


## Day 7 — Super Admin Console

- [x] Platform Super Admin dashboard with business overview and usage metrics.
- [x] Organization search, status filters, and pagination.
- [x] Admin suspend/reactivate actions with mandatory reason.
- [x] Separate platform audit log UI and model.
- [x] Server-side `super_admin` authorization for all platform admin endpoints.
- [x] CLI-only account bootstrap script and environment example variables.
- [x] Existing active tokens and refresh attempts blocked for suspended organizations.
- [x] Unit tests added for platform-admin input rules.
- [ ] User local verification of bootstrap, Super Admin login, business listing and suspend/reactivate.
- [ ] Frontend Vite production build verified locally.
- [ ] Abuse-report review and plan-entitlement controls remain future scope.


## Day 8 — Demo Subscription System

- [x] Added Free, Starter, Pro plan catalog with limits and feature entitlements.
- [x] Added organization subscription lifecycle fields while preserving legacy `subscriptionPlan` and `subscriptionExpiry` fields.
- [x] Added UTC monthly AI usage model and compare-and-set request reservation.
- [x] Added effective-state resolution for trial, active, grace period, expired and subscription-suspended states.
- [x] Added `GET /api/v1/subscription/me` and demo-only `POST /api/v1/subscription/demo/select-plan`.
- [x] Added owner-only Subscription page with current status, plan cards, usage bars, limits and explicit no-payment messaging.
- [x] Added server-side entitlement checks to staff/service/booking/offer creation and AI routes.
- [x] Advanced AI (staff summary, offer recommendations, retention) requires Starter/Pro; core AI has plan-specific monthly request caps.
- [x] Public booking page, slot listing and booking creation respect effective subscription status/limits.
- [x] Added Super Admin `PATCH /api/v1/platform-admin/organizations/:organizationId/subscription` to assign demo plan/status/duration with mandatory reason and audit log.
- [x] Super Admin business list reflects effective status after the current period/trial date passes.
- [x] Added subscription lifecycle tests; backend test suite in workspace: 70/70 passed.
- [x] Backend syntax checks and frontend JS/JSX parser syntax checks passed in workspace.
- [ ] User local Vite production build.
- [ ] User local browser test: choose demo plan, refresh, verify usage/limits, assign status from Super Admin and inspect audit log.
- [ ] Live MongoDB integration and actual expired-state entitlement requests.
- [ ] Real payment gateway/recurring billing deliberately not included in portfolio/demo phase.


### Day 8 final hardening note
- [x] Reactivating a paused offer checks the plan active-offer quota; deactivation remains permitted at quota.


## Day 9 — Customer Loyalty & Rewards

- [x] Tenant-scoped loyalty transaction ledger with unique idempotency keys.
- [x] Customer current and lifetime loyalty point balances.
- [x] Automatic points earning on appointment completion (5 points per full ₹100 net spend).
- [x] Idempotency guard to prevent duplicate earning on the same appointment.
- [x] Loyalty overview page with outstanding points, customer balances and recent activity.
- [x] Redemption against a pending/confirmed appointment belonging to the selected customer.
- [x] Redemption policy: 1 point = ₹1, minimum 100 points, maximum 20% of current payable amount.
- [x] Refund redeemed points when supported cancellation flows cancel an appointment.
- [x] Unit tests for loyalty earning and redemption rules added.
- [x] Backend unit tests: 75/75 passed, including five Day 9 loyalty rule tests.
- [x] Backend source/test syntax checks and frontend JS/JSX parser checks passed.
- [ ] Frontend Vite production build (dependency install unavailable in this environment).
- [ ] User local MongoDB/browser test of earning, duplicate prevention, redemption, cancellation refund and tenant isolation.
- [ ] Consider expiry policy, business-configurable reward rules and customer-facing wallet as future enhancements.


## Day 10 — Integration & Security Hardening

- [x] Added auth-version claims and immediate session invalidation after logout, password change and password reset.
- [x] Rejected stale access tokens in HTTP APIs and Socket.IO; socket handshake now checks organization active status.
- [x] Added login/refresh and registration/recovery-specific rate limits.
- [x] Reduced JSON/form body sizes and disabled extended URL-encoded object parsing.
- [x] Bounded customer/notification pagination; escaped and length-capped customer search terms.
- [x] Tenant-scoped customer appointment history and notification listing/read operations.
- [x] Sanitized reset/verification/bearer tokens from request access logs.
- [x] Production startup guard requires MongoDB, separate strong JWT secrets and a public HTTPS frontend URL.
- [x] Added automated tests for session invalidation rules, production config checks, URL redaction and safe pagination/search.
- [x] Backend unit/security test suite: 89/89 passed.
- [x] Backend source, test and script syntax checks passed.
- [ ] User-local MongoDB/API integration checks with two organizations and multiple user roles.
- [ ] User-local logout/password-reset stale-token test and rate-limit test.
- [ ] User-local Socket.IO cross-organization and suspended-organization tests.
- [ ] User-local Vite build, browser regression, SMTP, cron and live Groq checks.
- [ ] Concurrent booking/coupon redemption hardening and production deployment smoke test.
- [ ] Actual payment gateway intentionally deferred.


## Day 11 — UI Polish & Regression Readiness

- [x] Responsive application frame uses dynamic viewport height and prevents nested content from forcing horizontal page overflow.
- [x] Mobile navigation button exposes expanded state and controls the primary navigation landmark.
- [x] Appointment list, customer directory and customer appointment history tables scroll within their own containers on narrow viewports.
- [x] Appointment/customer action bars stack on small screens and keep primary actions full-width for touch use.
- [x] Shared dialog includes accessible dialog semantics, labelled title, Escape-to-close, initial close-button focus, Tab/Shift+Tab focus containment and focus restoration.
- [x] Dialog body scroll lock restores the previous page overflow setting after close.
- [x] Added consistent mobile touch target sizing, compact card spacing, safe-area padding and forced-colors focus treatment.
- [x] Added Loyalty & Rewards and Subscription page titles to the application top bar.
- [ ] Local browser regression at 320px, 375px, 768px, 1024px and desktop widths.
- [ ] Keyboard-only dialog test (Tab/Shift+Tab, Enter, Escape) and screen-reader review.
- [ ] User local Vite production build and actual cross-page visual review.
- [ ] Validate public booking, appointments, customers, loyalty, offers, AI, subscription and Super Admin after UI changes.



## Day 12 — Deployment preparation & documentation

- [x] Added Render Blueprint for the Express API (`backend/` root, production env, generated JWT secrets, `/health` check).
- [x] Added Vercel SPA rewrite for React Router deep links.
- [x] Added root `.gitignore` for secrets, dependency folders, build output and logs while preserving `.env.example`.
- [x] Added deployment guide covering MongoDB Atlas, Render, Vercel, Super Admin bootstrap, integration setup and smoke tests.
- [x] Added backend/frontend environment variable reference and secret-handling guidance.
- [x] Added final release checklist for build, business workflows, AI, SMTP, Socket.IO, tenancy/security, UI/accessibility and hosting.
- [x] Rewrote README and architecture overview to reflect the current Day 11 codebase.
- [ ] User/CI local backend tests and frontend production build after installing dependencies.
- [ ] User completes browser + live MongoDB + SMTP + Groq + Socket.IO release checklist.
- [ ] User connects GitHub/Render/Vercel/Atlas accounts, supplies secrets and completes deployment.
- [ ] Post-deployment smoke tests and operational monitoring.
- [ ] Keep the backend at one instance until in-process reminders are moved to a singleton scheduler.
- [ ] Production hardening remains: atomic booking reservation, guest ownership verification, coupon concurrency/refund handling, route-by-route RBAC review and email-verification policy.
- [ ] Actual payment gateway intentionally deferred; subscription entitlements remain demo-only.
