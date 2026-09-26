# Kinesis Cars

A **car booking & fleet management platform** for Mauritius, hosted at
`cars.kinesis.world`. Rent vehicles from verified merchants, or manage your own
fleet — bookings, blockouts, driver verification and Stripe payments all
handled end-to-end by the **Kinesis API** (`https://api.kinesis.world/x/cars/`).

The frontend is a static Astro site that talks directly to the Kinesis API from
the browser. It is intentionally **framework-agnostic about the backend**: the
API base URL is loaded from `.env` at build time, so the same build works
against the local API during development and the production API when deployed.

---

## Features

**Roles** — three user roles are supported end-to-end:

- **CLIENT** — browse, book and pay for vehicles; submit driver verification.
- **MERCHANT** — create and manage fleets, vehicles and blockouts; advance
  bookings; issue refunds for their own vehicles.
- **ADMIN** — everything a merchant can do, plus user management, role changes,
  driver-verification (KYC) approval/rejection, and full visibility.

**Auth & accounts**

- Registration (CLIENT/MERCHANT) with server-side email verification
  (`/auth/verify`), login (username or email, optional 2FA/OTP), JWT
  re-authentication, forgot/reset password, profile editing
  (name/username/email/password/profile picture via media upload), account
  deletion, and two-factor enable/disable.

**Driver verification (KYC)**

- Clients upload their license front/back and a selfie; the images are stored
  privately (private media streaming) and an ADMIN reviews/approves or rejects
  the record. One verification per user.

**Fleets & vehicles**

- Merchants/admins create fleets, then list vehicles with full specs (make,
  body, transmission, fuel, location, price in MUR cents, min/max rental days,
  options, pictures). Vehicles are filtered, searched, sorted and paginated on
  the public browse page.

**Blockouts**

- Merchants/admins block a vehicle for a period (maintenance, fleet hold,
  unavailable) and delete blockouts. A `BOOKING` blockout is created
  automatically when a booking is paid for, and removed on refund. Availability
  logic also accounts for the min-rental window, so a car whose minimum rental
  would overlap a future blockout is treated as unavailable.

**Bookings & payments**

- Clients book available vehicles (dates + pickup/dropoff); the booking is
  created in `PENDING_PAYMENT` with a full financial snapshot (daily rate,
  subtotal, insurance, deposit, tax, total — MUR).
- Payment uses **Stripe embedded Checkout** (a Checkout Session with
  `ui_mode="embedded"`) mounted inline on the site — no redirect. Paying
  confirms the booking and creates the `BOOKING` blockout via Stripe webhooks.
- Bookings progress `PENDING_PAYMENT → CONFIRMED → CHECKED_OUT → CHECKED_IN →
COMPLETED`; merchants/admins advance them, clients can cancel
  (PENDING_PAYMENT/CONFIRMED), and merchants/admins issue full refunds
  (reversing the booking and its blockout).

---

## Tech stack

