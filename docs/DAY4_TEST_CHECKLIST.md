# Day 4 Manual Test Checklist

## Setup
1. Extract the complete Day 4 ZIP into a new folder (keep prior backups).
2. Copy your local `backend/.env` and `frontend/.env`; do not share secrets.
3. In separate terminals run backend `npm install`, `npm test`, `npm run dev`, and frontend `npm install`, `npm run build`, `npm run dev`.

## Currency
- [ ] Add/edit a service with price 300; all service UI locations should display `₹300` (not `$300` or USD).
- [ ] Check dashboard total revenue and chart Y-axis/tooltip.
- [ ] Check Analytics revenue chart/tooltip.
- [ ] Check customer summary total spend.
- [ ] Check public booking service price, booking confirmation and booking-management page.
- [ ] If SMTP is configured, inspect confirmation email price formatting.
- [ ] If Groq is configured, test customer summary/dashboard insight text for INR formatting.

## Cancellation policy and customer link
- [ ] In Settings, set cancellation window to 24 hours and save.
- [ ] Open the public booking page in a private/incognito window and make a test booking with an email address.
- [ ] Copy/open the private booking-management link from the confirmation screen or email.
- [ ] For an appointment more than 24 hours away, request cancellation: it should become cancelled automatically.
- [ ] Make another booking within the 24-hour window: request cancellation; it should remain scheduled and show pending approval.
- [ ] In the owner Appointments page, approve the request; verify appointment status becomes cancelled. Repeat with a separate booking and reject the request; verify it remains scheduled.
- [ ] Reopen the customer link and verify the current request/cancellation state is displayed.
- [ ] Try a missing/invalid token; request should fail safely without redirecting the customer to owner login.
- [ ] Check owner notifications, appointment list refresh and customer email when SMTP is configured.

## Report back
Record frontend build result, backend test counts and each manual scenario. Do not mark end-to-end verified until the customer and owner flows have actually been exercised in the browser.
