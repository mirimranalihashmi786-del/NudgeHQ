import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 1_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

type RouteContext = { params: Promise<{ invoiceId: string }> };

type InvoiceRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  description: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  expectedPaymentDate: Date;
  paidAt: Date | null;
  invoiceNumber: number | null;
};

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseDateOnly(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function hasAtMostTwoDecimals(amount: number): boolean {
  return Number.isInteger(Number((amount * 100).toFixed(6)));
}

function toInvoiceJson(invoice: InvoiceRow, today: Date) {
  const daysOverdue = invoice.paidAt
    ? 0
    : Math.max(0, Math.floor((today.getTime() - invoice.dueDate.getTime()) / DAY_MS));
  const status: 'paid' | 'sent' | 'overdue' = invoice.paidAt
    ? 'paid'
    : daysOverdue > 0
      ? 'overdue'
      : 'sent';

  return {
    id: invoice.id,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    clientId: invoice.clientId,
    description: invoice.description,
    amount: Number(invoice.amount.toString()),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    expectedPaymentDate: invoice.expectedPaymentDate.toISOString().slice(0, 10),
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    invoiceNumber: invoice.invoiceNumber,
    status,
    daysOverdue,
  };
}

function isPrismaNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025';
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return bad('Request body must be a JSON object.');
  }
  const input = body as Record<string, unknown>;

  const data: Prisma.InvoiceUncheckedUpdateInput = {};

  if ('clientId' in input) {
    if (typeof input.clientId !== 'string' || !UUID_RE.test(input.clientId)) {
      return bad('Please select a client.');
    }
    const client = await db.client.findUnique({
      where: { id: input.clientId },
      select: { id: true },
    });
    if (!client) return bad('Please select a client.');
    data.clientId = input.clientId;
  }

  if ('description' in input) {
    if (typeof input.description !== 'string' || input.description.trim() === '') {
      return bad('Enter a description for this invoice.');
    }
    const description = input.description.trim();
    if (description.length < 3 || description.length > 120) {
      return bad('Description must be between 3 and 120 characters.');
    }
    data.description = description;
  }

  if ('amount' in input) {
    const amount = parseAmount(input.amount);
    if (amount === null) return bad('Enter an invoice amount.');
    if (amount <= 0 || amount > MAX_AMOUNT || !hasAtMostTwoDecimals(amount)) {
      return bad('Amount must be between $0.01 and $1,000,000, with up to 2 decimal places.');
    }
    data.amount = amount;
  }

  if ('dueDate' in input) {
    if (typeof input.dueDate !== 'string' || input.dueDate.trim() === '') {
      return bad('Choose a due date.');
    }
    const dueDate = parseDateOnly(input.dueDate.trim());
    if (!dueDate) return bad('Enter a valid date (YYYY-MM-DD).');
    data.dueDate = dueDate;
  }

  if ('expectedPaymentDate' in input) {
    if (typeof input.expectedPaymentDate !== 'string' || input.expectedPaymentDate.trim() === '') {
      return bad('Enter a valid date (YYYY-MM-DD).');
    }
    const expectedPaymentDate = parseDateOnly(input.expectedPaymentDate.trim());
    if (!expectedPaymentDate) return bad('Enter a valid date (YYYY-MM-DD).');
    data.expectedPaymentDate = expectedPaymentDate;
  }

  if (Object.keys(data).length === 0) {
    return bad('No editable fields provided.');
  }

  try {
    // paidAt is never touched here, so a paid invoice stays paid; sent/overdue
    // is re-derived from the new due date on every read.
    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data,
    });
    return NextResponse.json({ invoice: toInvoiceJson(updated, todayDateOnly()) });
  } catch (e) {
    if (isPrismaNotFound(e)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('PATCH /api/invoices/[invoiceId] failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await db.invoice.delete({ where: { id: invoiceId } });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (isPrismaNotFound(e)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('DELETE /api/invoices/[invoiceId] failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}