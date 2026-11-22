import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHATSAPP_MESSAGE_LIMIT = 4096;
const CLIENT_NAME_MAX = 120;
const MS_PER_DAY = 86_400_000;
const AI_MODEL = 'claude-3-5-haiku-latest';
const AI_TIMEOUT_MS = 8_000;

type NudgeSource = 'ai' | 'template';

function buildTemplate(
  clientName: string,
  invoiceRef: string,
  amount: number,
  daysOverdue: number,
): string {
  return (
    `Hi ${clientName}, just a quick nudge that invoice #${invoiceRef} for ` +
    `$${amount.toFixed(2)} is ${daysOverdue} days overdue. ` +
    `Let me know if you need me to resend the payment link. Thanks, Maya.`
  );
}

/** Whole days between the due date (a DATE column) and today, both as UTC calendar dates. */
function wholeDaysPastDue(dueDate: Date, now: Date): number {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  return Math.max(0, Math.floor((todayUtc - dueUtc) / MS_PER_DAY));
}

async function polishWithAnthropic(template: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[nudge-draft] ANTHROPIC_API_KEY is not set; using template message.');
    return null;
  }

  try {
    const client = new Anthropic({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 0 });
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      system:
        'You polish short WhatsApp payment reminders written by a freelance designer. ' +
        'Make the tone warm, polite and professional. Keep every fact intact: the invoice ' +
        'number, the amount, the number of days overdue, the offer to resend the payment ' +
        'link, and the sign-off from Maya. Return only the final message text, with no ' +
        'quotes, preamble or commentary.',
      messages: [{ role: 'user', content: template }],
    });

    const block = response.content[0];
    const text = block && block.type === 'text' ? block.text.trim() : '';
    if (!text || text.length > WHATSAPP_MESSAGE_LIMIT) {
      return null;
    }
    return text;
  } catch (error) {
    console.warn('[nudge-draft] Anthropic polish failed; using template message.', error);
    return null;
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { invoiceId: string } },
) {
  try {
    const invoiceId = params.invoiceId;

    if (!invoiceId || !UUID_PATTERN.test(invoiceId)) {
      return NextResponse.json(
        { error: 'Could not find that invoice. Refresh the page and try again.' },
        { status: 404 },
      );
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Could not find that invoice. Refresh the page and try again.' },
        { status: 404 },
      );
    }

    const clientName = invoice.client?.name?.trim() ?? '';
    if (clientName.length < 1 || clientName.length > CLIENT_NAME_MAX) {
      return NextResponse.json(
        { error: 'The client name is missing or too long to draft a nudge.' },
        { status: 400 },
      );
    }

    const amount = Number(invoice.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'The invoice amount must be greater than zero.' },
        { status: 400 },
      );
    }

    const now = new Date();
    const daysOverdue = invoice.paidAt ? 0 : wholeDaysPastDue(invoice.dueDate, now);

    if (invoice.paidAt || daysOverdue < 1) {
      return NextResponse.json(
        { error: 'This invoice is not overdue, so no nudge is needed.' },
        { status: 400 },
      );
    }

    const invoiceRef =
      invoice.invoiceNumber !== null && invoice.invoiceNumber !== undefined
        ? String(invoice.invoiceNumber)
        : invoice.id;

    const template = buildTemplate(clientName, invoiceRef, amount, daysOverdue);

    const polished = await polishWithAnthropic(template);
    const message = polished ?? template;
    const source: NudgeSource = polished ? 'ai' : 'template';

    if (message.trim().length === 0 || message.length > WHATSAPP_MESSAGE_LIMIT) {
      return NextResponse.json(
        {
          error:
            'This message is too long for WhatsApp. Please shorten it to 4096 characters or fewer.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message,
      source,
      client_whatsapp: invoice.client?.whatsapp ?? '',
    });
  } catch (error) {
    console.error('[nudge-draft] Failed to draft nudge', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}