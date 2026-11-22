'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getForecast } from '@/lib/api';
import { useFinance } from '@/hooks/useFinance';
import MetricCard from '@/components/MetricCard';
import ActionCenter from '@/components/ActionCenter';
import ForecastChart from '@/components/ForecastChart';
import NudgeModal from '@/components/NudgeModal';

type Scenario = Awaited<ReturnType<typeof getForecast>>;
const DELAY_DAYS = 15;

export default function DashboardPage() {
  const { dashboard, forecast, isLoading, error, refetch } = useFinance();
  const [whatIf, setWhatIf] = useState(false);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [nudgeId, setNudgeId] = useState<string | null>(null);

  const overdue = dashboard?.overdue_invoices ?? null;
  const safeOverdue = Array.isArray(overdue) ? overdue : [];
  const target = safeOverdue.find((r) => r.client_name.includes('TechCorp')) ?? safeOverdue[0];
  const targetId = target?.invoice_id;
  const targetName = target?.client_name ?? '';

  useEffect(() => {
    if (!whatIf || !targetId) {
      setScenario(null);
      return;
    }
    let active = true;
    getForecast({ delayedInvoiceId: targetId, delayDays: DELAY_DAYS })
      .then((res) => { if (active) setScenario(res); })
      .catch(() => { if (active) setScenario(null); });
    return () => { active = false; };
  }, [whatIf, targetId]);

  const nudgeRow = safeOverdue.find((r) => r.invoice_id === nudgeId);
  const nudgeInvoice = nudgeRow
    ? {
        id: nudgeRow.invoice_id,
        clientId: nudgeRow.client_id,
        clientName: nudgeRow.client_name,
        amount: nudgeRow.amount,
        daysOverdue: nudgeRow.days_overdue,
      }
    : null;

  const points = whatIf && scenario ? scenario.points : (forecast?.points ?? null);

  return (
    <div data-nexen-component="nx_app_page" className="mx-auto w-full max-w-6xl min-w-0 space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-nexen-id="nx-3393394e-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground" data-nexen-id="nx-3393394e-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground" data-nexen-id="nx-3393394e-2">Cash position and what needs chasing.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm" data-nexen-id="nx-3393394e-3">
          <Link href="/invoices" className="rounded-[var(--radius)] border border-border bg-card px-3 py-1.5" data-nexen-id="nx-3393394e-4">Invoices</Link>
          <Link href="/clients" className="rounded-[var(--radius)] border border-border bg-card px-3 py-1.5" data-nexen-id="nx-3393394e-5">Clients</Link>
          <Link href="/bills" className="rounded-[var(--radius)] border border-border bg-card px-3 py-1.5" data-nexen-id="nx-3393394e-6">Bills</Link>
        </nav>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-[var(--radius)] border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 break-words" data-nexen-id="nx-3393394e-7">{String(error)}</span>
          <button type="button" onClick={() => refetch()} className="rounded-[var(--radius)] border border-border px-3 py-1 text-foreground" data-nexen-id="nx-3393394e-8">Retry</button>
        </div>
      )}
      {isLoading && !dashboard && <p className="text-sm text-muted-foreground" data-nexen-id="nx-3393394e-9">Loading your numbers…</p>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-nexen-id="nx-3393394e-10">
        <MetricCard label="Cash on hand" value={dashboard?.cash_on_hand ?? 0} tone="positive" hint="Starting balance plus paid invoices" currency="USD" />
        <MetricCard label="Total owed to you" value={dashboard?.total_owed ?? 0} tone="neutral" hint="Sent and overdue invoices" currency="USD" />
        <MetricCard label="Total bills due" value={dashboard?.total_bills_due ?? 0} tone="negative" hint="All upcoming bills" currency="USD" />
      </section>

      <ActionCenter overdueInvoices={overdue} onDraftNudge={setNudgeId} />

      <section className="min-w-0 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6" data-nexen-id="nx-3393394e-11">
        <div>
          <h2 className="text-lg font-semibold text-foreground" data-nexen-id="nx-3393394e-12">30-day cash flow</h2>
          <p className="text-sm text-muted-foreground" data-nexen-id="nx-3393394e-13">Projected balance if invoices land on time.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={whatIf}
          disabled={!targetId}
          onClick={() => setWhatIf((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border px-4 py-3 text-left text-sm disabled:opacity-50"
         data-nexen-id="nx-3393394e-14">
          <span className="min-w-0 text-foreground" data-nexen-id="nx-3393394e-15">
            What if {targetName || 'your top overdue client'} pays {DELAY_DAYS} days late?
          </span>
          <span className={`h-5 w-9 flex-none rounded-full ${whatIf ? 'bg-primary' : 'bg-muted'}`}  data-nexen-id="nx-3393394e-16"/>
        </button>
        <ForecastChart points={points} clientToChase={targetName} />
      </section>

      {nudgeInvoice && (
        <NudgeModal invoice={nudgeInvoice} onClose={() => setNudgeId(null)} />
      )}
    </div>
  );
}