# Pahadi Seat

**Kal ghar jaana hai?** Pahadi Seat is a hyperlocal shared-taxi seat-booking platform for Uttarakhand. It connects passengers who need a seat with verified local drivers who are already driving that route and have empty seats.

Launch corridor: **Dehradun ↔ Chamoli** (via Rishikesh, Devprayag, Srinagar, Rudraprayag, Gauchar, Karnaprayag), plus **Dehradun ↔ Rudraprayag** and **Dehradun ↔ Srinagar**. Admins can add more routes and towns from the admin panel.

---

## Features

### Passengers
- Search by from / to / date / passengers. Results come straight from the database. A Dehradun → Rudraprayag trip also shows up for Dehradun → Srinagar, priced for that part of the route only.
- Ride details: driver profile, rating, verification badge, vehicle (number partly masked), the full stop timeline, live seat map, cancellation policy and reviews.
- Visual seat selection. Available seats can be clicked, booked seats are disabled, and the total updates as you pick.
- Booking flow: choose boarding and drop stops, add a name per seat and a contact phone, review the summary (fare + platform fee), then confirm.
- Booking confirmation and ticket with a print / download view, call and WhatsApp buttons for the driver, and cancellation with the refund amount shown first.
- Dashboard with next trip, upcoming and past trips, saved routes, ride alerts ("notify me when a ride is listed"), 1–5★ rating after a completed trip, and issue reporting.

