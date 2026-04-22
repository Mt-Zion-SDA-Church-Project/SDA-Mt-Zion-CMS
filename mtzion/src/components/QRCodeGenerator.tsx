// src/components/QRCodeGenerator.tsx
import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Calendar, Clock, MapPin, Copy, Check } from 'lucide-react';

interface QRCodeGeneratorProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  location?: string;
  onQRGenerated?: (qrCodeUrl: string) => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  eventId,
  eventTitle,
  eventDate,
  location,
  onQRGenerated
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [qrSize, setQrSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [copied, setCopied] = useState(false);

  const getCheckInSiteOrigin = () => {
    const fromEnv = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim().replace(/\/$/, '');
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv;
    return window.location.origin;
  };

  const buildCheckinUrl = () => {
    const payload = JSON.stringify({
      eventId: eventId,
      type: 'event_checkin',
      timestamp: Date.now(),
      expiresAt: Date.now() + (4 * 60 * 60 * 1000) // 4 hours validity
    });
    return `${getCheckInSiteOrigin()}/member/qr-checkin?data=${encodeURIComponent(btoa(payload))}`;
  };

  const generateQRCode = async () => {
    setGenerating(true);
    try {
      // Create URL that members will scan
      const checkinUrl = buildCheckinUrl();
      
      const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
        errorCorrectionLevel: 'H',
        width: qrSize === 'small' ? 200 : qrSize === 'medium' ? 300 : 500,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrDataUrl);
      if (onQRGenerated) {
        onQRGenerated(qrDataUrl);
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = `qr_${eventTitle.replace(/\s/g, '_')}_${eventId}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const copyCheckinUrl = () => {
    const checkinUrl = buildCheckinUrl();
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printQRCode = () => {
    if (!qrCodeUrl) return;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${eventTitle}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              padding: 20px;
              border: 2px dashed #ccc;
              border-radius: 10px;
              max-width: 400px;
            }
            img {
              max-width: 300px;
              height: auto;
            }
            .event-details {
              margin-top: 20px;
              text-align: left;
              font-size: 14px;
            }
            .instructions {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
            @media print {
              .no-print { display: none; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${eventTitle}</h2>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <div class="event-details">
              <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(eventDate).toLocaleTimeString()}</p>
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
            </div>
            <div class="instructions">
              <strong>Instructions for Members:</strong><br/>
              1. Open your phone camera<br/>
              2. Scan this QR code<br/>
              3. You will be automatically checked in<br/>
              4. Make sure you're logged into your account
            </div>
            <div class="no-print" style="margin-top: 20px;">
              <button onclick="window.print()">Print</button>
              <button onclick="window.close()">Close</button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow?.document.close();
  };

  const getSizeClasses = () => {
    switch (qrSize) {
      case 'small': return 'w-48 h-48';
      case 'medium': return 'w-64 h-64';
      case 'large': return 'w-96 h-96';
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">{eventTitle}</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(eventDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{new Date(eventDate).toLocaleTimeString()}</span>
          </div>
          {location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Size Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          QR Code Size
        </label>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setQrSize(size)}
              className={`px-3 py-1 rounded-md text-sm ${
                qrSize === size
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button or QR Display */}
      {!qrCodeUrl ? (
        <button
          onClick={generateQRCode}
          disabled={generating}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Generating QR Code...' : 'Generate QR Code for Check-in'}
        </button>
      ) : (
        <div className="text-center">
          <div className={`${getSizeClasses()} mx-auto bg-white p-4 border rounded-lg mb-4`}>
            <img src={qrCodeUrl} alt="Event QR Code" className="w-full h-full" />
          </div>
          
          <div className="flex gap-3 mb-4">
            <button
              onClick={downloadQRCode}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={printQRCode}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          <button
            onClick={copyCheckinUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mb-4"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Copied!' : 'Copy Check-in Link'}
          </button>

          <div className="bg-yellow-50 p-3 rounded-lg text-left">
            <p className="text-sm font-medium text-yellow-800 mb-2">📋 Instructions:</p>
            <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
              <li>Print this QR code and display at the event entrance</li>
              <li>Each QR code expires after 4 hours for security</li>
              <li>Members scan with their phone camera to check in</li>
              <li>One scan per member - duplicate check-ins are prevented</li>
              <li>Members must be logged into their account</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeGenerator;