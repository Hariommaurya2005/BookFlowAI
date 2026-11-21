# Day 3 — Public Booking Test Checklist

## Setup

1. Extract the Day 3 ZIP into a new folder; keep previous ZIPs as backups.
2. Copy the existing `backend/.env` and `frontend/.env` into this extracted project. Never commit or share those files.
3. Start MongoDB.
4. In `backend`, run `npm install`, `npm test`, and `npm run dev`.
5. In a second terminal, in `frontend`, run `npm install`, `npm run build`, and `npm run dev`.
6. Log in as the business owner and open Settings → Public booking page. The endpoint backfills a public slug for existing organizations and displays the shareable URL.

## Owner setup checks

- [ ] Open Settings → Public booking page; confirm a URL like `http://localhost:5173/book/<slug>` is displayed.
- [ ] Copy and open the link in a private/incognito browser window.
- [ ] Disable online booking, open the public URL, and confirm the public page reports unavailable.
- [ ] Re-enable online booking.

## Customer journey checks

- [ ] Public booking page loads business name, active services and active staff without customer login.
- [ ] Pick a service, date and “Any available team member”; only available slots are shown.
- [ ] Choose a specific staff member; slots update accordingly.
- [ ] Confirm a past date is blocked by the date picker and backend rejects a crafted past-time request.
- [ ] Enter name plus phone only; booking is accepted when all data is valid.
- [ ] Enter name plus email only; booking is accepted when all data is valid.
- [ ] Submit without both email and phone; booking is rejected.
- [ ] Submit with invalid email/phone; request is rejected with a clear message.
- [ ] Confirm the success screen shows service, staff, date, time, duration-derived end time, currency and a reference.
- [ ] Confirm a customer record was created or matched inside the same organization.
- [ ] Confirm the appointment appears in the owner's Appointments page/dashboard.
- [ ] Confirm owner/receptionist notification is created.
- [ ] If SMTP is configured, verify the customer confirmation email arrives.
- [ ] Refresh the slot list after booking; the booked interval should no longer appear for the same staff.
- [ ] Disable public booking and verify the public API returns unavailable.

## Security / isolation checks

- [ ] Use a slug belonging to another test organization and confirm only that organization's public services/staff are returned.
- [ ] Use an invalid or inactive organization slug and confirm no private records are returned.
- [ ] Try service/staff IDs from a different organization and confirm booking is rejected.
- [ ] Check that the public business response does not include user emails, customer records, staff email addresses, or appointment history.

## Report actual outcomes

Do not mark a browser or live API check as passed merely because source code compiles. Record failures and backend logs, omitting credentials and personal data.