### Drivers
- Registration, then onboarding: profile photo, licence number and document, vehicle details, RC, insurance and permit, plus photos of the actual vehicle.
- **Live vehicle preview.** As the driver picks a type, model and colour, the form shows a picture of the vehicle (see [Vehicle images](#vehicle-images)).
- A driver can't publish rides until an admin verifies them, and each vehicle needs separate approval.
- Create a trip: route, vehicle, date, time, journey length, boarding and drop landmarks, intermediate stops with fares, seats, price and cancellation window. A preview step comes before **Publish Ride**.
- Trip management:
  - Passenger list showing **where each person gets down**, with call and WhatsApp buttons.
  - Stop plan ("↑ 2 boarding · ↓ 1 getting down").
  - Seat map. The driver can tap a free seat to block it for an offline passenger.
  - Mark boarded & paid / no-show, start the trip, complete the trip, cancel with a reason.
  - Change seats only when it's possible (can't reduce below the highest booked seat or exceed vehicle capacity).
- Dashboard: upcoming trips, total passengers, seats sold, earnings and cancellation rate. Also includes bookings, passengers, earnings (monthly chart, collected vs to-collect), vehicles and profile pages.

### Admin
- Overview: users, drivers, verified drivers, active trips, bookings, completed trips and platform revenue, plus charts of bookings and revenue over time, popular routes and the booking funnel.
- Driver verification with each document openable, approve / reject (with reason) / suspend / reinstate, and an audit history.
- Vehicle approval, trip and booking tables (admins can cancel either), and passenger management with suspend / reactivate (suspending signs the user out immediately).
- Route management: add or edit routes with ordered stops, optionally creating the return route; activate / deactivate routes; add or hide towns. Coordinates are optional and stored for future maps.
- Complaints workflow, review moderation (hiding a review recalculates the driver's rating), and an analytics page:
  - searches, ride views, booking attempts, successful and cancelled bookings
  - revenue, active drivers and passengers
  - popular routes, average seats per trip, average booking value, driver utilisation

### Cinematic homepage
- **3D Himalayan valley hero.** Built with React Three Fiber, Drei and three.js. It's generated in code (`features/home/scene/`): forested, rocky and snow-dusted terrain; three hazy far ridges; fog, mist, sun glow and floating particles; deodar forests; a winding mountain road; and a stylized Bolero shared-jeep with roof carrier and luggage driving along it.
- **Camera.** On load the camera eases from a wide Himalaya shot down into the valley. As you scroll (GSAP ScrollTrigger) it follows the jeep, then pulls up to an aerial view of the whole road. The three story panels (Pahad / Safar / Jodna) scroll with it.
- **Route visualization.** Towns are placed from the coordinates stored in the database, and the map is clearly labelled **schematic**: straight lines show stop order, not the road. Distance and time come from route data.
- **Other sections.** Live "next rides" from the database, a scroll-driven driver story with a sample phone mock (Motion), and scroll reveals on content sections.
- **Performance and accessibility.**
  - three.js and GSAP are code-split and loaded only when the 3D renders. The hero text is server-rendered with a CSS-only entrance, so it never waits on JavaScript.
  - The render loop pauses when the hero is off-screen or the tab is hidden. Pixel ratio is capped and drops automatically if FPS falls.
  - Phones and low-core devices get a lighter scene: fewer triangles, trees and particles, and no shadows.
  - A static illustrated fallback is used with `prefers-reduced-motion`, Save-Data, ≤2 GB device memory, or no WebGL.

### Platform
- In-app notifications for booking confirmed or cancelled, trip updated or cancelled, new booking, reminders, verification results and ride alerts. The channel interface is ready for SMS, WhatsApp and email.
- Trip reminder cron endpoint.
- SEO: per-page metadata, Open Graph image, `sitemap.xml`, `robots.txt`, semantic HTML.
- Mobile-first: a bottom navigation bar on dashboards and tables that scroll sideways on small screens. Tested at 375px and desktop.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Cache Components, `proxy.ts`) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4, lucide-react icons |
| 3D & motion | three.js, React Three Fiber, Drei, GSAP ScrollTrigger, Motion (public homepage only) |
| Database | PostgreSQL + Prisma ORM 6 |
| Auth | Custom, database-backed sessions (bcrypt, httpOnly cookie, SHA-256 hashed tokens) |
| Validation | Zod 4 on every server action / route |
| Mutations | Server Actions; REST route handlers for files, cron, health and payment webhooks |

**Why custom sessions instead of NextAuth?** The app needs email + password with roles and immediate revocation (suspending a user kills their sessions). Server-side sessions in Postgres give that with no extra dependency, and they work cleanly with Next 16. Passwords use bcrypt (12 rounds), and only a SHA-256 hash of the session token is stored.

## Project structure

```
app/                 Routes (App Router)
  (site)/            Public pages: landing, search, ride, booking, routes, auth, content
  passenger/         Passenger dashboard
  driver/            Driver dashboard, onboarding, trips, vehicles, earnings
  admin/             Admin panel
  api/               files, cron/reminders, payments/webhook, health
auth/                Sessions, password hashing, role guards
components/          Reusable UI (ui/, layout/, charts/)
features/            Feature UI + server actions (auth, search, rides, booking, driver, vehicles, admin, passenger, account)
server/
  services/          Business logic: bookings (seat inventory), trips, inventory locks
  queries/           Read models for pages
  payments/          Payment provider abstraction (pay-to-driver, Razorpay)
  notifications/     In-app notifications + channel interface
  storage.ts         File storage abstraction (local disk → S3 later)
validation/          Zod schemas
database/            Prisma schema, migrations, seed
lib/                 Formatting (IST-aware), constants, utils, rate limiting
scripts/e2e-flow.ts  End-to-end business-rule test against the real DB
proxy.ts             Fast-path auth redirect for private areas
```

## Seat inventory and booking rules

Each trip has one `TripSeat` row per physical seat. Booking a seat works like this:

1. The trip row is locked with `SELECT … FOR UPDATE` inside a transaction. This serialises every inventory change on that trip.
2. The server rejects the booking if the trip is not `SCHEDULED`, departs within 30 minutes or has already left, the driver is unverified, the user is the driver, the seat numbers are invalid, or the user already has an active booking on this trip.
3. Seats are claimed with a conditional update: `UPDATE … SET BOOKED WHERE status = AVAILABLE`. If fewer rows change than requested, the whole transaction rolls back.

**Cancellations.** Cancelling returns the seats to `AVAILABLE` in the same locked transaction. Refunds follow the trip's free-cancellation window: full refund before it closes, 50% of the fare after. Driver or admin cancellations always refund in full.

**Example.** 8 seats with bookings of 2 + 2 + 1 leaves 3 available. If 5 people try to book the same two seats at the same moment, exactly one succeeds. `scripts/e2e-flow.ts` checks both of these.

---

## Getting started

### 1. Prerequisites
- Node.js ≥ 20.9
- PostgreSQL 14+ (or Docker)

### 2. Environment
```bash
cp .env.example .env
```
Edit `DATABASE_URL` if you are not using the bundled Docker database.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical URL for SEO / sitemap |
| `CRON_SECRET` | ✅ | Bearer token for `/api/cron/reminders` |
| `STORAGE_DIR` | – | Upload directory (default `./storage`, git-ignored) |
| `DEMO_PASSWORD` | – | Password for seeded demo accounts (default `Pahadi@2026`) |
| `SEED_DEMO_ACCOUNTS` / `SHOW_DEMO_ACCOUNTS` | – | Allow demo accounts / the login hint in production (off by default) |
| `PAYMENT_PROVIDER`, `RAZORPAY_*` | – | Online payments (see below) |
| `NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY` | – | 360° studio vehicle images (see below) |
| `NOTIFY_SMS_ENABLED`, `NOTIFY_WHATSAPP_ENABLED`, `NOTIFY_EMAIL_ENABLED` | – | Turn on external notification channels |

### 3. Database
```bash
docker compose up -d          # starts Postgres on :5432 (skip if you have your own)
npm install                   # also runs prisma generate
npm run db:deploy             # apply migrations (or `npm run db:migrate` while developing)
npm run db:seed               # load development data
```

### 4. Run
```bash
npm run dev                   # http://localhost:3000
```

### Useful commands
| Command | What it does |
|---|---|
| `npm run db:migrate` | Create / apply a migration after editing `database/schema.prisma` |
| `npm run db:reset` | Drop, re-migrate and re-seed the dev database |
| `npm run db:studio` | Browse data in Prisma Studio |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npx tsx --conditions=react-server scripts/e2e-flow.ts` | End-to-end business-rule test (creates `@e2e.test` users) |

---

## Seed data and demo logins

`npm run db:seed` **wipes the database** and loads clearly-marked development data (`isSeedData = true`, emails ending `@seed.pahadiseat.in`):

- 10 locations (Dehradun, Rishikesh, Devprayag, Srinagar, Rudraprayag, Agastyamuni, Ukhimath, Guptkashi, Haridwar, Kirtinagar)
- 4 routes: Dehradun ↔ Rudraprayag, Dehradun ↔ Srinagar
- 10 drivers: 8 verified, 1 pending review, 1 rejected
- 20 vehicles, 50 passengers
- 20 trips (14 upcoming, 6 completed) with bookings, payments, reviews and analytics events

| Role | Email | Password |
|---|---|---|
| Passenger | `passenger@demo.com` | `Pahadi@2026` |
| Driver (verified) | `driver@demo.com` | `Pahadi@2026` |
| Admin | `admin@demo.com` | `Pahadi@2026` |

The login page has one-tap buttons to fill these in. **Demo credentials are never shown or seeded in production.** The login hint is hidden when `NODE_ENV=production`, and the seed skips demo accounts unless `SEED_DEMO_ACCOUNTS=true`.

## Admin setup (production)

Create the first admin by registering normally, then promote that account in the database:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@yourcompany.in';
```
Admins can then verify drivers, approve vehicles and manage routes from `/admin`.

## Demo mode (no database yet)

If `DATABASE_URL` is missing, `DEMO_MODE=true` is set, or the database can't be reached, the public site switches to built-in sample content (`server/demo-data.ts`). The homepage, search, ride details and route pages all work, and a yellow "Demo preview" strip appears at the top. Login, booking and dashboards show a friendly "database not connected" message instead of erroring. Once a real `DATABASE_URL` is set and migrated, the site uses the database automatically.

## Production deployment

1. Provision PostgreSQL and set `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` and a strong `CRON_SECRET`.
2. `npm ci && npm run db:deploy && npm run build && npm start`. Any Node host works (Railway, Render, Fly, a VM); for Vercel, see the storage note below.
3. Schedule reminders every 15–30 minutes:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/reminders
   ```
4. **File storage.** The default adapter writes to local disk (`STORAGE_DIR`), which suits a single server with a persistent volume. For serverless or multi-instance setups, implement `StorageProvider` in `server/storage.ts` with S3, R2 or GCS. Files are never served from `/public`. Verification documents are only readable by the owning driver and admins through `/api/files/…`.
5. **Rate limiting** is in-memory per instance (`lib/rate-limit.ts`). Swap the store for Redis or Upstash when you run more than one instance.
6. Health check: `GET /api/health`.

## Payments

`server/payments/index.ts` defines a `PaymentProvider` interface.

- **Default: `pay_to_driver`.** This is the MVP mode, used when no gateway credentials are set. The booking is **CONFIRMED** (the seat is reserved) and the payment stays **PENDING**. Nothing is marked as paid until the driver taps **Boarded & paid**. No payment is ever faked.
- **Razorpay.** Set `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`. Bookings are then created as **PENDING**, seats are held for 15 minutes, and a Razorpay order is created. `POST /api/payments/webhook` checks the signature, marks the payment PAID and confirms the booking. Expired holds release their seats automatically.
- **Still to wire for Razorpay:**
  - Loading Razorpay Checkout on the booking page with the stored `providerOrderId`.
  - Calling the refund API for `REFUNDED` payments. The refund amount is already calculated and stored.
  - Updating the booking-page payment copy, which currently describes pay-at-boarding.
- **Stripe.** Add another `PaymentProvider` implementation the same way.

## Vehicle images

The driver's vehicle form shows a picture of the vehicle as soon as they choose its details. Images are picked in this order:

1. **Real photos uploaded by the driver.** Up to 6, shown first with a "Real photo" badge. This is the only option that shows the driver's actual vehicle.
2. **360° studio renders of the make and model.** Shown when `NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY` is set to a licensed [imagin.studio](https://www.imagin.studio/) customer key. Drag to rotate; colour follows the driver's selection.
3. **Built-in illustration.** Covers hatchback, sedan, SUV / Bolero / Sumo, Ertiga / Innova, Tempo Traveller and Mini Bus, in the chosen colour, with the roof carrier, a 3D tilt on hover, and no external calls.

No studio-image key is bundled, because those services require a licensed key.

## Security notes

- **Passwords and sessions.** bcrypt hashing; hashed session tokens in httpOnly, SameSite=Lax, Secure (in production) cookies; rolling 30-day expiry; logout and suspension revoke sessions.
- **Checks on every request.** Each page, server action and route handler checks the role and ownership on the server. Drivers only ever see passengers on their own trips, and passengers only their own bookings. A Zod schema validates every input.
- **Abuse protection.**
  - Rate limits on login, registration, booking, complaints and onboarding.
  - Constant-time login (no account enumeration).
  - Upload type sniffing by magic bytes with a 5 MB cap and path-traversal-safe storage keys.
  - Security headers via `next.config.ts`.
- **Phone privacy.** Driver phone numbers are revealed only to passengers with a confirmed booking.

## Notifications

`server/notifications/index.ts` writes in-app notifications inside the same transaction as the change that caused them, then sends to any external channels that are switched on. To add SMS (MSG91, Gupshup), WhatsApp (WhatsApp Business API) or email (Resend, SES), implement `NotificationChannel.send` and switch it on with the matching `NOTIFY_*_ENABLED` flag.

## Roadmap

Recurring trips · full-vehicle booking · parcel delivery · live GPS tracking (coordinates already on `Location`) · Google Maps / Mapbox pickup pins · WhatsApp & SMS notifications · Razorpay checkout UI and automatic refunds · wallet · driver subscriptions · referral codes · coupons · corporate bookings · Hindi UI toggle · PWA / offline ticket.
