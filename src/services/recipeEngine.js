// Recipe Retrieval & AI Recipe Generation Engine
// Powered by Culinary Intelligence API & RecipeNLG dataset
import { RECIPES_DATABASE, FOOD_DATABASE } from '../data/foodDatasets';

const API_BASE = 'http://localhost:5000/api';

/**
 * Matches existing database recipes against detected basket items
 */
export function matchRecipesToIngredients(basketItemIds, filterDiet = "All") {
  if (!basketItemIds || basketItemIds.length === 0) {
    return RECIPES_DATABASE.filter(r => filterDiet === "All" || r.diet_tags.includes(filterDiet));
  }

  const results = RECIPES_DATABASE.map(recipe => {
    const matchedCount = recipe.matchedIngredients.filter(id => basketItemIds.includes(id)).length;
    const matchPercentage = Math.round((matchedCount / recipe.matchedIngredients.length) * 100);

    const missingIngredients = recipe.requiredIngredients.filter(
      req => !basketItemIds.some(id => req.name.toLowerCase().includes(id.replace('-', ' ')))
    );

    return {
      ...recipe,
      matchedCount,
      matchPercentage,
      missingCount: missingIngredients.length
    };
  });

  const filtered = filterDiet === "All" 
    ? results 
    : results.filter(r => r.diet_tags.includes(filterDiet));

  return filtered.sort((a, b) => b.matchPercentage - a.matchPercentage || b.matchedCount - a.matchedCount);
}

/**
 * Generates an on-the-fly AI Chef Recipe tailored specifically to recognized ingredients,
 * dietary goals, and cuisine preferences.
 */
export async function generateAIRecipe(basketItems, dietGoal = "Balanced", promptExtra = "", cuisine = "Indian Fusion", targetCalories = 450) {
  if (!basketItems || basketItems.length === 0) {
    return null;
  }

  // 1. Try real backend culinary AI generator
  try {
    const res = await fetch(`${API_BASE}/generate-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: basketItems.map(b => b.name || b.id),
        diet_goal: dietGoal,
        cuisine: cuisine,
        custom_prompt: promptExtra,
        target_calories: targetCalories
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.recipe) {
        return data.recipe;
      }
    }
  } catch (err) {
    console.warn("Backend recipe generator not reached, using client-side AI generator:", err);
  }

  // 2. Client-side fallback generator
  const ingredientNames = basketItems.map(item => item.name);
  const primaryItem = basketItems[0];

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  basketItems.forEach(item => {
    if (item.nutrients) {
      totalCalories += item.nutrients.calories || 40;
      totalProtein += item.nutrients.protein_g || 1;
      totalCarbs += item.nutrients.carbs_g || 8;
      totalFat += item.nutrients.fat_g || 0.2;
    }
  });

  const portionScale = Math.max(0.8, Math.min(1.8, 450 / Math.max(150, totalCalories)));
  const estimatedCalories = Math.round(totalCalories * portionScale + 80);
  const estimatedProtein = Number((totalProtein * portionScale + 4).toFixed(1));
  const estimatedCarbs = Number((totalCarbs * portionScale + 6).toFixed(1));
  const estimatedFat = Number((totalFat * portionScale + 5).toFixed(1));

  const titles = [
    `Quick ${primaryItem.name} Idea`,
    `Fresh ${primaryItem.name} with ${ingredientNames.length > 1 ? ingredientNames[1] : 'Staples'}`,
    `Simple Homestyle ${primaryItem.name}`
  ];
  const chosenTitle = titles[Math.floor(Math.random() * titles.length)];

  return {
    id: `ai-gen-${Date.now()}`,
    title: chosenTitle,
    description: `A simple, fast everyday preparation featuring freshly detected ${ingredientNames.join(', ')}.`,
    category: "Quick Everyday Idea",
    prepTimeMins: 5,
    cookTimeMins: 5,
    servings: 1,
    difficulty: "Easy",
    diet_tags: [dietGoal, "Quick Idea", "Everyday"],
    caloriesPerServing: estimatedCalories,
    proteinPerServing: estimatedProtein,
    carbsPerServing: estimatedCarbs,
    fatPerServing: estimatedFat,
    matchedIngredients: basketItems.map(b => b.id),
    requiredIngredients: basketItems.map(item => ({
      name: item.name,
      quantity: `1 portion (~${item.serving_size_g || 100}g)`,
      prep: "washed and prepped",
      is_detected: true
    })).concat([
      { name: "Water or 1 tsp oil", quantity: "as needed", prep: "household staple", is_detected: false },
      { name: "Salt or pepper", quantity: "a pinch", prep: "to taste", is_detected: false }
    ]),
    instructions: [
      `Wash and prepare the fresh ${ingredientNames.join(' and ')}.`,
      `Chop or blend as desired depending on whether serving as a snack, drink, or light sauté.`,
      `Add a pinch of salt or pepper to taste and serve immediately.`
    ],
    image: primaryItem.image,
    isAIGenerated: false,
    userPrompt: promptExtra
  };
}
