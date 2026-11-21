# BookFlow AI — Architecture Overview (Day 12)

This overview describes the Day 11 source snapshot with Day 12 deployment configuration. A module being present in source does not mean its complete browser, database or provider integration has been verified.

## 1. High-level architecture

```text
React 18 + Vite frontend
  React Router pages / shared components / AuthContext / SocketContext
          | Axios REST (/api/v1)       | Socket.IO (authenticated)
          v                            v
Node.js + Express API  <-----------> Socket.IO server
  Helmet / CORS / body limits / rate limits / sanitized access logs
          |
          +--> Routes -> auth + tenant + entitlement middleware
          |              -> controllers -> domain services/utils
          +--> MongoDB via Mongoose
          +--> Groq API (optional; backend only)
          +--> SMTP via Nodemailer (optional integration)
          +--> node-cron reminder job (in-process)
```

## 2. Frontend routes

| Route | Access | Purpose |
|---|---|---|
| `/login`, `/register` | Public when signed out | Sign in / create a business workspace |
| `/forgot-password`, `/reset-password/:token` | Public | Password recovery |
| `/verify-email/:token` | Public | Verify email address |
| `/book/:slug` | Public | Guest booking page for a business |
| `/booking/manage` | Public, private bearer token required by page flow | View/manage a public booking request |
| `/dashboard` | Business user | Dashboard and business insights |
| `/appointments` | Business user | Appointment management |
| `/customers`, `/customers/:id` | Business user | Customer directory, profile and history |
| `/loyalty` | Business user | Loyalty balances and ledger |
| `/staff` | Business user | Staff and leave management |
| `/services` | Business user | Service catalogue |
| `/offers` | Business user | Offers and coupons |
| `/analytics` | Business user | Business analytics |
| `/notifications` | Business user | Notification inbox |
| `/ai-assistant` | Business user | Smart Appointment Assistant |
| `/settings` | Business user | Business/profile settings and public booking configuration |
| `/subscription` | Business owner | Demo plan/entitlement page |
| `/platform-admin` | Platform Super Admin | Platform business management |

Route guards are in `frontend/src/routes/ProtectedRoute.jsx`; the route table is in `frontend/src/App.jsx`.

## 3. Backend API route groups

All business API routes are mounted under `/api/v1` in `backend/src/routes/index.js`:

| Prefix | Main responsibility |
|---|---|
| `/auth` | Registration, login, refresh, logout, verification, recovery and current user |
| `/platform-admin` | Platform-only organization overview and status/plan administration |
| `/public/booking` | Public business page, slot discovery, guest booking and booking management |
| `/appointments` | Authenticated appointment list, creation, status, reschedule and cancel |
| `/customers` | Customer records, details and history |
| `/staff` | Staff and leave management |
| `/services` | Service management |
| `/offers` | Offers and coupon validation/management |
| `/notifications` | Organization/user-scoped notifications |
| `/dashboard` | Dashboard metrics and analytics |
| `/settings` | Business, profile, cancellation and public-booking settings |
| `/subscription` | Demo plan state and entitlements |
| `/loyalty` | Customer points, redemption and transaction history |
| `/ai` | Separate AI task endpoints |

`GET /health` is outside the API prefix. It is a basic HTTP liveness response, not a deep dependency readiness check.

## 4. Main data model boundaries

- `Organization` is the business/tenant boundary and stores business settings and subscription state.
- `User` belongs to an organization and carries a role; platform Super Admin accounts belong to a marked platform organization.
- Business-owned `Customer`, `Staff`, `Service`, `Appointment`, `Notification`, `Offer`, `AuditLog`, `LoyaltyTransaction` and `SubscriptionUsage` documents store organization context where applicable.
- `PlatformAuditLog` records platform-level administrative actions.
- `Appointment` references the customer, service and staff member involved in a booking.

The tenant boundary must be checked in every read/write path. Continue to verify it with multiple independent test organizations before production.

## 5. Authentication, tenancy and authorization flow

