# BookFlow AI — AI-Powered Appointment Scheduling Platform

BookFlow AI is a MERN-based, multi-tenant appointment management platform for salons, clinics, consultants, repair centers and other appointment-driven businesses. This repository contains the application source and deployment preparation for a portfolio/demo release.

> **Release status:** Core modules through Day 11 are implemented in source. Day 12 adds hosting configuration and handover documentation. Local browser/MongoDB integration, the frontend production build, provider setup and production smoke tests remain required before calling the project deployed or production-ready.

## Product capabilities

### Business workspace
- Organization-scoped appointments, customers, staff, services and business settings.
- Duration-aware appointment slot generation, staff schedules/leave, overlap checks, rescheduling and cancellation workflows.
- Public booking page at `/book/<organization-slug>`; guest booking matches or creates a customer within the selected business.
- Private booking-management links for supported customer cancellation requests.
- Offers and coupon validation with server-calculated discounts.
- INR price formatting across the customer-facing application.
- Dashboard, analytics, notifications and Socket.IO updates.

### AI capabilities
- Smart Appointment Assistant.
- Customer Summary.
- Dashboard Business Insights.
- Staff Summary.
- Offer Recommendations (draft/review, not automatic publishing).
- Public Booking AI slot suggestions (availability is still validated by booking logic).
- Customer Retention Assistant (insights/recommendations; no automatic message campaign).

Groq is called by the backend only when `GROQ_API_KEY` is configured. Without a valid key, supported tools use labelled deterministic/calculated fallback behavior. A response appearing in the UI does not by itself prove a live model call; inspect the returned AI metadata.

### Loyalty, administration and demo subscriptions
- Loyalty ledger: completed appointments earn 5 points per full ₹100 of net payable spend; 1 point equals ₹1 for redemption; redemption requires at least 100 points and is capped at 20% of the current payable amount. Supported cancellation flows return redeemed points.
- Platform Super Admin console with organization overview, suspend/reactivate controls and platform audit history. Super Admin creation is CLI-only.
- Free, Starter and Pro demo plans with lifecycle states and server-side feature/usage entitlements.
- **No payment gateway or recurring billing is connected.** Subscription plans are for demo/testing only.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide |
| Backend | Node.js, Express 4, Mongoose, MongoDB |
| Auth/security | JWT access/refresh tokens, bcryptjs, Helmet, CORS, express-rate-limit, express-validator/Joi |
| Realtime | Socket.IO |
| Email/scheduling | Nodemailer, node-cron |
| AI | Groq API from the backend |
| Tests | Node.js built-in test runner (`node --test`) |
| Suggested hosting | Render API + Vercel frontend + MongoDB Atlas |

## Repository structure

```text
bookflow/
├── backend/
│   ├── scripts/                 # CLI bootstrap tools
│   ├── src/
│   │   ├── config/              # Database connection
│   │   ├── controllers/         # HTTP request handlers
│   │   ├── cron/                # Appointment reminder schedule
│   │   ├── middleware/          # Auth, tenant, entitlement, audit, errors
│   │   ├── models/              # Mongoose data models
│   │   ├── routes/              # Versioned API route modules
│   │   ├── services/            # AI, email, loyalty, notifications, offers, subscriptions
│   │   ├── sockets/             # Authenticated Socket.IO behavior
│   │   └── utils/               # Domain rules and helpers
│   ├── test/                    # Unit/security tests
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # Shared UI and feature forms
│   │   ├── context/             # Auth and Socket.IO contexts
│   │   ├── layouts/             # Authenticated application shell
│   │   ├── pages/               # Business, public, AI and admin pages
│   │   ├── routes/              # Route guards
│   │   └── services/            # API and token storage
│   ├── vercel.json              # SPA deep-link rewrite
│   └── .env.example
├── docs/                        # Architecture, deployment and release checklists
├── render.yaml                  # Render backend Blueprint
├── MASTER_IMPLEMENTATION_CHECKLIST.md
└── README.md
```

## Local development

Use Node.js 22 LTS or newer supported Node.js 22/24 releases and a local MongoDB instance or Atlas database.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with MONGO_URI and two different random JWT secrets
npm run dev
```

API: `http://localhost:5000`  
Health endpoint: `http://localhost:5000/health`

Run backend tests:

```bash
npm test
```

