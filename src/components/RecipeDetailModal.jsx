import React, { useState } from 'react';
import { X, Clock, Flame, ChefHat, Check, CheckCircle2, ShoppingBag, Utensils, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RecipeDetailModal({ recipe, onClose, onLogMeal }) {
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  if (!recipe) return null;

  const toggleIngredient = (idx) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleFinishCooking = () => {
    setIsCompleted(true);
    // Trigger confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Graceful fallback if canvas-confetti unsupported
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(4, 7, 13, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Header with Image */}
        <div style={{ position: 'relative', height: '220px', width: '100%' }}>
          <img
            src={recipe.image}
            alt={recipe.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.7)',
              color: '#ffffff',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>

          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px',
            background: 'linear-gradient(0deg, rgba(13,20,36,1) 0%, rgba(13,20,36,0.8) 60%, transparent 100%)'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-emerald">{recipe.category || 'Entrée'}</span>
              <span className="badge badge-indigo">{recipe.difficulty || 'Easy'}</span>
              <span className="badge badge-emerald">quick idea</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {recipe.title}
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          
          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            padding: '12px',
            background: 'rgba(8,12,20,0.5)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                {recipe.prepTimeMins + recipe.cookTimeMins} mins
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calories</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f59e0b' }}>
                {recipe.caloriesPerServing} kcal
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protein</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#60a5fa' }}>
                {recipe.proteinPerServing}g
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carbs / Fat</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>
                {recipe.carbsPerServing}g / {recipe.fatPerServing}g
              </div>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
            {recipe.description}
          </p>

          {/* Ingredients Checklist */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={18} color="#10b981" />
              <span>Ingredients ({recipe.requiredIngredients?.length || 0})</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipe.requiredIngredients?.map((ing, idx) => {
                const isChecked = checkedIngredients[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleIngredient(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isChecked ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                      border: isChecked ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: isChecked ? '1px solid #10b981' : '1px solid var(--border-medium)',
                        background: isChecked ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        {isChecked && <Check size={14} />}
                      </div>
                      <span style={{
                        fontSize: '0.9rem',
                        textDecoration: isChecked ? 'line-through' : 'none',
                        color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {ing.name} {ing.prep ? `(${ing.prep})` : ''}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
                      {ing.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cooking Instructions */}
          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChefHat size={18} color="#6366f1" />
              <span>Step-by-Step Directions</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {recipe.instructions?.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '14px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#a5b4fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, flex: 1 }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
            <button
              onClick={() => {
                onLogMeal(recipe, 'Dinner');
                onClose();
              }}
              className="btn-secondary"
            >
              <CheckCircle2 size={16} color="#10b981" />
              <span>Log in Daily Tracker</span>
            </button>

            <button
              onClick={handleFinishCooking}
              className="btn-primary"
            >
              <Award size={18} />
              <span>{isCompleted ? '🎉 Recipe Cooked!' : 'I Made This Recipe!'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
