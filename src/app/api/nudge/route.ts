import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const WHATSAPP_MAX_LENGTH = 4096;
const CLIENT_NAME_MAX_LENGTH = 120;
const DAY_MS = 86_400_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_OVERDUE_MESSAGE = 'This invoice is not overdue, so no nudge is needed.';
const INVOICE_NOT_FOUND_MESSAGE = 'Could not find that invoice. Refresh the page and try again.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function utcToday(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function daysOverdueFrom(dueDate: Date): number {
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return Math.max(0, Math.floor((utcToday() - due) / DAY_MS));
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildTemplate(params: {
  clientName: string;
  invoiceRef: string;
  amount: number;
  daysOverdue: number;
}): string {
  const { clientName, invoiceRef, amount, daysOverdue } = params;
  return `Hi ${clientName}, just a quick nudge that invoice #${invoiceRef} for $${formatAmount(amount)} is ${daysOverdue} days overdue. Let me know if you need me to resend the payment link. Thanks, Maya.`;
}

async function polishWithAnthropic(template: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY is not set; using the template nudge.');
    return null;
  }

  try {
    const client = new Anthropic({ apiKey, timeout: 8000, maxRetries: 0 });
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content:
            'Rewrite the following WhatsApp payment reminder so it sounds warm, polite and professional. ' +
            'Keep every fact unchanged (client name, invoice number, amount, days overdue). ' +
            'Keep it short. Return only the message text, with no preamble or quotes.\n\n' +
            template,
        },
      ],
    });

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    if (!text || text.length > WHATSAPP_MAX_LENGTH) {
      return null;
    }
    return text;
  } catch (error) {
    console.warn('Anthropic nudge polish failed; using the template nudge.', error);
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const invoiceId =
    isRecord(body) && typeof body.invoice_id === 'string' ? body.invoice_id.trim() : '';

  if (!invoiceId) {
    return NextResponse.json({ error: INVOICE_NOT_FOUND_MESSAGE }, { status: 400 });
  }

  if (!UUID_PATTERN.test(invoiceId)) {
    return NextResponse.json({ error: INVOICE_NOT_FOUND_MESSAGE }, { status: 404 });
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: INVOICE_NOT_FOUND_MESSAGE }, { status: 404 });
    }

    // The schema has no status column: an invoice is overdue when it is unpaid
    // and its due date is in the past.
    if (invoice.paidAt !== null) {
      return NextResponse.json({ error: NOT_OVERDUE_MESSAGE }, { status: 400 });
    }

    const daysOverdue = daysOverdueFrom(invoice.dueDate);
    if (!Number.isInteger(daysOverdue) || daysOverdue < 1) {
      return NextResponse.json({ error: NOT_OVERDUE_MESSAGE }, { status: 400 });
    }

    const amount = invoice.amount.toNumber();
    if (!(amount > 0)) {
      return NextResponse.json(
        { error: 'The invoice amount must be greater than zero.' },
        { status: 400 },
      );
    }

    const clientName = invoice.client.name.trim();
    if (clientName.length < 1 || clientName.length > CLIENT_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: 'The client name is missing or too long to draft a nudge.' },
        { status: 400 },
      );
    }

    const template = buildTemplate({
      clientName,
      invoiceRef: invoice.invoiceNumber !== null ? String(invoice.invoiceNumber) : invoice.id,
      amount,
      daysOverdue,
    });

    const polished = await polishWithAnthropic(template);
    const message = polished ?? template;
    const source: 'ai' | 'template' = polished ? 'ai' : 'template';

    return NextResponse.json({ nudge: { message, source } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: INVOICE_NOT_FOUND_MESSAGE }, { status: 404 });
    }
    console.error('POST /api/nudge failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}