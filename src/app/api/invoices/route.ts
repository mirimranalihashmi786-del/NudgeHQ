import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MS_PER_DAY = 86_400_000;
const MAX_AMOUNT = 1_000_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

type InvoiceStatus = 'paid' | 'sent' | 'overdue';

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
  client: { name: string };
};

function todayUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function deriveStatus(paidAt: Date | null, dueDate: Date, todayUtc: number): InvoiceStatus {
  if (paidAt) return 'paid';
  return dueDate.getTime() < todayUtc ? 'overdue' : 'sent';
}

function daysOverdueFor(status: InvoiceStatus, dueDate: Date, todayUtc: number): number {
  if (status !== 'overdue') return 0;
  return Math.max(0, Math.floor((todayUtc - dueDate.getTime()) / MS_PER_DAY));
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function serializeInvoice(row: InvoiceRow, todayUtc: number) {
  const status = deriveStatus(row.paidAt, row.dueDate, todayUtc);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    clientId: row.clientId,
    clientName: row.client.name,
    description: row.description,
    amount: row.amount.toNumber(),
    dueDate: toDateOnly(row.dueDate),
    expectedPaymentDate: toDateOnly(row.expectedPaymentDate),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    invoiceNumber: row.invoiceNumber,
    status,
    daysOverdue: daysOverdueFor(status, row.dueDate, todayUtc),
  };
}

function parseCalendarDate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

export async function GET() {
  try {
    const todayUtc = todayUtcMidnight();
    const rows = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    });
    const invoices = rows.map((row) => serializeInvoice(row as InvoiceRow, todayUtc));
    return NextResponse.json({ invoices });
  } catch (e) {
    console.error('[GET /api/invoices]', e);
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

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Client
  const clientId = typeof raw.clientId === 'string' ? raw.clientId.trim() : '';
  if (!clientId || !UUID_RE.test(clientId)) {
    return NextResponse.json({ error: 'Please select a client.' }, { status: 400 });
  }

  // Amount
  if (raw.amount === undefined || raw.amount === null || raw.amount === '') {
    return NextResponse.json({ error: 'Enter an invoice amount.' }, { status: 400 });
  }
  const amountText =
    typeof raw.amount === 'number'
      ? Number.isFinite(raw.amount) ? String(raw.amount) : ''
      : typeof raw.amount === 'string' ? raw.amount.trim() : '';
  const amountValue = AMOUNT_RE.test(amountText) ? Number(amountText) : NaN;
  if (!Number.isFinite(amountValue) || amountValue < 0.01 || amountValue > MAX_AMOUNT) {
    return NextResponse.json(
      { error: 'Amount must be between $0.01 and $1,000,000, with up to 2 decimal places.' },
      { status: 400 },
    );
  }

  // Description
  if (typeof raw.description !== 'string' || raw.description.trim() === '') {
    return NextResponse.json({ error: 'Enter a description for this invoice.' }, { status: 400 });
  }
  const description = raw.description.trim();
  if (description.length < 3 || description.length > 120) {
    return NextResponse.json(
      { error: 'Description must be between 3 and 120 characters.' },
      { status: 400 },
    );
  }

  // Due date
  if (typeof raw.dueDate !== 'string' || raw.dueDate.trim() === '') {
    return NextResponse.json({ error: 'Choose a due date.' }, { status: 400 });
  }
  const dueDateText = raw.dueDate.trim();
  const dueDate = parseCalendarDate(dueDateText);
  if (!dueDate) {
    return NextResponse.json({ error: 'Enter a valid date (YYYY-MM-DD).' }, { status: 400 });
  }

  try {
    const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) {
      return NextResponse.json({ error: 'Please select a client.' }, { status: 400 });
    }

    const todayUtc = todayUtcMidnight();
    const status: InvoiceStatus = dueDate.getTime() < todayUtc ? 'overdue' : 'sent';

    // Next invoice number = highest stored + 1 (NULLs ignored by MAX).
    const created = await db.$transaction(async (tx) => {
      const agg = await tx.invoice.aggregate({ _max: { invoiceNumber: true } });
      const nextNumber = (agg._max.invoiceNumber ?? 0) + 1;
      return tx.invoice.create({
        data: {
          clientId,
          description,
          amount: amountValue.toFixed(2),
          dueDate,
          expectedPaymentDate: dueDate, // expected payment defaults to due date
          paidAt: null,
          invoiceNumber: nextNumber,
        },
        include: { client: { select: { name: true } } },
      });
    });

    const invoice = serializeInvoice(created as InvoiceRow, todayUtc);
    // Status is derived from dates; `status` above must match the creation rule.
    return NextResponse.json({ invoice: { ...invoice, status } }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return NextResponse.json({ error: 'Please select a client.' }, { status: 400 });
    }
    console.error('[POST /api/invoices]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}