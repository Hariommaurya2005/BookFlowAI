# Day 3 update — Single-panel sign-in and public showcase access

## Why this change
The old login layout used a two-column marketing panel with a fake dashboard preview. The preview showed arbitrary sample numbers and distracted from the only important task: signing in. Public portfolio viewers were also blocked from signing in with common personal email providers.

## What changed

### Frontend
- Replaced the split-screen Login composition with a single centered card.
- Added a restrained animated orbit mark, slow ambient gradient movement, light dot pattern, accessible show/hide password control, field errors, remember-me, forgot-password and create-account links.
- Kept the content short and removed fake metrics and made-up appointment previews.
- Login, registration and forgot-password now use the same email policy helper.
- Public-mode placeholders use `you@example.com`; B2B mode uses a work-email placeholder.
- Updated Axios session clearing copy matching so an explicitly enabled B2B-only policy can clear a disallowed session.

### Backend
- Added `isValidEmail`, `isAllowedEmail`, `isWorkEmailRequired`, and policy-specific message helpers.
- Registration, login, password reset, protected HTTP authentication and Socket.IO authentication follow the same environment-configured policy.
- Public mode is the default, allowing personal email domains while still validating email syntax.
- Changed duplicate-account error wording so it applies to personal or work emails.

## Configuration

Public demo/portfolio mode (default):

Backend `backend/.env`:
```env
REQUIRE_WORK_EMAIL=false
```

Frontend `frontend/.env`:
```env
VITE_REQUIRE_WORK_EMAIL=false
```

For B2B-only mode, set both to `true`. Restart the backend and restart/rebuild the frontend after changing them. Keep the flags matched to prevent the form and API from showing conflicting policy behavior.

## Verification
- Backend unit tests: 24/24 passed.
- Frontend JS/JSX syntax transpile check: 36 files, zero syntax errors.
- CSS syntax parse: 224 rules, zero parser errors.
- Full browser visual test and production Vite build still require installing the frontend dependencies locally.