- [Astro](https://astro.build) — static output, `src/pages/*` routes
- [React](https://react.dev) islands (`@astrojs/react`) for all interactive UI
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
- [daisyUI 5](https://daisyui.com) components with a custom dark theme
  (`--color-primary: #9582F2`)
- [Stripe](https://stripe.com) — official Stripe.js loaded from Stripe's CDN,
  Embedded Checkout

## How it integrates with Kinesis API

- **Base URL** — `PUBLIC_API_URL` (dev `http://localhost:8080/x/cars/`, prod
  `https://api.kinesis.world/x/cars/`) is inlined into the client at build time.
  All API calls go through `AppProvider` (`src/context/AppContext.tsx`), which
  exposes `api(path)`, `request(path, init)` (auto-attaches
  `Authorization: Bearer <jwt>`), `login`, `reauthenticate`, `logout`, `upload`
  and `mediaUrl`.
- **Response envelope** — every route returns `{ status, message, ... }`; the
  body `status` is authoritative even when the HTTP status is 200. `request`
  throws an `ApiError` carrying the API `message` on any non-2xx body status.
- **Media** — images are uploaded to `POST /upload` on the API host (not under
  `/x/cars/`). Public media render as `<origin>/<path>`; private media (KYC
  documents) render via `<origin>/media/stream?media_id=…&access_token=…`.
- **Dev proxy** — in development the Vite server proxies `/x/cars/*` and
  `/upload` to `http://localhost:8080`, so the browser never hits CORS. In
  production, nginx proxies `/upload` to `https://api.kinesis.world`.

### API routes used

| Area                | Routes                                                                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                | `POST /auth/register` · `POST /auth/login` · `POST /auth/jwt` · `GET /auth/email/verify`                                                                                                                                                                                      |
| User                | `GET /user/me` · `GET /user/fetch` (admin) · `PATCH /user/update` · `PATCH /user/update/role` (admin) · `DELETE /user/delete` · `PATCH /user/forget/password` · `PATCH /user/reset/password` · `POST /auth/otp/generate` · `POST /auth/otp/verify` · `POST /auth/otp/disable` |
| Driver verification | `POST /user/verification` · `GET /user/verification/fetch` · `POST /user/kyc/verification` (admin)                                                                                                                                                                            |
| Fleets              | `POST /fleet/create` · `PUT /fleet/update` · `DELETE /fleet/delete` · `GET /fleet/fetch`                                                                                                                                                                                      |
| Vehicles            | `POST /vehicle/create` · `PUT /vehicle/update` · `GET /vehicle/fetch` (public, filterable)                                                                                                                                                                                    |
| Blockouts           | `POST /blockout/create` · `DELETE /blockout/delete` · `GET /blockout/fetch`                                                                                                                                                                                                   |
| Bookings            | `POST /booking/create` · `PATCH /booking/status` · `PATCH /booking/cancel` · `GET /booking/fetch`                                                                                                                                                                             |
| Payments            | `POST /payment/intent` · `PATCH /payment/refund` · `GET /payment/fetch`                                                                                                                                                                                                       |

---

## Getting started

```sh
bun install
cp .env.example .env   # point PUBLIC_API_URL at your Kinesis API
bun run dev            # http://localhost:4321
```

Background dev server:

```sh
bunx astro dev --background
bunx astro dev status
bunx astro dev logs
bunx astro dev stop
```

## Environment variables

| Variable                        | Default                             | Purpose                                                                                                          |
| :------------------------------ | :---------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_API_URL`                | `https://api.kinesis.world/x/cars/` | Base URL of the Kinesis Cars REST API (`/x/cars/`). In dev, use the relative `/x/cars/` (proxied) to avoid CORS. |
| `PUBLIC_MEDIA_ORIGIN`           | `http://localhost:8080`             | Origin for media URLs (`<origin>/<path>`), the API host without `/x/cars/`.                                      |
| `PUBLIC_UPLOAD_ORIGIN`          | _(empty)_                           | Base for `POST /upload`. Empty in dev so uploads go through the proxy; `https://api.kinesis.world` in prod.      |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…`                         | Stripe publishable key (public by design).                                                                       |

## Commands

| Command            | Action                                     |
| :----------------- | :----------------------------------------- |
| `bun install`      | Install dependencies                       |
| `bun run dev`      | Start local dev server at `localhost:4321` |
| `bun run build`    | Build your production site to `./dist/`    |
| `bunx astro check` | Type-check the project                     |
| `bun run preview`  | Preview your build locally                 |

## Deploy

The site is hosted at `cars.kinesis.world` behind Traefik. CI builds the Docker
image, pushes it to the Gitea registry and recreates the compose service — see
`.gitea/workflows/main.yml` for the pipeline and the Gitea variables/secrets it
requires. `nginx.conf.template` serves the static build and proxies `/upload`
to `https://api.kinesis.world/upload` (same-origin, so no CORS).

For Stripe payments, the API's Checkout callback URL should point back to the
site, e.g. `https://cars.kinesis.world/bookings`.

## Project structure

```text
/
├── .gitea/workflows/main.yml   # Build + deploy pipeline
├── Dockerfile                  # Multi-stage build (bun → nginx)
├── docker-compose.yml          # Traefik service definition
├── nginx.conf.template         # envsubst-processed nginx config
├── src
│   ├── components
│   │   ├── Header.astro        # Logo, nav, mobile menu
│   │   ├── Footer.astro        # Footer + API badge
│   │   └── react/              # All interactive islands:
│   │       ├── AuthNav.tsx, MobileMenu.tsx, ForMerchantsLink.tsx
│   │       ├── LoginForm.tsx, RegisterForm.tsx, ForgotPassword.tsx,
│   │       │   ResetPassword.tsx, EmailVerification.tsx
│   │       ├── AccountPanel.tsx, EditProfile.tsx
│   │       ├── DriverVerification.tsx, AdminUsers.tsx
│   │       ├── FleetsManager.tsx, VehiclesManager.tsx, VehicleForm.tsx,
│   │       │   VehicleBlockouts.tsx
│   │       ├── BrowseCars.tsx, FeaturedCars.tsx, VehicleDetails.tsx,
│   │       │   BookingPanel.tsx
│   │       ├── BookingsManager.tsx, PaymentsManager.tsx
│   │       ├── StripeEmbeddedCheckout.tsx, ApiBadge.tsx, Skeleton.tsx
│   ├── context/AppContext.tsx  # API client, envelope parsing, auth session
│   ├── lib/                    # validation, vehicles enums, dates, availability
│   ├── layouts/Layout.astro
│   └── pages/                  # All routes (login, register, account, browse,
│                               # car, fleets, vehicles, verification, bookings,
│                               # payments, admin/users, auth/forgot, auth/reset,
│                               # auth/verify, 404)
└── package.json
```
