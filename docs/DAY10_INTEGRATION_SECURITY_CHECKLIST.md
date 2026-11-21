# Day 10 — Local Integration & Security Test Checklist

Run after extracting the Day 10 ZIP and configuring the local `.env` files. Keep two separate test organizations and at least two user accounts available for tenant-isolation checks.

## A. Startup and health

- [ ] Start MongoDB.
- [ ] Start backend with `NODE_ENV=development` and valid local MongoDB/JWT settings.
- [ ] Open `http://localhost:5000/health`; verify `{ "status": "ok" }`.
- [ ] Start the Vite frontend and sign in as a business owner.
- [ ] Run `cd backend && npm test`; verify 89 tests pass.

## B. Authentication and session invalidation

- [ ] Login with valid credentials; verify API calls succeed.
- [ ] Login with an incorrect password; verify `401`.
- [ ] Call `/api/v1/auth/refresh-token` with a malformed token; verify `401`, not `500`.
- [ ] Logout; retry `/api/v1/auth/me` with the old access token; verify `401`.
- [ ] Login again, change the password in Settings, and retry an old access token; verify `401`.
- [ ] Repeat using the forgot/reset-password flow with SMTP configured; prior sessions must be invalidated.
- [ ] Exceed the login limit (more than 10 requests in 15 minutes from one IP); verify `429`.
- [ ] Exceed registration/recovery limits (more than 5 requests in 15 minutes from one IP); verify `429`.

## C. Tenant isolation

- [ ] Create or use Organization A and Organization B with separate owners.
- [ ] Create customers and appointments in both organizations.
- [ ] Sign in to Organization A; verify its customer list/history and appointment data contain no Organization B records.
- [ ] Verify notifications and mark-as-read actions only affect the signed-in user's own organization notifications.
- [ ] Verify offers, loyalty balances/ledger, staff, services and subscription details remain organization-scoped.
- [ ] Try using an Organization B record ID while authenticated as Organization A; the API should return not found/denied without returning the record.

## D. Query and payload hardening

- [ ] Search customers using `.*`, `[`, `(`, `+` and backslashes; each must be treated as literal text.
- [ ] Request `?limit=10000`; verify no more than 100 records are returned.
- [ ] Request malformed/negative pagination values; verify safe defaults.
- [ ] Send JSON larger than 2 MB and URL-encoded data larger than 100 KB; verify the request is rejected.

## E. Socket.IO authorization and logs

- [ ] Connect Socket.IO with a valid access token; verify the current organization room is joined.
- [ ] Emit `join:org` with a different organization ID; verify `socket:error` is returned and the foreign room is not joined.
- [ ] Try connecting with a token invalidated by logout/password change; verify connection rejection.
- [ ] Suspend an organization in Super Admin and try a new socket connection with its old access token; verify rejection.
- [ ] Trigger password reset/email verification and inspect backend access logs; raw tokens must not appear.

## F. Production configuration guard

- [ ] Set `NODE_ENV=production` with placeholder/short JWT values; backend startup must fail.
- [ ] Set identical access and refresh secrets; backend startup must fail.
- [ ] Set `CLIENT_URL=http://localhost:5173`; production startup must fail.
- [ ] Configure MongoDB URI, two different random JWT secrets (at least 32 characters each), and a public HTTPS `CLIENT_URL`; startup should pass.
- [ ] When deployed behind Render or another trusted reverse proxy, set `TRUST_PROXY=1` so IP rate limiting uses the client IP supplied by the trusted proxy.

## G. Core product regression

- [ ] Register/login and verify email flow.
- [ ] Create a service, staff member, customer and appointment.
- [ ] Verify slot availability and conflicting booking prevention.
- [ ] Confirm, complete, cancel and reschedule appointments according to allowed status transitions.
- [ ] Complete a qualifying appointment and verify Day 9 loyalty points are awarded once.
- [ ] Redeem loyalty points and cancel the eligible appointment; verify the points return once.
- [ ] Apply a valid/invalid coupon on the public booking page and verify server-calculated pricing.
- [ ] Change demo subscription plan/status and verify server-side feature entitlements.
- [ ] Verify dashboard, AI endpoints/fallbacks, notifications, email and reminder behaviour with their real local configuration.

## Evidence to capture

Record the test date, browser/Node versions, MongoDB environment, test organization names (avoid real customer data), pass/fail result, and screenshots or sanitized API responses for every failed case. Do not include passwords, JWTs, reset links, SMTP credentials or Groq API keys in evidence.
