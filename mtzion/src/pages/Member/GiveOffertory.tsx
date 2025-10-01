import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import mtnLogo from '../../assets/mtn.png';
import airtelLogo from '../../assets/airtel.png';
import cardLogo from '../../assets/visa-mastercard.jpg';
import paypalLogo from '../../assets/paypal.png';

type KnownKey =
  | 'trust_fund'
  | 'camp_meeting_offering'
  | 'ssabiti_13th'
  | 'prime_radio'
  | 'hope_channel_tv_uganda'
  | 'ebf_development_fund'
  | 'ebirabo_ebyawamu'
  | 'essomero_lya_ssabbiti'
  | 'okwebaza'
  | 'okusinza'
  | 'ebirabo_ebirala'
  | 'okuzimba'
  | 'ekyemisana'
  | 'social_and_welfare'
  | 'enjiri';

const KNOWN_LABELS: Record<KnownKey, string> = {
  trust_fund: 'Trust Fund',
  camp_meeting_offering: 'Camp Meeting Offering',
  ssabiti_13th: 'Ssabiti 13th',
  prime_radio: 'Prime Radio',
  hope_channel_tv_uganda: 'Hope Channel Tv Uganda',
  ebf_development_fund: 'EBF Development Fund',
  ebirabo_ebyawamu: "Ebirabo Eby'awamu",
  essomero_lya_ssabbiti: 'Essomero lya Ssabbiti',
  okwebaza: 'Okwebaza',
  okusinza: 'Okusinza',
  ebirabo_ebirala: 'Ebirabo Ebirala',
  okuzimba: 'Okuzimba',
  ekyemisana: 'Ekyemisana',
  social_and_welfare: 'Social and Welfare',
  enjiri: 'Enjiri',
};

type Row = { id: string; label: string; amount: string; key?: KnownKey };

function formatUGX(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n || 0);
}

const GiveOffertory: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'mtn' | 'airtel' | 'card' | 'paypal'>('mtn');
  const [processing, setProcessing] = useState(false);

  const total = useMemo(() => rows.reduce((s, r) => s + (Number.isFinite(Math.floor(Number(r.amount))) ? Math.max(0, Math.floor(Number(r.amount))) : 0), 0), [rows]);

  // Load categories from DB
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('offertory_categories')
        .select('key, label, is_active')
        .eq('is_active', true)
        .order('label');
      if (!error) {
        const initial: Row[] = (data || []).map((c: any) => ({ id: crypto.randomUUID(), label: c.label, amount: '', key: c.key }));
        // Fallback: if no categories exist yet, seed UI with known defaults (read-only)
        if (initial.length === 0) {
          const defaults: Row[] = (Object.keys(KNOWN_LABELS) as KnownKey[]).map((k) => ({ id: crypto.randomUUID(), label: KNOWN_LABELS[k], amount: '', key: k }));
          setRows(defaults);
        } else {
          setRows(initial);
        }
      }
    };
    load();

    const channel = supabase
      .channel('member-offertory-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offertory_categories' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRemove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const handleChange = (id: string, field: 'label' | 'amount', value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: field === 'amount' ? value.replace(/[^0-9]/g, '') : value } : r))
    );
  };

  const handleReset = () => {
    setRows((Object.keys(KNOWN_LABELS) as KnownKey[]).map((k) => ({ id: crypto.randomUUID(), label: KNOWN_LABELS[k], amount: '', key: k })));
    setNotes('');
  };

  const handlePay = async () => {
    if (total <= 0) {
      alert('Please enter at least one amount before paying.');
      return;
    }
    setProcessing(true);
    try {
      // Demo: Auto-generate receipt immediately when Pay is clicked
      const categories = rows
        .filter((r) => (Number(r.amount) || 0) > 0)
        .map((r) => ({ key: r.key || 'custom', label: r.label, amount: Math.floor(Number(r.amount)) }));

      // Get current member id
      const { data: { user } } = await supabase.auth.getUser();
      let memberId: string | null = null;
      if (user) {
        const { data: m } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', user.id)
          .single();
        memberId = m?.id || null;
      }

      const { data, error } = await supabase
        .from('offertory_payments')
        .insert({
          member_id: memberId,
          amount_ugx: total,
          currency: 'UGX',
          method: payMethod,
          categories,
          notes
        })
        .select('id')
        .single();
      if (error) throw error;

      // Navigate to printable receipt
      window.location.assign(`/member/offertory/receipt/${data.id}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-base font-semibold">Give Offertory</div>
              <div className="text-xs text-gray-600">Select categories, enter amounts, then pay below</div>
            </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleReset} className="px-3 py-2 border rounded text-sm">Reset</button>
                </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <input
                    value={r.label}
                    readOnly
                    className="flex-1 border rounded px-3 py-2 bg-gray-50 text-gray-700"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={r.amount}
                    placeholder="0"
                    onChange={(e) => handleChange(r.id, 'amount', e.target.value)}
                    className="w-36 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-xs text-gray-600 w-28 text-right">{r.amount === '' ? '—' : formatUGX(Math.floor(Number(r.amount)))}</span>
                  {/* Members cannot remove categories */}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Optional note for church finance team…"
            />
          </div>

          <div className="mt-6 border-t pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-semibold text-gray-800">{formatUGX(total)}</div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Payment method</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button onClick={() => setPayMethod('mtn')} className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'mtn' ? 'bg-yellow-50 border-yellow-400' : ''}`}>
                  <img src={mtnLogo} alt="MTN MoMo" className="h-6 object-contain" />
                  <span>MTN MoMo</span>
                </button>
                <button onClick={() => setPayMethod('airtel')} className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'airtel' ? 'bg-red-50 border-red-400' : ''}`}>
                  <img src={airtelLogo} alt="Airtel Money" className="h-6 object-contain" />
                  <span>Airtel Money</span>
                </button>
                <button onClick={() => setPayMethod('card')} className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'card' ? 'bg-blue-50 border-blue-400' : ''}`}>
                  <img src={cardLogo} alt="Visa / Mastercard" className="h-6 object-contain" />
                  <span>Visa / Mastercard</span>
                </button>
                <button onClick={() => setPayMethod('paypal')} className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'paypal' ? 'bg-indigo-50 border-indigo-400' : ''}`}>
                  <img src={paypalLogo} alt="PayPal" className="h-6 object-contain" />
                  <span>PayPal</span>
                </button>
              </div>
              <div className="text-xs text-gray-500">Payments are processed securely by the selected provider.</div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button onClick={handlePay} disabled={processing || total <= 0} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 text-sm disabled:opacity-60">{processing ? 'Processing…' : `Pay ${formatUGX(total)}`}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiveOffertory;


