# WriteSpace

A React / JavaScript / Vite / Tailwind browser-local blogging demonstration. Guests discover recent local posts; registered users write/read/edit their own posts; Admins oversee all posts and create/remove eligible accounts.

## Demo only — never use real credentials
Passwords are stored in plaintext in browser localStorage. Built-in Admin is `admin` / `admin`. Client-side route and ownership checks are not secure authorization. All posts, users and sessions belong to this browser profile only; they are not shared, synced, backed up, or sent to AWS. Do not use real passwords or sensitive information. Clearing site storage deletes local data. Quota/write denial shows non-success but no repair, rollback or concurrency guarantee exists.

## Run
Node 20+ and npm required. Application root is `frontend/`.

```sh
cd frontend
npm ci --no-bin-links
npm run dev
```
Copy `.env.example` to an untracked `.env` to customize Vite host/port. Static assets bake public configuration at build time; there is no backend URL or database. Playwright configuration accepts environment variables E2E_BASE_URL, VITE_PREVIEW_HOST and VITE_PREVIEW_PORT directly.

## Verification
```sh
cd frontend
node node_modules/vitest/vitest.mjs run
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js install chromium
node node_modules/@playwright/test/cli.js test --workers=1
```
283 unit/component tests and 42 Chromium journeys passed during Developer verification. Browser tests use isolated real localStorage, click actual controls, verify saved data/reloads, and fail on console/page errors. They cover guest/role/deep-link boundaries, validation, owner/Admin CRUD and 390/768/1024 layouts. `scripts/preflight.mjs` captures representative accessibility snapshots, styles, HTML and screenshots; run against a live production preview. Modern Playwright uses body.ariaSnapshot, replacing the removed page.accessibility API. API/database tests are not applicable.

## Container
From repository root:
```sh
docker build -t writespace-frontend frontend
docker run --rm -p 8080:80 writespace-frontend
```
Two-stage Node build/nginx runtime, listens on all container interfaces port 80. `/` returns the entry document for health; client routes fall back to index.html. No reverse proxy/API/database. Image build and root/deep-link checks passed locally. AWS ECR/ECS/ALB/CloudFront/CloudFormation deployment and image promotion belong to downstream DevOps and were not performed here. Rolling back assets does not restore browser data.

## Design and product decisions
JavaScript JSX only, one BrowserRouter, no Context/state library. Tailwind theme/plugin defines warm-paper editorial tokens; index.css contains directives only. Local keys: writespace_posts, writespace_users, writespace_session. Human clarification permits created Admin login to /admin and four distinct dashboard counts: Total posts, Total users (including built-in), Admins (including built-in), Your posts. Existing story groupings remain provisional traceability, not an invented canonical allocation.

## Known dependency warnings
The retained Vite 5/Router 6 stack and pinned development tooling report 9 npm audit findings (2 moderate, 5 high, 2 critical) after the Playwright upgrade to 1.65.0. These include development-server/test-runner advisories and Router redirect advisories. No force-major upgrade was applied across source-mandated framework families. Do not expose development or Vitest UI/API servers to untrusted networks; deploy only the built nginx bundle. App routes are fixed or encode post IDs and no server-side Router hydration is used, but this is not a security certification or audit clearance. Review/update dependency families before any production use; the plaintext demo model itself is unsuitable for production identity.
