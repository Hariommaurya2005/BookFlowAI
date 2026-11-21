# BookFlow AI — Deployment Guide (Day 12)

This guide targets the current repository layout: `backend/` is an Express API and `frontend/` is a React/Vite single-page app. The included `render.yaml` describes the Render API service. The included `frontend/vercel.json` enables Vite/React Router deep links on Vercel.

> Deployment is not performed by this guide. You must connect your own GitHub repository and provider accounts, create a MongoDB database, and enter your own secrets.

## 1. Pre-deployment gate

Before deploying, run the complete local checklist in `RELEASE_CHECKLIST.md`. At minimum:

```bash
# Backend
cd backend
npm install
npm test

# Frontend — in a second terminal, from the repository root
cd frontend
npm install
npm run build
```

Also start the local database and manually verify the flows in the integration/security and UI regression checklists. A passing unit suite is not proof that MongoDB, SMTP, Groq, Socket.IO, or the browser flows work end to end.

## 2. Prepare MongoDB Atlas

1. Create a MongoDB Atlas project and cluster.
2. Create a dedicated database user for BookFlow; do not reuse your personal admin account.
3. Use a long, unique database password and store the connection string securely.
4. Configure Atlas network access for the hosting provider's outbound IPs where practical. If a broad allow-list is temporarily required for a demo, use strong credentials and revisit the rule before commercial use.
5. Use the URI for the BookFlow database as `MONGO_URI` in the backend environment.

## 3. Deploy the backend to Render

### Blueprint option

1. Push the whole `bookflow/` repository, including the root `render.yaml`, to GitHub.
2. In Render, create a new Blueprint and select the repository.
3. Review the service configuration. `render.yaml` sets `rootDir: backend`, `npm install`, `npm start`, and `/health` as the health check.
4. Supply `MONGO_URI` and `CLIENT_URL` when prompted. `CLIENT_URL` can be updated after the frontend is deployed.
5. Render generates two separate JWT secrets through `generateValue: true`.
6. Deploy and open `https://<your-api-host>/health`. Expect an HTTP 2xx response with `status: "ok"`.

### Dashboard/manual option

Create a Render Web Service connected to the repository with:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Add the environment values listed in `ENVIRONMENT_VARIABLES.md`. Set `NODE_ENV=production`, `TRUST_PROXY=1`, a valid Atlas `MONGO_URI`, two different 32+ character JWT secrets, and the exact public `CLIENT_URL`.

After deployment, copy the public API origin (without `/api/v1`) for the frontend configuration.

## 4. Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Use the Vite framework preset, build command `npm run build`, and output directory `dist`.
4. Set these environment variables for Production (and Preview only when the preview environment has a matching backend CORS origin):

```env
VITE_API_URL=https://<your-api-host>/api/v1
VITE_SOCKET_URL=https://<your-api-host>
VITE_REQUIRE_WORK_EMAIL=false
```

5. Deploy. The `frontend/vercel.json` rewrite sends client-side routes such as `/login`, `/book/<slug>`, `/platform-admin`, and `/reset-password/<token>` to the SPA entry point.

## 5. Connect frontend and backend origins

After Vercel creates the production domain:

1. Set backend `CLIENT_URL` to the exact Vercel origin, e.g. `https://your-project.vercel.app` (no path).
2. Keep backend `REQUIRE_WORK_EMAIL` aligned with frontend `VITE_REQUIRE_WORK_EMAIL`.
3. Redeploy/restart the backend after environment changes.
4. Redeploy the frontend after changing any `VITE_` variable.
5. Confirm the browser's API requests use the deployed backend URL and that Socket.IO connects from the allowed frontend origin.

The backend currently allows the single `CLIENT_URL` origin. Vercel preview domains are not automatically trusted; use a separate staging configuration if previews need API access.

## 6. Configure optional integrations

### Email (Nodemailer)

Set `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, and `FROM_NAME`. The current transport is configured for non-implicit-TLS SMTP and port 587/STARTTLS. Test email verification, password reset, appointment confirmation, cancellation updates, and reminders with a real recipient. Do not assume that a successful API response means the SMTP provider accepted every message.

### Groq AI

Set `GROQ_API_KEY` and `GROQ_MODEL` in the backend only. Verify each AI tool and inspect its returned AI metadata; labelled fallback output is not proof that a live model request succeeded. Keep quotas and provider rate limits in mind.

## 7. Create the platform Super Admin (new production database only)

The Super Admin is created by a backend CLI script, not by public registration. Do not make the bootstrap password a permanent service environment variable.

Option A — run from a secure local terminal with the production `MONGO_URI` loaded in `backend/.env`:

```bash
cd backend
# Set PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD and optionally PLATFORM_ADMIN_NAME
# in a temporary, untracked backend/.env, then run:
npm run superadmin:bootstrap
```

Option B — use an authenticated provider shell, if available, and run the same command after temporarily supplying those three variables to that one-off process.

The password must be at least 14 characters. Remove temporary bootstrap variables immediately afterwards. Do not use `--reset-password` unless an intentional password rotation is required. Sign in at `/login`; the app routes the `super_admin` account to `/platform-admin`.

## 8. Post-deployment smoke test

- [ ] `GET /health` returns 2xx.
- [ ] Register a test business account and sign in.
- [ ] Verify email/reset links point to the deployed frontend domain (with SMTP configured).
- [ ] Create a service and staff member; create an appointment.
- [ ] Open the public `/book/<slug>` page in a signed-out/incognito browser and test a booking.
- [ ] Test appointment reschedule/cancellation and customer booking-management link.
- [ ] Test coupon validation and loyalty points earning/redemption/cancellation return.
- [ ] Check business plan entitlements and Super Admin controls using dedicated test accounts.
- [ ] Test AI with Groq configured and again with the key absent to confirm labelled fallback behavior.
- [ ] Test real-time notifications and email reminders.
- [ ] Review logs for crashes, repeated jobs, rejected CORS requests, and leaked sensitive values.

## 9. Hosting and operational limitations

- **Run one backend instance for this milestone.** The reminder job is started inside the API process. Multiple API instances would each run the same in-process cron and can send duplicate reminders. A separate singleton worker/managed scheduler is required before horizontal scaling.
- The reminder cron uses `0 9 * * *` in the host process timezone; it is not currently scheduled per organization's timezone. Verify actual host timezone and expected customer reminder timing before enabling production reminders.
- The `/health` endpoint is a basic HTTP liveness endpoint, not a dependency readiness probe.
- Appointment conflict checking occurs before insert; simultaneous booking requests may still race across processes. Atomic slot reservation/locking is a commercial-launch hardening item.
- Customer OTP/ownership verification for guest bookings is not implemented in this snapshot.
- Coupon concurrency protection and some accounting/refund edge cases require additional work.
- The current authorization rules require a role-by-role, route-by-route review before real business data is accepted. Email verification enforcement also needs an explicit product decision and implementation check.
- No payment gateway or recurring billing is connected. Free/Starter/Pro subscriptions are demo entitlements only.
- Do not scale multiple API replicas while the in-process cron is active.

## Official provider references

- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
- [Render environment variables](https://render.com/docs/configure-environment-variables)
- [Vercel: Vite SPA deployment and deep links](https://vercel.com/docs/frameworks/frontend/vite)
