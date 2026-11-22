import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const STARTING_CASH = 1500;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC for today, matching how @db.Date columns are stored. */
function startOfTodayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function toNumber(value: { toNumber(): number } | null | undefined): number {
  return value ? value.toNumber() : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    const todayMs = startOfTodayUtc();
    const today = new Date(todayMs);

    const [paidSum, unpaidSum, billsSum, overdueRows] = await Promise.all([
      // Paid invoices: their cash is already on hand.
      db.invoice.aggregate({
        _sum: { amount: true },
        where: { paidAt: { not: null } },
      }),
      // Unpaid invoices (sent or overdue) are still owed to the user.
      db.invoice.aggregate({
        _sum: { amount: true },
        where: { paidAt: null },
      }),
      // Every bill counts toward total bills due.
      db.bill.aggregate({
        _sum: { amount: true },
      }),
      // Unpaid invoices whose due date is strictly before today are overdue.
      db.invoice.findMany({
        where: {
          paidAt: null,
          dueDate: { lt: today },
        },
        select: {
          id: true,
          clientId: true,
          amount: true,
          dueDate: true,
          client: {
            select: { id: true, name: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const cashOnHand = round2(STARTING_CASH + toNumber(paidSum._sum.amount));
    const totalOwed = round2(toNumber(unpaidSum._sum.amount));
    const totalBillsDue = round2(toNumber(billsSum._sum.amount));

    const overdueInvoices = overdueRows
      .map((invoice) => ({
        invoice_id: invoice.id,
        client_id: invoice.clientId,
        client_name: invoice.client.name,
        amount: round2(invoice.amount.toNumber()),
        days_overdue: Math.max(
          0,
          Math.floor((todayMs - invoice.dueDate.getTime()) / DAY_MS),
        ),
      }))
      .sort((a, b) => b.days_overdue - a.days_overdue);

    return NextResponse.json({
      dashboard: {
        cash_on_hand: cashOnHand,
        total_owed: totalOwed,
        total_bills_due: totalBillsDue,
        overdue_invoices: overdueInvoices,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}