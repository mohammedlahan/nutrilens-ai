"""
Live check script that calls the real LLM (Gemini 3.5 Flash Lite)
for apple, banana+milk, tomato, milk, spinach, paneer
and prints the results clearly.
"""
import os
import sys
import logging
import requests
from dotenv import load_dotenv

# Ensure root is in path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from simple_recipes import generate_simple_recipes, load_categories

# Setup logging to see SimpleRecipes logs
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# Load environment
load_dotenv(os.path.join(ROOT_DIR, "backend", ".env"))
load_dotenv(os.path.join(ROOT_DIR, ".env"))
gemini_key = os.environ.get("GEMINI_API_KEY")

if not gemini_key:
    print("FATAL: GEMINI_API_KEY is not set.")
    sys.exit(1)


def real_llm_call(system_prompt, user_prompt):
    """Real LLM call to Google Gemini 3.5 Flash Lite with temperature 0.3, max tokens 800, JSON mode."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={gemini_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 800,
            "responseMimeType": "application/json"
        }
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def print_recipe(r, idx):
    name = r.get("name", "Untitled")
    rtype = r.get("type", "idea")
    minutes = r.get("time_minutes", 5)
    source = r.get("source", "llm")
    print(f"   [{idx}] {name}  ({rtype}, {minutes} min, source: {source})")
    print("       Ingredients:")
    for ing in r.get("ingredients", []):
        item = ing.get("item", "")
        qty = ing.get("quantity", "")
        print(f"         - {qty} {item}".strip())
    print("       Steps:")
    for s_idx, s in enumerate(r.get("steps", []), 1):
        print(f"         {s_idx}. {s}")
    print()


def main():
    cat_path = os.path.join(ROOT_DIR, "models", "effnet", "class_to_category.csv")
    categories = load_categories(cat_path) if os.path.exists(cat_path) else {}

    test_queries = [
        ("apple", ["apple"]),
        ("banana + milk", ["banana", "milk"]),
        ("tomato", ["tomato"]),
        ("milk", ["milk"]),
        ("spinach", ["spinach"]),
        ("paneer", ["paneer"]),
    ]

    print("=" * 70)
    print("LIVE LLM RECIPE GENERATION TEST (gemini-3.5-flash-lite)")
    print("=" * 70)

    for label, items in test_queries:
        print(f"\n>>> Requesting ideas for: {label} (items={items})")
        recipes = generate_simple_recipes(
            items=items,
            llm_call=real_llm_call,
            n=3,
            categories=categories
        )
        print(f"--- Results for {label} ({len(recipes)} ideas returned) ---")
        for i, r in enumerate(recipes, 1):
            print_recipe(r, i)

    print("=" * 70)
    print("ALL LIVE RECIPES GENERATED SUCCESSFULLY")
    print("=" * 70)


if __name__ == "__main__":
    main()
