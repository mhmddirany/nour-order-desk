# API: Nour's Order Desk

Base URL (local): `http://localhost:3000`

All request and response bodies are JSON. Every error response has the same shape:

```json
{ "error": "Quantity must be a positive integer" }
```

## Order object

```json
{
  "id": "1afc49d5-c3f1-44d0-b3b8-a8247f2bb229",
  "customerName": "Demo Customer",
  "phone": "DEMO-001",
  "productName": "Vanilla Candle",
  "quantity": 3,
  "unitPrice": 8,
  "total": 24,
  "status": "Pending"
}
```

| Field | Type | Set by | Rule |
| --- | --- | --- | --- |
| `id` | string | Server | `crypto.randomUUID()`; cannot be edited |
| `customerName` | string | Client | Required, trimmed, not blank |
| `phone` | string | Client | Required, trimmed, not blank; kept as text |
| `productName` | string | Client | Required, trimmed, not blank |
| `quantity` | number | Client | Positive integer, minimum 1 |
| `unitPrice` | number | Client | Finite, minimum 0, at most two decimal places (USD) |
| `total` | number | Server | `quantity × unitPrice`, calculated in integer cents; any client value is ignored |
| `status` | string | Server on create, client on PATCH | `Pending`, `Preparing` or `Delivered`; new orders are always `Pending` |

Validation and the total calculation live in `lib/orders.ts`. The route handlers only parse the request, call those functions, and choose the status code.

## Endpoints

| Method | Endpoint | Success | Errors |
| --- | --- | --- | --- |
| GET | `/api/orders` | 200, array of orders | — |
| POST | `/api/orders` | 201, the created order | 400 |
| GET | `/api/orders/[id]` | 200, the order | 404 |
| PATCH | `/api/orders/[id]` | 200, the updated order | 400, 404 |
| DELETE | `/api/orders/[id]` | 204, no body | 404 |

Methods that a route does not define return 405 (for example `POST /api/orders/seed-1`).

---

### GET /api/orders

Returns every order.

**Response 200**

```json
[
  {
    "id": "seed-1",
    "customerName": "Demo Customer One",
    "phone": "DEMO-101",
    "productName": "Vanilla Candle",
    "quantity": 2,
    "unitPrice": 8,
    "total": 16,
    "status": "Pending"
  }
]
```

---

### POST /api/orders

Creates an order. Only the five client fields are read. `id`, `total` and `status` in the body are ignored.

**Request**

```json
{
  "customerName": "Demo Customer",
  "phone": "DEMO-001",
  "productName": "Vanilla Candle",
  "quantity": 3,
  "unitPrice": 8
}
```

**Response 201**: the full order, with a new `id`, `"total": 24` and `"status": "Pending"`.

**Response 400** examples

| Cause | `error` |
| --- | --- |
| Body is not valid JSON | `Request body must be valid JSON` |
| Body is not a JSON object | `Request body must be a JSON object` |
| Missing or blank name | `Customer name is required` |
| Missing or blank phone | `Phone is required` |
| Missing or blank product | `Product name is required` |
| Quantity 0, -1, 1.5 or not a number | `Quantity must be a positive integer` |
| Negative, non-numeric or 3+ decimal price | `Unit price must be a number of 0 or more with at most two decimal places` |

---

### GET /api/orders/[id]

**Response 200**: the order.

**Response 404**

```json
{ "error": "Order nope was not found" }
```

---

### PATCH /api/orders/[id]

Updates only the fields that are sent. Omitted fields keep their stored values.

Editable fields: `customerName`, `phone`, `productName`, `quantity`, `unitPrice`, `status`. `id` and `total` in the body are ignored, and `total` is always recalculated by the server.

Every supplied field is validated **before** the stored order changes. If any field is invalid, the request returns 400 and the stored order is left exactly as it was.

**Request**

```json
{ "quantity": 4, "status": "Preparing" }
```

**Response 200**: the full updated order, with `"total": 32`.

**Response 400** examples

| Cause | `error` |
| --- | --- |
| No body or malformed JSON | `Request body must be valid JSON` |
| `{}` or only non-editable fields | `Provide at least one field to update: customerName, phone, productName, quantity, unitPrice, status` |
| `"status": "Flying"` | `Status must be one of: Pending, Preparing, Delivered` |
| `"quantity": -2` | `Quantity must be a positive integer` |
| Any invalid field from the POST table | Same message as POST |

**Response 404**: unknown ID.

---

### DELETE /api/orders/[id]

**Response 204**: empty body.

**Response 404**: unknown ID.

## Storage

Orders are kept in an in-memory array on `globalThis`, shared by every route in one running server process. Data resets when the server restarts (the three seed orders come back) and is not shared between multiple server instances. There is no database.
