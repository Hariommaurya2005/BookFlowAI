# BookFlow AI — Day 2 Change Log

## Theme
Appointment engine hardening and clearly differentiated AI feature behavior.

## Backend changes

- Added timezone-aware past-slot validation for the organization timezone.
- Settings now reject invalid IANA timezone identifiers; legacy missing/invalid timezone values use the `Asia/Kolkata` fallback in the past-slot helper.
- Available-slot endpoints exclude times that have already passed today.
- Appointment creation rejects past dates/times.
- Appointment rescheduling rejects past dates/times and prevents rescheduling terminal `completed`, `cancelled`, or `no_show` appointments.
- Added explicit status transition rules: `pending -> confirmed/cancelled`; `confirmed -> completed/cancelled/no_show`; completed/cancelled/no-show are terminal. Repeating the same status is idempotent.
- AI smart suggestions also filter out past slots, so the assistant cannot recommend a time that has already passed today.
- Customer summaries now calculate completed visits and total spend across the full appointment history rather than treating the latest 20 appointments as the full lifetime total.
- Customer AI output is now a structured customer-retention brief with a specific summary and recommended follow-up action.
- Dashboard AI insights now use aggregate business metrics: revenue trend, booking volume, service performance, cancellations, and no-shows. Insight cards include distinct category/title/observation/action fields.
- The dashboard UI and customer detail UI display those different outputs as separate information types.
- Appointment status dropdown options now match permitted transitions, and API errors are displayed in the page.

## Tests

- Added timezone-aware past-slot unit tests.
- Added appointment-status transition unit tests.
- Backend unit test suite: 31/31 passed in this workspace.
- Backend `node --check` passed for the edited controllers/utilities.
- Full Vite build, browser flows, live MongoDB/API integration, and live Groq response were not run in this workspace and still require local verification.

## Known limitations

- Pre-insert overlap checks still have a simultaneous-request race across multiple app instances. A future production release should use a distributed reservation strategy or database-backed locking/transaction approach appropriate to the deployed MongoDB topology.
- Organization timezone strings should be validated in settings before commercial use.
- AI text is schema-validated and constrained to supplied metrics, but model-generated prose still needs review and live API testing; UI fallback is not proof of live AI.
- Public customer booking, offers/loyalty, Super Admin, and demo subscription lifecycle are still not implemented in this Day 2 change set.
