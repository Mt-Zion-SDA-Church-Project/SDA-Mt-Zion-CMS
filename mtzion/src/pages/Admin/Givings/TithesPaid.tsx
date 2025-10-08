import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import logo from '../../../assets/sda-logo.png';

function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const TithesPaid: React.FC = () => {
  const [loadingSummaries, setLoadingSummaries] = useState<boolean>(false);
  const [summaries, setSummaries] = useState<Array<{ id: string; service_date: string; total: number }>>([]);
  const handlePrint = () => window.print();

  const fetchSummaries = async () => {
    setLoadingSummaries(true);
    try {
      const { data, error } = await supabase
        .from('cash_offering_accounts')
        .select('id, service_date, total')
        .order('service_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      setSummaries((data || []).map((d) => ({ id: d.id as string, service_date: d.service_date as string, total: (d.total as unknown as number) || 0 })));
    } catch (e) {
      // ignore for list
    } finally {
      setLoadingSummaries(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: refresh list when new summaries are inserted
  useEffect(() => {
    const channel = supabase
      .channel('cash_offering_accounts_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cash_offering_accounts' }, () => {
        fetchSummaries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const CATEGORY_COLUMNS: Array<{ key: string; label: string }> = [
    { key: 'trust_fund', label: 'Trust Fund' },
    { key: 'ekitundu_10', label: "Ekitundu Ky\'ekikumi (10%)" },
    { key: 'camp_meeting_offering', label: 'Camp Meeting Offering' },
    { key: 'ssabiti_13th', label: 'Ssabiti 13th' },
    { key: 'prime_radio', label: 'Prime Radio' },
    { key: 'hope_channel_tv_uganda', label: 'Hope Channel Tv Uganda' },
    { key: 'eddwaliro_kireka', label: 'Eddwaliro (Kireka Adv. Church)' },
    { key: 'ebf_development_fund', label: 'EBF Development Fund' },
    { key: 'ebirabo_ebyawamu', label: "Ebirabo Eby\'awamu" },
    { key: 'essomero_lya_ssabbiti', label: 'Essomero lya Ssabbiti' },
    { key: 'okwebaza', label: 'Okwebaza' },
    { key: 'okusinza', label: 'Okusinza' },
    { key: 'ebirabo_ebirala', label: 'Ebirabo Ebirala' },
    { key: 'okuzimba', label: 'Okuzimba' },
    { key: 'ekyemisana', label: 'Ekyemisana' },
    { key: 'social_and_welfare', label: 'Social and Welfare' },
    { key: 'camp_meeting_expense', label: 'Camp Meeting Expense' },
    { key: 'enjiri', label: 'Enjiri' },
  ];

  const openPdf = async (id: string) => {
    // Open window immediately to avoid popup blockers
    const win = window.open('', '_blank');
    if (!win) return; // Blocked by browser
    win.document.write('<!doctype html><html><head><title>Loading…</title></head><body style="font-family:Arial,sans-serif;padding:24px;">Generating PDF…</body></html>');
    win.document.close();

    const { data, error } = await supabase
      .from('cash_offering_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      win.document.open();
      win.document.write(`<p style="color:#b91c1c;font-family:Arial,sans-serif;padding:24px;">Failed to load summary: ${(error as any)?.message || 'Unknown error'}</p>`);
      win.document.close();
      return;
    }

    const dateStr = new Date(data.service_date).toLocaleDateString();
    const rows = CATEGORY_COLUMNS
      .map(({ key, label }) => ({ label, value: Number(data[key] || 0) }))
      .filter((r) => r.value > 0);

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
            <button onClick={handlePrint} className="px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print</button>
            <button onClick={fetchSummaries} className="px-3 py-2 border rounded text-sm">Refresh</button>
          </div>
        </div>

        <div className="p-4">
          {/* No form here; display-only page */}

          {/* Saved summaries list */}
          <div className="mt-10">
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
                    <tr><td className="p-2 text-gray-600" colSpan={3}>Loading…</td></tr>
                  ) : summaries.length === 0 ? (
                    <tr><td className="p-2 text-gray-600" colSpan={3}>No summaries yet</td></tr>
                  ) : (
                    summaries.map((s) => (
                      <tr key={s.id} className="odd:bg-white even:bg-gray-50">
                        <td className="p-2 border-b">{new Date(s.service_date).toLocaleDateString()}</td>
                        <td className="p-2 border-b">{formatUGX(s.total)}</td>
                        <td className="p-2 border-b print:hidden">
                          <button onClick={() => openPdf(s.id)} className="px-2 py-1 border rounded text-xs">View / Download PDF</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TithesPaid;




