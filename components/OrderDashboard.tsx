"use client";

import { useEffect, useRef, useState } from "react";
import type { Order, OrderStatus, OrderUpdate } from "@/lib/orders";

const LOAD_ERROR =
  "We couldn't load the orders. Check that the server is running, then try again.";
const NETWORK_ERROR =
  "Couldn't reach the server. Your entries are still here, so try again.";

// Kept here (not imported as a value) so no server code is bundled for the browser.
const STATUSES: OrderStatus[] = ["Pending", "Preparing", "Delivered"];

// The teaching catalogue from the brief. Prices are only suggestions.
const CATALOGUE = [
  { name: "Vanilla Candle", price: 8 },
  { name: "Cedar Candle", price: 10 },
  { name: "Mini Gift Candle", price: 6 },
];

// ---------- Styles ----------

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/30";
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const primaryButton = `rounded-lg bg-amber-800 px-4 py-2.5 font-medium text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-amber-800 ${focusRing}`;
const secondaryButton = `rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-stone-700 ${focusRing}`;
const dangerButton = `rounded-lg border border-red-300 bg-white px-4 py-2.5 font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-red-700 ${focusRing}`;

// ---------- Helpers ----------

// Always ask the API for the list. Throws if the response isn't OK.
async function fetchOrders(): Promise<Order[]> {
  const response = await fetch("/api/orders", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }
  return response.json();
}

// Read { error } from a failed response; fall back to a generic message.
async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // The body wasn't JSON; use the generic message below.
  }
  return `Request failed (${response.status})`;
}

// 24 → "$24.00"
function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ---------- Small display components ----------

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: "bg-amber-100 text-amber-900",
  Preparing: "bg-sky-100 text-sky-900",
  Delivered: "bg-emerald-100 text-emerald-900",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ---------- Shared form fields ----------

// Inputs always hold text, so the form keeps exactly what Nour typed.
type FormValues = {
  customerName: string;
  phone: string;
  productName: string;
  quantity: string;
  unitPrice: string;
};

type EditValues = FormValues & { status: OrderStatus };

const EMPTY_FORM: FormValues = {
  customerName: "",
  phone: "",
  productName: CATALOGUE[0].name,
  quantity: "1",
  unitPrice: String(CATALOGUE[0].price),
};

// Apply one field change. Picking a product fills in its suggested price.
function withChange<T extends FormValues>(prev: T, field: keyof FormValues, value: string): T {
  if (field === "productName") {
    const product = CATALOGUE.find((p) => p.name === value);
    return {
      ...prev,
      productName: value,
      unitPrice: product ? String(product.price) : prev.unitPrice,
    };
  }
  return { ...prev, [field]: value };
}

