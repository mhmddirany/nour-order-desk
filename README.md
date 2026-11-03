# Nour's Order Desk

- **Author:** Mohamad Ali Eldirany
- **Assignment:** TechTalks Assignment 04
- **Branch:** `assignment-4-nour-order-desk`
- **Repository:** https://github.com/mhmddirany/nour-order-desk

An internal order dashboard for Nour Candle Studio, a fictional handmade-candle business in Beirut. Nour receives orders through Instagram and WhatsApp, and this tool gives her one place to record an order, correct it, track its status (Pending → Preparing → Delivered) and remove an accidental entry.

Every action in the dashboard goes through a REST API built with Next.js Route Handlers. The server validates all input and owns the order ID and the total.

## Features

- List orders with customer, product, quantity, total and status
- Summary counts (total, pending, delivered) derived from the server's order list
- Add an order, with the saved server response shown after submitting
- Order details panel with editing and status changes (PATCH)
- Delete with a confirmation step
- Loading, error-with-retry, empty and pending states
- Validation in the browser and on the server

## Stack

Next.js 16 (App Router, Route Handlers) · TypeScript · Tailwind CSS 4

## Run it locally

Requires Node.js 20.9 or newer.

```bash
git clone https://github.com/mhmddirany/nour-order-desk.git
cd nour-order-desk
git switch assignment-4-nour-order-desk
npm install
npm run dev
```

Open http://localhost:3000. The API is at http://localhost:3000/api/orders.

Other scripts:

```bash
npm run lint
npm run build
```

## Project structure

```
app/
  api/orders/route.ts        GET list, POST create
  api/orders/[id]/route.ts   GET one, PATCH, DELETE
  page.tsx                   renders the dashboard
components/
  OrderDashboard.tsx         client dashboard (fetch calls, forms, states)
lib/
  orders.ts                  types, in-memory store, validation, total calculation
docs/                        plan, API, testing, review, evidence
```

## Storage limitation

This project has **no database**. Orders live in an in-memory array on `globalThis` inside the running server process.

- Stopping or restarting the server deletes every order and restores the three seed orders.
- Development reloads can also reset the data.
- It does not work across multiple server instances, so a deployment would not persist data reliably.

This is a deliberate choice for the lesson, not a persistence solution.

## Configuration note

`create-next-app` enabled Cache Components by default. I turned it off (removed `cacheComponents` and `partialPrefetching` from `next.config.ts`) so the order list is never served from a pre-built cache. The build output confirms both API routes are dynamic.

## Documents

- [Plan](docs/PLAN.md)
- [API reference](docs/API.md)
- [Testing results](docs/TESTING.md)
- [Review and AI reflection](docs/REVIEW.md)
- [Evidence (screenshots)](docs/evidence/)

All customer data in this project and its evidence is fictional.
