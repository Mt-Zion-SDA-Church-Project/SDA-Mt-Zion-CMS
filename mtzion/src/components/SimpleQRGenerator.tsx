import React, { useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download } from 'lucide-react';

const SimpleQRGenerator: React.FC = () => {
  const [text, setText] = useState('TEST_MEMBER_ID_001');
  const [qrCodeURL, setQrCodeURL] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    if (!text) return;
    
    setLoading(true);
    try {
      console.log('Generating QR code for:', text);
      const dataURL = await QRCode.toDataURL(text, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeURL(dataURL);
      console.log('QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrCodeURL) return;
    
    const link = document.createElement('a');
    link.download = 'test_qr_code.png';
    link.href = qrCodeURL;
    link.click();
  };

  const generateMemberQR = async () => {
    const memberQR = {
      type: 'member_checkin',
      memberId: 'test-member-001',
      memberName: 'John Doe',
      timestamp: new Date().toISOString()
    };
    
    setText(JSON.stringify(memberQR));
    await generateQR();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold text-gray-900">Test QR Code Generator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="qrText" className="block text-sm font-medium text-gray-700 mb-2">
            QR Code Text
          </label>
          <textarea
            id="qrText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to encode in QR code"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={generateQR}
            disabled={loading || !text}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <QrCode className="w-4 h-4" />
            Generate QR Code
          </button>
          
          <button
            onClick={generateMemberQR}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            Generate Member QR
          </button>
        </div>

        {qrCodeURL && (
          <div className="text-center">
            <img src={qrCodeURL} alt="Generated QR Code" className="mx-auto border border-gray-200 rounded-lg" />
            
            <div className="mt-4">
              <button
                onClick={downloadQR}
                className="flex items-center gap-2 px-4 py-2 bg-white text-primary border border-primary rounded-lg hover:bg-gray-50 mx-auto"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
          <p className="font-medium mb-2">Test Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Enter simple text like "John Doe" or member ID</li>
            <li>Click "Generate Member QR" for a structured test QR code</li>
            <li>Use the QR Scanner component to test scanning</li>
            <li>Check browser console for debugging information</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleQRGenerator;
