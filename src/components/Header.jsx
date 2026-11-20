import React from 'react';
import { Camera, Sparkles, UtensilsCrossed, PieChart, Database, Flame, ShoppingBag } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, basketCount, dailyCalories, calorieGoal = 2000 }) {
  const percentCalories = Math.min(100, Math.round((dailyCalories / calorieGoal) * 100));

  return (
    <header className="glass-panel" style={{ marginBottom: '24px', padding: '16px 24px', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
            color: '#ffffff'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, background: 'linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                NutriLens AI
              </h1>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>v2.0 CNN</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Produce & Packaged Recognition • USDA FoodData Central • Smart Recipe Generator
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Calorie Progress Pill */}
          <div 
            onClick={() => setActiveTab('tracker')}
            title="Click to view daily tracker"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Flame size={16} color="#f59e0b" />
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: '#f59e0b' }}>{dailyCalories}</span>
              <span style={{ color: 'var(--text-muted)' }}> / {calorieGoal} kcal</span>
            </div>
            <div style={{ width: '40px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${percentCalories}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
            </div>
          </div>

          {/* Basket Pill */}
          <div 
            onClick={() => setActiveTab('recipes')}
            title="Click to view recipe matches"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: basketCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: basketCount > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer'
            }}
          >
            <ShoppingBag size={16} color={basketCount > 0 ? '#10b981' : '#94a3b8'} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: basketCount > 0 ? '#34d399' : 'var(--text-secondary)' }}>
              Pantry: {basketCount}
            </span>
          </div>
        </div>

      </div>

      {/* Navigation Tabs Bar */}
      <nav style={{
        display: 'flex',
        gap: '8px',
        marginTop: '18px',
        paddingTop: '14px',
        borderTop: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        <button
          id="nav-tab-scanner"
          onClick={() => setActiveTab('scanner')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: activeTab === 'scanner' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeTab === 'scanner' ? '#34d399' : 'var(--text-secondary)',
            border: activeTab === 'scanner' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent'
          }}
        >
          <Camera size={18} />
          <span>Scanner & Nutrition</span>
        </button>

        <button
          id="nav-tab-recipes"
          onClick={() => setActiveTab('recipes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: activeTab === 'recipes' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: activeTab === 'recipes' ? '#a5b4fc' : 'var(--text-secondary)',
            border: activeTab === 'recipes' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent'
          }}
        >
          <UtensilsCrossed size={18} />
          <span>Recipe Suggestions {basketCount > 0 && `(${basketCount})`}</span>
        </button>

        <button
          id="nav-tab-tracker"
          onClick={() => setActiveTab('tracker')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: activeTab === 'tracker' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeTab === 'tracker' ? '#fcd34d' : 'var(--text-secondary)',
            border: activeTab === 'tracker' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent'
          }}
        >
          <PieChart size={18} />
          <span>Daily Tracker</span>
        </button>

        <button
          id="nav-tab-datasets"
          onClick={() => setActiveTab('datasets')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: activeTab === 'datasets' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'datasets' ? '#67e8f9' : 'var(--text-secondary)',
            border: activeTab === 'datasets' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent'
          }}
        >
          <Database size={18} />
          <span>ML Datasets & Research</span>
        </button>
      </nav>
    </header>
  );
}
