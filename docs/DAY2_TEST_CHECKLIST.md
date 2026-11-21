# Day 2 — Manual Test Checklist

Run these checks against the **Day 2 ZIP**, not an older extracted folder.

## A. Automated checks

From `bookflow/backend`:

```powershell
npm install
npm test
```

Expected: 31 tests pass, 0 fail.

## B. Start the application

1. Keep the backend running with `npm run dev`.
2. In a second terminal, run `npm install`, `npm run build`, then `npm run dev` from `frontend`.
3. Confirm `GET http://localhost:5000/health` returns `{"status":"ok", ...}`.
4. Sign in with a valid test account and open Appointments, Customer Details, Dashboard and AI Assistant.

## C. Appointment behavior

Use a test customer, active staff member and active service.

1. Request available slots for today's date. Slots earlier than the organization's current local time must not be returned.
2. Try creating a booking for a past date/time via the API. Expected: HTTP 422 with a future-date/time validation message.
3. Create a booking at an available future time. Confirm that the API calculates `endTime` from service duration.
4. Try creating another booking for the same staff with a time that overlaps the first booking but has a different start time. Expected: HTTP 409 conflict.
5. Reschedule a pending/confirmed appointment to a valid future slot. Confirm `appointmentDate`, `appointmentTime` and `endTime` update.
6. Try rescheduling a completed, cancelled, or no-show appointment. Expected: HTTP 409.
7. Try marking a pending appointment completed directly. Expected: HTTP 409; confirm pending -> confirmed -> completed works.
8. Confirm completed/cancelled/no-show appointments cannot be reopened through the normal status dropdown/API.

## D. Confirm the three AI features are different

Keep the same signed-in organization for these tests.

1. **AI Assistant:** select staff and service, then ask “tomorrow after 5 PM.” The response should contain a date, real available slots and an `aiPowered` field. If Groq is configured and working, `aiPowered` should be `true`; a fallback is `false`.
2. **Customer Summary:** open one customer's detail and click AI Summary. It should display the customer's relationship stage, visit-history summary, factual metrics and a Suggested follow-up. It should not return appointment time slots.
3. **Dashboard Insights:** open Dashboard. Insight cards should have a business-level title, observation and suggested action. Metrics should cover revenue, booking volume, service performance, cancellations and no-shows where data exists. It should not return a single customer's history or slot suggestions.

## E. What is not verified by this checklist yet

- Simultaneous booking requests across multiple server instances may still race; distributed reservation/locking is a later production hardening item.
- Live SMTP delivery and live Groq API responses require valid configuration and must be tested in your environment.
- Run and inspect the frontend production build locally before accepting the UI changes.
