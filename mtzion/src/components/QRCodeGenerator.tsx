import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, CheckCircle } from 'lucide-react';

interface QRCodeGeneratorProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  onQRGenerated?: (qrCode: string) => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  eventId,
  eventTitle,
  eventDate,
  onQRGenerated
}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [qrCodeText, setQrCodeText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [eventId, eventTitle, eventDate]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      // Create QR code data with event information
      const qrData = {
        type: 'event_checkin',
        eventId: eventId,
        eventTitle: eventTitle,
        eventDate: eventDate,
        timestamp: new Date().toISOString(),
        // Include member ID for individual member QR codes
        // For events, this could be a general check-in code
        checkInCode: `EVENT_${eventId}_${Date.now()}`
      };

      const qrString = JSON.stringify(qrData);
      setQrCodeText(qrString);

      // Generate QR code image
      const dataURL = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeDataURL(dataURL);

      if (onQRGenerated) {
        onQRGenerated(qrString);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataURL) return;

    const link = document.createElement('a');
    link.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
    link.href = qrCodeDataURL;
    link.click();
  };

  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy QR data:', error);
    }
  };

  const generateMemberQRCode = async (memberId: string) => {
    setLoading(true);
    try {
      const memberQRData = {
        type: 'member_checkin',
        memberId: memberId,
        eventId: eventId,
        eventTitle: eventTitle,
        eventDate: eventDate,
        timestamp: new Date().toISOString(),
        checkInCode: `MEMBER_${memberId}_EVENT_${eventId}`
      };

      const qrString = JSON.stringify(memberQRData);
      setQrCodeText(qrString);

      const dataURL = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeDataURL(dataURL);
    } catch (error) {
      console.error('Error generating member QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold text-gray-900">QR Code Generator</h3>
      </div>

      {/* Event Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Event Details</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <p><span className="font-medium">Title:</span> {eventTitle}</p>
          <p><span className="font-medium">Date:</span> {new Date(eventDate).toLocaleDateString()}</p>
          <p><span className="font-medium">Event ID:</span> {eventId}</p>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="text-center mb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-600">Generating QR Code...</p>
            </div>
          </div>
        ) : qrCodeDataURL ? (
          <div className="space-y-4">
            <div className="inline-block p-4 bg-white border rounded-lg">
              <img 
                src={qrCodeDataURL} 
                alt="Event QR Code" 
                className="w-64 h-64"
              />
            </div>
            
            {/* QR Code Actions */}
            <div className="flex justify-center gap-3">
              <button
                onClick={downloadQRCode}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              
              <button
                onClick={copyQRData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Copy Data'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No QR code generated</p>
          </div>
        )}
      </div>

      {/* QR Code Information */}
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">QR Code Usage</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• <strong>Event Check-in:</strong> Members can scan this QR code to check in to the event</p>
            <p>• <strong>Attendance Tracking:</strong> All scans are automatically recorded in the attendance system</p>
            <p>• <strong>Real-time Updates:</strong> Attendance records update immediately when scanned</p>
            <p>• <strong>Admin Visibility:</strong> Administrators can view all QR code check-ins in the attendance manager</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">QR Code Data</h4>
          <div className="p-3 bg-gray-50 rounded-lg">
            <code className="text-xs text-gray-700 break-all">
              {qrCodeText || 'No QR code data available'}
            </code>
          </div>
        </div>
      </div>

      {/* Regenerate Button */}
      <div className="mt-6 pt-4 border-t">
        <button
          onClick={generateQRCode}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          <QrCode className="w-4 h-4" />
          Regenerate QR Code
        </button>
      </div>
    </div>
  );
};

export default QRCodeGenerator;


