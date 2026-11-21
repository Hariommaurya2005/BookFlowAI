# Day 7 — Super Admin Setup and Test Guide

## 1. Preserve the project backup
Extract this ZIP into a new folder. Do not overwrite Day 6. Copy your existing private `backend/.env` and `frontend/.env` into the new folders; do not commit those files.

## 2. Configure the platform-admin bootstrap values
In `backend/.env`, set:

```env
PLATFORM_ADMIN_EMAIL=your-unique-admin-email@example.com
PLATFORM_ADMIN_PASSWORD=use-a-long-unique-password-at-least-14-chars
PLATFORM_ADMIN_NAME=BookFlow Platform Admin
```

Keep `MONGO_URI`, JWT secrets and the rest of your current backend configuration. The admin email must be unique across users because the current login endpoint searches by email unless an organization ID is supplied.

## 3. Install dependencies and create the Super Admin
From the `backend` folder:

```powershell
npm install
npm test
npm run superadmin:bootstrap
npm run dev
```

The bootstrap is a command-line script, not a public endpoint. It creates/uses a separate internal `BookFlow Platform` organization and provisions a `super_admin` user. Public registration still creates only a `business_owner` and cannot choose its own role.

If you intentionally need to rotate an existing bootstrap account's password to the `PLATFORM_ADMIN_PASSWORD` value, run:

```powershell
npm run superadmin:bootstrap -- --reset-password
```

Do not use `--reset-password` unless you intend to rotate that account's password.

## 4. Start the frontend
From the `frontend` folder in another terminal:

```powershell
npm install
npm run build
npm run dev
```

Log in through the regular login screen using the configured platform admin email/password. The role should route to `/platform-admin` and the sidebar should show only Platform Console.

## 5. Test the Super Admin Console
- Confirm overview counts exclude the internal platform organization.
- Confirm business list search and Active/Suspended filters.
- Suspend a test organization using a documented reason of at least 8 characters.
- Confirm its previously issued user token now receives HTTP 403 for protected APIs and token refresh.
- Confirm the business appears as Suspended in the list and the action is present in Audit log.
- Reactivate the organization with a reason and confirm its members can log in again.
- Try opening `/platform-admin` with a normal business-owner account; the frontend should redirect and the API must return HTTP 403 if called directly.

Use a disposable test organization. Do not suspend your only real working organization during a demo.

## 6. Verified in working workspace
- Backend test suite: 61 passed, 0 failed.
- Backend JavaScript syntax checks passed.
- Frontend production build and live MongoDB/browser workflows remain to be verified on your PC.

## Scope boundaries
Abuse-report intake, plan entitlements, demo subscription lifecycle and real payments are not part of Day 7. Super Admin status actions and audit history are implemented; those later features remain on the master checklist.
