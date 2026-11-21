# Day 1 — Baseline Audit and Verification Report

## Scope completed

Day 1 establishes the current codebase as the baseline before new product features such as public self-booking are added.

- Mapped the frontend route tree and backend REST modules.
- Mapped primary Mongoose models and organization relationships.
- Documented authentication, appointment and Groq AI request flows.
- Distinguished code that exists from flows that still require live verification.
- Ran the backend unit tests and JavaScript syntax checks.
- Recorded gaps that should guide the next implementation days.

## Verification results (current ZIP)

| Check | Result | Notes |
|---|---|---|
| `cd backend && npm test` | PASS — 24/24 | These are unit tests for AI service behaviour (mocked fetch), appointment date/time utilities, email policy and API response helpers. They do not call live Groq or MongoDB. |
| `node --check` for every `backend/src/**/*.js` and `backend/test/**/*.js` file | PASS | Checks JavaScript syntax only; it does not prove runtime routes or database operations work. |
| Frontend production build | NOT RUN | This working environment does not include installed frontend dependencies. Run `npm install` and `npm run build` on the user's computer. |
| Live API / MongoDB integration | NOT RUN | Requires dependencies, a running MongoDB and a configured local `.env`. |
| SMTP/email delivery | NOT RUN | Requires valid SMTP credentials and a safe test mailbox. |
| Live Groq call | NOT RUN | Requires a valid `GROQ_API_KEY`; unit tests mock the external request. |
| Browser end-to-end tests | NOT RUN | Must be completed on the user's local running app. |

## Confirmed product gaps in current code

1. **Public self-booking is missing.** Appointment endpoints use authentication and tenant context, and appointment creation requires an existing `customerId`. The frontend has no public `/book/:slug` route. Therefore, an external customer cannot yet book directly from a public business page.
2. **Offers and loyalty are missing.** No coupon/offer/reward model or corresponding API/UI was found in the current source tree.
3. **Super Admin console is missing.** The user role enum contains `super_admin`, but no dedicated admin route/page or business-management API is present.
4. **Subscription lifecycle is incomplete.** Organization has basic plan/expiry/active fields, but no complete trial/grace/expired entitlement enforcement and no payment gateway. Payment gateway is intentionally out of scope for this portfolio milestone.
5. **Email verification enforcement needs a decision.** Verification tokens/routes exist, but login currently does not require `isEmailVerified === true`.
6. **Role authorization needs a systematic review.** Many authenticated CRUD route groups use `authenticate` and `tenantGuard` without applying `authorize(...)` per operation.
7. **Concurrent booking race remains possible.** Current interval-overlap validation checks the database before creating the appointment but does not atomically reserve the slot under concurrent requests.
8. **Currency formatting is inconsistent.** Some UI uses a hard-coded rupee symbol while other components may show another symbol; a centralized organization/service currency formatter should be added later.
9. **Reminder scheduling deployment risk.** The cron job runs in each backend process. Multi-instance deployment needs a single scheduler/lock or an external job runner to avoid duplicate reminder attempts.
10. **Production readiness is not established by unit tests alone.** Full browser, integration, deployment and third-party service testing remains.

## Priority queue

- **Day 2:** public booking API design and reliable booking-engine edge cases; add a non-authenticated, rate-limited business lookup/slot lookup and safe customer booking flow only after its authorization/data model is designed.
- **Day 3:** role permissions, email verification policy, tenant/security tests, public endpoint abuse protection.
- **Day 4–5:** public customer booking UI and end-to-end connection.
- **Day 6–7:** offer/coupon and loyalty rules.
- **Day 8–9:** Super Admin and demo subscription lifecycle.
- **Day 10:** Groq workflow testing and fallback validation.
- **Day 11–12:** regression testing, polish, docs and deployment.

## Local verification checklist

Run from the extracted project folder in PowerShell.

### Backend terminal

```powershell
cd backend
npm install
npm test
npm run dev
```

Expected: unit tests pass; backend starts on port 5000 and logs a successful MongoDB connection. If MongoDB URI shows malformed database text, confirm `backend/.env` contains only the actual URI, e.g. `MONGO_URI=mongodb://localhost:27017/bookflow` for a local database.

### Health check

Open `http://localhost:5000/health`. Expected JSON has `status: "ok"` and a timestamp.

### Frontend terminal

```powershell
cd frontend
npm install
npm run build
npm run dev
```

Expected: production build completes and Vite prints the local URL (usually `http://localhost:5173`).

### Manual baseline flows

- [ ] Register an isolated test organization with a valid test email.
- [ ] Login/logout and verify page refresh behaviour.
- [ ] Create a service and staff schedule.
- [ ] Create a test customer.
- [ ] Create an appointment and verify it appears on the appointments page/dashboard.
- [ ] Try an overlapping appointment and confirm it is rejected.
- [ ] Reschedule an appointment and confirm the end time/slot changes correctly.
- [ ] Confirm other organization data is not visible (use a separate test organization).
- [ ] Test AI with a valid Groq key and inspect `aiPowered`/`aiModel`; never paste the key into chat.
- [ ] Verify fallback behaviour after temporarily removing the key only in a local test environment.

Do not mark a flow complete until it has been run and its result recorded.
