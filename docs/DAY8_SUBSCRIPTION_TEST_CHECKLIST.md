# Day 8 — Subscription Test Checklist

## Automated tests run in the workspace
- [x] Plan limits increase across Free, Starter and Pro.
- [x] Legacy `subscriptionPlan` / `subscriptionExpiry` fallback resolves.
- [x] Active subscription transitions into grace period when a grace date is still valid.
- [x] Grace period expires after its end date.
- [x] Expired subscription denies plan-limited actions.
- [x] Free plan does not include advanced AI; Starter includes it.
- [x] Admin subscription assignment accepts valid demo payloads.
- [x] Invalid plans, unreasonable duration, and missing reason are rejected.
- [x] Expired trial resolves to expired after trial and grace dates pass.
- [x] Paused-offer reactivation is checked against active-offer quota; deactivation remains allowed at quota.
- [x] Full backend test suite: 70 passed, 0 failed.
- [x] Backend syntax checks passed.
- [x] Frontend JS/JSX parser syntax checks passed.

## Pending user-side checks
- [ ] Full Vite build.
- [ ] Owner Subscription page in browser.
- [ ] Demo plan activation persists after refresh.
- [ ] Super Admin subscription assignment and audit log.
- [ ] Backend plan limits enforced against real MongoDB records.
- [ ] Expired subscription restrictions in real browser/API flows.
- [ ] Verify no existing Day 1–7 feature regressed.
