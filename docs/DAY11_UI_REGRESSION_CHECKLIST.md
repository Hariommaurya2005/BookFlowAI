# Day 11 — UI Regression Checklist

## Responsive screen review

Review the following viewport widths in browser developer tools or on physical devices:

- [ ] 320px — no page-level horizontal overflow; controls remain usable.
- [ ] 375px — mobile navigation, header, cards and form controls fit.
- [ ] 768px — tablet layout and mobile/desktop navigation transition.
- [ ] 1024px — dense dashboards and tables remain readable.
- [ ] 1440px — desktop sidebar, top bar, cards and charts remain balanced.

Wide data tables are allowed to scroll horizontally inside their own cards. The overall page should not be forced wider by those tables.

## Dialog keyboard/accessibility review

- [ ] Opening a modal moves focus to its close control.
- [ ] Tab and Shift+Tab stay inside the modal.
- [ ] Escape closes the modal.
- [ ] Backdrop click closes the modal.
- [ ] Closing restores focus to the control that opened the modal.
- [ ] Modal body scrolls internally when its content is taller than the viewport.
- [ ] Page scrolling is restored to its previous state after close.

## Core workflow regression

- [ ] Login/logout and route protection.
- [ ] Dashboard metrics and charts.
- [ ] Appointment creation, status update, cancellation review.
- [ ] Customer search, create, edit, detail and AI summary.
- [ ] Loyalty points earning, duplicate prevention, redemption and cancellation refund.
- [ ] Staff and service CRUD.
- [ ] Offers and coupon validation/application.
- [ ] AI assistant tools and fallback states.
- [ ] Subscription demo plan selection and entitlement restrictions.
- [ ] Super Admin organizations, demo plan management and audit log.
- [ ] Public booking selection, coupon and confirmation pages.

## Build/test commands

Run in separate terminals from the project root:

```bash
cd backend
npm test
```

```bash
cd frontend
npm run build
```

SMTP delivery, live Groq requests, live MongoDB isolation, multi-instance concurrency and hosted deployment require real environment credentials/services and are not covered by a local frontend build.
