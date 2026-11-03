# Review

## 1. Trace one Add Order action from the form to the Route Handler and back

1. Nour fills in the form in `components/OrderDashboard.tsx` and clicks **Add order**.
2. `onSubmit` calls `event.preventDefault()` so the page doesn't reload, then `handleSubmit()`.
3. `handleSubmit` disables the button (`isSubmitting`), converts quantity and price from text to numbers, and calls `fetch("/api/orders", { method: "POST", body: JSON.stringify(...) })`.
4. Next.js routes the request to the `POST` function in `app/api/orders/route.ts`.
5. The handler reads the body with `request.json()` inside a `try/catch` (broken JSON → 400).
6. It calls `validateNewOrder(body)` in `lib/orders.ts`. If a field is invalid, it returns 400 with `{ error }`, and nothing is saved.
7. If valid, it calls `createOrder(result.data)`, which adds a `crypto.randomUUID()` id, calculates `total` with `calculateTotal`, sets `status: "Pending"`, and pushes the order into the shared store.
8. The handler returns 201 with the saved order.
9. Back in the browser, `response.ok` is true, so the form is cleared and `onCreated(saved)` shows the server's total and status in the notice, then `reloadOrders()` fetches the list again so the list and counts update.

## 2. Where is the total calculated, and why is that important?

Only in `calculateTotal()` in `lib/orders.ts`, called by `createOrder` and `updateOrder`. It works in integer cents (`Math.round(unitPrice * 100) * quantity / 100`) to avoid JavaScript decimal errors: `8.2 * 3` gives `24.599999999999998`, while the cents version gives `24.6`.

It matters because anyone can call the API directly with Postman. If the server trusted a client total, someone could send `total: 0`. The validators never copy `total` from the body, and `updateOrder` recalculates it every time.

## 3. Show one invalid request. Why did it fail, and did stored data remain unchanged?

Request: `PATCH /api/orders/seed-1` with `{ "quantity": -2 }`.

It failed with 400 `Quantity must be a positive integer` because `checkQuantity` requires a whole number of at least 1. `validateOrderUpdate` only builds a separate `update` object and returns early on the first error, so `updateOrder` is never called. A follow-up `GET /api/orders/seed-1` showed the quantity unchanged.

In the 3 Nov test run, `seed-2` had quantity 3 and total 30 before the request. After the 400, a GET still showed quantity 3 and total 30.

I also tested a mixed request, `{ "quantity": 9, "status": "Flying" }`. It returned 400, and the follow-up GET still showed quantity 3. So the valid quantity was **not** saved on its own: nothing is changed unless every field passes.

## 4. What is the difference between PATCH and replacing an entire object?

PATCH sends only the fields that change, and the server keeps everything else. In `updateOrder`, `{ ...current, ...update }` copies the stored order and overwrites only the supplied fields. Sending `{ "quantity": 4 }` changes the quantity (and the recalculated total) and leaves the name, phone, product, price and status alone.

Replacing the whole object (like PUT) would require sending every field. Any field you left out would be lost or rejected. The dashboard's edit form also sends only the changed fields.

## 5. What happens to your orders after a server restart?

They are lost. The store is an array on `globalThis` in the server's memory. When the server restarts, `getStore()` creates a new array from the three seed orders. I saw this during testing: after restarting `npm run dev`, `seed-1` came back with its original values. It also would not work across multiple server instances, because each one would have its own memory.

## 6. Which AI suggestion did you correct or verify, and what evidence helped you decide?

**Cache Components config.** The AI told me to remove only `cacheComponents: true` from `next.config.ts`. After I did, the dev server printed `partialPrefetching requires cacheComponents to be enabled` and stopped. That error message showed the suggestion was incomplete.

The AI's next suggestion was to replace the whole file with an empty config. Before doing that, I sent a screenshot of the file, and it showed a `turbopack` block that loads `@tailwindcss/turbopack`. Replacing the whole file would have removed the Tailwind loader, so I deleted only the `partialPrefetching` line instead. The server then started, and the build output shows the API routes as dynamic.

**Deprecated type.** The AI's form code used `FormEvent`, and VS Code showed it struck through as deprecated. I changed the form to use an inline `onSubmit` handler so TypeScript infers the event type, and `npm run lint` then reported no problems.

**Checked, not just trusted.** I didn't rely on the AI saying the rules worked. I ran every case from section 08 against the running server and recorded the real responses in `evidence/api-test-run-2026-11-03.md`. When a delete in Postman returned 204 for `seed-1` instead of `seed-3`, the server log (`DELETE /api/orders/seed-1 204`) showed it was my wrong URL, not a bug in the code.
