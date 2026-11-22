import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 120;

type ClientPatchBody = {
  name?: unknown;
  email?: unknown;
  whatsapp?: unknown;
};

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function validateName(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Name must be a string' };
  }
  const name = raw.trim();
  if (name.length === 0) {
    return { ok: false, error: 'Name cannot be empty' };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }
  return { ok: true, value: name };
}

function validateEmail(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Email must be a string' };
  }
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Email is not a valid address' };
  }
  return { ok: true, value: email };
}

function validateWhatsapp(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'WhatsApp number must be a string' };
  }
  // Allow a leading "+" and common visual separators, then store digits only.
  const stripped = raw.trim().replace(/^\+/, '').replace(/[\s\-().]/g, '');
  if (!/^\d+$/.test(stripped)) {
    return { ok: false, error: 'WhatsApp number must contain digits only, including the country code' };
  }
  if (stripped.length < 8 || stripped.length > 15) {
    return { ok: false, error: 'WhatsApp number must be between 8 and 15 digits' };
  }
  return { ok: true, value: stripped };
}

function isKnownRequestError(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

export async function PATCH(
  request: Request,
  { params }: { params: { clientId: string } }
) {
  const clientId = params.clientId;
  if (!UUID_RE.test(clientId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: ClientPatchBody;
  try {
    body = (await request.json()) as ClientPatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const data: Prisma.ClientUpdateInput = {};

  if (body.name !== undefined) {
    const result = validateName(body.name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    data.name = result.value;
  }

  if (body.email !== undefined) {
    const result = validateEmail(body.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    data.email = result.value;
  }

  if (body.whatsapp !== undefined) {
    const result = validateWhatsapp(body.whatsapp);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    data.whatsapp = result.value;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'Provide at least one of name, email or whatsapp' },
      { status: 400 }
    );
  }

  try {
    const existing = await db.client.findUnique({ where: { id: clientId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (typeof data.email === 'string' && data.email !== existing.email) {
      const duplicate = await db.client.findFirst({
        where: { email: data.email, NOT: { id: clientId } },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        );
      }
    }

    const client = await db.client.update({
      where: { id: clientId },
      data,
    });

    return NextResponse.json({ client });
  } catch (e) {
    if (isKnownRequestError(e, 'P2025')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (isKnownRequestError(e, 'P2002')) {
      return NextResponse.json(
        { error: 'A client with this email already exists' },
        { status: 409 }
      );
    }
    console.error('PATCH /api/clients/[clientId] failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { clientId: string } }
) {
  const clientId = params.clientId;
  if (!UUID_RE.test(clientId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const existing = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, _count: { select: { invoices: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Client has invoices and cannot be deleted' },
        { status: 409 }
      );
    }

    await db.client.delete({ where: { id: clientId } });

    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (isKnownRequestError(e, 'P2025')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (isKnownRequestError(e, 'P2003')) {
      return NextResponse.json(
        { error: 'Client has invoices and cannot be deleted' },
        { status: 409 }
      );
    }
    console.error('DELETE /api/clients/[clientId] failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}