function OrderFields({
  values,
  onChange,
}: {
  values: FormValues;
  onChange: (field: keyof FormValues, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium">
        Customer name
        <input
          required
          value={values.customerName}
          onChange={(e) => onChange("customerName", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium">
        Phone
        <input
          required
          inputMode="tel"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium">
        Product
        <select
          value={values.productName}
          onChange={(e) => onChange("productName", e.target.value)}
          className={inputClass}
        >
          {CATALOGUE.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          Quantity
          <input
            required
            type="number"
            min={1}
            step={1}
            value={values.quantity}
            onChange={(e) => onChange("quantity", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Unit price (USD)
          <input
            required
            type="number"
            min={0}
            step={0.01}
            value={values.unitPrice}
            onChange={(e) => onChange("unitPrice", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}

// ---------- Add-order form (POST) ----------

function AddOrderForm({ onCreated }: { onCreated: (order: Order) => Promise<void> }) {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: values.customerName,
          phone: values.phone,
          productName: values.productName,
          quantity: Number(values.quantity),
          unitPrice: Number(values.unitPrice),
        }),
      });

      if (!response.ok) {
        setError(await readError(response)); // values stay as typed
        return;
      }

      const saved: Order = await response.json();
      setValues(EMPTY_FORM); // clear the form only on success
      await onCreated(saved);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault(); // stop the browser from reloading the page
        void handleSubmit();
      }}
      aria-labelledby="add-order-heading"
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="add-order-heading" className="mb-4 text-xl font-semibold">
        Add an order
      </h2>

      <OrderFields
        values={values}
        onChange={(field, value) => setValues((prev) => withChange(prev, field, value))}
      />

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className={`mt-4 w-full sm:w-auto ${primaryButton}`}>
        {isSubmitting ? "Saving…" : "Add order"}
      </button>
    </form>
  );
}

// ---------- Details panel: view, edit (PATCH), delete (DELETE) ----------

function OrderDetails({
  order,
  onSaved,
  onDeleted,
  onClose,
}: {
  order: Order;
  onSaved: (order: Order) => Promise<void>;
  onDeleted: (order: Order) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<EditValues>({
    customerName: order.customerName,
    phone: order.phone,
    productName: order.productName,
    quantity: String(order.quantity),
    unitPrice: String(order.unitPrice),
    status: order.status,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard focus to the panel when it opens (also scrolls to it on mobile).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const isBusy = isSaving || isDeleting;
  const url = `/api/orders/${encodeURIComponent(order.id)}`;

  async function handleSave() {
    // PATCH sends ONLY the fields that changed.
    const changes: OrderUpdate = {};
    if (values.customerName !== order.customerName) changes.customerName = values.customerName;
    if (values.phone !== order.phone) changes.phone = values.phone;
    if (values.productName !== order.productName) changes.productName = values.productName;
    if (Number(values.quantity) !== order.quantity) changes.quantity = Number(values.quantity);
    if (Number(values.unitPrice) !== order.unitPrice) changes.unitPrice = Number(values.unitPrice);
    if (values.status !== order.status) changes.status = values.status;

    if (Object.keys(changes).length === 0) {
      setError("Nothing has changed yet.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        setError(await readError(response)); // values stay as typed
        return;
      }

      const saved: Order = await response.json();
      await onSaved(saved);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete the order for ${order.customerName}? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response));
        setIsDeleting(false);
        return;
      }
      // 204 No Content: there is no body, so we do NOT call response.json().
      await onDeleted(order);
    } catch {
      setError(NETWORK_ERROR);
      setIsDeleting(false);
    }
  }

  return (
    <section
      aria-labelledby="details-heading"
      className="mb-6 rounded-xl border-2 border-amber-700/40 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="details-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold focus:outline-none"
          >
            Order details
          </h2>
          <p className="text-sm text-stone-600">{order.customerName}</p>
        </div>
        <button type="button" onClick={onClose} className={secondaryButton}>
          Close
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-stone-50 p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-stone-600">Order ID</dt>
          <dd className="break-all font-mono text-xs">{order.id}</dd>
        </div>
        <div>
          <dt className="text-stone-600">Phone</dt>
          <dd>{order.phone}</dd>
        </div>
        <div>
          <dt className="text-stone-600">
            {order.quantity} × {formatMoney(order.unitPrice)}
          </dt>
          <dd className="font-semibold">{formatMoney(order.total)}</dd>
        </div>
        <div>
          <dt className="text-stone-600">Status</dt>
          <dd>
            <StatusBadge status={order.status} />
          </dd>
        </div>
      </dl>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        className="mt-6"
      >
        <h3 className="mb-4 font-semibold">Edit order</h3>

        <OrderFields
          values={values}
          onChange={(field, value) => setValues((prev) => withChange(prev, field, value))}
        />

        <label className="mt-4 block text-sm font-medium sm:w-1/2 sm:pr-2">
          Status
          <select
            value={values.status}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, status: e.target.value as OrderStatus }))
            }
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" disabled={isBusy} className={primaryButton}>
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={handleDelete} disabled={isBusy} className={dangerButton}>
            {isDeleting ? "Deleting…" : "Delete order"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ---------- The dashboard ----------

export default function OrderDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // First load, when the page opens.
  useEffect(() => {
    fetchOrders()
      .then((data) => setOrders(data))
      .catch(() => setLoadError(LOAD_ERROR))
      .finally(() => setIsLoading(false));
  }, []);

  // Re-fetch the list from the server (used after every change).
  async function reloadOrders() {
    try {
      setOrders(await fetchOrders());
      setLoadError(null);
    } catch {
      setLoadError(LOAD_ERROR);
    }
  }

  function handleRetry() {
    setIsLoading(true);
    reloadOrders().finally(() => setIsLoading(false));
  }

  // Each handler receives the order the SERVER returned.
  async function handleCreated(order: Order) {
    setNotice(`Saved order for ${order.customerName}: ${formatMoney(order.total)}, ${order.status}.`);
    await reloadOrders();
  }

  async function handleSaved(order: Order) {
    setNotice(`Updated order for ${order.customerName}: ${formatMoney(order.total)}, ${order.status}.`);
    await reloadOrders();
  }

  async function handleDeleted(order: Order) {
    setSelectedId(null);
    setNotice(`Deleted the order for ${order.customerName}.`);
    await reloadOrders();
  }

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;

  // Counts are DERIVED from the server's list, never stored separately.
  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="text-sm font-medium text-amber-800">Nour Candle Studio</p>
          <h1 className="text-3xl font-bold">Order Desk</h1>
        </header>

        <section aria-label="Order summary" className="mb-6 grid grid-cols-3 gap-3">
          <SummaryCard label="Total orders" value={orders.length} />
          <SummaryCard label="Pending" value={pendingCount} />
          <SummaryCard label="Delivered" value={deliveredCount} />
        </section>

        {notice && (
          <p role="status" className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
            {notice}
          </p>
        )}

        <div className="mb-8">
          <AddOrderForm onCreated={handleCreated} />
        </div>

        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="mb-1 text-xl font-semibold">
            Orders
          </h2>
          <p className="mb-3 text-sm text-stone-600">Select an order to view, edit or delete it.</p>

          {selectedOrder && (
            <OrderDetails
              key={selectedOrder.id}
              order={selectedOrder}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onClose={() => setSelectedId(null)}
            />
          )}

          {isLoading ? (
            <p role="status" className="rounded-xl bg-white p-6 text-stone-600 shadow-sm">
              Loading orders…
            </p>
          ) : loadError ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className={`mt-3 rounded-lg bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800 focus-visible:outline-red-700 ${focusRing}`}
              >
                Try again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-stone-600">
              No orders yet. New orders will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => {
                const isSelected = order.id === selectedId;
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`flex w-full flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4 text-left shadow-sm hover:border-amber-700 focus-visible:outline-amber-800 ${focusRing} ${
                        isSelected ? "border-amber-700 ring-2 ring-amber-700/30" : "border-stone-200"
                      }`}
                    >
                      <span>
                        <span className="block font-semibold">{order.customerName}</span>
                        <span className="block text-sm text-stone-600">
                          {order.quantity} × {order.productName}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold">{formatMoney(order.total)}</span>
                        <StatusBadge status={order.status} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}