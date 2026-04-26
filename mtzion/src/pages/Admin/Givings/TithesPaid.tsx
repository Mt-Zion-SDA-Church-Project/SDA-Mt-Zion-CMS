import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { useAdminTabAllowed } from '../../../hooks/useAdminTabAllowed';
import PageLoader from '../../../components/Layout/PageLoader';
import logo from '../../../assets/sda-logo.png';

function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

type SummaryRow = { id: string; service_date: string; total: number };

function dateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

const TithesPaid: React.FC = () => {
  const queryClient = useQueryClient();
  const accessQuery = useAdminTabAllowed('financial_summaries');

  const { data: summaries = [], isPending: loadingSummaries, refetch: fetchSummaries } = useQuery({
    queryKey: queryKeys.tithes.cashOfferingAccounts(),
    enabled: accessQuery.data === true,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('cash_offering_accounts')
          .select('id, service_date, total')
          .order('service_date', { ascending: false })
          .limit(2000);
        if (error) throw error;
        return (data || []).map((d) => ({
          id: d.id as string,
          service_date: d.service_date as string,
          total: (d.total as unknown as number) || 0,
        })) as SummaryRow[];
      } catch {
        return [];
      }
    },
  });

  const totals = useMemo(() => {
    const totalAll = summaries.reduce((s, r) => s + r.total, 0);
    const byDate = new Map<string, { sum: number; count: number }>();
    for (const r of summaries) {
      const k = dateKey(r.service_date);
      const cur = byDate.get(k) || { sum: 0, count: 0 };
      cur.sum += r.total;
      cur.count += 1;
      byDate.set(k, cur);
    }
    const byDateRows = [...byDate.entries()]
      .map(([k, v]) => ({ dateKey: k, ...v }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return { totalAll, entryCount: summaries.length, uniqueSabbaths: byDate.size, byDateRows };
  }, [summaries]);

  useEffect(() => {
    const inv = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tithes.cashOfferingAccounts() });
    };
    const channel = supabase
      .channel('cash_offering_accounts_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cash_offering_accounts' }, inv)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const CATEGORY_COLUMNS: Array<{ key: string; label: string }> = [
    { key: 'trust_fund', label: 'Trust Fund' },
    { key: 'ekitundu_10', label: 'Tithe (10%)' },
    { key: 'camp_meeting_offering', label: 'Camp Meeting Offering' },
    { key: 'ssabiti_13th', label: '13th Sabbath' },
    { key: 'prime_radio', label: 'Prime Radio' },
    { key: 'hope_channel_tv_uganda', label: 'Hope Channel TV Uganda' },
    { key: 'eddwaliro_kireka', label: 'Kireka Adventist Church' },
    { key: 'ebf_development_fund', label: 'EBF Development Fund' },
    { key: 'ebirabo_ebyawamu', label: 'Combined Offerings' },
    { key: 'essomero_lya_ssabbiti', label: 'Sabbath School' },
    { key: 'okwebaza', label: 'Thanks Giving' },
    { key: 'okusinza', label: 'Devine' },
    { key: 'ebirabo_ebirala', label: 'NBF Development Fund' },
    { key: 'okuzimba', label: 'Local Church Building' },
    { key: 'ekyemisana', label: 'Lunch' },
    { key: 'social_and_welfare', label: 'Social and Welfare' },
    { key: 'camp_meeting_expense', label: 'Camp Meeting Expense' },
    { key: 'enjiri', label: 'Evangelism' },
  ];

  const openPdf = async (id: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write('<!doctype html><html><head><title>Loading…</title></head><body style="font-family:Arial,sans-serif;padding:24px;">Generating PDF…</body></html>');
    win.document.close();

    const { data, error } = await supabase.from('cash_offering_accounts').select('*').eq('id', id).single();

    if (error || !data) {
      win.document.open();
      win.document.write(
        `<p style="color:#b91c1c;font-family:Arial,sans-serif;padding:24px;">Failed to load summary: ${(error as Error)?.message || 'Unknown error'}</p>`
      );
      win.document.close();
      return;
    }

    const dateStr = new Date(data.service_date).toLocaleDateString();
    const rows = CATEGORY_COLUMNS.map(({ key, label }) => ({ label, value: Number(data[key] || 0) })).filter((r) => r.value > 0);

    const total = Number(data.total || rows.reduce((s, r) => s + r.value, 0));

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Financial Summary - ${dateStr}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      .header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
      .logo { width: 40px; height: 40px; }
      .subtitle { color: #6b7280; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 14px; }
      tfoot td { font-weight: 700; font-size: 16px; }
      .meta { margin-top: 12px; font-size: 13px; color: #374151; }
      .btns { margin-top: 16px; }
      @media print { .btns { display: none; } }
    </style>
  </head>
  <body>
    <div class="header">
      <img class="logo" src="${logo}" alt="SDA Logo" />
      <div>
        <div style="font-weight:700;">Seventh-Day Adventist Church, Mt. Zion - Kigoma</div>
        <div class="subtitle">Financial Summary</div>
      </div>
    </div>
    <div class="meta">Sabbath Date: <strong>${dateStr}</strong></div>
    <table>
      <thead><tr><th>Category</th><th>Amount (UGX)</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${r.label}</td><td>${new Intl.NumberFormat('en-UG').format(r.value)}</td></tr>`).join('')}
      </tbody>
      <tfoot>
        <tr><td>Total</td><td>${new Intl.NumberFormat('en-UG').format(total)}</td></tr>
      </tfoot>
    </table>
    <div class="btns">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
  </body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  if (accessQuery.isPending) {
    return (
      <div className="p-4">
        <PageLoader variant="inline" message="Checking access…" />
      </div>
    );
  }

  if (accessQuery.isError) {
    return (
      <div className="p-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50/80">
        Unable to verify permissions. Please refresh the page or try again later.
      </div>
    );
  }

  if (accessQuery.data === false) {
    return (
      <div className="p-6 max-w-lg">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          You do not have permission to view financial summaries. A super admin can enable{' '}
          <strong>Financial summaries</strong> for your account under{' '}
          <span className="font-medium">Privileges</span>.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SDA Logo" className="w-10 h-10" />
            <div>
              <div className="text-base font-semibold">Seventh-Day Adventist Church, Mt. Zion - Kigoma</div>
              <div className="text-xs text-gray-600">Financial Summaries</div>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button type="button" onClick={() => window.print()} className="px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">
              Print
            </button>
            <button type="button" onClick={() => void fetchSummaries()} className="px-3 py-2 border rounded text-sm">
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 space-y-8">
          <section>
            <div className="text-sm font-semibold text-gray-800 mb-3">Church offertory totals (saved summaries)</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-4">
                <div className="text-xs font-medium text-teal-900/80">Total recorded (all rows)</div>
                <div className="text-xl font-bold text-teal-950 tabular-nums mt-1">{formatUGX(totals.totalAll)}</div>
                <p className="text-xs text-teal-900/70 mt-2">Sum of every saved cash-offering total in the list below.</p>
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Summary entries</div>
                <div className="text-2xl font-semibold text-gray-900 tabular-nums">{totals.entryCount}</div>
                <p className="text-xs text-gray-500 mt-2">Rows in cash_offering_accounts (up to 2,000 most recent).</p>
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Sabbath dates with data</div>
                <div className="text-2xl font-semibold text-gray-900 tabular-nums">{totals.uniqueSabbaths}</div>
                <p className="text-xs text-gray-500 mt-2">Distinct service dates (multiple entries per date are combined in the table below).</p>
              </div>
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-gray-800 mb-2">Totals by Sabbath date</div>
            <p className="text-xs text-gray-500 mb-2">
              When several summaries exist for the same Sabbath, amounts are added so you can see the day total at a glance.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border-b">Sabbath date</th>
                    <th className="text-left p-2 border-b">Combined total (UGX)</th>
                    <th className="text-left p-2 border-b"># entries</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.byDateRows.length === 0 ? (
                    <tr>
                      <td className="p-2 text-gray-600" colSpan={3}>
                        No data yet.
                      </td>
                    </tr>
                  ) : (
                    totals.byDateRows.map((row) => (
                      <tr key={row.dateKey} className="odd:bg-white even:bg-gray-50">
                        <td className="p-2 border-b">{new Date(row.dateKey).toLocaleDateString()}</td>
                        <td className="p-2 border-b font-medium tabular-nums">{formatUGX(row.sum)}</td>
                        <td className="p-2 border-b text-gray-600 tabular-nums">{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-gray-800 mb-2">Saved Financial Summaries</div>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border-b">Sabbath Date</th>
                    <th className="text-left p-2 border-b">Total (UGX)</th>
                    <th className="text-left p-2 border-b print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSummaries ? (
                    <tr>
                      <td className="p-2 text-gray-600" colSpan={3}>
                        Loading…
                      </td>
                    </tr>
                  ) : summaries.length === 0 ? (
                    <tr>
                      <td className="p-2 text-gray-600" colSpan={3}>
                        No summaries yet
                      </td>
                    </tr>
                  ) : (
                    summaries.map((s) => (
                      <tr key={s.id} className="odd:bg-white even:bg-gray-50">
                        <td className="p-2 border-b">{new Date(s.service_date).toLocaleDateString()}</td>
                        <td className="p-2 border-b">{formatUGX(s.total)}</td>
                        <td className="p-2 border-b print:hidden">
                          <button type="button" onClick={() => void openPdf(s.id)} className="px-2 py-1 border rounded text-xs">
                            View / Download PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TithesPaid;
