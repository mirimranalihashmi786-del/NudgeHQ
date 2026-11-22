import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;
const OPENING_CASH_BALANCE = 1500;
const MAX_DELAY_DAYS = 365;
const DAY_MS = 86_400_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addToMap(map: Map<string, number>, key: string, amount: number): void {
  map.set(key, round2((map.get(key) ?? 0) + amount));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const delayedInvoiceIdParam = searchParams.get('delayedInvoiceId')?.trim() || undefined;
  const delayDaysParam = searchParams.get('delayDays')?.trim() || undefined;

  if (delayedInvoiceIdParam !== undefined && !UUID_RE.test(delayedInvoiceIdParam)) {
    return NextResponse.json({ error: 'Invalid delayedInvoiceId' }, { status: 400 });
  }

  let delayDays: number | undefined;
  if (delayDaysParam !== undefined) {
    if (!/^\d+$/.test(delayDaysParam)) {
      return NextResponse.json({ error: 'delayDays must be a whole number of days' }, { status: 400 });
    }
    delayDays = Number(delayDaysParam);
    if (delayDays > MAX_DELAY_DAYS) {
      return NextResponse.json(
        { error: `delayDays must be ${MAX_DELAY_DAYS} or fewer` },
        { status: 400 },
      );
    }
  }

  if (delayedInvoiceIdParam !== undefined && delayDays === undefined) {
    return NextResponse.json(
      { error: 'delayDays is required when delayedInvoiceId is given' },
      { status: 400 },
    );
  }
  if (delayedInvoiceIdParam === undefined && delayDays !== undefined) {
    return NextResponse.json(
      { error: 'delayedInvoiceId is required when delayDays is given' },
      { status: 400 },
    );
  }

  try {
    if (delayedInvoiceIdParam !== undefined) {
      const target = await db.invoice.findUnique({
        where: { id: delayedInvoiceIdParam },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
    }

    const [paidInvoices, unpaidInvoices, bills] = await Promise.all([
      db.invoice.findMany({
        where: { paidAt: { not: null } },
        select: { amount: true },
      }),
      db.invoice.findMany({
        where: { paidAt: null },
        select: { id: true, amount: true, expectedPaymentDate: true },
      }),
      db.bill.findMany({
        select: { amount: true, dueDate: true },
      }),
    ]);

    const today = startOfTodayUtc();

    // Cash on hand: starting balance plus everything already collected.
    const paidTotal = paidInvoices.reduce((sum, inv) => sum + toNumber(inv.amount), 0);
    const startingBalance = round2(OPENING_CASH_BALANCE + paidTotal);

    // Daily inflows (unpaid invoices by expected payment date) and outflows (bills by due date).
    // Keys outside the 31-day window are simply never read below.
    const inflowByDay = new Map<string, number>();
    const outflowByDay = new Map<string, number>();

    for (const invoice of unpaidInvoices) {
      let effectiveDate = invoice.expectedPaymentDate;
      if (
        delayedInvoiceIdParam !== undefined &&
        delayDays !== undefined &&
        invoice.id === delayedInvoiceIdParam
      ) {
        effectiveDate = addDays(effectiveDate, delayDays);
      }
      addToMap(inflowByDay, toDateKey(effectiveDate), toNumber(invoice.amount));
    }

    for (const bill of bills) {
      addToMap(outflowByDay, toDateKey(bill.dueDate), toNumber(bill.amount));
    }

    // 31 daily points: day 0 (today) through day 30.
    const points: { day: number; date: string; balance: number }[] = [];
    let runningBalance = startingBalance;

    for (let day = 0; day <= WINDOW_DAYS; day++) {
      const dateKey = toDateKey(addDays(today, day));
      const inflow = inflowByDay.get(dateKey) ?? 0;
      const outflow = outflowByDay.get(dateKey) ?? 0;
      runningBalance = round2(runningBalance + inflow - outflow);
      points.push({ day, date: dateKey, balance: runningBalance });
    }

    // Lowest point (earliest day wins ties).
    let lowest = points[0];
    for (const point of points) {
      if (point.balance < lowest.balance) {
        lowest = point;
      }
    }

    const shortfallAmount = round2(Math.max(0, -lowest.balance));

    const forecast = {
      points,
      lowest: { day: lowest.day, balance: lowest.balance },
      shortfall_amount: shortfallAmount,
      shortfall_day: lowest.day,
    };

    return NextResponse.json({ forecast });
  } catch (error) {
    console.error('GET /api/forecast failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}