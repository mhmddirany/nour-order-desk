# Testing

Tools: Postman (collection **Nour Order Desk**), `fetch` calls from the browser, and the dashboard itself.
Server: `npm run dev`, Next.js 16.4.3, local only.

There were two test sessions:

- **30–31 Oct:** manual Postman tests (screenshots in `evidence/`).
- **3 Nov:** a full re-run of every API test from a freshly started server, plus every dashboard check. The exact requests and responses are in `evidence/api-test-run-2026-11-03.md`.

All values below are what the server actually returned.

## API tests (section 08)

| # | Test | Request | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | List orders | GET `/api/orders` | 200, array | 200, array of 3 seed orders | run log |
| 2 | Read existing order | GET `/api/orders/seed-2` | 200, matching object | 200, Demo Customer Two | run log |
| 3 | Create valid order | POST Demo Customer, 3 × 8 | 201, unique ID, correct total, Pending | 201, UUID `id`, `total: 24`, `status: "Pending"` | `api-03-post-create-201.png` |
| 4 | List after create / delete | GET `/api/orders` | Reflects changes | New order appeared after POST and was gone after DELETE | run log |
| 5 | Omit customer name | POST without `customerName` | 400 with useful error | 400, `Customer name is required` | `api-05-post-missing-name-400.png` |
| 6 | Blank phone | POST `"phone": "   "` | 400 | 400, `Phone is required` | run log |
| 7 | Quantity 0 / -1 / 1.5 | POST | 400 | 400 for all three, `Quantity must be a positive integer` | run log |
| 8 | Negative or non-numeric price | POST `-5`, `"abc"`, and `8.999` | 400 | 400 for all three, `Unit price must be a number of 0 or more with at most two decimal places` | run log |
| 9 | Status `Flying` | PATCH | 400 | 400, `Status must be one of: Pending, Preparing, Delivered` | run log |
| 10 | Malformed JSON | POST `{"customerName":"X"` | 400, not 500 | 400, `Request body must be valid JSON` | run log |
| 11 | Empty PATCH | PATCH `{}` | 400 | 400, `Provide at least one field to update: …` | run log |
| 12 | Update quantity without name | PATCH `/api/orders/seed-2` `{ "quantity": 3 }` | 200; name unchanged | 200, quantity 3, total 30, name still `Demo Customer Two` | run log |
| 12b | Brief's PATCH example | PATCH `/api/orders/seed-1` `{ "quantity": 4, "status": "Preparing" }` | total 32 | 200, quantity 4, status Preparing, name unchanged | `api-12-patch-quantity-4-200.png` |
| 13 | Invalid quantity leaves data unchanged | PATCH `{ "quantity": -2 }`, then GET | 400; order unchanged | 400; follow-up GET still quantity 3, total 30 | run log |
| 13b | No partial update | PATCH `{ "quantity": 9, "status": "Flying" }`, then GET | 400; nothing applied | 400; follow-up GET still quantity 3, so the valid quantity was **not** saved | run log |
| 14 | Attempt to change ID / total | PATCH `{ "id": "hacked", "total": 0, "unitPrice": 9 }` | ID unchanged; server total | 200, `id` still `seed-2`, `total: 27` (3 × 9, not 0) | run log; `api-14-patch-id-total-ignored-200.png` (same test on seed-1: id `seed-1`, total 36) |
| 15 | Delete existing order | DELETE `/api/orders/<new id>` | 204, no body | 204, empty body | run log; `api-15-delete-204.png` |
| 16 | Read deleted order | GET `/api/orders/<deleted id>` | 404 | 404, `Order … was not found` | run log; `api-16-get-deleted-order-404.png` |
| 17 | Read unknown ID | GET `/api/orders/nope` | 404 | 404, `Order nope was not found` | run log |
| 18 | Update unknown ID | PATCH `/api/orders/nope` | 404 | 404 | run log |
| 19 | Delete unknown ID | DELETE `/api/orders/nope` (and `seed-3` after it was already deleted) | 404 | 404, `Order seed-3 was not found` | run log; `api-19-delete-unknown-404.png` |

### Extra finding

Screenshots: `extra-405-post-on-id-route.png`, `extra-405-get-before-file-saved.png`, `extra-no-http-methods-exported-log.png`.

