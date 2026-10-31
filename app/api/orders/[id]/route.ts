import { NextResponse } from "next/server";
import {
  deleteOrder,
  findOrder,
  updateOrder,
  validateOrderUpdate,
} from "@/lib/orders";

export const dynamic = "force-dynamic";

// In Next.js 16, params is a Promise, so it must be awaited.
type RouteContext = { params: Promise<{ id: string }> };

function notFound(id: string) {
  return NextResponse.json(
    { error: `Order ${id} was not found` },
    { status: 404 }
  );
}

// GET /api/orders/[id] → 200 + the order, or 404
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const order = findOrder(id);
  if (!order) return notFound(id);
  return NextResponse.json(order);
}

// PATCH /api/orders/[id] → 200 + updated order, 400, or 404
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  // 1. Does the order exist?
  if (!findOrder(id)) return notFound(id);

  // 2. Read the body safely (no body at all or broken JSON → 400).
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  // 3. Validate EVERYTHING before touching the store.
  const result = validateOrderUpdate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 4. Only now change the stored order.
  const updated = updateOrder(id, result.data);
  if (!updated) return notFound(id);
  return NextResponse.json(updated);
}

// DELETE /api/orders/[id] → 204 with no body, or 404
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const deleted = deleteOrder(id);
  if (!deleted) return notFound(id);
  return new Response(null, { status: 204 });
}