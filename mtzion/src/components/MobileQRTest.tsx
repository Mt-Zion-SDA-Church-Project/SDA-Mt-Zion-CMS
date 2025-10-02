import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';

const MobileQRTest: React.FC = () => {
  const [testQRCode, setTestQRCode] = useState<string>('');
  const [qrVisible, setQrVisible] = useState(false);

  const generateTestQR = async () => {
    const testData = JSON.stringify({
      type: 'member_checkin',
      memberId: 'mobile-test-001',
      memberName: 'Mobile Test User',
      timestamp: new Date().toISOString()
    });

    try {
      const dataURL = await QRCode.toDataURL(testData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setTestQRCode(dataURL);
      setQrVisible(true);
    } catch (error) {
      console.error('Error generating test QR:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center gap-3 mb-4">
        <QrCode className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-gray-900">Mobile QR Test</h3>
      </div>

      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>For Testing QR Scanning on Mobile:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>This creates a test QR code on your mobile screen</li>
            <li>Keep your phone steady</li>
            <li>Point camera at the QR code below</li>
            <li>Check browser console for detection logs</li>
          </ul>
        </div>

        <button
          onClick={generateTestQR}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
        >
          Generate Test QR Code
        </button>

        {qrVisible && testQRCode && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="mb-3">
              <strong>Scan this QR code with the camera scanner above:</strong>
            </div>
            <div className="flex justify-center">
              <img 
                src={testQRCode} 
                alt="Test QR Code" 
                className="border-2 border-gray-300 rounded-lg shadow-md"
                style={{ width: '200px', height: '200px' }}
              />
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <p>QR Code Data:</p>
              <code className="text-xs bg-white p-2 rounded border">
                {JSON.stringify({
                  type: 'member_checkin',
                  memberId: 'mobile-test-001',
                  memberName: 'Mobile Test User',
                  timestamp: 'timestamp'
                }, null, 2)}
              </code>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <strong>Mobile Debugging Tips:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Make sure camera permissions are granted</li>
            <li>Try scanning in good lighting conditions</li>
            <li>Hold phone steady and ensure QR code is clearly visible</li>
            <li>Check browser console for error messages</li>
            <li>Try rotating phone - some cameras work better in landscape</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MobileQRTest;
