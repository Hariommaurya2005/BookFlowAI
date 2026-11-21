# Day 7 — Super Admin Console

## Implemented
- Added `isPlatformOrganization` to Organization so the CLI-provisioned platform tenant is not shown as a customer business.
- Added a CLI-only Super Admin bootstrap script (`npm run superadmin:bootstrap`). It uses `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, and `PLATFORM_ADMIN_NAME` from `backend/.env`. Password must be at least 14 characters. Public registration still hardcodes `business_owner` and never trusts a client-supplied role.
- Added server-authorized routes under `/api/v1/platform-admin`:
  - `GET /overview`
  - `GET /organizations?search=&status=all|active|suspended&page=1&limit=10`
  - `PATCH /organizations/:organizationId/status` with `{ "active": false, "reason": "..." }`
  - `GET /audit-logs?page=1&limit=20`
- Added a dedicated PlatformAuditLog model for organization suspend/reactivate actions.
- Added a responsive premium Super Admin Console with overview metrics, business search/filter, paginated list, suspend/reactivate modal, mandatory reason, and audit-log view.
- Sidebar navigation shows only Platform Console for super admins. Business users are redirected away from platform admin UI; server authorization remains authoritative.
- Existing access-token requests and refresh-token requests are rejected when an organization is inactive/suspended.
- Added unit tests for admin pagination, status filtering, regex escaping and status change payload validation.

## Bootstrap setup
1. In `backend/.env`, set `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD` (minimum 14 characters), and optionally `PLATFORM_ADMIN_NAME`.
2. Ensure `MONGO_URI` is correct and MongoDB is running.
3. From `backend`, run `npm run superadmin:bootstrap` once.
4. Start/restart backend and log in using the provisioned account through the normal login page. The email must not already belong to a different organization, because the existing login flow looks up user email without requiring an organization selector.
5. The user should arrive at `/platform-admin` and see Platform Console navigation.

## Scope boundaries
- Real payment gateway and recurring billing are not implemented.
- Plan entitlement configuration and demo subscription lifecycle remain future milestones.
- Abuse/report review intake is not implemented yet; this day provides safe access-status actions and audit history only.
- Browser integration and full Vite production build must still be verified on the user's machine.

## Verification performed in workspace
- Backend unit suite: 61/61 passed (`node --test`).
- All backend JavaScript files passed `node --check`.
- Frontend production build not run: npm dependency installation timed out in this workspace.
- Full browser/role/auth/MongoDB integration must be verified on the user's machine.
- Authentication middleware now distinguishes invalid/expired JWT errors from database/infrastructure errors, passing unexpected errors to the central error handler instead of incorrectly reporting them as invalid credentials.
