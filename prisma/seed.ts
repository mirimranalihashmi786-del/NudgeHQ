// Demo data — rendered by the pipeline from prisma/schema.prisma. One account per
// role (<role>@example.com, password DEMO_PASSWORD from .env) plus demo@example.com, then every table,
// parents first. Every insert is non-fatal; safe to run again.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const ids: Record<string, Array<string | number>> = {};
const users: Record<string, string | number> = {};
function pick(model: string, i: number): string | number | undefined {
  const list = ids[model] || [];
  return list.length ? list[i % list.length] : undefined;
}
function why(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 200) ?? m;
}

async function main() {
  console.log('[seed] demo-user: MISSING — this app has no user model');
  try {
    if ((await db.bill.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ name: "Adobe Creative Cloud", amount: 54.99, dueDate: new Date("2026-11-24T00:00:00.000Z"), status: "unpaid" }),
        () => ({ name: "Tax Installment", amount: 1800, dueDate: new Date("2026-12-01T00:00:00.000Z"), status: "unpaid" }),
        () => ({ name: "Studio Rent", amount: 1200, dueDate: new Date("2026-12-06T00:00:00.000Z"), status: "unpaid" }),
        () => ({ name: "Figma Professional", amount: 15, dueDate: new Date("2026-11-03T00:00:00.000Z"), status: "paid" }),
        () => ({ name: "Coworking Pass", amount: 149, dueDate: new Date("2026-11-15T00:00:00.000Z"), status: "cancelled" }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.bill.create({ data: row() as never });
          (ids["Bill"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Bill row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Bill: ${ok}/${rows.length} rows`);
    } else {
      ids["Bill"] = (await db.bill.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Bill skipped: ' + why(e));
  }
  try {
    if ((await db.client.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ name: "TechCorp Startup", email: "billing@techcorpstartup.io", whatsapp: "15551234567" }),
        () => ({ name: "Sarah's Bakery", email: "hello@sarahsbakery.com", whatsapp: "15552208841" }),
        () => ({ name: "FitApp Mobile", email: "accounts@fitappmobile.com", whatsapp: "447911223344" }),
        () => ({ name: "Northwind Coffee Co.", email: "hello@northwindcoffee.com", whatsapp: "14155550198" }),
        () => ({ name: "Lumen Architecture", email: "studio@lumenarch.co", whatsapp: "61400555019" }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.client.create({ data: row() as never });
          (ids["Client"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Client row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Client: ${ok}/${rows.length} rows`);
    } else {
      ids["Client"] = (await db.client.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Client skipped: ' + why(e));
  }
  try {
    if ((await db.invoice.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ clientId: pick("Client", 0), description: "Brand Identity Final Payment", amount: 2500, dueDate: new Date("2026-11-09T00:00:00.000Z"), expectedPaymentDate: new Date("2026-11-23T00:00:00.000Z"), paidAt: new Date("2026-11-18T00:00:00.000Z"), invoiceNumber: 102 }),
        () => ({ clientId: pick("Client", 1), description: "Website UI Design Deposit", amount: 800, dueDate: new Date("2026-11-26T00:00:00.000Z"), expectedPaymentDate: new Date("2026-11-26T00:00:00.000Z"), paidAt: new Date("2026-11-18T00:00:00.000Z"), invoiceNumber: 103 }),
        () => ({ clientId: pick("Client", 2), description: "App Icon Design", amount: 1200, dueDate: new Date("2026-11-19T00:00:00.000Z"), expectedPaymentDate: new Date("2026-11-19T00:00:00.000Z"), paidAt: new Date("2026-11-18T00:00:00.000Z"), invoiceNumber: 101 }),
        () => ({ clientId: pick("Client", 3), description: "Pitch Deck Layout", amount: 950, dueDate: new Date("2026-11-02T00:00:00.000Z"), expectedPaymentDate: new Date("2026-11-12T00:00:00.000Z"), paidAt: new Date("2026-10-30T00:00:00.000Z"), invoiceNumber: 106 }),
        () => ({ clientId: pick("Client", 4), description: "Social Media Kit", amount: 650, dueDate: new Date("2026-10-28T00:00:00.000Z"), expectedPaymentDate: new Date("2026-10-30T00:00:00.000Z"), paidAt: new Date("2026-10-30T00:00:00.000Z"), invoiceNumber: 105 }),
        () => ({ clientId: pick("Client", 5), description: "Logo Refresh Milestone 2", amount: 1450, dueDate: new Date("2026-12-03T00:00:00.000Z"), expectedPaymentDate: new Date("2026-12-10T00:00:00.000Z"), paidAt: new Date("2026-11-18T00:00:00.000Z"), invoiceNumber: 104 }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.invoice.create({ data: row() as never });
          (ids["Invoice"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Invoice row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Invoice: ${ok}/${rows.length} rows`);
    } else {
      ids["Invoice"] = (await db.invoice.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Invoice skipped: ' + why(e));
  }
}

main()
  .then(async () => { await db.$disconnect(); })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(0); });
