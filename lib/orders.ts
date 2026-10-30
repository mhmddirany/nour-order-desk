// The three statuses from section 03
export const ORDER_STATUSES = ["Pending", "Preparing", "Delivered"] as const;

// A type that only allows one of those three strings
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// One stored order: the 8 fields from the section 04 table
export type Order = {
  id: string;
  customerName: string;
  phone: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: OrderStatus;
};

// What the client sends on POST: the 5 fields from the
// "POST request example" in section 05
export type NewOrderInput = {
  customerName: string;
  phone: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

// Three fictional orders so the dashboard isn't empty on first load.
// Fixed IDs make them easy to use in Postman (e.g. GET /api/orders/seed-1).
const SEED_ORDERS: Order[] = [
  {
    id: "seed-1",
    customerName: "Demo Customer One",
    phone: "DEMO-101",
    productName: "Vanilla Candle",
    quantity: 2,
    unitPrice: 8,
    total: 16,
    status: "Pending",
  },
  {
    id: "seed-2",
    customerName: "Demo Customer Two",
    phone: "DEMO-102",
    productName: "Cedar Candle",
    quantity: 1,
    unitPrice: 10,
    total: 10,
    status: "Preparing",
  },
  {
    id: "seed-3",
    customerName: "Demo Customer Three",
    phone: "DEMO-103",
    productName: "Mini Gift Candle",
    quantity: 5,
    unitPrice: 6,
    total: 30,
    status: "Delivered",
  },
];

// Tell TypeScript that globalThis may hold our orders array.
const globalStore = globalThis as typeof globalThis & {
  __nourOrders?: Order[];
};

// Return the one shared array, creating it from the seed data the first time.
function getStore(): Order[] {
  if (!globalStore.__nourOrders) {
    globalStore.__nourOrders = structuredClone(SEED_ORDERS);
  }
  return globalStore.__nourOrders;
}



// Convert dollars to whole cents: 8.2 -> 820
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// The business rule: total = quantity × unit price, calculated in cents.
// This is the ONLY place a total is ever calculated.
export function calculateTotal(quantity: number, unitPrice: number): number {
  return (toCents(unitPrice) * quantity) / 100;
}

// True for 8, 8.5, 8.99. False for 8.999.
export function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}


// ---------- Validation ----------

// Either success with clean data, or failure with a message for the user.
type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// A JSON object like { ... }, not null, not an array, not a number.
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Each checker returns an error message, or null if the value is valid.
function checkText(value: unknown, label: string): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return `${label} is required`;
  }
  return null;
}

function checkQuantity(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return "Quantity must be a positive integer";
  }
  return null;
}

function checkUnitPrice(value: unknown): string | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    !hasAtMostTwoDecimals(value)
  ) {
    return "Unit price must be a number of 0 or more with at most two decimal places";
  }
  return null;
}

function checkStatus(value: unknown): string | null {
  if (typeof value !== "string" || !ORDER_STATUSES.includes(value as OrderStatus)) {
    return `Status must be one of: ${ORDER_STATUSES.join(", ")}`;
  }
  return null;
}

export function validateNewOrder(body: unknown): ValidationResult<NewOrderInput> {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  // Run the checks in order and stop at the first error.
  const error =
    checkText(body.customerName, "Customer name") ??
    checkText(body.phone, "Phone") ??
    checkText(body.productName, "Product name") ??
    checkQuantity(body.quantity) ??
    checkUnitPrice(body.unitPrice);

  if (error) {
    return { ok: false, error };
  }

  // Build clean data: trimmed text, and ONLY the 5 allowed fields.
  return {
    ok: true,
    data: {
      customerName: (body.customerName as string).trim(),
      phone: (body.phone as string).trim(),
      productName: (body.productName as string).trim(),
      quantity: body.quantity as number,
      unitPrice: body.unitPrice as number,
    },
  };
}


// Every field is optional in an update.
export type OrderUpdate = Partial<NewOrderInput> & { status?: OrderStatus };

const EDITABLE_FIELDS = [
  "customerName",
  "phone",
  "productName",
  "quantity",
  "unitPrice",
  "status",
] as const;

export function validateOrderUpdate(body: unknown): ValidationResult<OrderUpdate> {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const update: OrderUpdate = {};

  // Check each allowlisted field ONLY if it was sent.
  if ("customerName" in body) {
    const error = checkText(body.customerName, "Customer name");
    if (error) return { ok: false, error };
    update.customerName = (body.customerName as string).trim();
  }

  if ("phone" in body) {
    const error = checkText(body.phone, "Phone");
    if (error) return { ok: false, error };
    update.phone = (body.phone as string).trim();
  }

  if ("productName" in body) {
    const error = checkText(body.productName, "Product name");
    if (error) return { ok: false, error };
    update.productName = (body.productName as string).trim();
  }

  if ("quantity" in body) {
    const error = checkQuantity(body.quantity);
    if (error) return { ok: false, error };
    update.quantity = body.quantity as number;
  }

  if ("unitPrice" in body) {
    const error = checkUnitPrice(body.unitPrice);
    if (error) return { ok: false, error };
    update.unitPrice = body.unitPrice as number;
  }

  if ("status" in body) {
    const error = checkStatus(body.status);
    if (error) return { ok: false, error };
    update.status = body.status as OrderStatus;
  }

  // Nothing editable was sent: {} or only { "id": ... } or { "total": ... }
  if (Object.keys(update).length === 0) {
    return {
      ok: false,
      error: `Provide at least one field to update: ${EDITABLE_FIELDS.join(", ")}`,
    };
  }

  return { ok: true, data: update };
}


// ---------- Data access (the only code that touches the store) ----------

export function listOrders(): Order[] {
  return getStore();
}

export function findOrder(id: string): Order | undefined {
  return getStore().find((order) => order.id === id);
}

export function createOrder(input: NewOrderInput): Order {
  const order: Order = {
    id: crypto.randomUUID(),                                   // server owns the ID
    ...input,
    total: calculateTotal(input.quantity, input.unitPrice),    // server owns the total
    status: "Pending",                                         // new orders always start Pending
  };
  getStore().push(order);
  return order;
}

// Returns the updated order, or undefined if the ID doesn't exist.
export function updateOrder(id: string, update: OrderUpdate): Order | undefined {
  const store = getStore();
  const index = store.findIndex((order) => order.id === id);
  if (index === -1) return undefined;

  const current = store[index];
  const merged = { ...current, ...update };   // omitted fields keep their old values

  const updated: Order = {
    ...merged,
    id: current.id,                                             // ID can never change
    total: calculateTotal(merged.quantity, merged.unitPrice),   // always recalculated
  };

  store[index] = updated;   // the one moment the store changes
  return updated;
}

// Returns true if something was deleted, false if the ID doesn't exist.
export function deleteOrder(id: string): boolean {
  const store = getStore();
  const index = store.findIndex((order) => order.id === id);
  if (index === -1) return false;

  store.splice(index, 1);
  return true;
}