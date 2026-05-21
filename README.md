# OpenBook

OpenBook is an open-source event booking system. Organisers create events with ticket types and age-banded price bands; attendee prices are resolved automatically from date of birth at the event start date. An admin panel handles event management, order processing, payment recording, and reporting.

---

## Features

- **Age-banded pricing** — attendee price is determined by date of birth at the event start date, not the booking date
- **Card payments via Stripe** — built-in Stripe Elements checkout with 3D Secure support; payments are automatically recorded on the order
- **Offline payment recording** — log cash, bank transfer, cheque, or other payments; paid/outstanding totals update in real time
- **Per-event order numbers** — configurable prefix per event (e.g. `GBBO-00001`), or plain sequence if no prefix is set
- **Venue fee tracking** — per price band, snapshotted to each order item so historical reports stay accurate after pricing changes
- **Student qualifier** — price bands can be flagged as student-rate; attendees self-declare at checkout
- **Inventory management** — pending orders hold stock for 15 minutes; confirmed orders hold indefinitely
- **Multi-step public checkout** — attendees → booker details → review & confirm
- **Secure booking view links** — each order has a unique token URL giving bookers read-only access without logging in
- **Admin panel** — manage events, ticket types, orders, payments, and admin users; includes finance and attendee reports
- **Email confirmations** — via [Resend](https://resend.com) (optional; skipped if no API key is configured)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLModel, Alembic, PostgreSQL |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, TanStack Query v5 |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Payments | Stripe (Elements + PaymentIntents) |
| Email | Resend |
| Infrastructure | Docker Compose |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- A [Stripe](https://stripe.com) account (test keys are fine to start)

### 1. Clone the repo

```bash
git clone https://github.com/thirdrockuk/openbook.git
cd openbook
```

### 2. Set your secrets in `docker-compose.yml`

Open `docker-compose.yml` and update the following values:

| Key | Where | Description |
|---|---|---|
| `SECRET_KEY` | `backend.environment` | Long random string for JWT signing |
| `STRIPE_SECRET_KEY` | `backend.environment` | Stripe secret key (`sk_test_…`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `frontend.environment` | Stripe publishable key (`pk_test_…`) |
| `RESEND_API_KEY` | `backend.environment` | Resend key — omit to disable email |

### 3. Start all services

```bash
docker-compose up --build -d
```

This starts PostgreSQL, runs migrations, starts the FastAPI server on port 8000, and the Vite dev server on port 5173.

### 4. Create the first admin user

```bash
docker-compose exec backend python -m app.scripts.seed_admin \
    --email admin@example.com \
    --password changeme123
```

### 5. Open the app

| URL | Description |
|---|---|
| http://localhost:5173 | Public booking site |
| http://localhost:5173/admin | Admin panel |
| http://localhost:8000/docs | Interactive API docs |

---

## Running Without Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Export required env vars, then:
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

All backend configuration is via environment variables (or a `.env` file in `backend/` when running without Docker).

### Backend

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://openbook:openbook@localhost:5432/openbook` | PostgreSQL connection string |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key — **change this** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Token TTL (8 hours) |
| `STRIPE_SECRET_KEY` | *(empty)* | Stripe secret key — card payments disabled if not set |
| `RESEND_API_KEY` | *(empty)* | Resend API key — email is disabled if not set |
| `EMAIL_FROM_ADDRESS` | `openbook@yourdomain.com` | Sender address |
| `EMAIL_FROM_NAME` | `OpenBook` | Sender display name |
| `APP_NAME` | `OpenBook` | Application name used in emails |
| `APP_URL` | `http://localhost:5173` | Frontend URL (used in emails and CORS) |
| `ENVIRONMENT` | `development` | Set to `production` to disable SQL query logging |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (e.g. `http://localhost:8000`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_…` or `pk_live_…`) |

---

## API Reference

Full interactive documentation is available at `/docs` when the backend is running.

### Public

```
GET  /api/events                      List published events
GET  /api/events/{id}                 Event detail with ticket types and price bands
POST /api/orders                      Create a pending order
GET  /api/orders/{id}                 Order detail
POST /api/orders/{id}/confirm         Confirm order (records card payment if payment_intent_id supplied)
POST /api/orders/{id}/cancel          Cancel order
POST /api/orders/{id}/payment-intent  Create a Stripe PaymentIntent (returns client_secret)
GET  /api/orders/view/{token}         Read-only booker view (no auth required)
POST /api/auth/login                  Returns JWT access token
GET  /api/auth/me                     Current admin user
```

### Admin (JWT required)

```
GET    /api/admin/dashboard                                Stats summary

GET    /api/admin/events                                   List all events
POST   /api/admin/events                                   Create event
GET    /api/admin/events/{id}                              Get event
PUT    /api/admin/events/{id}                              Update event
DELETE /api/admin/events/{id}                              Delete event

GET    /api/admin/events/{id}/ticket-types                 List ticket types
POST   /api/admin/events/{id}/ticket-types                 Create ticket type
PUT    /api/admin/events/{id}/ticket-types/{tid}           Update ticket type
DELETE /api/admin/events/{id}/ticket-types/{tid}           Delete ticket type

GET    /api/admin/events/{id}/orders/paginated             Paginated orders
GET    /api/admin/events/{id}/attendee-report              Attendee report
PUT    /api/admin/events/{id}/attendee-report/settings     Update report settings

GET    /api/admin/orders/{id}                              Order detail
POST   /api/admin/orders/{id}/cancel                       Cancel order
PUT    /api/admin/orders/{id}/items/{itemId}/price         Override item price
POST   /api/admin/orders/{id}/items/{itemId}/price/reset   Reset item to band price
PUT    /api/admin/orders/{id}/items/{itemId}/requirements  Update dietary/access requirements
POST   /api/admin/orders/{id}/payments                     Record a payment
DELETE /api/admin/orders/{id}/payments/{pid}               Remove a payment

GET    /api/admin/users                                    List admin users
POST   /api/admin/users                                    Create admin user
GET    /api/admin/users/{id}                               Get admin user
PUT    /api/admin/users/{id}                               Update admin user
DELETE /api/admin/users/{id}                               Delete admin user
```

---

## Business Logic

### Age calculation

Age is calculated at the **event start date**, so a child who turns 18 the week after the event still receives child pricing.

### Inventory

```
available = inventory_total - count(pending/confirmed items where expires_at > now())
```

Pending orders hold inventory for 15 minutes. Confirming an order extends `expires_at` by one year.

### Order numbers

Set an `order_number_prefix` on an event (e.g. `CONF`) to get `CONF-00001`, `CONF-00002`, etc. Leave it blank for plain numbers: `00001`, `00002`. The sequence resets per event.

### Payments

**Card payments** use Stripe PaymentIntents. When a booker selects card at checkout, the confirmation page loads a Stripe Elements form, creates a PaymentIntent server-side, and collects the card. On success, the `payment_intent_id` is passed to the confirm endpoint, which automatically creates a `Payment` record with `provider='card'`. 3D Secure redirects are handled transparently.

**Offline payments** (cash, bank transfer, cheque, other) are recorded manually by an admin against a confirmed order. The balance outstanding is calculated live from the sum of all recorded payments.

Each event independently controls which payment methods are enabled (`allow_bank_transfer`, `allow_card_payment`).

### Venue fee

`venue_fee_pence` is set per price band and copied to each `order_item` at booking time. This means venue fee totals in reports are always historically accurate, even if the price band is later edited.

---

## Project Structure

```
openbook/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI entry point
│   │   ├── config.py            Settings (env vars via Pydantic)
│   │   ├── database.py          SQLModel engine and session
│   │   ├── models/              SQLModel table definitions
│   │   ├── schemas/             Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── auth.py          Login and current user
│   │   │   ├── events.py        Public event endpoints
│   │   │   ├── orders.py        Public order endpoints (incl. Stripe)
│   │   │   └── admin/           Admin endpoints (JWT required)
│   │   │       ├── events.py    Events, ticket types, orders, reports
│   │   │       ├── orders.py    Per-order operations and payments
│   │   │       ├── dashboard.py Stats summary
│   │   │       └── _helpers.py  Shared serialisation helpers
│   │   └── services/
│   │       ├── pricing.py       Age → price band resolution
│   │       ├── inventory.py     Stock availability checks
│   │       ├── orders.py        Order lifecycle + order number generation
│   │       └── email.py         Resend integration
│   ├── alembic/                 Database migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              Route definitions
│   │   ├── api/                 Axios client and TanStack Query hooks
│   │   ├── components/          Shared UI components
│   │   ├── pages/               Public and admin pages
│   │   ├── hooks/               useAuth, usePriceBand
│   │   ├── utils/               Currency, date, and age helpers
│   │   └── types/               TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```
