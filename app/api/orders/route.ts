import { NextResponse } from "next/server";
import { createOrder, listOrders, validateNewOrder } from "@/lib/orders";

// Always run on each request; never pre-build this route with old data.
export const dynamic = "force-dynamic";

// GET /api/orders → 200 + array of orders
export async function GET() {
  return NextResponse.json(listOrders());
}

// POST /api/orders → 201 + the created order, or 400 + { error }
export async function POST(request: Request) {
  // 1. Read the body. Broken JSON throws here, so catch it → 400.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  // 2. Validate. The store is not touched yet.
  const result = validateNewOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 3. Only now save it. The server sets id, total and status.
  const order = createOrder(result.data);
  return NextResponse.json(order, { status: 201 });
}