1. Login verifies credentials and issues access/refresh tokens.
2. The frontend stores tokens using the token-storage service and Axios attaches the access token to protected API requests.
3. The backend authentication middleware validates the token/session and loads the current active user/organization context.
4. Tenant middleware supplies organization scoping; controllers use the authenticated organization for business data.
5. Route guards provide a frontend navigation boundary, but they are not a substitute for server-side authorization.
6. Platform routes have a server-side Super Admin guard; the Super Admin role is provisioned through `backend/scripts/bootstrapSuperAdmin.js`.

Day 10 added session invalidation, auth rate limits, input/query bounds, tenant-scoped notifications/history, Socket.IO organization checks, production configuration checks and sanitized logs. The remaining route-by-route role audit and email-verification policy must be resolved before commercial use.

## 6. Appointment lifecycle

The appointment engine validates service/staff/customer context, service duration, staff schedule/leave, date/time and existing overlapping appointments before persisting. Status transitions, rescheduling and cancellation rules are centralized in backend rules/helpers and controllers. Public guest bookings are scoped to the selected organization's slug and attempt customer match/create inside that tenant.

**Known concurrency limitation:** overlap detection is a check-before-insert workflow. Two simultaneous requests may both pass before either insert completes. Use an atomic reservation/locking design before a multi-instance commercial deployment.

## 7. AI integration

- Groq key and model are read by the backend (`GROQ_API_KEY`, `GROQ_MODEL`). Do not expose provider credentials to the browser.
- The seven AI capabilities use separate feature contracts/prompts and input facts; see `docs/AI_FEATURE_CONTRACTS.md`.
- Appointment assistant outputs suggestions; the booking engine still validates availability.
- Offer Recommendations produces reviewable drafts; it does not auto-publish offers.
- Public Booking AI can suggest slots; final slot validation and booking confirmation remain explicit.
- Customer Retention Assistant provides segments/recommendations, not an automatic outbound campaign.
- Without a configured provider key or when provider calls fail, supported endpoints can return labelled deterministic/calculated fallback content. Check AI metadata before describing an output as model-generated.

## 8. Email and reminder scheduling

Nodemailer sends verification, reset, appointment, cancellation and reminder messages when SMTP is configured. The reminder job is started in `backend/src/server.js` and is scheduled by `node-cron` with `0 9 * * *`.

Operational constraints:
- It runs inside each API process. Multiple API replicas can run duplicate jobs. Keep one backend instance until the scheduler is moved to a singleton worker/managed scheduler.
- The schedule uses the host process timezone, not each organization's timezone. Verify or redesign the schedule before relying on customer-facing reminders.
- SMTP configuration and delivery must be tested with the intended provider.

## 9. Deployment topology

```text
Browser
  |
  +--> Vercel static Vite SPA (frontend/)
           | REST API + Socket.IO
           v
      Render Node Web Service (backend/)
           |
           +--> MongoDB Atlas
           +--> Groq API (optional)
           +--> SMTP provider (optional)
```

- Root `render.yaml` configures the Render API service with `backend/` as `rootDir`, production mode, generated JWT secrets and `/health` health check.
- `frontend/vercel.json` rewrites SPA routes to `/index.html` for React Router deep links.
- Backend `CLIENT_URL` must be the exact public frontend origin. The API currently configures a single allowed CORS origin.
- `VITE_API_URL` and `VITE_SOCKET_URL` are public build-time browser configuration. They are not secrets.
- The full deployment process is documented in `docs/DEPLOYMENT_GUIDE.md`.

## 10. Explicit production limitations

1. Automated unit tests do not replace live MongoDB/HTTP/browser integration tests.
2. Appointment reservation is not atomic across concurrent requests/processes.
3. Guest booking OTP/ownership verification is not implemented.
4. Coupon concurrent redemption and cancellation/refund edge cases need further hardening.
5. Fine-grained authorization for every role and mutation route requires a complete review.
6. Email verification enforcement needs an explicit policy and implementation check.
7. Reminder scheduling is in-process and not per-organization timezone aware.
8. No payment gateway or recurring billing is connected; subscription plans are demo entitlements.
