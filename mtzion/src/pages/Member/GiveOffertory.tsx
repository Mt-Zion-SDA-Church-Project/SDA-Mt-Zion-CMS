import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { formatZodError, offertoryNotesSchema } from '../../lib/validation';
import mtnLogo from '../../assets/mtn.png';
import airtelLogo from '../../assets/airtel.png';
import cardLogo from '../../assets/visa-mastercard.png';
import paypalLogo from '../../assets/paypal.png';
import MemberMobileNav from '../../components/Member/MemberMobileNav';

type KnownKey =
  | 'tithe_10_percent'
  | 'camp_meeting_offering'
  | '13th_sabbath'
  | 'prime_radio'
  | 'kireka_adventist_church'
  | 'sabbath_school'
  | 'thanks_giving'
  | 'devine'
  | 'local_church_building'
  | 'district_project_fund'
  | 'lunch'
  | 'social_and_welfare'
  | 'evangelism'
  | 'nbf_development_fund';

const KNOWN_LABELS: Record<KnownKey, string> = {
  tithe_10_percent: 'Tithe (10%)',
  camp_meeting_offering: 'Camp Meeting Offering',
  '13th_sabbath': '13th Sabbath',
  prime_radio: 'Prime Radio',
  kireka_adventist_church: 'Kireka Adventist Church',
  sabbath_school: 'Sabbath School',
  thanks_giving: 'Thanks Giving',
  devine: 'Devine',
  local_church_building: 'Local Church Building',
  district_project_fund: 'District Project Fund',
  lunch: 'Lunch',
  social_and_welfare: 'Social and welfare',
  evangelism: 'Evangelism',
  nbf_development_fund: 'NBF Development Fund',
};

type Row = { id: string; label: string; amount: string; key?: KnownKey };

function formatUGX(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n || 0);
}

function rowsFromCategories(data: { key: string; label: string }[] | undefined | null): Row[] {
  const initial: Row[] = (data || []).map((c) => ({ id: crypto.randomUUID(), label: c.label, amount: '', key: c.key as KnownKey }));
  if (initial.length === 0) {
    return (Object.keys(KNOWN_LABELS) as KnownKey[]).map((k) => ({
      id: crypto.randomUUID(),
      label: KNOWN_LABELS[k],
      amount: '',
      key: k,
    }));
  }
  return initial;
}

async function fetchOffertoryCategories(): Promise<{ key: string; label: string }[]> {
  const { data, error } = await supabase.from('offertory_categories').select('key, label, is_active').eq('is_active', true).order('label');
  if (error) throw error;
  return (data as { key: string; label: string }[]) || [];
}

const GiveOffertory: React.FC = () => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'mtn' | 'airtel' | 'card' | 'paypal'>('mtn');

  const categoriesQuery = useQuery({
    queryKey: queryKeys.memberPortal.offertoryCategories(),
    queryFn: fetchOffertoryCategories,
  });

  useEffect(() => {
    if (!categoriesQuery.data) return;
    setRows(rowsFromCategories(categoriesQuery.data));
  }, [categoriesQuery.data]);

  useEffect(() => {
    const channel = supabase
      .channel('member-offertory-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offertory_categories' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.memberPortal.offertoryCategories() });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const payMutation = useMutation({
    mutationFn: async (vars: { total: number; categories: { key: string; label: string; amount: number }[]; payMethod: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      let memberId: string | null = null;
      if (user) {
        const { data: m } = await supabase.from('members').select('id').eq('user_id', user.id).single();
        memberId = m?.id || null;
      }
      const { data, error } = await supabase
        .from('offertory_payments')
        .insert({
          member_id: memberId,
          amount_ugx: vars.total,
          currency: 'UGX',
          method: vars.payMethod,
          categories: vars.categories,
          notes: vars.notes,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (paymentId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberPortal.dashboardMe() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberPortal.offertoryPayment(paymentId) });
      window.location.assign(`/member/offertory/receipt/${paymentId}`);
    },
  });

  const processing = payMutation.isPending;

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number.isFinite(Math.floor(Number(r.amount))) ? Math.max(0, Math.floor(Number(r.amount))) : 0), 0),
    [rows]
  );

  const handleChange = (id: string, field: 'label' | 'amount', value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: field === 'amount' ? value.replace(/[^0-9]/g, '') : value } : r))
    );
  };

  const handleReset = () => {
    setRows((Object.keys(KNOWN_LABELS) as KnownKey[]).map((k) => ({ id: crypto.randomUUID(), label: KNOWN_LABELS[k], amount: '', key: k })));
    setNotes('');
  };

  const handlePay = () => {
    const notesCheck = offertoryNotesSchema.safeParse(notes);
    if (!notesCheck.success) {
      alert(formatZodError(notesCheck.error));
      return;
    }
    if (total <= 0) {
      alert('Please enter at least one amount before paying.');
      return;
    }
    const categories = rows
      .filter((r) => (Number(r.amount) || 0) > 0)
      .map((r) => ({ key: r.key || 'custom', label: r.label, amount: Math.floor(Number(r.amount)) }));
    payMutation.mutate({ total, categories, payMethod, notes: notesCheck.data });
  };

  return (
    <div className="p-3 sm:p-4">
      <MemberMobileNav title="Give Offertory" />
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold">Give Offertory</div>
              <div className="text-xs text-gray-600">Select categories, enter amounts, then pay below</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="px-3 py-2 border rounded text-sm">
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3">
            {rows.map((r) => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <input
                      value={r.label}
                      readOnly
                      className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm truncate"
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:w-auto">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={100}
                      value={r.amount}
                      placeholder="0"
                      onChange={(e) => handleChange(r.id, 'amount', e.target.value)}
                      className="w-32 sm:w-36 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                    <span className="text-xs text-gray-600 w-24 sm:w-28 text-right">{r.amount === '' ? '—' : formatUGX(Math.floor(Number(r.amount)))}</span>
                  </div>
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

          <div className="mt-6 border-t pt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-xl sm:text-2xl font-semibold text-gray-800">{formatUGX(total)}</div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Payment method</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setPayMethod('mtn')}
                  className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'mtn' ? 'bg-yellow-50 border-yellow-400' : ''}`}
                >
                  <img src={mtnLogo} alt="MTN MoMo" className="h-6 object-contain" />
                  <span className="text-xs">MTN MoMo</span>
                </button>
                <button
                  onClick={() => setPayMethod('airtel')}
                  className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'airtel' ? 'bg-red-50 border-red-400' : ''}`}
                >
                  <img src={airtelLogo} alt="Airtel Money" className="h-6 object-contain" />
                  <span className="text-xs">Airtel Money</span>
                </button>
                <button
                  onClick={() => setPayMethod('card')}
                  className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'card' ? 'bg-blue-50 border-blue-400' : ''}`}
                >
                  <img src={cardLogo} alt="Visa / Mastercard" className="h-6 object-contain" />
                  <span className="text-xs">Visa / Mastercard</span>
                </button>
                <button
                  onClick={() => setPayMethod('paypal')}
                  className={`p-2 border rounded text-sm flex flex-col items-center gap-1 ${payMethod === 'paypal' ? 'bg-indigo-50 border-indigo-400' : ''}`}
                >
                  <img src={paypalLogo} alt="PayPal" className="h-6 object-contain" />
                  <span className="text-xs">PayPal</span>
                </button>
              </div>
              <div className="text-xs text-gray-500">Payments are processed securely by the selected provider.</div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={handlePay}
              disabled={processing || total <= 0}
              className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 text-sm disabled:opacity-60"
            >
              {processing ? 'Processing…' : `Pay ${formatUGX(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiveOffertory;
