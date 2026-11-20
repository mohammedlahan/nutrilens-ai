"""
Unit tests for simple_recipes.py
Covers:
  1. apple
  2. banana + milk (multi-ingredient)
  3. tomato
  4. milk alone
  5. soy milk (multi-word display name)
  6. class with no category (fallback to _default)
  7. LLM returning fancy output (rejected by validator -> template fallback)
  8. LLM returning invalid JSON (retried -> template fallback)
"""
import unittest
import json
import os
import sys

# Ensure root is in path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from simple_recipes import (
    generate_simple_recipes,
    validate_recipe,
    load_categories,
    _category,
    PANTRY,
    FANCY_WORDS
)


class TestSimpleRecipes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        csv_path = os.path.join(ROOT_DIR, "models", "effnet", "class_to_category.csv")
        if os.path.exists(csv_path):
            cls.categories = load_categories(csv_path)
        else:
            cls.categories = {"apple": "Fruits", "banana": "Fruits", "tomato": "Vegetables", "milk": "Dairy products", "soy milk": "Milk alternatives"}

    def test_1_apple(self):
        """Case 1: apple with a valid LLM response."""
        llm_reply = json.dumps({"recipes": [
            {
                "name": "Apple juice",
                "type": "drink",
                "time_minutes": 5,
                "uses": ["apple"],
                "ingredients": [{"item": "apple", "quantity": "2"}, {"item": "water", "quantity": "1/2 cup"}, {"item": "sugar", "quantity": "1 tsp"}],
                "steps": ["Wash and core the apples.", "Blend with cold water until smooth.", "Serve chilled."]
            },
            {
                "name": "Apple with milk",
                "type": "drink",
                "time_minutes": 5,
                "uses": ["apple"],
                "ingredients": [{"item": "apple", "quantity": "1"}, {"item": "milk", "quantity": "1 cup"}, {"item": "honey", "quantity": "1 tsp"}],
                "steps": ["Chop the apple.", "Blend with milk.", "Drizzle honey and serve."]
            },
            {
                "name": "Apple with curd",
                "type": "snack",
                "time_minutes": 3,
                "uses": ["apple"],
                "ingredients": [{"item": "apple", "quantity": "1"}, {"item": "curd", "quantity": "1/2 cup"}],
                "steps": ["Chop apple into cubes.", "Mix into fresh curd.", "Serve."]
            }
        ]})
        recipes = generate_simple_recipes(["apple"], lambda s, u: llm_reply, n=3, categories=self.categories)
        self.assertEqual(len(recipes), 3)
        self.assertEqual(recipes[0]["name"], "Apple juice")
        self.assertEqual(recipes[0]["source"], "llm")
        self.assertEqual(recipes[1]["name"], "Apple with milk")
        self.assertEqual(recipes[2]["name"], "Apple with curd")

    def test_2_banana_and_milk(self):
        """Case 2: banana + milk combined ideas."""
        llm_reply = json.dumps({"recipes": [
            {
                "name": "Banana milkshake",
                "type": "drink",
                "time_minutes": 5,
                "uses": ["banana", "milk"],
                "ingredients": [{"item": "banana", "quantity": "1"}, {"item": "milk", "quantity": "1 cup"}, {"item": "honey", "quantity": "1 tsp"}],
                "steps": ["Peel banana and slice.", "Blend with milk and honey until smooth.", "Serve chilled."]
            },
            {
                "name": "Banana with oats and milk",
                "type": "breakfast",
                "time_minutes": 5,
                "uses": ["banana", "milk"],
                "ingredients": [{"item": "banana", "quantity": "1"}, {"item": "milk", "quantity": "1 cup"}, {"item": "oats", "quantity": "3 tbsp"}],
                "steps": ["Mix oats with warm milk.", "Top with sliced banana.", "Enjoy."]
            }
        ]})
        recipes = generate_simple_recipes(["banana", "milk"], lambda s, u: llm_reply, n=2, categories=self.categories)
        self.assertEqual(len(recipes), 2)
        self.assertEqual(recipes[0]["name"], "Banana milkshake")
        self.assertEqual(recipes[0]["source"], "llm")
        self.assertTrue(any("banana" in i["item"] for i in recipes[0]["ingredients"]))
        self.assertTrue(any("milk" in i["item"] for i in recipes[0]["ingredients"]))

    def test_3_tomato(self):
        """Case 3: tomato simple snack or salad."""
        llm_reply = json.dumps({"recipes": [
            {
                "name": "Tomato salad",
                "type": "snack",
                "time_minutes": 4,
                "uses": ["tomato"],
                "ingredients": [{"item": "tomato", "quantity": "2"}, {"item": "lemon", "quantity": "1 tsp"}, {"item": "salt", "quantity": "a pinch"}],
                "steps": ["Wash and chop tomatoes.", "Squeeze lemon juice and sprinkle salt.", "Toss and serve."]
            }
        ]})
        recipes = generate_simple_recipes(["tomato"], lambda s, u: llm_reply, n=1, categories=self.categories)
        self.assertEqual(len(recipes), 1)
        self.assertEqual(recipes[0]["name"], "Tomato salad")
        self.assertEqual(recipes[0]["source"], "llm")

    def test_4_milk_alone(self):
        """Case 4: milk alone (single item dairy)."""
        llm_reply = json.dumps({"recipes": [
            {
                "name": "Warm milk with honey",
                "type": "drink",
                "time_minutes": 4,
                "uses": ["milk"],
                "ingredients": [{"item": "milk", "quantity": "1 cup"}, {"item": "honey", "quantity": "1 tsp"}],
                "steps": ["Warm milk gently in a pan.", "Stir in honey and serve warm."]
            }
        ]})
        recipes = generate_simple_recipes(["milk"], lambda s, u: llm_reply, n=1, categories=self.categories)
        self.assertEqual(len(recipes), 1)
        self.assertEqual(recipes[0]["name"], "Warm milk with honey")

    def test_5_soy_milk(self):
        """Case 5: soy milk (multi-word display name with spaces)."""
        llm_reply = json.dumps({"recipes": [
            {
                "name": "Warm soy milk with honey",
                "type": "drink",
                "time_minutes": 4,
                "uses": ["soy milk"],
                "ingredients": [{"item": "soy milk", "quantity": "1 cup"}, {"item": "honey", "quantity": "1 tsp"}],
                "steps": ["Warm the soy milk gently in a pan.", "Stir in honey and enjoy."]
            }
        ]})
        recipes = generate_simple_recipes(["soy milk"], lambda s, u: llm_reply, n=1, categories=self.categories)
        self.assertEqual(len(recipes), 1)
        self.assertEqual(recipes[0]["name"], "Warm soy milk with honey")
        self.assertEqual(recipes[0]["source"], "llm")
        # Ensure it didn't crash or get rejected as missing detected food
        self.assertEqual(validate_recipe(recipes[0], ["soy milk"]), [])

    def test_6_class_with_no_category(self):
        """Case 6: A class not in CSV or categories dictionary falls back to _default."""
        cat = _category("exotic_dragonfruit", {})
        self.assertEqual(cat, "_default")

        # When LLM fails, template fallback should use _default template
        recipes = generate_simple_recipes(["dragonfruit"], lambda s, u: "invalid json", n=1, categories={})
        self.assertEqual(len(recipes), 1)
        self.assertEqual(recipes[0]["name"], "Simple dragonfruit")
        self.assertEqual(recipes[0]["source"], "template")

    def test_7_llm_returns_fancy_output(self):
        """Case 7: LLM returns fancy restaurant dishes (mustard glaze, reduction, saffron, 45 min).
        Validator must reject them, retry with feedback, and fall back to safe templates."""
        fancy_reply = json.dumps({"recipes": [
            {
                "name": "Mustard-Glazed Apple with Spiced Reduction",
                "type": "meal",
                "time_minutes": 45,
                "uses": ["apple"],
                "ingredients": [
                    {"item": "apple", "quantity": "2"},
                    {"item": "whole grain mustard", "quantity": "2 tbsp"},
                    {"item": "saffron", "quantity": "1 pinch"},
                    {"item": "white wine", "quantity": "1/2 cup"},
                    {"item": "shallots", "quantity": "2"}
                ],
                "steps": [
                    "Prepare an artisan balsamic reduction in a hot copper pan.",
                    "Glaze the apple slices with whole grain mustard and spices.",
                    "Garnish with microgreens and saffron threads."
                ]
            }
        ]})
        seen_prompts = []
        def mock_llm(system, user):
            seen_prompts.append(user)
            return fancy_reply

        recipes = generate_simple_recipes(["apple"], mock_llm, n=3, categories=self.categories, max_tries=2)
        # Should have retried with feedback about rejection
        self.assertEqual(len(seen_prompts), 2)
        self.assertIn("rejected", seen_prompts[1])
        # All 3 returned recipes must be safe templates
        self.assertEqual(len(recipes), 3)
        self.assertTrue(all(r["source"] == "template" for r in recipes))
        self.assertEqual([r["name"] for r in recipes], ["Apple juice", "Apple with milk", "Apple with curd"])

    def test_8_llm_returns_invalid_json(self):
        """Case 8: LLM returns non-JSON or corrupted output.
        System must retry with feedback and fall back safely to templates without crashing."""
        seen_prompts = []
        def broken_llm(system, user):
            seen_prompts.append(user)
            return "Sure! Here is a great recipe for tomatoes: Just slice them up with some salt and pepper."

        recipes = generate_simple_recipes(["tomato"], broken_llm, n=2, categories=self.categories, max_tries=2)
        self.assertEqual(len(seen_prompts), 2)
        self.assertIn("not valid JSON", seen_prompts[1])
        self.assertEqual(len(recipes), 2)
        self.assertTrue(all(r["source"] == "template" for r in recipes))
        self.assertEqual(recipes[0]["name"], "Tomato salad")


if __name__ == "__main__":
    unittest.main()
