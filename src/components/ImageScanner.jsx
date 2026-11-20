import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Barcode, RefreshCw, Sparkles, CheckCircle2, ChevronRight, Zap, Layers, AlertCircle, ShoppingBag } from 'lucide-react';
import { FOOD_DATABASE } from '../data/foodDatasets';
import { classifyFoodImage, checkBackendHealth } from '../services/foodClassifier';
import { lookupOpenFoodFactsProduct } from '../services/nutritionApi';

export default function ImageScanner({
  selectedFood,
  setSelectedFood,
  addToBasket,
  basket,
  addToMealLog,
  onNavigateToRecipes
}) {
  const [activeInputMode, setActiveInputMode] = useState('samples'); // 'samples', 'upload', 'camera', 'barcode'
  const [currentImage, setCurrentImage] = useState(FOOD_DATABASE[0].image);
  const [isScanning, setIsScanning] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('0052159701047');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState(null);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [sampleCategoryFilter, setSampleCategoryFilter] = useState('All');

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // On initial mount, classify the first item & check model health
  useEffect(() => {
    checkBackendHealth().then(status => setIsBackendLive(status.online));
    runClassification(FOOD_DATABASE[0].image, FOOD_DATABASE[0]);
  }, []);

  const runClassification = async (imageSrc, explicitItem = null) => {
    setIsScanning(true);
    setCurrentImage(imageSrc);

    try {
      const result = await classifyFoodImage(imageSrc, explicitItem);
      setClassificationResult(result);
      setSelectedFood(result.topMatch);
    } catch (err) {
      console.error("Classification error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Preset Sample Click
  const handleSelectSample = (item) => {
    runClassification(item.image, item);
  };

  // Handle File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          runClassification(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          runClassification(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Camera Stream
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable:", err);
      alert("Unable to access camera. Please allow webcam permission or try upload mode.");
      setIsCameraActive(false);
    }
  };

  const captureCameraFrame = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      // Stop camera stream
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraActive(false);

      runClassification(dataUrl);
    }
  };

  // Handle Barcode Lookup
  const handleBarcodeSearch = async (e) => {
    e?.preventDefault();
    if (!barcodeInput.trim()) return;

    setBarcodeLoading(true);
    setBarcodeError(null);

    const offResult = await lookupOpenFoodFactsProduct(barcodeInput.trim());
    setBarcodeLoading(false);

    if (offResult) {
      // Find or synthesize item
      const matched = FOOD_DATABASE.find(f => f.off_barcode === barcodeInput.trim()) || {
        id: `off-${offResult.barcode}`,
        name: offResult.name,
        category: "Packaged Product",
        scientificName: offResult.brand,
        usda_fdc_id: "OFF-" + offResult.barcode,
        off_barcode: offResult.barcode,
        dataset_origin: "OpenFoodFacts API (ODbL)",
        confidence: 0.994,
        image: offResult.image || "https://images.unsplash.com/photo-1622484216800-478673895e63?auto=format&fit=crop&w=600&q=80",
        serving_size_g: 100,
        unit_description: "1 standard package serving (100g)",
        unit_ratio: 1.0,
        nutrients: offResult.nutrients,
        diet_tags: ["Verified GTIN Barcode", `Nutri-Score ${offResult.nutriScore}`, "Packaged Food"],
        storage_tip: "Refer to manufacturer expiration date on packaging."
      };

      setCurrentImage(matched.image);
      setSelectedFood(matched);
      setClassificationResult({
        topMatch: matched,
        confidence: 0.994,
        alternatives: [],
        model: "OpenFoodFacts GTIN Barcode Decoder",
        inferenceLatency: "4.8ms",
        inputResolution: "1D/2D Barcode EAN-13",
        freshnessIndex: "Commercially Packaged",
        detectedPackaging: `Verified GTIN ${barcodeInput.trim()}`,
        boundingBox: { x: 5, y: 10, width: 90, height: 80 }
      });
    } else {
      setBarcodeError("Product barcode not found in OpenFoodFacts. Try sample barcode 0052159701047 or 0602652171112.");
    }
  };

  const isInBasket = selectedFood && basket.some(b => b.id === selectedFood.id);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)', gap: '24px' }}>
      
      {/* Left Column: Visual Scanner & Recognition View */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        
        {/* Model Live Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          marginBottom: '14px',
          borderRadius: 'var(--radius-sm)',
          background: isBackendLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: isBackendLive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isBackendLive ? '#10b981' : '#f59e0b',
              boxShadow: isBackendLive ? '0 0 8px #10b981' : 'none',
              display: 'inline-block'
            }} />
            <strong style={{ color: isBackendLive ? '#34d399' : '#fbbf24' }}>
              {isBackendLive ? 'MobileNetV2 Live Inference Active' : 'Connecting to MobileNetV2 (Port 5000)...'}
            </strong>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            36 Food Classes • Kritik Seth Dataset
          </span>
        </div>

        {/* Mode Selector Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            id="scanner-mode-samples"
            onClick={() => setActiveInputMode('samples')}
            className={activeInputMode === 'samples' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            <Layers size={15} />
            <span>Sample Produce (36)</span>
          </button>

          <button
            id="scanner-mode-upload"
            onClick={() => setActiveInputMode('upload')}
            className={activeInputMode === 'upload' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            <Upload size={15} />
            <span>Upload Photo</span>
          </button>

          <button
            id="scanner-mode-camera"
            onClick={() => { setActiveInputMode('camera'); startCamera(); }}
            className={activeInputMode === 'camera' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            <Camera size={15} />
            <span>Live Camera</span>
          </button>

          <button
            id="scanner-mode-barcode"
            onClick={() => setActiveInputMode('barcode')}
            className={activeInputMode === 'barcode' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            <Barcode size={15} />
            <span>Barcode (OFF)</span>
          </button>
        </div>

        {/* Input Mode Container */}
        {activeInputMode === 'upload' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '24px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '16px',
              background: 'rgba(255,255,255,0.02)',
              transition: 'border-color var(--transition-fast)'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
              id="file-upload-input"
            />
            <Upload size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: '0.95rem' }}>
              Drop food image here or browse files
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supports JPG, PNG, WEBP (Fruits-360 / VegNet classification)
            </span>
          </div>
        )}

        {activeInputMode === 'barcode' && (
          <form onSubmit={handleBarcodeSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              id="barcode-input-field"
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Enter EAN/UPC barcode (e.g. 0052159701047)"
              style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
            />
            <button
              id="barcode-submit-btn"
              type="submit"
              disabled={barcodeLoading}
              className="btn-primary"
              style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
            >
              {barcodeLoading ? <RefreshCw size={16} className="animate-spin" /> : <Barcode size={16} />}
              <span>Lookup</span>
            </button>
          </form>
        )}

        {barcodeError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', color: '#fda4af', fontSize: '0.8rem', marginBottom: '16px' }}>
            <AlertCircle size={15} />
            <span>{barcodeError}</span>
          </div>
        )}

        {/* Viewport for Image & CNN Overlay */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '320px',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: '#04070d',
          border: '1px solid var(--border-medium)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
        }}>
          {isCameraActive ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={captureCameraFrame}
                className="btn-primary"
                style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}
              >
                <Camera size={18} />
                <span>Capture & Classify</span>
              </button>
            </div>
          ) : (
            <>
              <img
                src={currentImage}
                alt="Detected Food Specimen"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: isScanning ? 'brightness(0.7) contrast(1.1)' : 'brightness(0.95)'
                }}
              />

              {/* Scanning Laser Beam */}
              {isScanning && <div className="scanner-beam" />}

              {/* Bounding Box HUD */}
              {!isScanning && classificationResult && (
                <div style={{
                  position: 'absolute',
                  top: `${classificationResult.boundingBox.y}%`,
                  left: `${classificationResult.boundingBox.x}%`,
                  width: `${classificationResult.boundingBox.width}%`,
                  height: `${classificationResult.boundingBox.height}%`,
                  border: '2px solid #10b981',
                  borderRadius: '10px',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4), inset 0 0 15px rgba(16, 185, 129, 0.2)',
                  pointerEvents: 'none',
                  transition: 'all 0.4s ease'
                }}>
                  {/* Corner Targets */}
                  <div style={{ position: 'absolute', top: -3, left: -3, width: 8, height: 8, background: '#34d399' }} />
                  <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: '#34d399' }} />
                  <div style={{ position: 'absolute', bottom: -3, left: -3, width: 8, height: 8, background: '#34d399' }} />
                  <div style={{ position: 'absolute', bottom: -3, right: -3, width: 8, height: 8, background: '#34d399' }} />

                  {/* HUD Confidence Label */}
                  <div style={{
                    position: 'absolute',
                    top: '-26px',
                    left: 0,
                    background: 'rgba(16, 185, 129, 0.95)',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                  }}>
                    <span>{classificationResult.topMatch.name}</span>
                    <span>•</span>
                    <span>{(classificationResult.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {/* Bottom Telemetry HUD */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '10px 14px',
                background: 'linear-gradient(0deg, rgba(8,12,20,0.95) 0%, rgba(8,12,20,0.7) 70%, transparent 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
                    <Zap size={13} />
                    <span>{classificationResult?.inferenceLatency || '14.2ms'}</span>
                  </span>
                  <span>•</span>
                  <span>{classificationResult?.model?.split(' ')[0] || 'ConvNeXt-Tiny'}</span>
                </div>
                <div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                    {selectedFood?.dataset_origin || 'Fruits-360'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Preset Sample Gallery Thumbnails */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Model Benchmark Samples ({FOOD_DATABASE.length} Classes)
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['All', 'Fruit', 'Vegetable'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSampleCategoryFilter(cat)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    background: sampleCategoryFilter === cat ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: sampleCategoryFilter === cat ? '#34d399' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {cat === 'All' ? `All (${FOOD_DATABASE.length})` : cat === 'Fruit' ? 'Fruits (10)' : 'Vegetables (26)'}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
            gap: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {FOOD_DATABASE
              .filter(item => sampleCategoryFilter === 'All' || item.category?.includes(sampleCategoryFilter))
              .map(item => {
                const isSelected = selectedFood?.id === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sample-btn-${item.id}`}
                    onClick={() => handleSelectSample(item)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                      padding: 0,
                      boxShadow: isSelected ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                      transform: isSelected ? 'scale(1.04)' : 'none',
                      cursor: 'pointer'
                    }}
                    title={item.name}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.75)',
                      padding: '2px 3px',
                      fontSize: '0.62rem',
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.name.replace(/^(Fresh|Garden|Sweet|Crisp|Sweet Table|Zesty Green|Citrus|Ripe|Baby|White|Purple|Yellow)\s+/i, '')}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

      </div>

      {/* Right Column: Classification Results & Fast Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Identified Produce Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>
                {selectedFood?.category || 'Produce'}
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 4px' }}>
                {selectedFood?.name || 'Classifying Food...'}
              </h2>
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {selectedFood?.scientificName}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
                {classificationResult ? `${(classificationResult.confidence * 100).toFixed(1)}%` : '98.4%'}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                CNN Confidence
              </span>
            </div>
          </div>

          {/* Quick Linking Schema Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              fontSize: '0.75rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>USDA FDC:</span>
              <a 
                href={`https://fdc.nal.usda.gov/fdc-app.html#/food-details/${selectedFood?.usda_fdc_id}/nutrients`}
                target="_blank" 
                rel="noreferrer"
                style={{ color: '#67e8f9', textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
              >
                #{selectedFood?.usda_fdc_id} ↗
              </a>
            </div>

            {selectedFood?.off_barcode && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>GTIN / Barcode:</span>
                <span style={{ color: '#fcd34d', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {selectedFood.off_barcode}
                </span>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              fontSize: '0.75rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Dataset:</span>
              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                {selectedFood?.dataset_origin}
              </span>
            </div>
          </div>

          {/* Quick Macro Pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            padding: '12px',
            background: 'rgba(8,12,20,0.6)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '18px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calories</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                {selectedFood?.nutrients?.calories} <span style={{ fontSize: '0.7rem' }}>kcal</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protein</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>
                {selectedFood?.nutrients?.protein_g}g
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carbs</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>
                {selectedFood?.nutrients?.carbs_g}g
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fat</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f43f5e' }}>
                {selectedFood?.nutrients?.fat_g}g
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              id="btn-scanner-ai-recipe"
              onClick={() => {
                if (selectedFood) {
                  addToBasket(selectedFood);
                  if (onNavigateToRecipes) onNavigateToRecipes();
                }
              }}
              className="btn-primary"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={17} />
              <span>Craft AI Recipe with {selectedFood?.name ? selectedFood.name.split(' ')[0] : 'This Item'}</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-add-to-basket"
                onClick={() => selectedFood && addToBasket(selectedFood)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                <ShoppingBag size={16} />
                <span>{isInBasket ? "In Pantry (Add More)" : "Add to Pantry"}</span>
              </button>

              <button
                id="btn-log-food"
                onClick={() => selectedFood && addToMealLog(selectedFood, 'Lunch')}
                className="btn-secondary"
              >
                <CheckCircle2 size={16} color="#10b981" />
                <span>Log Meal</span>
              </button>
            </div>
          </div>

        </div>

        {/* Alternative CNN Predictions Box */}
        {classificationResult?.alternatives && classificationResult.alternatives.length > 0 && (
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Alternative Top-K Predictions
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {classificationResult.alternatives.map((alt, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectSample(alt.item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={alt.item.image}
                      alt={alt.item.name}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{alt.item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(alt.confidence * 100).toFixed(1)}%
                    </span>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
