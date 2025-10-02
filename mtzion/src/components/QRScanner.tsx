import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { QrCode, CheckCircle, XCircle, Camera, AlertCircle, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  eventId?: string;
  onScanSuccess?: (memberId: string, memberName: string) => void;
  onScanError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ 
  eventId, 
  onScanSuccess, 
  onScanError 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startScanning = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      // Request camera permission - more permissive for mobile
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 }
        }
      });

      setStream(mediaStream);
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setIsScanning(true);
        setLoading(false);
        
        // Start QR code detection
        detectQRCode();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permission to scan QR codes.');
      setHasPermission(false);
      setLoading(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const detectQRCode = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Use jsQR for actual QR code detection
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      // QR code detected!
      console.log("QR Code detected:", code.data);
      stopScanning(); // Stop scanning upon successful detection
      
      // Process the QR code data
      handleQRDetection(code.data);
    }
    
    // Continue scanning
    if (isScanning) {
      requestAnimationFrame(detectQRCode);
    }
  };

  const handleQRDetection = async (qrData: string) => {
    // Immediately process the detected QR code
    await handleManualQRInput(qrData);
  };

  const handleManualQRInput = async (qrData: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Parse QR code data - could be member ID or list of names
      const inputData = qrData.trim();
      
      if (!inputData) {
        throw new Error('Invalid QR code data');
      }

      // Check if input contains multiple names (comma-separated or newline-separated)
      const memberNames = inputData
        .split(/[,\n]/)
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (memberNames.length === 0) {
        throw new Error('No valid names found');
      }

      const today = new Date().toISOString().split('T')[0];
      let successMessages: string[] = [];
      let errorMessages: string[] = [];

      if (memberNames.length === 1) {
        // Single member check-in (existing logic)
        const memberId = memberNames[0];
        
        // Try to find member by ID first
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id, first_name, last_name, email, status')
          .eq('id', memberId)
          .eq('status', 'active')
          .single();

        if (member && !memberError) {
          // Member exists in database
          const { data: existingAttendance } = await supabase
            .from('attendance')
            .select('id')
            .eq('member_id', memberId)
            .eq('attendance_date', today)
            .eq('event_id', eventId || null)
            .single();

          if (existingAttendance) {
            throw new Error('Member has already checked in today');
          }

          // Record attendance for existing member
          const attendanceData = {
            member_id: memberId,
            event_id: eventId || null,
            attendance_date: today,
            attendance_type: eventId ? 'event' : 'service',
            check_in_time: new Date().toISOString(),
            qr_scanned: true
          };

          const { error: attendanceError } = await supabase
            .from('attendance')
            .insert(attendanceData);

          if (attendanceError) {
            throw new Error('Failed to record attendance');
          }

          // Log activity
          await supabase
            .from('activity_logs')
            .insert({
              member_id: memberId,
              action: 'checked_in_via_qr',
              details: `Checked in via QR code${eventId ? ' for event' : ' for service'}`
            });

          const memberName = `${member.first_name} ${member.last_name}`;
          successMessages.push(memberName);
        } else {
          // Member not found in database, create manual entry
          const attendanceData = {
            member_id: null,
            event_id: eventId || null,
            attendance_date: today,
            attendance_type: eventId ? 'event' : 'service',
            check_in_time: new Date().toISOString(),
            qr_scanned: true,
            member_names: [memberId],
            is_multi_member: false,
            check_in_method: 'manual_entry'
          };

          const { error: attendanceError } = await supabase
            .from('attendance')
            .insert(attendanceData);

          if (attendanceError) {
            throw new Error('Failed to record attendance');
          }

          successMessages.push(memberId);
        }
      } else {
        // Multiple members check-in
        const attendanceData = {
          member_id: null,
          event_id: eventId || null,
          attendance_date: today,
          attendance_type: eventId ? 'event' : 'service',
          check_in_time: new Date().toISOString(),
          qr_scanned: true,
          member_names: memberNames,
          is_multi_member: true,
          check_in_method: 'manual_entry'
        };

        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert(attendanceData);

        if (attendanceError) {
          throw new Error('Failed to record multi-member attendance');
        }

        successMessages = memberNames;
      }

      if (successMessages.length > 0) {
        const successText = successMessages.length === 1 
          ? `Successfully checked in: ${successMessages[0]}`
          : `Successfully checked in ${successMessages.length} members: ${successMessages.join(', ')}`;
        
        setSuccess(successText);
        
        if (onScanSuccess) {
          onScanSuccess('', successText);
        }

        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process QR code';
      setError(errorMessage);
      
      if (onScanError) {
        onScanError(errorMessage);
      }

      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const qrData = formData.get('qrData') as string;
    
    if (qrData) {
      handleManualQRInput(qrData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold text-gray-900">QR Code Check-in</h3>
      </div>

      {/* Camera Section */}
      <div className="mb-6">
        {!hasPermission ? (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {hasPermission === false 
                ? 'Camera access denied. Please allow camera permission to scan QR codes.'
                : 'Click the button below to start scanning QR codes.'
              }
            </p>
            <button
              onClick={startScanning}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 mx-auto"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {loading ? 'Starting Camera...' : 'Start Scanning'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-48 sm:h-64 object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Scanning QR Highlight Overlay */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-primary border-dashed rounded-lg flex items-center justify-center bg-white/20">
                    <div className="text-center">
                      <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-primary font-medium">Position QR code here</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex justify-center gap-3">
              <button
                onClick={stopScanning}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" />
                Stop Scanning
              </button>
              {!isScanning && (
                <button
                  onClick={startScanning}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
                >
                  <Camera className="w-4 h-4" />
                  Scan Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual QR Input */}
      <div className="border-t pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Manual Check-in Entry</h4>
        <p className="text-sm text-gray-600 mb-4">
          Enter member names to check in. You can enter multiple names separated by commas or new lines.
        </p>
        
        <form onSubmit={handleQRCodeSubmit} className="space-y-4">
          <div>
            <label htmlFor="qrData" className="block text-sm font-medium text-gray-700 mb-2">
              Member Names
            </label>
            <textarea
              id="qrData"
              name="qrData"
              placeholder="Enter member names (one per line or separated by commas)&#10;Example:&#10;John Doe&#10;Jane Smith&#10;or: John Doe, Jane Smith"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {loading ? 'Processing...' : 'Check In Members'}
          </button>
        </form>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
