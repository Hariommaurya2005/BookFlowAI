# Day 8 — Demo Subscription Setup and Testing

No new environment variables are required. Copy your existing `backend/.env` and `frontend/.env` from your working project; do not commit or share those files.

## Run backend

```powershell
cd backend
npm install
npm test
npm run dev
```

Expected workspace test result for this ZIP: 70 passed, 0 failed.

## Run frontend (second terminal)

```powershell
cd frontend
npm install
npm run build
npm run dev
```

## Owner subscription flow

1. Sign in as a business owner.
2. Open **Subscription** from the sidebar.
3. Review the current demo plan and monthly usage.
4. Select “Simulate Starter plan” or “Simulate Pro plan”. This creates a 30-day demo access period. No payment is processed.
5. Refresh the page and confirm the new plan/status is persisted.
6. Free plan allows 2 active staff, 5 active services, 50 appointments created per UTC calendar month, 10 AI requests/month, and 2 active offers.
7. Starter allows 5 staff, 20 services, 300 bookings/month, 100 AI requests/month, and 10 active offers.
8. Pro allows 25 staff, 100 services, 2,000 bookings/month, 1,000 AI requests/month, and 50 active offers.

## Super Admin flow

1. Sign in to the platform Super Admin account.
2. Open Platform Console → Businesses.
3. Click **Manage demo plan** for a test business.
4. Select Free/Starter/Pro and a status (Trial, Active, Grace period, Expired, or Suspended).
5. Set period/grace days and enter a reason of at least 8 characters.
6. Save and check the Plan status shown in the business row and the Audit Log.

## What plan limits do

- Free: AI appointment assistance, customer summary, and dashboard insights are allowed up to the 10 AI-request monthly limit. Advanced Staff Summary, AI Offer Recommendations and AI Retention are available on Starter/Pro demo plans.
- Creating staff/services, creating owner or public bookings, and creating offers are checked server-side against plan limits.
- After a plan is effectively expired/suspended, new booking/creation/AI actions return a clear API error. Existing records remain readable and appointment status/cancellation flows remain usable.
- Monthly AI usage resets by UTC calendar month. Booking creation usage is calculated from appointments created in that UTC month.

## Manual verification checklist

- [ ] Subscription page loads and shows Free plan for a new/default organization.
- [ ] Select Starter; UI updates and shows 30-day demo access.
- [ ] Select Pro; UI updates and Pro limits appear.
- [ ] Super Admin sets a test organization to Trial; status appears in the organization list.
- [ ] Super Admin sets an organization to Grace period; status and end date appear correctly.
- [ ] Super Admin sets an organization to Expired; the owner can still view existing records but plan-limited creation/AI calls are denied.
- [ ] Free plan's advanced AI routes return a useful feature-plan error; Starter/Pro allow them within the AI usage limit.
- [ ] Create staff/service/offer until the Free plan limit, then verify the next create is rejected with a plan-limit message.
- [ ] Public booking and AI suggestions fail cleanly when the subscription is expired or relevant limit is reached.
- [ ] Subscription changes appear in the platform audit log.
- [ ] Vite production build succeeds and browser console has no new runtime errors.

This is a demo entitlements system only. Payment gateway and recurring billing are intentionally deferred.
