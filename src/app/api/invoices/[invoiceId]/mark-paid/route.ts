import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { Invoice as InvoiceRecord } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serializeInvoice(invoice: InvoiceRecord) {
  return {
    id: invoice.id,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    clientId: invoice.clientId,
    description: invoice.description,
    amount: invoice.amount.toNumber(),
    dueDate: invoice.dueDate.toISOString(),
    expectedPaymentDate: invoice.expectedPaymentDate.toISOString(),
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    invoiceNumber: invoice.invoiceNumber,
  };
}

export async function POST(
  _request: Request,
  { params }: { params: { invoiceId: string } },
) {
  const invoiceId = params.invoiceId;

  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const existing = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, paidAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.paidAt) {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 409 },
      );
    }

    // Conditional update so cash on hand is credited only once, even if two
    // requests race to mark the same invoice paid.
    const result = await db.invoice.updateMany({
      where: { id: invoiceId, paidAt: null },
      data: { paidAt: new Date() },
    });

    if (result.count === 0) {
      const current = await db.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, paidAt: true },
      });
      if (!current) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 409 },
      );
    }

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });

    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice: serializeInvoice(invoice) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}