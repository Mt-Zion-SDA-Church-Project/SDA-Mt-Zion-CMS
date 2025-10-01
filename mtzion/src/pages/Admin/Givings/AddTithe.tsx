import React, { useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import logo from '../../../assets/sda-logo.png';

type KnownKey =
  | 'trust_fund'
  | 'ekitundu_10'
  | 'camp_meeting_offering'
  | 'ssabiti_13th'
  | 'prime_radio'
  | 'hope_channel_tv_uganda'
  | 'eddwaliro_kireka'
  | 'ebf_development_fund'
  | 'ebirabo_ebyawamu'
  | 'essomero_lya_ssabbiti'
  | 'okwebaza'
  | 'okusinza'
  | 'ebirabo_ebirala'
  | 'okuzimba'
  | 'ekyemisana'
  | 'social_and_welfare'
  | 'camp_meeting_expense'
  | 'enjiri';

const KNOWN_LABELS: Record<KnownKey, string> = {
  trust_fund: 'Trust Fund',
  ekitundu_10: "Ekitundu Ky'ekikumi (10%)",
  camp_meeting_offering: 'Camp Meeting Offering',
  ssabiti_13th: 'Ssabiti 13th',
  prime_radio: 'Prime Radio',
  hope_channel_tv_uganda: 'Hope Channel Tv Uganda',
  eddwaliro_kireka: 'Eddwaliro (Kireka Adv. Church)',
  ebf_development_fund: 'EBF Development Fund',
  ebirabo_ebyawamu: "Ebirabo Eby'awamu",
  essomero_lya_ssabbiti: 'Essomero lya Ssabbiti',
  okwebaza: 'Okwebaza',
  okusinza: 'Okusinza',
  ebirabo_ebirala: 'Ebirabo Ebirala',
  okuzimba: 'Okuzimba',
  ekyemisana: 'Ekyemisana',
  social_and_welfare: 'Social and Welfare',
  camp_meeting_expense: 'Camp Meeting Expense',
  enjiri: 'Enjiri',
};

type Row = { id: string; label: string; amount: string; key?: KnownKey };

function formatUGX(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n || 0);
}

const AddTithe: React.FC = () => {
  const [serviceDate, setServiceDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>(() =>
    (Object.keys(KNOWN_LABELS) as KnownKey[]).map((k) => ({ id: crypto.randomUUID(), label: KNOWN_LABELS[k], amount: '', key: k }))
  );
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMsg, setSaveMsg] = useState<string>('');
  const [saveErr, setSaveErr] = useState<string>('');

  const total = useMemo(() => rows.reduce((s, r) => s + (Number.isFinite(Math.floor(Number(r.amount))) ? Math.max(0, Math.floor(Number(r.amount))) : 0), 0), [rows]);

  const handleAddCategory = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), label: 'Custom Category', amount: '' }]);
  };

  const handleRemove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const handleChange = (id: string, field: 'label' | 'amount', value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: field === 'amount' ? value.replace(/[^0-9]/g, '') : value } : r))
    );
  };

  const handleReset = () => {
    setRows((Object.keys(KNOWN_LABELS) as KnownKey[]).map((k) => ({ id: crypto.randomUUID(), label: KNOWN_LABELS[k], amount: '', key: k })));
    setNotes('');
    setSaveErr('');
    setSaveMsg('');
  };

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaving(true);
    setSaveErr('');
    setSaveMsg('');
    try {
      if (!serviceDate) throw new Error('Please select the service date');

      // Map known categories to fixed columns, sum custom into ebirabo_ebirala
      const base: Record<KnownKey, number> = {
        trust_fund: 0,
        ekitundu_10: 0,
        camp_meeting_offering: 0,
        ssabiti_13th: 0,
        prime_radio: 0,
        hope_channel_tv_uganda: 0,
        eddwaliro_kireka: 0,
        ebf_development_fund: 0,
        ebirabo_ebyawamu: 0,
        essomero_lya_ssabbiti: 0,
        okwebaza: 0,
        okusinza: 0,
        ebirabo_ebirala: 0,
        okuzimba: 0,
        ekyemisana: 0,
        social_and_welfare: 0,
        camp_meeting_expense: 0,
        enjiri: 0,
      };

      for (const r of rows) {
        const amt = Math.max(0, Math.floor(Number(r.amount || 0)));
        if (r.key) {
          base[r.key] += amt;
        } else {
          base.ebirabo_ebirala += amt; // aggregate unknown/custom
        }
      }

      const payload = {
        service_date: serviceDate,
        notes: notes || null,
        ...base,
      };

      const { error } = await supabase.from('cash_offering_accounts').insert(payload);
      if (error) throw error;
      setSaveMsg('Saved successfully');
      // Reset to defaults after save
      handleReset();
      setServiceDate(new Date().toISOString().slice(0, 10));
    } catch (e: any) {
      setSaveErr(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="SDA Logo" className="w-10 h-10" />
              <div>
                <div className="text-base font-semibold">SDA Mt. Zion Church</div>
                <div className="text-xs text-gray-600">Add Tithes</div>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button onClick={handlePrint} className="px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print</button>
              <button onClick={handleReset} className="px-3 py-2 border rounded text-sm">Reset</button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-gray-700">Service Date</label>
            <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <div className="ml-auto flex items-center gap-2 print:hidden">
              <button onClick={handleAddCategory} className="px-3 py-2 border rounded text-sm">Add Tithe Category</button>
            </div>
          </div>
          {(saveErr || saveMsg) && (
            <div className="mt-2 text-sm">
              {saveErr && <span className="text-red-600">{saveErr}</span>}
              {saveMsg && <span className="text-green-600">{saveMsg}</span>}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <input
                    value={r.label}
                    onChange={(e) => handleChange(r.id, 'label', e.target.value)}
                    className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={r.amount}
                    placeholder="0"
                    onChange={(e) => handleChange(r.id, 'amount', e.target.value)}
                    className="w-40 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-xs text-gray-600 w-32 text-right">{r.amount === '' ? '—' : formatUGX(Math.floor(Number(r.amount)))}</span>
                  {!r.key && (
                    <button onClick={() => handleRemove(r.id)} className="px-2 py-1 border rounded text-xs">Remove</button>
                  )}
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
              placeholder="Any remarks for this service..."
            />
          </div>

          <div className="mt-6 border-t pt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Omugatte (Total)</div>
            <div className="text-2xl font-semibold text-gray-800">{formatUGX(total)}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Custom categories are aggregated under “Ebirabo Ebirala” when saved.</div>

          <div className="mt-6 flex items-center justify-end gap-2 print:hidden">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save Summary'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTithe;














