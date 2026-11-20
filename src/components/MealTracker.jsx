import React, { useState } from 'react';
import { Flame, PieChart, Plus, Trash2, Download, CheckCircle, Award, Coffee, Sun, Moon, Apple } from 'lucide-react';

export default function MealTracker({
  mealLog,
  removeFromMealLog,
  clearMealLog,
  calorieGoal = 2000,
  proteinGoal = 120,
  carbsGoal = 220,
  fatGoal = 65
}) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Compute totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  mealLog.forEach(item => {
    totalCalories += item.calories || (item.nutrients?.calories || 0);
    totalProtein += item.protein_g || (item.nutrients?.protein_g || 0);
    totalCarbs += item.carbs_g || (item.nutrients?.carbs_g || 0);
    totalFat += item.fat_g || (item.nutrients?.fat_g || 0);
  });

  const remainingCalories = Math.max(0, calorieGoal - totalCalories);
  const percentCals = Math.min(100, Math.round((totalCalories / calorieGoal) * 100));
  const percentProtein = Math.min(100, Math.round((totalProtein / proteinGoal) * 100));
  const percentCarbs = Math.min(100, Math.round((totalCarbs / carbsGoal) * 100));
  const percentFat = Math.min(100, Math.round((totalFat / fatGoal) * 100));

  const mealSlots = [
    { name: 'Breakfast', icon: Coffee, color: '#f59e0b' },
    { name: 'Lunch', icon: Sun, color: '#10b981' },
    { name: 'Dinner', icon: Moon, color: '#6366f1' },
    { name: 'Snacks', icon: Apple, color: '#f43f5e' }
  ];

  const generateExportText = () => {
    const lines = [
      `=========================================`,
      `NutriLens AI — Daily Nutrition Report`,
      `Date: ${new Date().toLocaleDateString()}`,
      `=========================================`,
      `Daily Energy: ${totalCalories} / ${calorieGoal} kcal (${percentCals}% target)`,
      `Protein:      ${totalProtein.toFixed(1)}g / ${proteinGoal}g (${percentProtein}%)`,
      `Carbohydrates:${totalCarbs.toFixed(1)}g / ${carbsGoal}g (${percentCarbs}%)`,
      `Total Fats:   ${totalFat.toFixed(1)}g / ${fatGoal}g (${percentFat}%)`,
      `-----------------------------------------`,
      `Logged Meals & Food Items:`,
      ...mealLog.map((item, idx) => 
        `  ${idx + 1}. [${item.slot || 'Meal'}] ${item.title || item.name} — ${item.calories || item.nutrients?.calories} kcal`
      ),
      `=========================================`
    ];
    return lines.join('\n');
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateExportText());
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div>
      
      {/* Daily Progress Overview Panel */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Today's Nutritional Targets</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Real-time synchronization with USDA FoodData Central nutrient profiles
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="export-report-btn"
              onClick={() => setShowExportModal(true)}
              className="btn-secondary btn-sm"
            >
              <Download size={15} />
              <span>Export Report</span>
            </button>

            {mealLog.length > 0 && (
              <button
                id="clear-meal-log-btn"
                onClick={clearMealLog}
                className="btn-secondary btn-sm"
                style={{ color: '#fda4af' }}
              >
                Clear Log
              </button>
            )}
          </div>
        </div>

        {/* Big Calorie Meter & 3 Macro Gauges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.3fr) repeat(3, minmax(140px, 1fr))', gap: '16px' }}>
          
          {/* Calorie Card */}
          <div style={{ background: 'rgba(8,12,20,0.6)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>
                Energy Budget
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {remainingCalories} kcal left
              </span>
            </div>

            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
              {totalCalories} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {calorieGoal} kcal</span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
              <div style={{ width: `${percentCals}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Protein Goal */}
          <div style={{ background: 'rgba(8,12,20,0.6)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '4px' }}>
              Protein
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {totalProtein.toFixed(0)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {proteinGoal}g</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ width: `${percentProtein}%`, height: '100%', background: '#3b82f6' }} />
            </div>
          </div>

          {/* Carbs Goal */}
          <div style={{ background: 'rgba(8,12,20,0.6)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', marginBottom: '4px' }}>
              Carbohydrates
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {totalCarbs.toFixed(0)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {carbsGoal}g</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ width: `${percentCarbs}%`, height: '100%', background: '#10b981' }} />
            </div>
          </div>

          {/* Fat Goal */}
          <div style={{ background: 'rgba(8,12,20,0.6)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f43f5e', textTransform: 'uppercase', marginBottom: '4px' }}>
              Healthy Fats
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {totalFat.toFixed(0)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {fatGoal}g</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ width: `${percentFat}%`, height: '100%', background: '#f43f5e' }} />
            </div>
          </div>

        </div>

      </div>

      {/* Meal Breakdown Slots (Breakfast, Lunch, Dinner, Snacks) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {mealSlots.map(slot => {
          const slotItems = mealLog.filter(item => (item.slot || 'Lunch') === slot.name);
          const Icon = slot.icon;
          const slotCals = slotItems.reduce((acc, curr) => acc + (curr.calories || curr.nutrients?.calories || 0), 0);

          return (
            <div key={slot.name} className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: `${slot.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: slot.color
                  }}>
                    <Icon size={16} />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', margin: 0 }}>{slot.name}</h4>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: slot.color }}>
                  {slotCals} kcal
                </span>
              </div>

              {/* Slot Items List */}
              {slotItems.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No items logged for {slot.name.toLowerCase()} yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {slotItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.title || item.name}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {item.calories || item.nutrients?.calories} kcal
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromMealLog(item.logId || idx)}
                        style={{ color: 'var(--text-muted)', padding: '4px' }}
                        title="Delete meal entry"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export Report Modal */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 12px' }}>Daily Nutrition Export</h3>
            <textarea
              readOnly
              value={generateExportText()}
              style={{
                width: '100%',
                height: '240px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                padding: '12px',
                background: '#04070d',
                color: '#34d399',
                resize: 'none',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={handleCopyReport}
                className="btn-primary"
              >
                {copiedExport ? <CheckCircle size={16} /> : <Download size={16} />}
                <span>{copiedExport ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
