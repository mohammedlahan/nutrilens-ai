import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, SwitchCamera, Zap, ZapOff, Image as ImageIcon, AlertCircle, RefreshCw, Check } from 'lucide-react';

export default function CameraScannerModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setPermissionError(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      setStream(null);
    }
  };

  const startCamera = async (mode) => {
    stopCamera();
    setIsLoadingCamera(true);
    setPermissionError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Video play warning:', e));
      }

      // Check for torch/flash capability
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera permission was denied. Please allow camera access in your browser settings or choose a photo from your gallery.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera found on this device. You can upload an image from your device.');
      } else {
        setPermissionError('Unable to start camera. Please verify camera permissions or upload an image.');
      }
    } finally {
      setIsLoadingCamera(false);
    }
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
  };

  // Flip Front/Back Camera
  const flipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Still Frame from Video
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPreview(dataUrl);
  };

  // Confirm Snapshot
  const handleConfirmCapture = () => {
    if (capturedPreview) {
      onCapture(capturedPreview, 'Camera Snapshot');
      onClose();
    }
  };

  // Handle Gallery Upload from File Picker
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onCapture(event.target.result, file.name || 'Uploaded Photo');
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="nutrilens-camera-overlay" onClick={onClose}>
      <div className="nutrilens-camera-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header Bar */}
        <div className="nutrilens-camera-header">
          <div className="nutrilens-camera-title">
            <Camera size={18} color="var(--gemini-emerald)" />
            <span>NutriLens Food Scanner</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasTorch && !capturedPreview && (
              <button
                className="nutrilens-camera-ctrl-btn"
                onClick={toggleTorch}
                title="Toggle Torch"
              >
                {torchOn ? <Zap size={18} color="#f59e0b" /> : <ZapOff size={18} />}
              </button>
            )}

            {!capturedPreview && (
              <button
                className="nutrilens-camera-ctrl-btn"
                onClick={flipCamera}
                title="Switch Camera"
              >
                <SwitchCamera size={18} />
              </button>
            )}

            <button className="nutrilens-camera-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div className="nutrilens-camera-viewfinder">
          {permissionError ? (
            <div className="nutrilens-camera-error">
              <AlertCircle size={40} color="var(--gemini-rose)" />
              <p style={{ fontSize: '14px', lineHeight: 1.5, maxWidth: '320px' }}>
                {permissionError}
              </p>
              <button
                className="nutrilens-camera-upload-fallback-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={16} /> Choose from Gallery Instead
              </button>
            </div>
          ) : capturedPreview ? (
            /* Snapshot Confirmation Preview */
            <div className="nutrilens-preview-container">
              <img src={capturedPreview} alt="Captured food" className="nutrilens-preview-img" />
              <div className="nutrilens-preview-badge">
                Food item captured • Ready to scan
              </div>
            </div>
          ) : (
            /* Live Camera Stream */
            <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="nutrilens-camera-video"
                style={{
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
              />

              {/* Scanning Target Reticle */}
              <div className="nutrilens-scan-reticle">
                <div className="nutrilens-reticle-corner tl" />
                <div className="nutrilens-reticle-corner tr" />
                <div className="nutrilens-reticle-corner bl" />
                <div className="nutrilens-reticle-corner br" />
                <div className="nutrilens-scan-beam" />
              </div>

              <div className="nutrilens-viewfinder-hint">
                Position food item inside the frame
              </div>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Controls Footer */}
        <div className="nutrilens-camera-footer">
          {capturedPreview ? (
            /* Confirm or Retake */
            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
              <button
                className="nutrilens-camera-action-btn secondary"
                onClick={() => setCapturedPreview(null)}
              >
                <RefreshCw size={16} /> Retake
              </button>
              <button
                className="nutrilens-camera-action-btn primary"
                onClick={handleConfirmCapture}
              >
                <Check size={16} /> Scan This Food
              </button>
            </div>
          ) : (
            /* Shutter & Gallery Trigger */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '320px' }}>
              {/* Gallery Pick */}
              <button
                className="nutrilens-gallery-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload from Photos"
              >
                <ImageIcon size={22} />
              </button>

              {/* Shutter Button */}
              <button
                className="nutrilens-shutter-btn"
                onClick={handleSnap}
                disabled={!!permissionError || isLoadingCamera}
                title="Capture food photo"
              >
                <div className="nutrilens-shutter-inner" />
              </button>

              {/* Flip Button */}
              <button
                className="nutrilens-gallery-btn"
                onClick={flipCamera}
                title="Flip Camera"
              >
                <SwitchCamera size={22} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
