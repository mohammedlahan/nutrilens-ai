import React, { useState } from 'react';
import { Sparkles, Utensils, Clock, Flame, Plus, X, Filter, ChefHat, Check, AlertCircle } from 'lucide-react';
import { FOOD_DATABASE } from '../data/foodDatasets';
import { matchRecipesToIngredients, generateAIRecipe } from '../services/recipeEngine';

export default function RecipeFinder({
  basket,
  removeFromBasket,
  addToBasket,
  clearBasket,
  onOpenRecipeDetail,
  addToMealLog
}) {
  const [selectedDietFilter, setSelectedDietFilter] = useState('All');
  const [aiDietGoal, setAiDietGoal] = useState('Balanced');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [customAIRecipes, setCustomAIRecipes] = useState([]);
  const [showAddProduceModal, setShowAddProduceModal] = useState(false);

  // Match existing recipes against current pantry basket
  const basketItemIds = basket.map(b => b.id);
  const matchedRecipes = matchRecipesToIngredients(basketItemIds, selectedDietFilter);

  // Combine custom generated AI recipes with matched database recipes
  const allDisplayRecipes = [
    ...customAIRecipes.filter(r => selectedDietFilter === 'All' || r.diet_tags.includes(selectedDietFilter)),
    ...matchedRecipes
  ];

  const [selectedCuisine, setSelectedCuisine] = useState('Indian Fusion');

  // Handle AI Recipe Generation
  const handleGenerateAIRecipe = async () => {
    if (basket.length === 0) {
      alert("Please add at least 1 ingredient to your pantry basket to craft a recipe!");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const generated = await generateAIRecipe(basket, aiDietGoal, aiCustomPrompt, selectedCuisine);
      if (generated) {
        setCustomAIRecipes([generated, ...customAIRecipes]);
        onOpenRecipeDetail(generated);
      }
    } catch (err) {
      console.error("AI Recipe generation error:", err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const dietFilters = [
    'All',
    'High-Protein',
    'Low-Calorie',
    'Vegan',
    'Quick (<20m)',
    'Keto-Friendly',
    'Gluten-Free'
  ];

  return (
    <div>
      
      {/* Active Pantry Ingredients Basket Header */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Detected Pantry Basket</span>
              <span className="badge badge-emerald">{basket.length} Ingredients</span>
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Ingredients recognized by CNN model available for culinary matching & recipe generation
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="add-pantry-btn"
              onClick={() => setShowAddProduceModal(!showAddProduceModal)}
              className="btn-secondary btn-sm"
            >
              <Plus size={15} />
              <span>Add Ingredient</span>
            </button>

            {basket.length > 0 && (
              <button
                id="clear-basket-btn"
                onClick={clearBasket}
                className="btn-secondary btn-sm"
                style={{ color: '#fda4af' }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Ingredient Chips */}
        {basket.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-medium)' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Your pantry basket is currently empty. Scan produce or click <strong>"Add Ingredient"</strong> above to discover matched recipes!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {basket.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 10px 5px 6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
                  {item.name}
                </span>
                <button
                  onClick={() => removeFromBasket(item.id)}
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', padding: '2px', borderRadius: '50%' }}
                  title="Remove from basket"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Add Produce Dropdown / Modal */}
        {showAddProduceModal && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Click any item to add to your pantry basket:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginTop: '10px' }}>
              {FOOD_DATABASE.map(item => {
                const inBasket = basket.some(b => b.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!inBasket) addToBasket(item);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      background: inBasket ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                      border: inBasket ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left'
                    }}
                  >
                    <img src={item.image} alt={item.name} style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.75rem', color: inBasket ? '#34d399' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* AI Recipe Generator Banner */}
      <div className="glass-panel" style={{
        padding: '24px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <ChefHat size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
              AI Culinary Crafter (RecipeNLG Engine)
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              Synthesize custom recipes, estimated macros, and chef instructions from your scanned basket
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(280px, 2fr) auto', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Dietary Profile Goal:
            </label>
            <select
              id="ai-diet-goal-select"
              value={aiDietGoal}
              onChange={(e) => setAiDietGoal(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <option value="Balanced">Balanced Nutrition</option>
              <option value="High-Protein">High-Protein (Muscle Fuel)</option>
              <option value="Low-Calorie">Low-Calorie (Weight Loss)</option>
              <option value="Keto-Friendly">Keto / Low-Carb</option>
              <option value="Vegan">100% Plant-Based Vegan</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Cuisine Style:
            </label>
            <select
              id="ai-cuisine-select"
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <option value="Indian Fusion">Indian Homestyle / Tadka Sabzi</option>
              <option value="Mediterranean">Mediterranean Garlic & Olive Oil</option>
              <option value="Asian Wok">Asian Wok Stir-Fry / Sesame</option>
              <option value="Continental">Continental / Fresh Herb Sauté</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Custom Chef Instructions (Optional):
            </label>
            <input
              id="ai-custom-prompt-input"
              type="text"
              value={aiCustomPrompt}
              onChange={(e) => setAiCustomPrompt(e.target.value)}
              placeholder="e.g. Under 400 calories, add crushed red peppers, 15 min prep"
              style={{ width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              id="btn-generate-ai-recipe"
              onClick={handleGenerateAIRecipe}
              disabled={isGeneratingAI}
              className="btn-primary"
              style={{ height: '42px', padding: '0 20px', whiteSpace: 'nowrap' }}
            >
              {isGeneratingAI ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />}
              <span>{isGeneratingAI ? 'Crafting Recipe...' : 'Generate AI Recipe'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dietary Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        <Filter size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        {dietFilters.map(filter => (
          <button
            key={filter}
            id={`filter-${filter.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            onClick={() => setSelectedDietFilter(filter)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: selectedDietFilter === filter ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedDietFilter === filter ? '#a5b4fc' : 'var(--text-secondary)',
              border: selectedDietFilter === filter ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-subtle)'
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Recipe Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {allDisplayRecipes.map(recipe => {
          const matchPercent = recipe.matchPercentage || 100;
          return (
            <div
              key={recipe.id}
              className="glass-panel-interactive"
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Recipe Image & Overlay Badges */}
              <div style={{ position: 'relative', height: '180px', width: '100%' }}>
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {recipe.isAIGenerated ? (
                  <span
                    className="badge badge-indigo"
                    style={{ position: 'absolute', top: '12px', left: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  >
                    <Sparkles size={12} />
                    <span>AI Model Generated</span>
                  </span>
                ) : (
                  <span
                    className={matchPercent >= 60 ? 'badge badge-emerald' : 'badge badge-amber'}
                    style={{ position: 'absolute', top: '12px', left: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  >
                    {matchPercent >= 75 ? <Check size={12} /> : null}
                    <span>{matchPercent}% Pantry Match</span>
                  </span>
                )}

                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.75)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ffffff'
                }}>
                  <Clock size={13} />
                  <span>{recipe.prepTimeMins + recipe.cookTimeMins} mins</span>
                </div>
              </div>

              {/* Recipe Body */}
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {recipe.diet_tags?.slice(0, 3).map((tag, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
                    {recipe.title}
                  </h4>

                  <p style={{ margin: '0 0 16px', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {recipe.description}
                  </p>
                </div>

                <div>
                  {/* Macro Summary Strip */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(8,12,20,0.5)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '14px',
                    fontSize: '0.75rem'
                  }}>
                    <span><Flame size={13} color="#f59e0b" style={{ display: 'inline', verticalAlign: '-2px' }} /> <strong>{recipe.caloriesPerServing}</strong> kcal</span>
                    <span style={{ color: '#60a5fa' }}>P: <strong>{recipe.proteinPerServing}g</strong></span>
                    <span style={{ color: '#34d399' }}>C: <strong>{recipe.carbsPerServing}g</strong></span>
                    <span style={{ color: '#f43f5e' }}>F: <strong>{recipe.fatPerServing}g</strong></span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id={`btn-view-recipe-${recipe.id}`}
                      onClick={() => onOpenRecipeDetail(recipe)}
                      className="btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <span>View Recipe & Steps</span>
                    </button>

                    <button
                      id={`btn-log-recipe-${recipe.id}`}
                      onClick={() => addToMealLog(recipe, 'Dinner')}
                      className="btn-secondary btn-sm"
                      title="Log as meal in daily tracker"
                    >
                      <span>Log Meal</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
