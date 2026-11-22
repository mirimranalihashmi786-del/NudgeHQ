
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Bill } from '@/types/bill';
import type { Bill as PrismaBill } from '@prisma/client';

function serialize(b: PrismaBill): Bill {
  return {
    id: b.id,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    name: b.name,
    amount: Number(b.amount),
    dueDate: b.dueDate.toISOString(),
    status: b.status,
  };
}

export async function GET() {
  try {
    const rows = await db.bill.findMany({
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json({ bills: rows.map(serialize) });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Missing required fields: name, amount, dueDate' },
      { status: 400 }
    );
  }

  const { name, amount, dueDate } = body as Record<string, unknown>;
  const parsedAmount = typeof amount === 'string' ? Number(amount) : amount;

  if (
    typeof name !== 'string' ||
    name.trim() === '' ||
    typeof parsedAmount !== 'number' ||
    !Number.isFinite(parsedAmount) ||
    typeof dueDate !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Missing required fields: name, amount, dueDate' },
      { status: 400 }
    );
  }

  if (parsedAmount <= 0) {
    return NextResponse.json(
      { error: 'Amount must be greater than zero' },
      { status: 400 }
    );
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
  }

  try {
    const bill = await db.bill.create({
      data: {
        name: name.trim(),
        amount: parsedAmount,
        dueDate: due,
      },
    });
    return NextResponse.json({ bill: serialize(bill) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}