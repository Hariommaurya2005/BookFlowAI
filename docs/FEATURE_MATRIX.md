# BookFlow AI — Feature Matrix

Legend:
- **In code** — source exists; live behaviour has not necessarily been verified.
- **Partial** — some building blocks exist, but the product flow is incomplete.
- **Planned** — not implemented in the current source snapshot.

| Area | Current status | What exists / what remains |
|---|---|---|
| Registration and login | In code | JWT access/refresh tokens, password hashing; test email verification enforcement policy. |
| Password reset / verification | In code, needs live test | Token flows and frontend routes exist; SMTP must be configured. Login currently does not enforce verified email. |
| Multi-tenancy | In code; Day 10 hardening added | Organization-scoped queries remain in the business controllers; notification APIs now enforce tenant context and notification/history queries include organization scope. Continue route-by-route browser/API verification with two test organizations. |
| Appointment CRUD | In code; Day 2 hardened | Authenticated list/create/status/reschedule/cancel. Rejects past appointment dates/times, checks interval overlap, recalculates end time, and enforces allowed status transitions. Concurrent slot reservation across multiple app instances remains a risk. |
| Available slots | In code; Day 2 hardened | Staff schedule, leave, service duration, overlap checks, and timezone-aware exclusion of past slots; verify with real data/browser. |
| Customer CRUD/history | In code | Records and summaries; current AI facts use the latest 20 appointments. |
| Staff and leave | In code | Staff CRUD and leave endpoints. |
| Services | In code; INR consistency implemented | Service CRUD with duration and price; service API/model currently use INR for the India-focused portfolio version. |
| Dashboard/analytics | In code | Metrics and charts; validate date ranges and currency formatting. |
| Notifications / Socket.IO | In code, Day 10 hardening added; integration test pending | Notification reads and mutations are user- and organization-scoped. Socket connections validate user/session and current organization status, and clients cannot join a foreign organization room. Verify live event delivery locally. |
| Email/reminder cron | In code, external config required | Nodemailer and scheduled reminders; test SMTP and deployment scheduler strategy. |
| Groq AI | In code, features separated; live API not verified here | Appointment intent extraction returns slot suggestions; customer summary gives an individual retention brief; dashboard insights analyze aggregate KPIs. Distinct prompts/schemas/UI and clearly marked fallback. |
| Public customer booking | Implemented in Day 3; local integration test pending | Public business slug/page, service and staff selection, public available-slot API, guest booking creation, organization-scoped customer match/create, owner/receptionist notifications, confirmation-email attempt, Socket.IO event, and public enable/disable controls. OTP/contact ownership verification and atomic cross-instance reservations remain future hardening. |
| Customer booking management / cancellation | Implemented in Day 4; local workflow test pending | Private token-based link; configurable notice window; automatic cancellation outside the window; approval-required request within the window; owner/receptionist approve/reject UI; status notifications. Bearer-link privacy and concurrency hardening remain limitations. |
| Offers/coupons | Implemented in Day 5; local end-to-end test pending | Organization-scoped offer model and APIs; owner create/edit/pause UI; public coupon validation and promotion cards; backend recalculates and stores discount/pricing metadata. Strict concurrent per-customer redemption protection remains future hardening. |
| Customer loyalty | Implemented in Day 9; local workflow test pending | Completed appointments earn 5 points per full ₹100 of net payable spend. One point equals ₹1 on redemption; minimum 100 points and maximum 20% of current appointment payable amount. Supported cancellation flows return redeemed points. Expiry policy, configurable reward tiers and public self-service redemption remain future work. |
| Re-engagement automation | Planned | AI retention insights and customer segments exist, but automatic consent-aware message campaigns/scheduling are not implemented. |
| Super Admin console | Implemented in Day 7; local verification pending | CLI-only bootstrap; server-guarded platform admin APIs for organization overview/search/status, mandatory reason for suspend/reactivate, PlatformAuditLog and a responsive dashboard. User-local role/MongoDB/browser verification remains. Abuse-report intake and plan entitlements are not part of this milestone. |
| Demo subscription lifecycle | Implemented in Day 8; local workflow test pending | Free/Starter/Pro demo plans, trial/active/grace/expired/suspended lifecycle, usage counters, server-side entitlements and Super Admin plan assignment. No payment provider or recurring billing. |
| Security hardening | Day 10 implemented; full deployment verification pending | Session-version invalidation, auth rate limits, request-size caps, safe pagination/search, tenant-scoped notification queries, socket organization checks, production env guard and redacted auth URLs. HTTP/MongoDB/socket/browser integration still requires local verification. |
| Actual payments | Intentionally deferred | No payment gateway in portfolio milestone. |
| Centralized currency formatting | Implemented in Day 4; local UI audit pending | Shared INR frontend formatter for prices, revenue charts, customer spend, public booking and booking management; backend currency formatting for confirmation email and AI monetary text. App is currently India-focused; multi-currency conversion is not implemented. |


## Day 5 — Offers & Coupons

- Owner-managed offers: percentage/fixed discount, code, date range, service restrictions, minimum booking value, usage limits and first-visit eligibility.
- Public booking: eligible promotion cards and server-validated coupon application.
- Appointment stores base price, discount amount, offer reference and final price.
- Current state: coupon implementation is in code; local browser integration still pending. Customer loyalty is implemented in Day 9; automatic re-engagement campaigns remain future work.


## Day 7 — Platform ownership
- Internal platform organization is excluded from customer-business listings and overview metrics.
- Only a `super_admin` authenticated by the backend can access `/api/v1/platform-admin/*`.
- Organization suspension denies existing access-token API requests and refresh-token requests.
- Local bootstrap instructions are in `DAY7_SETUP_GUIDE.md`; actual Super Admin creation must be performed from the backend CLI.
- At the Day 7 checkpoint, 61 backend unit tests passed; later Day 10/11 backups carry the expanded 89-test suite. Vite build/live integration remains pending local verification.


## Day 9 status update

Customer Loyalty & Rewards was implemented in Day 9. Day 10 adds security hardening for auth sessions, rate limits, tenant-scoped notifications/history, query bounds, safe logs and production configuration. The Day 10 unit/security suite passes 89 tests; live browser/MongoDB verification remains pending.


### Day 11 UI status
- Responsive layout and accessible modal improvements are implemented in the Day 11 backup. The responsive browser/device review, keyboard-only pass and production Vite build are still pending local verification.


## Day 12 — Deployment readiness

- Render API Blueprint and Vercel SPA rewrite configuration are included in the repository.
- Deployment, environment-variable and release-gate documentation have been added.
- These files prepare deployment; they do not prove the application has been deployed or passed live integration testing.
- The reminder worker is in-process and should run on a single API instance only. Its schedule follows the host timezone.
