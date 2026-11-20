import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, Info, CheckCircle, Flame, Heart, Leaf, Award } from 'lucide-react';

export default function NutritionCard({ foodItem }) {
  const [portionMode, setPortionMode] = useState('100g'); // '100g', 'unit', 'custom'
  const [customGrams, setCustomGrams] = useState(100);

  if (!foodItem) return null;

  // Determine portion multiplier
  let portionGrams = 100;
  if (portionMode === '100g') {
    portionGrams = 100;
  } else if (portionMode === 'unit') {
    portionGrams = Math.round(foodItem.serving_size_g * (foodItem.unit_ratio || 1.0));
  } else {
    portionGrams = customGrams;
  }

  const multiplier = portionGrams / 100;

  // Scaled nutrients
  const cals = Math.round((foodItem.nutrients?.calories || 0) * multiplier);
  const protein = Number(((foodItem.nutrients?.protein_g || 0) * multiplier).toFixed(1));
  const carbs = Number(((foodItem.nutrients?.carbs_g || 0) * multiplier).toFixed(1));
  const fat = Number(((foodItem.nutrients?.fat_g || 0) * multiplier).toFixed(1));
  const fiber = Number(((foodItem.nutrients?.fiber_g || 0) * multiplier).toFixed(1));
  const sugar = Number(((foodItem.nutrients?.sugar_g || 0) * multiplier).toFixed(1));
  const sodium = Math.round((foodItem.nutrients?.sodium_mg || 0) * multiplier);
  const potassium = Math.round((foodItem.nutrients?.potassium_mg || 0) * multiplier);
  const vitC = Number(((foodItem.nutrients?.vit_c_mg || 0) * multiplier).toFixed(1));
  const calcium = Math.round((foodItem.nutrients?.calcium_mg || 0) * multiplier);
  const iron = Number(((foodItem.nutrients?.iron_mg || 0) * multiplier).toFixed(2));

  // Daily Value % calculations (FDA standard based on 2,000 kcal diet)
  // Fat: 78g, SatFat: 20g, Carbs: 275g, Fiber: 28g, Protein: 50g, Sodium: 2300mg, Potassium: 4700mg, VitC: 90mg, Calcium: 1300mg, Iron: 18mg
  const dvFat = Math.round((fat / 78) * 100);
  const dvCarbs = Math.round((carbs / 275) * 100);
  const dvFiber = Math.round((fiber / 28) * 100);
  const dvProtein = Math.round((protein / 50) * 100);
  const dvSodium = Math.round((sodium / 2300) * 100);
  const dvPotassium = Math.round((potassium / 4700) * 100);
  const dvVitC = Math.round((vitC / 90) * 100);
  const dvCalcium = Math.round((calcium / 1300) * 100);
  const dvIron = Math.round((iron / 18) * 100);

  // Macro calorie shares
  const calsFromProtein = protein * 4;
  const calsFromCarbs = carbs * 4;
  const calsFromFat = fat * 9;
  const totalMacroCals = Math.max(1, calsFromProtein + calsFromCarbs + calsFromFat);
  const pctProtein = Math.round((calsFromProtein / totalMacroCals) * 100);
  const pctCarbs = Math.round((calsFromCarbs / totalMacroCals) * 100);
  const pctFat = Math.round((calsFromFat / totalMacroCals) * 100);

  return (
    <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
      
      {/* Nutrition Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399'
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
              USDA FoodData Central Nutrition Profile
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Linked FDC ID #{foodItem.usda_fdc_id} • CC0 Public Domain Reference
            </span>
          </div>
        </div>

        {/* Portion Selector Tabs */}
        <div style={{ display: 'flex', background: 'rgba(8,12,20,0.6)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            id="portion-100g-btn"
            onClick={() => setPortionMode('100g')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: portionMode === '100g' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: portionMode === '100g' ? '#34d399' : 'var(--text-secondary)'
            }}
          >
            100g Standard
          </button>
          
          <button
            id="portion-unit-btn"
            onClick={() => setPortionMode('unit')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: portionMode === 'unit' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: portionMode === 'unit' ? '#34d399' : 'var(--text-secondary)'
            }}
          >
            1 Unit ({foodItem.unit_description?.split('(~')[1]?.replace(')', '') || 'Serving'})
          </button>

          <button
            id="portion-custom-btn"
            onClick={() => setPortionMode('custom')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: portionMode === 'custom' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: portionMode === 'custom' ? '#34d399' : 'var(--text-secondary)'
            }}
          >
            Custom Grams
          </button>
        </div>
      </div>

      {/* Custom Grams Slider */}
      {portionMode === 'custom' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 18px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '110px' }}>
            Portion Weight:
          </span>
          <input
            id="custom-grams-slider"
            type="range"
            min="20"
            max="500"
            step="5"
            value={customGrams}
            onChange={(e) => setCustomGrams(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#10b981' }}
          />
          <span style={{ fontWeight: 700, minWidth: '60px', fontFamily: 'var(--font-mono)', color: '#34d399' }}>
            {customGrams} g
          </span>
        </div>
      )}

      {/* Main Nutrition Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(280px, 1fr)', gap: '24px' }}>
        
        {/* Left: FDA Standard Nutrition Facts Box */}
        <div style={{
          background: '#04070d',
          border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 22px',
          color: '#ffffff',
          fontFamily: 'var(--font-heading)'
        }}>
          <div style={{ borderBottom: '8px solid #ffffff', paddingBottom: '4px', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              Nutrition Facts
            </h4>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
              Serving size: <strong>{portionGrams}g</strong> ({foodItem.name})
            </div>
          </div>

          {/* Calories row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '4px solid #ffffff', padding: '6px 0 8px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Amount per serving</div>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>Calories</div>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b' }}>
              {cals}
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            % Daily Value *
          </div>

          {/* Nutrient Rows */}
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
            
            {/* Total Fat */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span><strong>Total Fat</strong> {fat}g</span>
              <strong>{dvFat}%</strong>
            </div>

            {/* Sodium */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span><strong>Sodium</strong> {sodium}mg</span>
              <strong>{dvSodium}%</strong>
            </div>

            {/* Total Carbs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span><strong>Total Carbohydrate</strong> {carbs}g</span>
              <strong>{dvCarbs}%</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
              <span>Dietary Fiber {fiber}g</span>
              <strong>{dvFiber}%</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
              <span>Total Sugars {sugar}g</span>
              <span>—</span>
            </div>

            {/* Protein */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '4px solid #ffffff' }}>
              <span><strong>Protein</strong> {protein}g</span>
              <strong>{dvProtein}%</strong>
            </div>

            {/* Micronutrients */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
              <span>Potassium {potassium}mg</span>
              <span>{dvPotassium}%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
              <span>Vitamin C {vitC}mg</span>
              <span>{dvVitC}%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
              <span>Calcium {calcium}mg</span>
              <span>{dvCalcium}%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem' }}>
              <span>Iron {iron}mg</span>
              <span>{dvIron}%</span>
            </div>

          </div>

          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.3 }}>
            * The % Daily Value (DV) tells you how much a nutrient in a serving contributes to a daily diet of 2,000 calories a day.
          </div>
        </div>

        {/* Right: Macro Distribution & Diet Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Caloric Energy Distribution */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Caloric Energy Breakdown
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                4 kcal/g (P, C) • 9 kcal/g (F)
              </span>
            </div>

            {/* Segmented Energy Bar */}
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: '12px' }}>
              <div style={{ width: `${pctProtein}%`, background: '#3b82f6' }} title={`Protein: ${pctProtein}%`} />
              <div style={{ width: `${pctCarbs}%`, background: '#10b981' }} title={`Carbs: ${pctCarbs}%`} />
              <div style={{ width: `${pctFat}%`, background: '#f43f5e' }} title={`Fat: ${pctFat}%`} />
            </div>

            {/* Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
                <span style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 600 }}>Protein</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#93c5fd' }}>{pctProtein}%</div>
              </div>
              <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
                <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>Carbs</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a7f3d0' }}>{pctCarbs}%</div>
              </div>
              <div style={{ padding: '6px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '6px' }}>
                <span style={{ color: '#f43f5e', fontSize: '0.75rem', fontWeight: 600 }}>Fat</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fecdd3' }}>{pctFat}%</div>
              </div>
            </div>
          </div>

          {/* Dietary Highlights & Tags */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Functional Nutrition & Diet Attributes
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {foodItem.diet_tags?.map((tag, idx) => (
                <span key={idx} className="badge badge-emerald">
                  <CheckCircle size={12} />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Storage & Freshness Intelligence */}
          {foodItem.storage_tip && (
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                <Leaf size={16} />
                <span>Culinary & Storage Recommendation</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                {foodItem.storage_tip}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
