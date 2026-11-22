import { Mail, MessageCircle, Users } from 'lucide-react';
import type { Client } from '@/types/client';

export type ClientWithBalance = Client & { outstandingBalance?: number | string | null };

interface ClientListProps {
  clients?: ClientWithBalance[] | null;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function toBalance(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function digitsOnly(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

function initialsOf(name: string): string {
  return String(name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-8 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Users className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground" data-nexen-id="nx-4cf00b83-0">No clients yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground" data-nexen-id="nx-4cf00b83-1">
        Add your first client to start tracking invoices and outstanding balances.
      </p>
    </div>
  );
}

export default function ClientList({ clients }: ClientListProps) {
  const rows = Array.isArray(clients) ? clients : [];

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <ul className="divide-y divide-border" data-nexen-id="nx-4cf00b83-2">
        {rows.map((client) => {
          const balance = toBalance(client.outstandingBalance);
          const hasBalance = balance > 0;
          const whatsappDigits = digitsOnly(client.whatsapp);

          return (
            <li data-nexen-component="nx_components_ClientList"
              key={client.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
             data-nexen-id="nx-4cf00b83-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-semibold text-secondary"
                  aria-hidden="true"
                >
                  {initialsOf(client.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground" data-nexen-id="nx-4cf00b83-4">{client.name}</p>

                  <div className="mt-1 flex min-w-0 flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
                    <span className="flex min-w-0 items-center gap-1.5" data-nexen-id="nx-4cf00b83-5">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <a
                        href={`mailto:${client.email}`}
                        className="truncate hover:text-foreground"
                       data-nexen-id="nx-4cf00b83-6">
                        {client.email}
                      </a>
                    </span>

                    {whatsappDigits && (
                      <span className="flex min-w-0 items-center gap-1.5" data-nexen-id="nx-4cf00b83-7">
                        <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <a
                          href={`https://wa.me/${whatsappDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-foreground"
                         data-nexen-id="nx-4cf00b83-8">
                          +{whatsappDigits}
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                <span className="text-xs text-muted-foreground sm:hidden" data-nexen-id="nx-4cf00b83-9">Outstanding</span>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      hasBalance ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                   data-nexen-id="nx-4cf00b83-10">
                    {currency.format(balance)}
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block" data-nexen-id="nx-4cf00b83-11">
                    {hasBalance ? 'outstanding' : 'settled'}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}