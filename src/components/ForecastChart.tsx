
'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ForecastPoint {
  day: number;
  date: string;
  balance: number;
}

interface ForecastChartProps {
  points?: ForecastPoint[] | null;
  clientToChase?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LINE_COLOR = '#6366F1';
const NEUTRAL_MARKER = '#818CF8';
const DANGER = '#f44343';
const AXIS = '#9a94b8';

function formatDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  const month = MONTHS[Number(m) - 1] ?? '';
  return `${month} ${Number(d)}`;
}

function money(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`;
}

export default function ForecastChart({ points, clientToChase }: ForecastChartProps) {
  const data = useMemo(() => {
    const safe = Array.isArray(points) ? points : [];
    return safe.map((p) => ({ ...p, label: formatDay(p.date) }));
  }, [points]);

  const lowest = useMemo(
    () =>
      data.reduce<(typeof data)[number] | null>(
        (min, p) => (!min || p.balance < min.balance ? p : min),
        null,
      ),
    [data],
  );

  const shortfall = lowest && lowest.balance < 0 ? lowest : null;
  const markerColor = shortfall ? DANGER : NEUTRAL_MARKER;

  return (
    <div data-nexen-component="nx_components_ForecastChart" className="w-full min-w-0 rounded-[var(--radius)] border border-slate-700 bg-slate-800 p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100" data-nexen-id="nx-f4c35498-0">30-day cash flow</h2>
          <p className="text-sm text-slate-400" data-nexen-id="nx-f4c35498-1">Projected balance if invoices land on time.</p>
        </div>
        {lowest && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              shortfall ? 'bg-rose-500/15 text-rose-400' : 'bg-indigo-500/15 text-indigo-300'
            }`}
           data-nexen-id="nx-f4c35498-2">
            Low: {money(lowest.balance)} on {lowest.label}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400">
          No forecast data yet.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => money(v)}
              />
              <Tooltip
                formatter={(value) => money(Number(value))}
                contentStyle={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  color: '#F1F5F9',
                }}
                labelStyle={{ color: AXIS }}
              />
              <ReferenceLine y={0} stroke={AXIS} strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={LINE_COLOR}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              {lowest && (
                <ReferenceDot
                  x={lowest.label}
                  y={lowest.balance}
                  r={6}
                  fill="#1E293B"
                  stroke={markerColor}
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {shortfall && (
        <div className="mt-4 flex min-w-0 items-start gap-3 rounded-[var(--radius)] border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-400" aria-hidden="true" />
          <p className="min-w-0 break-words" data-nexen-id="nx-f4c35498-3">
            Short by <strong data-nexen-id="nx-f4c35498-4">{money(-shortfall.balance)}</strong> on <strong data-nexen-id="nx-f4c35498-5">{shortfall.label}</strong>.
            Chase {clientToChase ?? 'the client with the late payment'} to keep your balance above zero.
          </p>
        </div>
      )}
    </div>
  );
}