# Day 6 — AI Feature Wiring Test Checklist

## Setup
- Preserve the existing `backend/.env` and `frontend/.env` files. Keep `GROQ_API_KEY` only in the backend environment.
- Start MongoDB, then run backend `npm install`, `npm test`, `npm run dev`.
- In a second terminal, run frontend `npm install`, `npm run build`, `npm run dev`.

## Automated tests
- [x] Workspace backend suite: 56 passed, 0 failed.
- [x] Backend JavaScript syntax checks passed (all backend source/test JS files).
- [x] JSX/TSX syntax parsing: 36 files, no parse diagnostics.
- [ ] User-local Vite production build.

## Browser acceptance tests
- [ ] Dashboard always shows the Business Insights panel, including when AI is unavailable; refresh shows a loading state and API errors are visible/retryable.
- [ ] Staff page → AI Summary on a staff card opens a summary containing calculated counts/hours/revenue and clear `Groq AI` or `Calculated summary` status.
- [ ] Offers & Coupons → AI offer ideas shows three recommendations or clearly labeled rule-based ideas. “Review as draft” pre-fills the offer form but does not save automatically.
- [ ] AI Assistant → Customer Retention Assistant shows segment counts, aggregate recommendations and at-risk customers. Confirm that it does not send outreach.
- [ ] Public booking page → natural-language time request returns actual available slot suggestions. Selecting a suggestion fills the normal booking choices; booking is only created after the customer submits the confirmation form.
- [ ] Customers list → AI Summary and Customer Detail → Generate AI Summary remain working.
- [ ] Authenticated Smart Appointment Assistant still works for selected staff and service.
- [ ] Test with a real valid Groq key and inspect `aiPowered`/UI status. Then remove or invalidate the key and verify fallback labels; never treat fallback output as proof of live LLM success.
- [ ] Confirm that no Groq key or private customer detail appears in frontend network requests to a third-party provider. Frontend calls only the BookFlow backend.

## Known limitations / review before production
- A live Groq request has not been verified in this workspace.
- Frontend dependency install timed out here, so the production build remains user-local pending.
- Retention segments and offer recommendations are advisory; owner controls any customer outreach and offer creation.
- Public Booking AI suggests slots only; backend revalidates on final booking creation.
