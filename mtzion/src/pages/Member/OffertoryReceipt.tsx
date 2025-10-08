import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MemberMobileNav from '../../components/Member/MemberMobileNav';
import logo from '../../assets/sda-logo.png';

type Payment = {
  id: string;
  amount_ugx: number;
  method: string;
  categories: Array<{ key: string; label: string; amount: number }>;
  notes: string | null;
  provider_ref: string | null;
  created_at: string;
};

const OffertoryReceipt: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('offertory_payments')
        .select('id, amount_ugx, method, categories, notes, provider_ref, created_at')
        .eq('id', id)
        .single();
      if (error) setError(error.message);
      setPayment(data as any);
      setLoading(false);
    };
    load();
    // Auto-print support when opened from notification with ?auto=print
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === 'print') {
      setTimeout(() => window.print(), 400);
    }
  }, [id]);

  const formatUGX = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n).replace('UGX', 'USh');

  if (loading) return (
    <div className="p-6">
      <MemberMobileNav title="Receipt" />
      Loading…
    </div>
  );
  if (error || !payment) return (
    <div className="p-6">
      <MemberMobileNav title="Receipt" />
      <div className="text-red-600">{error || 'Receipt not found'}</div>
    </div>
  );

  return (
    <div className="p-4">
      <MemberMobileNav title="Receipt" />
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden print-area">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SDA Logo" className="w-12 h-12 object-contain" />
            <div>
              <div className="text-xl font-semibold">Seventh-Day Adventist Church, Mt. Zion - Kigoma</div>
              <div className="text-sm text-gray-600">Official Offertory Receipt</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Receipt No.</div>
            <div className="font-semibold">{payment.id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Date</div>
              <div className="font-medium">{new Date(payment.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Payment Method</div>
              <div className="font-medium capitalize">{payment.method}</div>
            </div>
            {payment.provider_ref && (
              <div className="md:col-span-2">
                <div className="text-sm text-gray-600">Provider Reference</div>
                <div className="font-medium">{payment.provider_ref}</div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b">CATEGORY</th>
                  <th className="text-right p-2 border-b">AMOUNT (USh)</th>
                </tr>
              </thead>
              <tbody>
                {payment.categories.map((c, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b">{c.label}</td>
                    <td className="p-2 border-b text-right">{formatUGX(c.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="p-2 border-t font-semibold">Total</td>
                  <td className="p-2 border-t font-semibold text-right">{formatUGX(payment.amount_ugx)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {payment.notes && (
            <div className="mt-4 text-sm text-gray-700">Note: {payment.notes}</div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2 hide-on-print">
            <a href={`/member/offertory/receipt/${payment.id}?auto=print`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-primary text-white rounded">Download PDF</a>
            <button onClick={() => window.print()} className="px-4 py-2 border rounded">Print</button>
            <button onClick={() => navigate('/member')} className="px-4 py-2 border rounded">Back to Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OffertoryReceipt;


