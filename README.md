# NudgeHQ

## Running it

```bash
npm install
node scripts/setup-db.mjs   # applies the schema and seeds a demo user
npm run dev
```

The app serves on <http://localhost:3000>.

Sign in as `demo@example.com` with the password you set as `DEMO_PASSWORD` in `.env` (the seed reads it; each role also has an account, `<role>@example.com`).

## Built with

- Next.js
- postgresql via prisma

## Screens

- `/` — Dashboard
- `/invoices` — Invoices
- `/clients` — Clients
- `/bills` — Bills

## API

- `GET /api/dashboard`
- `GET /api/forecast`
- `GET /api/invoices`
- `POST /api/invoices`
- `PATCH /api/invoices/{invoiceId}`
- `DELETE /api/invoices/{invoiceId}`
- `POST /api/invoices/{invoiceId}/mark-paid`
- `POST /api/invoices/{invoiceId}/nudge-draft`
- `GET /api/clients`
- `POST /api/clients`
- `PATCH /api/clients/{clientId}`
- `DELETE /api/clients/{clientId}`
- `GET /api/bills`
- `POST /api/bills`
- `PATCH /api/bills/{billId}`
- `DELETE /api/bills/{billId}`
- `POST /api/nudge`

## Environment

Copy `.env.example` to `.env` and fill it in. Every variable there is read by this app; none is optional.

---

https://nudge-qq8uuxjy4-m-i-h2.vercel.app/
