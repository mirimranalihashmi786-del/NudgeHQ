import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WHATSAPP_RE = /^\d{8,15}$/;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    const rows = await db.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        invoices: {
          where: { paidAt: null },
          select: { amount: true },
        },
      },
    });

    const clients = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      whatsapp: row.whatsapp,
      outstanding_balance: roundMoney(
        row.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
      ),
    }));

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('GET /api/clients failed', error);
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
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const { name, email, whatsapp } = body as Record<string, unknown>;

  const errors: string[] = [];

  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName) {
    errors.push('name is required');
  }

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!cleanEmail) {
    errors.push('email is required');
  } else if (!EMAIL_RE.test(cleanEmail)) {
    errors.push('email must be a valid email address');
  }

  // Strip common formatting characters, then require digits only with country code.
  const cleanWhatsapp =
    typeof whatsapp === 'string' ? whatsapp.replace(/[\s\-()+.]/g, '') : '';
  if (!cleanWhatsapp) {
    errors.push('whatsapp is required');
  } else if (!WHATSAPP_RE.test(cleanWhatsapp)) {
    errors.push('whatsapp must contain digits only, including the country code (8 to 15 digits)');
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  try {
    const existing = await db.client.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A client with this email already exists' },
        { status: 409 },
      );
    }

    const client = await db.client.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        whatsapp: cleanWhatsapp,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A client with this email already exists' },
        { status: 409 },
      );
    }
    console.error('POST /api/clients failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}