`POST /api/orders/seed-1` returned **405 Method Not Allowed**, which is correct: that route has no POST, and orders are created at `/api/orders`. Earlier, a `GET /api/orders/seed-1` also returned 405 because `app/api/orders/[id]/route.ts` had not been saved yet, so Next.js reported `No HTTP methods exported`. After saving the file, the GET returned 200.

## Maya's acceptance test (section 07)

Steps 1, 2, 3 and 6 were run through the dashboard. Steps 4, 5 and 7 were run against the API, as the brief asks.

| Step | Expected | Actual |
| --- | --- | --- |
| 1. Add 3 Vanilla at $8 | $24.00, Pending | Notice: "Saved order for Demo Customer: $24.00, Pending." Counts went to Total 4, Pending 2. Form cleared. |
| 2. Change quantity to 4 | $32.00 | Notice: "Updated order for Demo Customer: $32.00, Pending." Details panel shows 4 × $8.00 = $32.00. |
| 3. Change status to Delivered | Delivered up, pending reflects it | Delivered 1 → 2, Pending 2 → 1. Notice shows "$32.00, Delivered." |
| 4. Quantity -2 via API | 400, order unchanged | API test 13: 400, order unchanged |
| 5. Send `total: 0` | Server decides the total | API test 14: total 27 (and 36 in the Postman run), never 0 |
| 6. Create and delete an accidental order | List and counts update | Added "Accidental Demo" (Total 5). Delete → confirmation "Delete the order for Accidental Demo? This cannot be undone." → Cancel kept it. Delete → OK removed it: Total 4, Pending 1, removed from the server list too. |
| 7. Fetch deleted order | 404 | API test 16: 404 |

## Dashboard behaviour

The 3 Nov dashboard checks were run in the Claude desktop app's browser by filling the real form fields and submitting the real forms, so they used the same React code and API calls as clicking. Slow and failing requests were simulated by wrapping `fetch` in the page. One unplanned result: the test script once put an invalid value in the **Product** dropdown, so the PATCH sent a blank product. The server answered 400 `Product name is required` and the order stayed unchanged.


| Check | Actual | Evidence |
| --- | --- | --- |
| List and counts load from the API | 3 seed orders; Total 3, Pending 1, Delivered 1 | `ui-dashboard-list.png` |
| Amounts with two decimals | `$16.00`, `$10.00`, `$30.00`, `$24.00`, `$32.00` | `ui-dashboard-list.png` |
| Browser validation, empty name | "Please fill out this field"; request not sent | `ui-add-order-saved-and-browser-validation.png` |
| Server validation, name of only spaces | Red box: "Customer name is required" | |
| Values kept after a rejected submit | Phone `DEMO-002` and quantity `2` still filled in | |
| Submit disabled while pending | With a slowed request, the button showed "Saving…" and was disabled | |
| Loading state | "Loading orders…" shown while the list was being fetched | |
| Error state with retry | With the list request failing: "We couldn't load the orders. Check that the server is running, then try again." plus a **Try again** button. Clicking it showed "Loading orders…" and then the list again. | |
| Empty state | After deleting every order: "No orders yet. New orders will appear here." and counts 0 / 0 / 0 | |
| Delete asks for confirmation | Yes; Cancel keeps the order, OK deletes it | |
| Details panel takes keyboard focus | Opening an order moves focus to the "Order details" heading | |
| Keyboard access | All 7 controls are native inputs, selects or buttons (reachable with Tab) and all have focus-visible styles; every input has a label | |
| Mobile layout (375 × 812) | No horizontal scrolling; fields stack full-width; quantity and price sit side by side | `ui-mobile.png` |

## Scripts

| Command | Result |
| --- | --- |
| `npm run lint` | Passed with no output (0 problems) |
| `npm run build` | Compiled successfully; TypeScript passed; `/` static, `/api/orders` and `/api/orders/[id]` dynamic (ƒ) |

A successful build does not prove the workflow. The workflow is shown by the tests above.

## Not verified

- Behaviour with multiple server instances or after deployment (not deployed).
- Screen-reader behaviour (only labels and roles were checked, not a real screen reader).
