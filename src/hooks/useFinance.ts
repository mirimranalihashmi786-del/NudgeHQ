
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getBills,
  getClients,
  getDashboard,
  getForecast,
  getInvoices,
} from '@/lib/api';
import type { Bill } from '@/types/bill';
import type { Invoice } from '@/types/invoice';

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
export type ForecastData = Awaited<ReturnType<typeof getForecast>>;
export type InvoiceRow = Invoice & { client_name: string; days_overdue: number };
export type ClientRow = Awaited<ReturnType<typeof getClients>>[number];

export interface UseFinanceOptions {
  delayedInvoiceId?: string;
  delayDays?: number;
}

export interface UseFinanceResult {
  dashboard: DashboardData | null;
  forecast: ForecastData | null;
  invoices: InvoiceRow[];
  clients: ClientRow[];
  bills: Bill[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFinance(options: UseFinanceOptions = {}): UseFinanceResult {
  const { delayedInvoiceId, delayDays } = options;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Incremented on every request so only the latest response is applied.
  const requestId = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    requestId.current += 1;
    const id = requestId.current;

    setIsLoading(true);
    setError(null);

    const forecastQuery =
      delayedInvoiceId && delayDays
        ? { delayedInvoiceId, delayDays }
        : undefined;

    try {
      const [dash, fc, inv, cls, bl] = await Promise.all([
        getDashboard(),
        getForecast(forecastQuery),
        getInvoices(),
        getClients(),
        getBills(),
      ]);

      if (id !== requestId.current) return;

      setDashboard(dash);
      setForecast(fc);
      setInvoices(Array.isArray(inv) ? inv : []);
      setClients(Array.isArray(cls) ? cls : []);
      setBills(Array.isArray(bl) ? bl : []);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(
        err instanceof Error ? err : new Error('Failed to load finance data'),
      );
    } finally {
      if (id === requestId.current) {
        setIsLoading(false);
      }
    }
  }, [delayedInvoiceId, delayDays]);

  useEffect(() => {
    void load();
    return () => {
      // Invalidate any in-flight request when deps change or on unmount.
      requestId.current += 1;
    };
  }, [load]);

  return {
    dashboard,
    forecast,
    invoices,
    clients,
    bills,
    isLoading,
    error,
    refetch: load,
  };
}