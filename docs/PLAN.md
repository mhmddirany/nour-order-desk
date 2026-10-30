# Plan: Nour's Order Desk

## Client problem

Nour runs Nour Candle Studio, a small handmade-candle business in Beirut. Orders arrive through Instagram and WhatsApp messages. Customer names, phone numbers, quantities, prices and preparation status end up split between chats and a notebook, so she cannot reliably see which orders exist or which ones still need preparing.

## Goal

One internal dashboard where Nour can record an order, correct it, track its status and remove an accidental entry, without touching code. Every action goes through a REST API built with Next.js Route Handlers.

## Required features

1. **List orders** showing customer, product, quantity, total and status.
2. **View an order** in a details panel.
3. **Add an order** through a form; show the order the server saved.
4. **Update an order**: edit its fields and change its status.
5. **Delete an order** after a confirmation step.
6. **Summary counts**: total, pending and delivered, derived from the fetched list.

Interface states: loading, error with retry, empty list, pending submit (button disabled), API error messages, preserved form values after a rejected submission, usable on mobile and with the keyboard.

## Out of scope

Database, authentication, payments, taxes, discounts, delivery fees, Instagram/WhatsApp integration, inventory, multiple products per order, real customer data.

## Data model

| Field | Type | Owner | Rule |
| --- | --- | --- | --- |
| `id` | string | Server | `crypto.randomUUID()`, never taken from the request |
| `customerName` | string | Client | Required, non-blank after trimming |
| `phone` | string | Client | Required, non-blank after trimming; kept as text, never converted to a number (fictional values only, e.g. `DEMO-001`) |
| `productName` | string | Client | Required, non-blank after trimming (catalogue: Vanilla 8.00, Cedar 10.00, Mini Gift 6.00 USD) |
| `quantity` | number | Client | Positive integer, minimum 1 |
| `unitPrice` | number | Client | Finite number, minimum 0, at most two decimal places; editable for special prices |
| `status` | string | Client on PATCH | `Pending`, `Preparing` or `Delivered`; always `Pending` on create |
| `total` | number | Server | `quantity × unitPrice`, recalculated on create and whenever quantity or unit price changes; a client-sent total is ignored |

### Money

- Currency is USD everywhere; the UI displays amounts with two decimal places (e.g. `$24.00`).
- To avoid floating-point surprises, the server converts the unit price to integer cents, multiplies by quantity, then converts back: `Math.round(unitPrice * 100) * quantity / 100`.
- The two-decimal rule on `unitPrice` is checked with the same idea: `Math.round(unitPrice * 100)` must equal `unitPrice * 100` (within a tiny tolerance), so `8.5` and `8.99` pass and `8.999` fails.

## Endpoints

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/api/orders` | 200, array of orders | — |
| POST | `/api/orders` | 201, the created order | 400 invalid fields or malformed JSON |
| GET | `/api/orders/[id]` | 200, the order | 404 unknown ID |
| PATCH | `/api/orders/[id]` | 200, the updated order | 400 invalid field, empty body or malformed JSON; 404 unknown ID |
| DELETE | `/api/orders/[id]` | 204, no body | 404 unknown ID |

Use 400 for invalid input and malformed JSON, and 404 when the requested order does not exist. Every error response has one shape with a useful message, for example `{ "error": "Quantity must be a positive integer" }`.

### PATCH rules

- Only allowlisted fields are editable: `customerName`, `phone`, `productName`, `quantity`, `unitPrice`, `status`.
- `id` and `total` in the body are ignored; the server owns them.
- Empty body, or a body with no editable fields → 400.
- Validate every supplied field first. Only if all pass, build the updated order, recalculate `total`, and save it. A rejected request leaves the stored order unchanged.

## File structure

```
app/
  api/
    orders/
      route.ts          GET list, POST create
      [id]/
        route.ts        GET one, PATCH, DELETE (await params)
  page.tsx              renders the dashboard
components/
  OrderDashboard.tsx    client component: list, form, details, counts
lib/
  orders.ts             in-memory store, validation, total calculation
```

## Storage decision

An in-memory array kept on `globalThis` so every handler shares one store within the local server process. Three fictional seed orders. Limitation to document: data resets on server restart and can reset during development reloads; it is not shared across multiple server instances. This is a teaching choice, not persistence.

## Implementation steps

Each step ends with a check before moving on.

1. **Setup.** Create the repo, branch `assignment-4-nour-order-desk`, and a Next.js 16 + TypeScript + Tailwind app. *Check:* `npm run dev` shows the starter page.
2. **Store module (`lib/orders.ts`).** Order type, status list, seed data on `globalThis`, functions to list, find, create, update and delete, plus validation and total calculation. *Check:* types compile; seed data looks right.
3. **Collection route.** GET and POST, including safe JSON parsing. *Check in Postman:* list returns 200; valid create returns 201 with `total: 24` and `Pending`; missing name, blank phone, bad quantity, bad price and malformed JSON each return 400.
4. **Dynamic route.** GET, PATCH and DELETE with awaited params. *Check:* PATCH `{ "quantity": 4, "status": "Preparing" }` returns `total: 32`; quantity `-2` returns 400 and a follow-up GET shows the order unchanged; `total: 0` and `id` in the body are ignored; status `Flying` and empty body return 400; DELETE returns 204; unknown IDs return 404.
5. **Dashboard: read.** Fetch the list on load with loading, error/retry and empty states; render the list and summary counts. *Check:* stop the server or break the URL to see the error state.
6. **Dashboard: create.** Form with labels, product dropdown that pre-fills the suggested price, submit disabled while pending, API error shown, values kept on failure, re-fetch on success.
7. **Dashboard: view, update, delete.** Details panel, edit form and status control using PATCH; delete with confirmation, handling 204 without parsing JSON; re-fetch after each success.
8. **Usability pass.** Keyboard focus order, visible focus styles, mobile layout. *Check:* narrow browser width and tab through every control.
9. **Acceptance test.** Run Maya's seven-step scenario end to end and capture evidence.
10. **Docs and checks.** Write `README.md`, `API.md`, `TESTING.md` (actual results only) and `REVIEW.md`; run `npm run lint` and `npm run build` and record their real output; push the branch and make the repo public.