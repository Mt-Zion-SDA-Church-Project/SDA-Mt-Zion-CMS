// src/components/QRScanner.tsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, XCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

interface QRScannerProps {
  eventId?: string;
  onScanSuccess?: (memberId: string, memberName: string) => void;
  onScanError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ eventId, onScanSuccess, onScanError }) => {
  const queryClient = useQueryClient();
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  const [memberId, setMemberId] = useState('');

  const manualCheckInMutation = useMutation({
    mutationFn: async (vars: { memberId: string; eventId: string }) => {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .eq('id', vars.memberId)
        .single();

      if (memberError || !member) {
        throw new Error('Member not found');
      }

      const { data: existingCheckIn } = await supabase
        .from('attendance')
        .select('id')
        .eq('member_id', member.id)
        .eq('event_id', vars.eventId)
        .maybeSingle();

      if (existingCheckIn) {
        throw new Error(`${member.first_name} ${member.last_name} has already checked in`);
      }

      const { error: insertError } = await supabase.from('attendance').insert({
        member_id: member.id,
        event_id: vars.eventId,
        attendance_date: new Date().toISOString().split('T')[0],
        attendance_type: 'event',
        check_in_time: new Date().toISOString(),
        qr_scanned: false,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      return {
        memberId: member.id,
        memberName: `${member.first_name} ${member.last_name}` as const,
      };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.qrCheckIn.recentCheckIns() });
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'manager'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberPortal.dashboardMe() });
      const successMessage = `✓ Checked in: ${data.memberName}`;
      setScanResult({ success: true, message: successMessage });
      if (onScanSuccess) onScanSuccess(data.memberId, data.memberName);
      setMemberId('');
    },
    onError: (err: Error) => {
      const errorMessage = err.message || 'Failed to check in member';
      setScanResult({ success: false, message: errorMessage });
      if (onScanError) onScanError(errorMessage);
    },
  });

  const manualChecking = manualCheckInMutation.isPending;

  const handleManualCheckIn = () => {
    if (!memberId.trim()) {
      if (onScanError) onScanError('Please enter a member ID');
      setScanResult({ success: false, message: 'Please enter a member ID' });
      return;
    }

    if (!eventId) {
      if (onScanError) onScanError('No event selected');
      setScanResult({ success: false, message: 'Please select an event first' });
      return;
    }

    setScanResult(null);
    manualCheckInMutation.mutate({ memberId: memberId.trim(), eventId });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Camera className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Staff Check-in Tool</h3>
      </div>

      <div className="text-center py-4">
        <p className="text-gray-600 mb-2">This tool is for church staff to manually check in members.</p>
        <p className="text-sm text-gray-500 mb-4">For members: Please scan the event QR code displayed at the entrance using your phone camera.</p>

        <div className="border-t pt-4 mt-2">
          <p className="text-sm font-medium text-gray-700 mb-3">Manual Member Check-in:</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Member ID"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              disabled={manualChecking}
            />
            <button
              onClick={handleManualCheckIn}
              disabled={manualChecking || !eventId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {manualChecking ? <Loader className="w-4 h-4 animate-spin" /> : 'Check In'}
            </button>
          </div>

          {!eventId && <p className="text-xs text-orange-600 mt-2">⚠️ Please select an event from the list first</p>}

          {scanResult && (
            <div
              className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${
                scanResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {scanResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {scanResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
