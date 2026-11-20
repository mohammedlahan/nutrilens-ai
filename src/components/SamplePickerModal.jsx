import React, { useRef } from 'react';
import { X, Upload, Camera, Sparkles } from 'lucide-react';
import { FOOD_DATABASE } from '../data/foodDatasets';

export default function SamplePickerModal({ isOpen, onClose, onSelectImage }) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Selected sample foods with high resolution images
  const samples = [
    { name: 'Fresh Apple', image: FOOD_DATABASE[0]?.image || 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600' },
    { name: 'Vine Tomato', image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600' },
    { name: 'Bell Pepper', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600' },
    { name: 'Baby Spinach', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600' },
    { name: 'Ripe Banana', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600' },
    { name: 'Sweet Corn', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600' }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onSelectImage(event.target.result, file.name);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSampleClick = (sample) => {
    onSelectImage(sample.image, sample.name);
    onClose();
  };

  return (
    <div className="gemini-modal-overlay" onClick={onClose}>
      <div className="gemini-modal" onClick={e => e.stopPropagation()}>
        <div className="gemini-modal-header">
          <div className="gemini-modal-title">Attach Food Photo</div>
          <button className="gemini-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Upload / Camera Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '14px',
              background: 'var(--gemini-surface-hover)',
              border: '1px solid var(--gemini-border)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Upload size={16} color="var(--gemini-blue)" /> Upload from Device
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <button
            onClick={() => {
              // Trigger device camera capture
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '14px',
              background: 'var(--gemini-surface-hover)',
              border: '1px solid var(--gemini-border)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Camera size={16} color="var(--gemini-emerald)" /> Camera Snapshot
          </button>
        </div>

        {/* Or Pick Curated Samples */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--gemini-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="var(--gemini-cyan)" /> Or try with instant sample produce:
          </div>

          <div className="gemini-sample-grid">
            {samples.map((s, idx) => (
              <div
                key={idx}
                className="gemini-sample-item"
                onClick={() => handleSampleClick(s)}
              >
                <img src={s.image} alt={s.name} />
                <div className="gemini-sample-name">{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
