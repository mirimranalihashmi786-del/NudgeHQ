import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { Bill as BillRecord } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: { billId: string } | Promise<{ billId: string }>;
};

async function resolveBillId(context: RouteContext): Promise<string> {
  const { billId } = await context.params;
  return billId;
}

function serializeBill(bill: BillRecord) {
  return {
    id: bill.id,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
    name: bill.name,
    amount: bill.amount.toNumber(),
    dueDate: bill.dueDate.toISOString(),
    status: bill.status,
  };
}

function handleWriteError(error: unknown, label: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  console.error(`[bills/{billId}] ${label} failed`, error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const billId = await resolveBillId(context);

  if (!UUID_RE.test(billId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const data: Prisma.BillUpdateInput = {};

  if ('name' in input) {
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
    }
    data.name = input.name.trim();
  }

  if ('amount' in input) {
    const raw = input.amount;
    const amount = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than zero' }, { status: 400 });
    }
    data.amount = amount;
  }

  if ('dueDate' in input) {
    if (typeof input.dueDate !== 'string') {
      return NextResponse.json({ error: 'dueDate must be an ISO date string' }, { status: 400 });
    }
    const dueDate = new Date(input.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'dueDate must be a valid date' }, { status: 400 });
    }
    data.dueDate = dueDate;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  try {
    const bill = await db.bill.update({
      where: { id: billId },
      data,
    });
    return NextResponse.json({ bill: serializeBill(bill) });
  } catch (error) {
    return handleWriteError(error, 'update');
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const billId = await resolveBillId(context);

  if (!UUID_RE.test(billId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const existing = await db.bill.findUnique({ where: { id: billId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.status === 'unpaid') {
      return NextResponse.json(
        { error: 'Only paid or cancelled bills can be deleted' },
        { status: 409 },
      );
    }

    await db.bill.delete({ where: { id: billId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleWriteError(error, 'delete');
  }
}