### Frontend

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`

For local defaults, the frontend API and Socket.IO URLs in `frontend/.env.example` point to the local backend. Keep the backend `CLIENT_URL` and frontend `VITE_REQUIRE_WORK_EMAIL` / backend `REQUIRE_WORK_EMAIL` policies aligned.

### Bootstrap the platform Super Admin

Set `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD` (minimum 14 characters), and optionally `PLATFORM_ADMIN_NAME` in an untracked backend `.env`, then run:

```bash
cd backend
npm run superadmin:bootstrap
```

This is a one-time CLI operation against the database configured in `MONGO_URI`. Do not expose bootstrap credentials through public registration or keep temporary credentials in a long-lived hosting environment. The bootstrap command does not run automatically during normal server startup.

## Environment configuration

The complete ZIP includes both local `.env` files and the corresponding `.env.example` templates. The backend `.env` has a local MongoDB URI and unique development-only JWT secrets; SMTP, Groq and Super Admin bootstrap credentials are blank until you configure them. The frontend `.env` points to the local API. Replace these settings with your own values before connecting external services or deploying. No real MongoDB, Groq, SMTP or production credentials are included.

- Backend variables: [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md)
- Backend local config: [`backend/.env`](backend/.env)
- Frontend local config: [`frontend/.env`](frontend/.env)
- Backend template: [`backend/.env.example`](backend/.env.example)
- Frontend template: [`frontend/.env.example`](frontend/.env.example)

Important production settings:
- `NODE_ENV=production`
- Valid MongoDB `MONGO_URI`
- Two different randomly generated JWT secrets, each at least 32 characters
- Public HTTPS `CLIENT_URL` matching the frontend origin
- `TRUST_PROXY=1` only behind a trusted reverse proxy (Render deployment)
- Groq and SMTP secrets are backend-only; never expose them through `VITE_` variables

Vite `VITE_*` variables are embedded into the public browser bundle during build. They are public configuration and must never contain secrets.

## Deployment

The repository includes:
- `render.yaml` — Render Web Service Blueprint for the API, using `backend/` as its root directory and `/health` as its health check.
- `frontend/vercel.json` — Vercel SPA rewrite for React Router deep links.

Read [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) before deploying. It explains MongoDB Atlas, Render, Vercel, environment values, Super Admin bootstrap, smoke testing and operational limitations.

**Operational caution:** the reminder cron is started inside the backend process. Run only one backend instance until the scheduler is moved to a singleton worker/managed scheduler; multiple replicas may send duplicate reminders. Its current `0 9 * * *` schedule uses the server timezone, not each organization's timezone.

## Testing and release status

The Day 11 source snapshot records 89 passing backend unit/security tests and syntax parsing for 43 frontend JS/JSX files. This Day 12 package adds deployment configuration and documentation; it does not claim that provider deployment or live integration testing has happened.

Still required before a public release:
- Install dependencies and run the backend tests and frontend `npm run build` locally or in CI.
- Verify real MongoDB workflows with at least two organizations and multiple roles.
- Test Socket.IO, SMTP/email, reminder scheduling and live Groq calls.
- Complete the Day 10 security/integration and Day 11 responsive/accessibility checklists.
- Complete the [`final release checklist`](docs/RELEASE_CHECKLIST.md).

Known hardening items before commercial use include atomic cross-instance slot reservation, guest booking ownership verification, coupon concurrency/refund edge cases, full role-by-route authorization review, and explicit email-verification policy enforcement. See [`docs/FEATURE_MATRIX.md`](docs/FEATURE_MATRIX.md) for the feature-by-feature status.

## Project documentation

- [Architecture overview](docs/ARCHITECTURE_OVERVIEW.md)
- [Feature matrix](docs/FEATURE_MATRIX.md)
- [Master implementation checklist](MASTER_IMPLEMENTATION_CHECKLIST.md)
- [Environment variables](docs/ENVIRONMENT_VARIABLES.md)
- [Deployment guide](docs/DEPLOYMENT_GUIDE.md)
- [Final release checklist](docs/RELEASE_CHECKLIST.md)
- [Day 10 integration/security checklist](docs/DAY10_INTEGRATION_SECURITY_CHECKLIST.md)
- [Day 11 UI regression checklist](docs/DAY11_UI_REGRESSION_CHECKLIST.md)
- [Day 12 changelog](DAY12_CHANGELOG.md)

## License and usage

This repository is a portfolio/demo project. Before handling real customer records or charging businesses, complete the security, privacy, operational and legal review appropriate to the deployment jurisdiction. Demo subscription entitlements are not a billing system.
