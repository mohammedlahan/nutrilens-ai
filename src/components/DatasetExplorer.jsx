import React, { useState } from 'react';
import { Database, Cpu, GitBranch, Terminal, ExternalLink, Check, Play, RefreshCw } from 'lucide-react';
import { DATASET_BENCHMARKS } from '../data/foodDatasets';
import { searchUSDAFoodData, lookupOpenFoodFactsProduct } from '../services/nutritionApi';

export default function DatasetExplorer() {
  const [activeSubTab, setActiveSubTab] = useState('benchmarks'); // 'benchmarks', 'schema', 'apiTester'
  
  // API Playground State
  const [usdaQuery, setUsdaQuery] = useState('apple');
  const [usdaResult, setUsdaResult] = useState(null);
  const [usdaLoading, setUsdaLoading] = useState(false);

  const [offBarcode, setOffBarcode] = useState('7376280645023');
  const [offResult, setOffResult] = useState(null);
  const [offLoading, setOffLoading] = useState(false);

  const handleTestUSDA = async () => {
    setUsdaLoading(true);
    const res = await searchUSDAFoodData(usdaQuery);
    setUsdaResult(res);
    setUsdaLoading(false);
  };

  const handleTestOFF = async () => {
    setOffLoading(true);
    const res = await lookupOpenFoodFactsProduct(offBarcode);
    setOffResult(res);
    setOffLoading(false);
  };

  return (
    <div>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>Research & Architecture Foundation</span>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
              AI Recipe Generator & Nutrition Datasets Directory
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Open-source datasets, CNN backbone benchmarking, USDA FoodData Central and OpenFoodFacts mapping schema
            </p>
          </div>

          {/* Sub Navigation */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveSubTab('benchmarks')}
              className={activeSubTab === 'benchmarks' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            >
              <Cpu size={15} />
              <span>CNN Benchmarks</span>
            </button>
            <button
              onClick={() => setActiveSubTab('schema')}
              className={activeSubTab === 'schema' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            >
              <GitBranch size={15} />
              <span>Linking Schema</span>
            </button>
            <button
              onClick={() => setActiveSubTab('apiTester')}
              className={activeSubTab === 'apiTester' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            >
              <Terminal size={15} />
              <span>Live API Playground</span>
            </button>
          </div>
        </div>
      </div>

      {/* SubTab 1: CNN Benchmarks & Datasets List */}
      {activeSubTab === 'benchmarks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Datasets Cards Grid */}
          <div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#06b6d4" />
              <span>Curated Datasets for Produce, Packaged Goods & Recipes</span>
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px'
            }}>
              {DATASET_BENCHMARKS.datasets.map((dataset, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '1.05rem', margin: 0, color: '#f8fafc' }}>{dataset.name}</h4>
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>{dataset.license}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <span><strong>{typeof dataset.images === 'number' ? dataset.images.toLocaleString() : dataset.images}</strong> items</span>
                      <span>•</span>
                      <span><strong>{dataset.classes}</strong> classes</span>
                    </div>

                    <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      {dataset.notes}
                    </p>
                  </div>

                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <strong style={{ color: '#67e8f9' }}>Best for:</strong> {dataset.bestFor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CNN Architecture Benchmark Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#10b981" />
              <span>ConvNet Backbone Transfer Learning Benchmarks (PackEat & VegNet Baselines)</span>
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Model Architecture</th>
                    <th style={{ padding: '12px' }}>Top-1 Accuracy</th>
                    <th style={{ padding: '12px' }}>Top-5 Accuracy</th>
                    <th style={{ padding: '12px' }}>Inference Latency</th>
                    <th style={{ padding: '12px' }}>Parameters</th>
                    <th style={{ padding: '12px' }}>Packaged Produce mAP</th>
                    <th style={{ padding: '12px' }}>Deployment Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {DATASET_BENCHMARKS.cnn_architectures.map((arch, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', background: i === 0 ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: i === 0 ? '#34d399' : '#ffffff' }}>
                        {arch.model} {i === 0 && <span className="badge badge-emerald" style={{ fontSize: '0.6rem', marginLeft: '6px' }}>Recommended</span>}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#34d399' }}>{arch.top1_accuracy}</td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>{arch.top5_accuracy}</td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)' }}>{arch.latency_ms}</td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)' }}>{arch.params_m}</td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)' }}>{arch.mAP_packaged}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{arch.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SubTab 2: Linking Schema Diagram */}
      {activeSubTab === 'schema' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
            Multi-Modal Linking Pipeline Architecture
          </h3>

          {/* Flow Visualization */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Step 1</div>
              <h4 style={{ fontSize: '1.1rem', margin: '4px 0 8px', color: '#10b981' }}>Input Food Image</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Produce photo, webcam snapshot, or packaged barcode frame.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Step 2</div>
              <h4 style={{ fontSize: '1.1rem', margin: '4px 0 8px', color: '#6366f1' }}>CNN Classifier</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                ConvNeXt-Tiny transfer learning on Fruits-360 & VegNet produce classes.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Step 3</div>
              <h4 style={{ fontSize: '1.1rem', margin: '4px 0 8px', color: '#f59e0b' }}>Nutrition Mapping</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Joins predicted class to USDA FDC ID or OpenFoodFacts GTIN.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Step 4</div>
              <h4 style={{ fontSize: '1.1rem', margin: '4px 0 8px', color: '#06b6d4' }}>Recipe Suggestion</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Retrieves matching RecipeNLG dishes and executes AI culinary generation.
              </p>
            </div>
          </div>

          {/* Linking Schema Code Sample */}
          <div style={{ background: '#04070d', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              JSON Schema Joining Produce Class to USDA & Recipe Repositories:
            </span>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.825rem', color: '#34d399', overflowX: 'auto' }}>
{`{
  "honeycrisp_apple": {
    "scientific_name": "Malus domestica",
    "usda_fdc_id": 1750340,
    "dataset_origin": "Fruits-360 (Class 14)",
    "nutrients_per_100g": {
      "calories": 52,
      "protein_g": 0.26,
      "carbohydrates_g": 13.81,
      "total_fat_g": 0.17,
      "dietary_fiber_g": 2.4,
      "potassium_mg": 107,
      "vitamin_c_mg": 4.6
    },
    "recipenlg_recipes": [
      "rec-01-avocado-berry-bowl",
      "rec-06-apple-cinnamon-bake"
    ]
  }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* SubTab 3: Live API Playground */}
      {activeSubTab === 'apiTester' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '20px' }}>
          
          {/* USDA FDC API Tester */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 6px', color: '#10b981' }}>
              USDA FoodData Central REST API
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
              Endpoint: api.nal.usda.gov/fdc/v1/foods/search
            </span>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                id="usda-test-query"
                type="text"
                value={usdaQuery}
                onChange={(e) => setUsdaQuery(e.target.value)}
                placeholder="Search food item (e.g. apple, banana)"
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
              />
              <button
                id="btn-run-usda-test"
                onClick={handleTestUSDA}
                disabled={usdaLoading}
                className="btn-primary btn-sm"
              >
                {usdaLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Execute</span>
              </button>
            </div>

            {usdaResult && (
              <div style={{ background: '#04070d', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Source: {usdaResult.source}</span>
                  <span>FDC ID: #{usdaResult.fdcId}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                  {usdaResult.description}
                </div>
                {usdaResult.nutrients && (
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    Calories: {usdaResult.nutrients.calories} kcal • Protein: {usdaResult.nutrients.protein_g}g • Carbs: {usdaResult.nutrients.carbs_g}g
                  </div>
                )}
              </div>
            )}
          </div>

          {/* OpenFoodFacts API Tester */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 6px', color: '#f59e0b' }}>
              OpenFoodFacts Product Barcode API
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
              Endpoint: world.openfoodfacts.org/api/v3/product/[barcode].json
            </span>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                id="off-test-barcode"
                type="text"
                value={offBarcode}
                onChange={(e) => setOffBarcode(e.target.value)}
                placeholder="Enter Barcode (e.g. 7376280645023)"
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
              />
              <button
                id="btn-run-off-test"
                onClick={handleTestOFF}
                disabled={offLoading}
                className="btn-primary btn-sm"
              >
                {offLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Lookup</span>
              </button>
            </div>

            {offResult && (
              <div style={{ background: '#04070d', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Source: {offResult.source}</span>
                  <span>Nutri-Score: {offResult.nutriScore}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                  {offResult.name} ({offResult.brand})
                </div>
                {offResult.nutrients && (
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    Energy: {offResult.nutrients.calories} kcal • Protein: {offResult.nutrients.protein_g}g • Carbs: {offResult.nutrients.carbs_g}g
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
