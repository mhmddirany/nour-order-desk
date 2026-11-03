# API test run — 2026-11-03

Run against `npm run dev` (Next.js 16.4.3) at http://localhost:3000, using `fetch` from the browser.
Server freshly started, so the store held the three seed orders. Each line is the real status code and response body.

| Test | Request | Status | Response |
| --- | --- | --- | --- |
| 1 List orders | GET `/api/orders` | 200 | array of 3 seed orders |
| 2 Read existing | GET `/api/orders/seed-2` | 200 | `{"id":"seed-2","customerName":"Demo Customer Two",...,"quantity":1,"unitPrice":10,"total":10,"status":"Preparing"}` |
| 3 Create valid | POST `/api/orders` `{"customerName":"Test Customer","phone":"DEMO-201","productName":"Cedar Candle","quantity":2,"unitPrice":10}` | 201 | `{"id":"8755e520-e5f9-4c30-a04a-c51e966510f1",...,"total":20,"status":"Pending"}` |
| 5 Omit name | POST without `customerName` | 400 | `{"error":"Customer name is required"}` |
| 6 Blank phone | POST `"phone":"   "` | 400 | `{"error":"Phone is required"}` |
| 7 Quantity 0 | POST `"quantity":0` | 400 | `{"error":"Quantity must be a positive integer"}` |
| 7 Quantity -1 | POST `"quantity":-1` | 400 | `{"error":"Quantity must be a positive integer"}` |
| 7 Quantity 1.5 | POST `"quantity":1.5` | 400 | `{"error":"Quantity must be a positive integer"}` |
| 8 Price -5 | POST `"unitPrice":-5` | 400 | `{"error":"Unit price must be a number of 0 or more with at most two decimal places"}` |
| 8 Price "abc" | POST `"unitPrice":"abc"` | 400 | same message |
| 8 Price 8.999 | POST `"unitPrice":8.999` | 400 | same message |
| 10 Malformed JSON | POST body `{"customerName":"X"` | 400 | `{"error":"Request body must be valid JSON"}` |
| 9 Status Flying | PATCH `/api/orders/seed-2` `{"status":"Flying"}` | 400 | `{"error":"Status must be one of: Pending, Preparing, Delivered"}` |
| 11 Empty PATCH | PATCH `/api/orders/seed-2` `{}` | 400 | `{"error":"Provide at least one field to update: customerName, phone, productName, quantity, unitPrice, status"}` |
| 12 Quantity only | PATCH `/api/orders/seed-2` `{"quantity":3}` | 200 | quantity 3, total 30; name, phone, product, price and status unchanged |
| 13 Quantity -2 | PATCH `/api/orders/seed-2` `{"quantity":-2}` | 400 | `{"error":"Quantity must be a positive integer"}` |
| 13 Follow-up GET | GET `/api/orders/seed-2` | 200 | still quantity 3, total 30 |
| 13b Valid + invalid field | PATCH `/api/orders/seed-2` `{"quantity":9,"status":"Flying"}` | 400 | status error |
| 13b Follow-up GET | GET `/api/orders/seed-2` | 200 | still quantity 3, total 30: the valid quantity 9 was **not** applied |
| 14 Change id / total | PATCH `/api/orders/seed-2` `{"id":"hacked","total":0,"unitPrice":9}` | 200 | `id` still `seed-2`, unitPrice 9, total **27** (3 × 9, not 0) |
| 17 Read unknown ID | GET `/api/orders/nope` | 404 | `{"error":"Order nope was not found"}` |
| 18 Update unknown ID | PATCH `/api/orders/nope` | 404 | `{"error":"Order nope was not found"}` |
| 19 Delete unknown ID | DELETE `/api/orders/nope` | 404 | `{"error":"Order nope was not found"}` |
| 15 Delete existing | DELETE `/api/orders/8755e520-…` | 204 | empty body |
| 16 Read deleted | GET `/api/orders/8755e520-…` | 404 | `{"error":"Order 8755e520-e5f9-4c30-a04a-c51e966510f1 was not found"}` |
| 4 List at end | GET `/api/orders` | 200 | 3 orders; the deleted order is gone |
