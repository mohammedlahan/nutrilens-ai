"""
Food Recognition CNN & AI Recipe Generator Backend
Powered by MobileNetV2 Transfer Learning Model (36 Food Classes)
"""

import os
import io
import time
import json
import base64
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FoodCNN")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Paths and Model Versioning
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_VERSION = os.environ.get("MODEL_VERSION", "effnet").lower().strip()

# Global model, classes, and category holder
model = None
class_names = []
model_card = {}
CATEGORY_MAP = {}

if MODEL_VERSION == "mobilenet":
    logger.info("Operating in backward-compatibility mode: MODEL_VERSION=mobilenet")
    MODEL_PATH = os.path.join(BASE_DIR, "models", "old_mobilenet", "food_cnn_mobilenetv2.keras")
    if not os.path.exists(MODEL_PATH):
        MODEL_PATH = os.path.join(BASE_DIR, "models", "food_cnn_mobilenetv2.keras")
    CLASS_NAMES_PATH = os.path.join(BASE_DIR, "models", "old_mobilenet", "class_names.json")
    if not os.path.exists(CLASS_NAMES_PATH):
        CLASS_NAMES_PATH = os.path.join(BASE_DIR, "models", "class_names.json")
    CATEGORY_CSV_PATH = os.path.join(BASE_DIR, "models", "old_mobilenet", "class_to_category.csv")
    if not os.path.exists(CATEGORY_CSV_PATH):
        CATEGORY_CSV_PATH = os.path.join(BASE_DIR, "models", "class_to_category.csv")
    IMG_SIZE = (160, 160)
    CONFIDENCE_THRESHOLD = 0.50
    USE_TTA = False
    MODEL_NAME = "MobileNetV2 Transfer Learning CNN"
else:
    # Default is EfficientNetV2-B0
    logger.info("Operating in default mode: MODEL_VERSION=effnet (EfficientNetV2-B0)")
    MODEL_PATH = os.path.join(BASE_DIR, "models", "effnet", "food_cnn_effnet.keras")
    CLASS_NAMES_PATH = os.path.join(BASE_DIR, "models", "effnet", "class_names.json")
    MODEL_CARD_PATH = os.path.join(BASE_DIR, "models", "effnet", "model_card.json")
    CATEGORY_CSV_PATH = os.path.join(BASE_DIR, "models", "effnet", "class_to_category.csv")
    if not os.path.exists(CATEGORY_CSV_PATH):
        CATEGORY_CSV_PATH = os.path.join(BASE_DIR, "models", "class_to_category.csv")

    if os.path.exists(MODEL_CARD_PATH):
        try:
            with open(MODEL_CARD_PATH, "r", encoding="utf-8") as f:
                model_card = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load model_card.json: {e}")

    # Use img_size from model_card (224 x 224)
    img_size_card = model_card.get("img_size", [224, 224])
    IMG_SIZE = (int(img_size_card[0]), int(img_size_card[1]))
    CONFIDENCE_THRESHOLD = float(model_card.get("confidence_threshold", 0.50))
    USE_TTA = bool(model_card.get("tta", True))
    MODEL_NAME = model_card.get("model", "EfficientNetV2B0") + " Food Vision CNN"

# Load Class Names
if os.path.exists(CLASS_NAMES_PATH):
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        class_names = json.load(f)
    logger.info(f"Loaded {len(class_names)} classes from {CLASS_NAMES_PATH}")
else:
    logger.error(f"FATAL: class_names.json missing at {CLASS_NAMES_PATH}")
    class_names = []

# Load Category Mapping from class_to_category.csv
if os.path.exists(CATEGORY_CSV_PATH):
    import csv
    try:
        with open(CATEGORY_CSV_PATH, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                item = row.get("item", "").strip().lower()
                cat = row.get("category", "").strip()
                if item and cat:
                    CATEGORY_MAP[item] = cat
                    CATEGORY_MAP[item.replace("_", " ")] = cat
                    CATEGORY_MAP[item.replace(" ", "_")] = cat
        logger.info(f"Loaded {len(CATEGORY_MAP)} category mappings from {CATEGORY_CSV_PATH}")
    except Exception as e:
        logger.warning(f"Could not parse class_to_category.csv: {e}")

# Extended category heuristics for standard produces & new classes
EXTENDED_CATEGORIES = {
    "grapes": "Fruits",
    "grape": "Fruits",
    "raddish": "Vegetables",
    "radish": "Vegetables",
    "sweetpotato": "Vegetables",
    "sweet potato": "Vegetables",
    "sweetcorn": "Vegetables",
    "bell pepper": "Vegetables",
    "capsicum": "Vegetables",
    "chilli pepper": "Vegetables",
    "chili pepper": "Vegetables",
    "jalepeno": "Vegetables",
    "jalapeno": "Vegetables",
    "garlic": "Vegetables",
    "ginger": "Spices and seasonings",
    "paprika": "Spices and seasonings",
    "pear": "Fruits",
    "kiwi": "Fruits",
    "turnip": "Vegetables",
    "soy beans": "Pulses, beans and lentils",
    "soybean": "Pulses, beans and lentils",
    "milk": "Dairy products",
    "curd": "Dairy products",
    "soy_milk": "Milk alternatives",
    "soy milk": "Milk alternatives",
    "buttermilk": "Dairy products",
    "milk_powder": "Dairy products",
    "milk powder": "Dairy products",
    "condensed_milk": "Dairy products",
    "condensed milk": "Dairy products",
    "ice_cream": "Dairy products",
    "ice cream": "Dairy products",
    "cooking_oil": "Oils and fats",
    "cooking oil": "Oils and fats"
}
for k, v in EXTENDED_CATEGORIES.items():
    if k not in CATEGORY_MAP:
        CATEGORY_MAP[k] = v

# Integration with simple_recipes.py
import sys
import requests
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
from simple_recipes import generate_simple_recipes, load_categories
try:
    from backend.nvidia_service import query_nemotron, NVIDIA_MODEL, get_nvidia_api_key
except ImportError:
    from nvidia_service import query_nemotron, NVIDIA_MODEL, get_nvidia_api_key

SIMPLE_CATEGORIES = load_categories(CATEGORY_CSV_PATH) if os.path.exists(CATEGORY_CSV_PATH) else {}

def gemini_llm_call(system_prompt, user_prompt):
    """
    LLM wrapper calling Gemini 3.5 Flash Lite using the app's GEMINI_API_KEY.
    Strict JSON output, temperature 0.3, max tokens 800.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        env_file = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_file):
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("GEMINI_API_KEY="):
                        gemini_key = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not gemini_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

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

def format_display_name(label: str) -> str:
    """Format machine label (e.g. 'soy_milk', 'sweetpotato') into clean user display text."""
    if not label:
        return ""
    clean = label.replace("_", " ").strip()
    spelling_fixes = {
        "sweetpotato": "sweet potato",
        "raddish": "radish",
        "chilli pepper": "chili pepper",
        "jalepeno": "jalapeno",
        "soy beans": "soy beans",
        "soybeans": "soy beans",
        "cooking oil": "cooking oil",
        "soy milk": "soy milk"
    }
    return spelling_fixes.get(clean.lower(), clean)


# Verified Nutritional Database for all 36 classes (USDA FoodData Central & IFCT standards)
NUTRITION_DATABASE = {
    "apple": {
        "id": "apple",
        "name": "Fresh Apple",
        "category": "Fruit",
        "scientificName": "Malus domestica",
        "usda_fdc_id": "1750340",
        "serving_size_g": 100,
        "unit_description": "1 medium apple (~182g)",
        "unit_ratio": 1.82,
        "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 52, "protein_g": 0.26, "carbs_g": 13.81, "fat_g": 0.17, "fiber_g": 2.4, "sugar_g": 10.39, "sodium_mg": 1, "potassium_mg": 107, "vit_c_mg": 4.6, "calcium_mg": 6, "iron_mg": 0.12},
        "diet_tags": ["High Fiber", "Low Calorie", "Antioxidant Rich", "Vegan", "Heart Healthy"],
        "storage_tip": "Store in crisper drawer at 32-35°F to preserve crispness."
    },
    "banana": {
        "id": "banana",
        "name": "Ripe Banana",
        "category": "Fruit",
        "scientificName": "Musa acuminata",
        "usda_fdc_id": "173944",
        "serving_size_g": 100,
        "unit_description": "1 medium banana (~118g)",
        "unit_ratio": 1.18,
        "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 89, "protein_g": 1.09, "carbs_g": 22.84, "fat_g": 0.33, "fiber_g": 2.6, "sugar_g": 12.23, "sodium_mg": 1, "potassium_mg": 358, "vit_c_mg": 8.7, "calcium_mg": 5, "iron_mg": 0.26},
        "diet_tags": ["Potassium Rich", "Prebiotic", "Natural Energy", "Vegan"],
        "storage_tip": "Keep at room temperature away from direct sunlight; wrap stems to slow ripening."
    },
    "beetroot": {
        "id": "beetroot",
        "name": "Garden Beetroot",
        "category": "Vegetable",
        "scientificName": "Beta vulgaris",
        "usda_fdc_id": "169145",
        "serving_size_g": 100,
        "unit_description": "1 medium beet (~82g)",
        "unit_ratio": 0.82,
        "image": "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 43, "protein_g": 1.61, "carbs_g": 9.56, "fat_g": 0.17, "fiber_g": 2.8, "sugar_g": 6.76, "sodium_mg": 78, "potassium_mg": 325, "vit_c_mg": 4.9, "calcium_mg": 16, "iron_mg": 0.8},
        "diet_tags": ["Nitrate Rich", "Blood Pressure Support", "Low Fat", "Vegan"],
        "storage_tip": "Trim greens leaving 1 inch of stem; store in perforated plastic bag in crisper."
    },
    "bell pepper": {
        "id": "bell pepper",
        "name": "Sweet Bell Pepper",
        "category": "Vegetable",
        "scientificName": "Capsicum annuum",
        "usda_fdc_id": "170108",
        "serving_size_g": 100,
        "unit_description": "1 medium pepper (~119g)",
        "unit_ratio": 1.19,
        "image": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 31, "protein_g": 0.99, "carbs_g": 6.03, "fat_g": 0.3, "fiber_g": 2.1, "sugar_g": 4.2, "sodium_mg": 4, "potassium_mg": 211, "vit_c_mg": 127.7, "calcium_mg": 7, "iron_mg": 0.43},
        "diet_tags": ["Ultra Vit-C Rich", "Low Calorie", "Keto-Friendly", "Anti-Inflammatory"],
        "storage_tip": "Keep unwashed in vegetable drawer; consume within 1-2 weeks."
    },
    "cabbage": {
        "id": "cabbage",
        "name": "Green Cabbage",
        "category": "Vegetable",
        "scientificName": "Brassica oleracea var. capitata",
        "usda_fdc_id": "169975",
        "serving_size_g": 100,
        "unit_description": "1 cup shredded (~89g)",
        "unit_ratio": 0.89,
        "image": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 25, "protein_g": 1.28, "carbs_g": 5.8, "fat_g": 0.1, "fiber_g": 2.5, "sugar_g": 3.2, "sodium_mg": 18, "potassium_mg": 170, "vit_c_mg": 36.6, "calcium_mg": 40, "iron_mg": 0.47},
        "diet_tags": ["High Vit-K", "Gut Health", "Low Calorie", "Cruciferous", "Vegan"],
        "storage_tip": "Store whole head tightly wrapped in plastic film in crisper for up to 3 weeks."
    },
    "capsicum": {
        "id": "capsicum",
        "name": "Green Capsicum",
        "category": "Vegetable",
        "scientificName": "Capsicum annuum var. grossum",
        "usda_fdc_id": "170108",
        "serving_size_g": 100,
        "unit_description": "1 medium capsicum (~120g)",
        "unit_ratio": 1.2,
        "image": "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 20, "protein_g": 0.86, "carbs_g": 4.64, "fat_g": 0.17, "fiber_g": 1.7, "sugar_g": 2.4, "sodium_mg": 3, "potassium_mg": 175, "vit_c_mg": 80.4, "calcium_mg": 10, "iron_mg": 0.34},
        "diet_tags": ["Metabolism Booster", "Low Calorie", "Crisp Texture", "Keto-Friendly"],
        "storage_tip": "Store dry in crisper compartment; pat dry before refrigerating."
    },
    "carrot": {
        "id": "carrot",
        "name": "Crunchy Carrot",
        "category": "Vegetable",
        "scientificName": "Daucus carota",
        "usda_fdc_id": "170393",
        "serving_size_g": 100,
        "unit_description": "1 medium carrot (~61g)",
        "unit_ratio": 0.61,
        "image": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 41, "protein_g": 0.93, "carbs_g": 9.58, "fat_g": 0.24, "fiber_g": 2.8, "sugar_g": 4.74, "sodium_mg": 69, "potassium_mg": 320, "vit_c_mg": 5.9, "calcium_mg": 33, "iron_mg": 0.3},
        "diet_tags": ["Beta-Carotene", "Eye Health", "Antioxidant", "Low Fat"],
        "storage_tip": "Remove leafy tops immediately; immerse in cold water container in fridge for maximum crunch."
    },
    "cauliflower": {
        "id": "cauliflower",
        "name": "White Cauliflower",
        "category": "Vegetable",
        "scientificName": "Brassica oleracea var. botrytis",
        "usda_fdc_id": "169986",
        "serving_size_g": 100,
        "unit_description": "1 cup florets (~107g)",
        "unit_ratio": 1.07,
        "image": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 25, "protein_g": 1.92, "carbs_g": 4.97, "fat_g": 0.28, "fiber_g": 2.0, "sugar_g": 1.91, "sodium_mg": 30, "potassium_mg": 299, "vit_c_mg": 48.2, "calcium_mg": 22, "iron_mg": 0.42},
        "diet_tags": ["Keto Staple", "Low Carb Rice Substitute", "Choline Source", "Vegan"],
        "storage_tip": "Keep head stem down in perforated bag to prevent moisture from condensing on florets."
    },
    "chili pepper": {
        "id": "chili pepper",
        "name": "Spicy Chili Pepper",
        "category": "Vegetable / Spice",
        "scientificName": "Capsicum frutescens",
        "usda_fdc_id": "168574",
        "serving_size_g": 100,
        "unit_description": "1 chili (~45g)",
        "unit_ratio": 0.45,
        "image": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 40, "protein_g": 1.87, "carbs_g": 8.81, "fat_g": 0.44, "fiber_g": 1.5, "sugar_g": 5.3, "sodium_mg": 9, "potassium_mg": 322, "vit_c_mg": 143.7, "calcium_mg": 14, "iron_mg": 1.03},
        "diet_tags": ["Capsaicin", "Thermogenic Metabolism", "High Vit-C", "Antioxidant"],
        "storage_tip": "Keep unwashed in breathable bag in fridge for 2-3 weeks, or freeze whole."
    },
    "corn": {
        "id": "corn",
        "name": "Sweet Corn Kernel",
        "category": "Vegetable / Grain",
        "scientificName": "Zea mays",
        "usda_fdc_id": "169998",
        "serving_size_g": 100,
        "unit_description": "1 ear (~102g kernels)",
        "unit_ratio": 1.02,
        "image": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 86, "protein_g": 3.27, "carbs_g": 18.7, "fat_g": 1.35, "fiber_g": 2.0, "sugar_g": 6.26, "sodium_mg": 15, "potassium_mg": 270, "vit_c_mg": 6.8, "calcium_mg": 2, "iron_mg": 0.52},
        "diet_tags": ["Lutein Rich", "Energy Dense", "Naturally Gluten-Free", "Vegetarian"],
        "storage_tip": "Keep in husks refrigerated; cook within 2 days as sugars quickly convert to starch."
    },
    "cucumber": {
        "id": "cucumber",
        "name": "Crisp Garden Cucumber",
        "category": "Vegetable",
        "scientificName": "Cucumis sativus",
        "usda_fdc_id": "169225",
        "serving_size_g": 100,
        "unit_description": "1/2 cucumber (~150g)",
        "unit_ratio": 1.5,
        "image": "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 15, "protein_g": 0.65, "carbs_g": 3.63, "fat_g": 0.11, "fiber_g": 0.5, "sugar_g": 1.67, "sodium_mg": 2, "potassium_mg": 147, "vit_c_mg": 2.8, "calcium_mg": 16, "iron_mg": 0.28},
        "diet_tags": ["Hydrating 96% Water", "Ultra Low Calorie", "Detox", "Keto-Friendly"],
        "storage_tip": "Store wrapped in paper towel in upper warmer shelves of fridge; avoids chill injury."
    },
    "eggplant": {
        "id": "eggplant",
        "name": "Purple Eggplant / Brinjal",
        "category": "Vegetable",
        "scientificName": "Solanum melongena",
        "usda_fdc_id": "169228",
        "serving_size_g": 100,
        "unit_description": "1 cup cubed (~82g)",
        "unit_ratio": 0.82,
        "image": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 25, "protein_g": 0.98, "carbs_g": 5.88, "fat_g": 0.18, "fiber_g": 3.0, "sugar_g": 3.53, "sodium_mg": 2, "potassium_mg": 229, "vit_c_mg": 2.2, "calcium_mg": 9, "iron_mg": 0.23},
        "diet_tags": ["Nasunin Antioxidant", "High Fiber", "Spongy Texture", "Heart Healthy"],
        "storage_tip": "Best stored cool (50°F) or crisper drawer for up to 5 days; sensitive to ethylene gas."
    },
    "garlic": {
        "id": "garlic",
        "name": "Fresh Garlic Cloves",
        "category": "Vegetable / Aromatic",
        "scientificName": "Allium sativum",
        "usda_fdc_id": "169230",
        "serving_size_g": 100,
        "unit_description": "3 cloves (~9g)",
        "unit_ratio": 0.09,
        "image": "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 149, "protein_g": 6.36, "carbs_g": 33.06, "fat_g": 0.5, "fiber_g": 2.1, "sugar_g": 1.0, "sodium_mg": 17, "potassium_mg": 401, "vit_c_mg": 31.2, "calcium_mg": 181, "iron_mg": 1.7},
        "diet_tags": ["Allicin Antimicrobial", "Immune Defense", "Aromatic Foundation", "Cardioprotective"],
        "storage_tip": "Store whole bulbs in cool, dry, dark pantry with good air circulation; do NOT refrigerate."
    },
    "ginger": {
        "id": "ginger",
        "name": "Fresh Ginger Root",
        "category": "Vegetable / Spice",
        "scientificName": "Zingiber officinale",
        "usda_fdc_id": "169231",
        "serving_size_g": 100,
        "unit_description": "1 tbsp grated (~6g)",
        "unit_ratio": 0.06,
        "image": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 80, "protein_g": 1.82, "carbs_g": 17.77, "fat_g": 0.75, "fiber_g": 2.0, "sugar_g": 1.7, "sodium_mg": 13, "potassium_mg": 415, "vit_c_mg": 5.0, "calcium_mg": 16, "iron_mg": 0.6},
        "diet_tags": ["Gingerol Anti-Nausea", "Digestive Aid", "Anti-Inflammatory", "Metabolic"],
        "storage_tip": "Keep unpeeled in airtight resealable bag in crisper or freeze whole root for grating."
    },
    "grapes": {
        "id": "grapes",
        "name": "Sweet Table Grapes",
        "category": "Fruit",
        "scientificName": "Vitis vinifera",
        "usda_fdc_id": "174682",
        "serving_size_g": 100,
        "unit_description": "1 cup grapes (~151g)",
        "unit_ratio": 1.51,
        "image": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 69, "protein_g": 0.72, "carbs_g": 18.1, "fat_g": 0.16, "fiber_g": 0.9, "sugar_g": 15.48, "sodium_mg": 2, "potassium_mg": 191, "vit_c_mg": 3.2, "calcium_mg": 10, "iron_mg": 0.36},
        "diet_tags": ["Resveratrol", "Cellular Longevity", "Heart Healthy", "Natural Sugar"],
        "storage_tip": "Keep unwashed in ventilated original bag in coldest part of refrigerator."
    },
    "jalapeno": {
        "id": "jalapeno",
        "name": "Jalapeño Pepper",
        "category": "Vegetable / Spice",
        "scientificName": "Capsicum annuum 'Jalapeño'",
        "usda_fdc_id": "168576",
        "serving_size_g": 100,
        "unit_description": "1 pepper (~14g)",
        "unit_ratio": 0.14,
        "image": "https://images.unsplash.com/photo-1592417817098-8f3d6910a566?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 29, "protein_g": 0.91, "carbs_g": 6.5, "fat_g": 0.37, "fiber_g": 2.8, "sugar_g": 4.12, "sodium_mg": 3, "potassium_mg": 248, "vit_c_mg": 118.6, "calcium_mg": 12, "iron_mg": 0.25},
        "diet_tags": ["Scoville 2500-8000", "Thermogenic", "Immunity", "Keto"],
        "storage_tip": "Store whole in a paper bag in the vegetable drawer for up to 3 weeks."
    },
    "kiwi": {
        "id": "kiwi",
        "name": "Zesty Green Kiwi",
        "category": "Fruit",
        "scientificName": "Actinidia deliciosa",
        "usda_fdc_id": "168153",
        "serving_size_g": 100,
        "unit_description": "1 kiwi (~69g)",
        "unit_ratio": 0.69,
        "image": "https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 61, "protein_g": 1.14, "carbs_g": 14.66, "fat_g": 0.52, "fiber_g": 3.0, "sugar_g": 8.99, "sodium_mg": 3, "potassium_mg": 312, "vit_c_mg": 92.7, "calcium_mg": 34, "iron_mg": 0.31},
        "diet_tags": ["Actinidin Enzyme", "High Vit-C", "Sleep Aid", "Digestive Health"],
        "storage_tip": "Ripen at room temperature; once soft, refrigerate for up to 2 weeks."
    },
    "lemon": {
        "id": "lemon",
        "name": "Citrus Lemon",
        "category": "Fruit / Citrus",
        "scientificName": "Citrus limon",
        "usda_fdc_id": "167746",
        "serving_size_g": 100,
        "unit_description": "1 fruit (~58g)",
        "unit_ratio": 0.58,
        "image": "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 29, "protein_g": 1.1, "carbs_g": 9.32, "fat_g": 0.3, "fiber_g": 2.8, "sugar_g": 2.5, "sodium_mg": 2, "potassium_mg": 138, "vit_c_mg": 53.0, "calcium_mg": 26, "iron_mg": 0.6},
        "diet_tags": ["Citric Acid", "Alkalizing", "Immunity", "Culinary Acid", "Low Sugar"],
        "storage_tip": "Submerge whole lemons in a sealed jar of water in the fridge to keep fresh for 1 month."
    },
    "lettuce": {
        "id": "lettuce",
        "name": "Crisp Romaine / Leaf Lettuce",
        "category": "Vegetable / Greens",
        "scientificName": "Lactuca sativa",
        "usda_fdc_id": "169248",
        "serving_size_g": 100,
        "unit_description": "1 cup shredded (~47g)",
        "unit_ratio": 0.47,
        "image": "https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 15, "protein_g": 1.36, "carbs_g": 2.87, "fat_g": 0.15, "fiber_g": 1.3, "sugar_g": 0.78, "sodium_mg": 28, "potassium_mg": 194, "vit_c_mg": 9.2, "calcium_mg": 36, "iron_mg": 0.86},
        "diet_tags": ["Folate Rich", "Ultra Low Calorie", "Salad Base", "Hydrating"],
        "storage_tip": "Wash, spin dry completely, wrap in cotton towel in produce bin."
    },
    "mango": {
        "id": "mango",
        "name": "Alphonso / Tropical Mango",
        "category": "Fruit",
        "scientificName": "Mangifera indica",
        "usda_fdc_id": "169910",
        "serving_size_g": 100,
        "unit_description": "1 cup sliced (~165g)",
        "unit_ratio": 1.65,
        "image": "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 60, "protein_g": 0.82, "carbs_g": 14.98, "fat_g": 0.38, "fiber_g": 1.6, "sugar_g": 13.66, "sodium_mg": 1, "potassium_mg": 168, "vit_c_mg": 36.4, "calcium_mg": 11, "iron_mg": 0.16},
        "diet_tags": ["King of Fruits", "Mangiferin Antioxidant", "Vitamin A", "Digestive Enzymes"],
        "storage_tip": "Leave on counter until fragrant and giving slightly to gentle pressure, then chill."
    },
    "onion": {
        "id": "onion",
        "name": "Yellow / Red Onion",
        "category": "Vegetable / Aromatic",
        "scientificName": "Allium cepa",
        "usda_fdc_id": "170000",
        "serving_size_g": 100,
        "unit_description": "1 medium onion (~110g)",
        "unit_ratio": 1.1,
        "image": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 40, "protein_g": 1.1, "carbs_g": 9.34, "fat_g": 0.1, "fiber_g": 1.7, "sugar_g": 4.24, "sodium_mg": 4, "potassium_mg": 146, "vit_c_mg": 7.4, "calcium_mg": 23, "iron_mg": 0.21},
        "diet_tags": ["Quercetin Bioflavonoid", "Prebiotic Inulin", "Essential Base", "Heart Support"],
        "storage_tip": "Store in a cool, well-ventilated, dry basket away from potatoes (which cause sprouting)."
    },
    "orange": {
        "id": "orange",
        "name": "Navel Orange",
        "category": "Fruit / Citrus",
        "scientificName": "Citrus sinensis",
        "usda_fdc_id": "169097",
        "serving_size_g": 100,
        "unit_description": "1 medium orange (~131g)",
        "unit_ratio": 1.31,
        "image": "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 47, "protein_g": 0.94, "carbs_g": 11.75, "fat_g": 0.12, "fiber_g": 2.4, "sugar_g": 9.35, "sodium_mg": 0, "potassium_mg": 181, "vit_c_mg": 53.2, "calcium_mg": 40, "iron_mg": 0.1},
        "diet_tags": ["Immunity Shield", "Hesperidin", "Collagen Synthesis", "High Vit-C"],
        "storage_tip": "Keep at room temperature for 1 week or refrigerate for up to 1 month."
    },
    "paprika": {
        "id": "paprika",
        "name": "Sweet Hungarian Paprika Pepper",
        "category": "Vegetable / Spice",
        "scientificName": "Capsicum annuum",
        "usda_fdc_id": "170932",
        "serving_size_g": 100,
        "unit_description": "1 tbsp ground (~7g)",
        "unit_ratio": 0.07,
        "image": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 282, "protein_g": 14.14, "carbs_g": 53.99, "fat_g": 12.89, "fiber_g": 34.9, "sugar_g": 10.34, "sodium_mg": 68, "potassium_mg": 2280, "vit_c_mg": 71.1, "calcium_mg": 229, "iron_mg": 21.14},
        "diet_tags": ["Iron Rich", "Carotenoid Blend", "Warm Spice", "Smoky Profile"],
        "storage_tip": "Keep ground spice in airtight tin away from heat and light to preserve vibrant red hue."
    },
    "pear": {
        "id": "pear",
        "name": "Bosc / Bartlett Pear",
        "category": "Fruit",
        "scientificName": "Pyrus communis",
        "usda_fdc_id": "169118",
        "serving_size_g": 100,
        "unit_description": "1 medium pear (~178g)",
        "unit_ratio": 1.78,
        "image": "https://images.unsplash.com/photo-1631160299919-6a175aa6d189?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 57, "protein_g": 0.36, "carbs_g": 15.23, "fat_g": 0.14, "fiber_g": 3.1, "sugar_g": 9.75, "sodium_mg": 1, "potassium_mg": 116, "vit_c_mg": 4.3, "calcium_mg": 9, "iron_mg": 0.18},
        "diet_tags": ["Pectin Soluble Fiber", "Low Glycemic", "Hypoallergenic", "Gentle Digestion"],
        "storage_tip": "Check the neck: when stem gives to gentle thumb pressure, it is ripe and ready to chill."
    },
    "peas": {
        "id": "peas",
        "name": "Green Garden Peas",
        "category": "Vegetable / Legume",
        "scientificName": "Pisum sativum",
        "usda_fdc_id": "170419",
        "serving_size_g": 100,
        "unit_description": "1 cup peas (~145g)",
        "unit_ratio": 1.45,
        "image": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 81, "protein_g": 5.42, "carbs_g": 14.45, "fat_g": 0.4, "fiber_g": 5.7, "sugar_g": 5.67, "sodium_mg": 5, "potassium_mg": 244, "vit_c_mg": 40.0, "calcium_mg": 25, "iron_mg": 1.47},
        "diet_tags": ["Plant Protein", "High Fiber", "Lutein", "B-Vitamins", "Vegan Muscle"],
        "storage_tip": "Keep pods refrigerated in breathable mesh bag; best enjoyed within 3 days."
    },
    "pineapple": {
        "id": "pineapple",
        "name": "Golden Pineapple",
        "category": "Fruit",
        "scientificName": "Ananas comosus",
        "usda_fdc_id": "169124",
        "serving_size_g": 100,
        "unit_description": "1 cup chunks (~165g)",
        "unit_ratio": 1.65,
        "image": "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 50, "protein_g": 0.54, "carbs_g": 13.12, "fat_g": 0.12, "fiber_g": 1.4, "sugar_g": 9.85, "sodium_mg": 1, "potassium_mg": 109, "vit_c_mg": 47.8, "calcium_mg": 13, "iron_mg": 0.29},
        "diet_tags": ["Bromelain Enzyme", "Protein Tenderizer", "Anti-Inflammatory", "Manganese Rich"],
        "storage_tip": "Cut fruit keeps in airtight glass container in fridge for 5-7 days."
    },
    "pomegranate": {
        "id": "pomegranate",
        "name": "Ruby Pomegranate Arils",
        "category": "Fruit",
        "scientificName": "Punica granatum",
        "usda_fdc_id": "169134",
        "serving_size_g": 100,
        "unit_description": "1/2 cup arils (~87g)",
        "unit_ratio": 0.87,
        "image": "https://images.unsplash.com/photo-1541344999736-83eca872f242?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 83, "protein_g": 1.67, "carbs_g": 18.7, "fat_g": 1.17, "fiber_g": 4.0, "sugar_g": 13.67, "sodium_mg": 3, "potassium_mg": 236, "vit_c_mg": 10.2, "calcium_mg": 10, "iron_mg": 0.3},
        "diet_tags": ["Punicalagins", "Super Antioxidant", "Vascular Health", "Nitric Oxide Booster"],
        "storage_tip": "Arils store in sealed container for 5 days or freeze on baking sheet."
    },
    "potato": {
        "id": "potato",
        "name": "Russet / Yellow Potato",
        "category": "Vegetable / Tuber",
        "scientificName": "Solanum tuberosum",
        "usda_fdc_id": "170026",
        "serving_size_g": 100,
        "unit_description": "1 medium potato (~173g)",
        "unit_ratio": 1.73,
        "image": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 77, "protein_g": 2.05, "carbs_g": 17.49, "fat_g": 0.09, "fiber_g": 2.1, "sugar_g": 0.82, "sodium_mg": 6, "potassium_mg": 425, "vit_c_mg": 19.7, "calcium_mg": 12, "iron_mg": 0.81},
        "diet_tags": ["High Satiety Index", "Potassium Powerhouse", "Resistant Starch (cooled)", "Energy"],
        "storage_tip": "Store in a cool (45-50°F), dark, ventilated cupboard; prevent light exposure to stop solanine formation."
    },
    "radish": {
        "id": "radish",
        "name": "Crisp Red Radish / Daikon",
        "category": "Vegetable",
        "scientificName": "Raphanus sativus",
        "usda_fdc_id": "169276",
        "serving_size_g": 100,
        "unit_description": "1/2 cup sliced (~58g)",
        "unit_ratio": 0.58,
        "image": "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 16, "protein_g": 0.68, "carbs_g": 3.4, "fat_g": 0.1, "fiber_g": 1.6, "sugar_g": 1.86, "sodium_mg": 39, "potassium_mg": 233, "vit_c_mg": 14.8, "calcium_mg": 25, "iron_mg": 0.34},
        "diet_tags": ["Glucosinolates", "Liver Support", "Crisp Peppery Bite", "Ultra Low Calorie"],
        "storage_tip": "Slice off leaves, keep roots submerged in cold water in fridge to maintain snap."
    },
    "soybean": {
        "id": "soybean",
        "name": "Edamame / Green Soybean",
        "category": "Vegetable / Legume",
        "scientificName": "Glycine max",
        "usda_fdc_id": "174270",
        "serving_size_g": 100,
        "unit_description": "1/2 cup shelled (~78g)",
        "unit_ratio": 0.78,
        "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 122, "protein_g": 10.88, "carbs_g": 9.94, "fat_g": 5.2, "fiber_g": 5.2, "sugar_g": 2.18, "sodium_mg": 6, "potassium_mg": 436, "vit_c_mg": 6.1, "calcium_mg": 63, "iron_mg": 2.27},
        "diet_tags": ["Complete Protein", "Isoflavones", "High Fiber", "Vegan Powerhouse"],
        "storage_tip": "Keep pods in crisper for up to 4 days, or blanch and freeze for 6 months."
    },
    "spinach": {
        "id": "spinach",
        "name": "Baby Spinach Leaves",
        "category": "Vegetable / Greens",
        "scientificName": "Spinacia oleracea",
        "usda_fdc_id": "168462",
        "serving_size_g": 100,
        "unit_description": "1 cup raw (~30g)",
        "unit_ratio": 0.3,
        "image": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 23, "protein_g": 2.86, "carbs_g": 3.63, "fat_g": 0.39, "fiber_g": 2.2, "sugar_g": 0.42, "sodium_mg": 79, "potassium_mg": 558, "vit_c_mg": 28.1, "calcium_mg": 99, "iron_mg": 2.71},
        "diet_tags": ["Iron Rich", "Lutein & Zeaxanthin", "Folate Heavy", "Bone Strength"],
        "storage_tip": "Line container with dry paper towels to absorb all excess moisture."
    },
    "sweetcorn": {
        "id": "sweetcorn",
        "name": "Tender Sweetcorn",
        "category": "Vegetable / Grain",
        "scientificName": "Zea mays convar. saccharata",
        "usda_fdc_id": "169998",
        "serving_size_g": 100,
        "unit_description": "1 cup kernels (~145g)",
        "unit_ratio": 1.45,
        "image": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 86, "protein_g": 3.27, "carbs_g": 18.7, "fat_g": 1.35, "fiber_g": 2.0, "sugar_g": 6.26, "sodium_mg": 15, "potassium_mg": 270, "vit_c_mg": 6.8, "calcium_mg": 2, "iron_mg": 0.52},
        "diet_tags": ["Sweet & Juicy", "Natural Carbs", "Antioxidants", "Dietary Fiber"],
        "storage_tip": "Refrigerate in husks and consume quickly to retain natural sweetness."
    },
    "sweet potato": {
        "id": "sweet potato",
        "name": "Orange Sweet Potato",
        "category": "Vegetable / Tuber",
        "scientificName": "Ipomoea batatas",
        "usda_fdc_id": "168482",
        "serving_size_g": 100,
        "unit_description": "1 medium sweet potato (~114g)",
        "unit_ratio": 1.14,
        "image": "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 86, "protein_g": 1.57, "carbs_g": 20.12, "fat_g": 0.05, "fiber_g": 3.0, "sugar_g": 4.18, "sodium_mg": 55, "potassium_mg": 337, "vit_c_mg": 2.4, "calcium_mg": 30, "iron_mg": 0.61},
        "diet_tags": ["Super Beta-Carotene", "Low Glycemic Complex Carb", "Immunity", "Gut Friendly"],
        "storage_tip": "Keep in cool, dry, dark pantry (55-60°F); never refrigerate raw sweet potatoes."
    },
    "tomato": {
        "id": "tomato",
        "name": "Vine-Ripened Tomato",
        "category": "Fruit / Vegetable",
        "scientificName": "Solanum lycopersicum",
        "usda_fdc_id": "170457",
        "serving_size_g": 100,
        "unit_description": "1 medium tomato (~123g)",
        "unit_ratio": 1.23,
        "image": "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 18, "protein_g": 0.88, "carbs_g": 3.89, "fat_g": 0.2, "fiber_g": 1.2, "sugar_g": 2.63, "sodium_mg": 5, "potassium_mg": 237, "vit_c_mg": 13.7, "calcium_mg": 10, "iron_mg": 0.27},
        "diet_tags": ["Lycopene Antioxidant", "Prostate & Heart Health", "Umami Depth", "Low Calorie"],
        "storage_tip": "Store stem-side down at room temperature; chilling kills aroma and makes texture mealy."
    },
    "turnip": {
        "id": "turnip",
        "name": "Purple Top Turnip",
        "category": "Vegetable / Root",
        "scientificName": "Brassica rapa subsp. rapa",
        "usda_fdc_id": "170061",
        "serving_size_g": 100,
        "unit_description": "1 medium turnip (~122g)",
        "unit_ratio": 1.22,
        "image": "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 28, "protein_g": 0.9, "carbs_g": 6.43, "fat_g": 0.1, "fiber_g": 1.8, "sugar_g": 3.8, "sodium_mg": 67, "potassium_mg": 191, "vit_c_mg": 21.0, "calcium_mg": 30, "iron_mg": 0.3},
        "diet_tags": ["Cruciferous Root", "Glucosinolates", "Low Calorie", "Winter Vegetable"],
        "storage_tip": "Cut greens off; store roots in plastic bag in crisper for up to 4 weeks."
    },
    "watermelon": {
        "id": "watermelon",
        "name": "Juicy Red Watermelon",
        "category": "Fruit",
        "scientificName": "Citrullus lanatus",
        "usda_fdc_id": "167765",
        "serving_size_g": 100,
        "unit_description": "1 wedge (~286g)",
        "unit_ratio": 2.86,
        "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
        "nutrients": {"calories": 30, "protein_g": 0.61, "carbs_g": 7.55, "fat_g": 0.15, "fiber_g": 0.4, "sugar_g": 6.2, "sodium_mg": 1, "potassium_mg": 112, "vit_c_mg": 8.1, "calcium_mg": 7, "iron_mg": 0.24},
        "diet_tags": ["L-Citrulline", "92% Hydration", "Muscle Recovery", "Lycopene Rich"],
        "storage_tip": "Keep whole melon at room temperature until cut, then cover surface tightly and chill."
    }
}


def get_food_nutrition_or_fallback(class_label):
    """Retrieve verified nutrition from NUTRITION_DATABASE or return safe placeholder without crashing."""
    key = class_label.lower().strip()
    aliases = {
        "chilli pepper": "chili pepper",
        "jalepeno": "jalapeno",
        "raddish": "radish",
        "soy beans": "soybean",
        "sweetpotato": "sweet potato",
        "grape": "grapes"
    }
    norm_key = aliases.get(key, key)
    matched = NUTRITION_DATABASE.get(norm_key) or NUTRITION_DATABASE.get(key)
    if matched:
        return matched

    logger.warning(f"Nutrition not available yet for class: '{class_label}'")
    category = CATEGORY_MAP.get(key) or CATEGORY_MAP.get(norm_key) or "Produce / Grocery"
    disp = format_display_name(class_label)
    return {
        "id": key.replace(" ", "-"),
        "name": disp.title(),
        "category": category,
        "scientificName": "Food Item",
        "usda_fdc_id": "Custom",
        "serving_size_g": 100,
        "unit_description": "1 standard serving (~100g)",
        "unit_ratio": 1.0,
        "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        "nutrients": {
            "calories": 50,
            "protein_g": 1.5,
            "carbs_g": 10.0,
            "fat_g": 0.5,
            "fiber_g": 2.0,
            "sugar_g": 5.0,
            "sodium_mg": 10,
            "potassium_mg": 200,
            "vit_c_mg": 10,
            "calcium_mg": 15,
            "iron_mg": 0.5
        },
        "nutrition_status": "nutrition not available yet",
        "diet_tags": [category],
        "storage_tip": "Keep in appropriate ambient or chilled storage."
    }


def load_cnn_model():
    """Load and warm up the selected model (EfficientNetV2-B0 or MobileNetV2)."""
    global model
    if model is not None:
        return model

    if not os.path.exists(MODEL_PATH):
        logger.error(f"Model file not found at {MODEL_PATH}")
        return None

    try:
        import keras
        logger.info(f"Loading {MODEL_NAME} from {MODEL_PATH}...")
        model = keras.models.load_model(MODEL_PATH)
        output_units = model.output_shape[-1]
        logger.info(f"Model loaded successfully! Output units: {output_units}, class list count: {len(class_names)}")

        # Fail loudly if class list length does not match model output
        if len(class_names) != output_units:
            raise RuntimeError(
                f"FATAL: Class list count ({len(class_names)}) does not match "
                f"model output dimensions ({output_units})!"
            )

        # Warm up model with raw 0..255 pixel values
        dummy = np.zeros((1, IMG_SIZE[0], IMG_SIZE[1], 3), dtype="float32")
        _ = model.predict(dummy, verbose=0)
        logger.info(f"Pre-warming complete with input shape (1, {IMG_SIZE[0]}, {IMG_SIZE[1]}, 3). Ready for inference!")
        return model
    except Exception as e:
        logger.exception(f"Failed to load Keras model: {e}")
        raise e


# Pre-load on startup once
load_cnn_model()


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "online",
        "model_version": MODEL_VERSION,
        "model_name": MODEL_NAME,
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
        "classes_count": len(class_names),
        "img_size": IMG_SIZE,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "nvidia_configured": bool(get_nvidia_api_key()),
        "nvidia_model": NVIDIA_MODEL,
        "timestamp": time.time()
    })


@app.route("/api/model-info", methods=["GET"])
def model_info():
    """Detailed metadata about the active model."""
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    return jsonify({
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "framework": "TensorFlow / Keras 3",
        "input_shape": [None, IMG_SIZE[0], IMG_SIZE[1], 3],
        "output_shape": [None, len(class_names)],
        "classes_count": len(class_names),
        "classes": class_names,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "tta_enabled": USE_TTA,
        "preprocessing": "RAW pixel values 0 to 255 as float32 (internal model rescaling)"
    })


@app.route("/api/foods", methods=["GET"])
def get_all_foods():
    """Returns all verified food items with full nutrition facts."""
    return jsonify(list(NUTRITION_DATABASE.values()))


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Accepts an image via multipart form ('file' or 'image') OR JSON body ('image_base64' / 'image_data').
    Runs inference using raw float32 pixel values [0..255] and returns top matches, confidence,
    needs_confirmation flag, and verified nutrition details.
    """
    global model
    if model is None:
        model = load_cnn_model()
        if model is None:
            return jsonify({"error": "Model is not loaded on server."}), 500

    start_time = time.perf_counter()
    image = None

    # 1. Check if multipart file uploaded
    if "file" in request.files:
        uploaded_file = request.files["file"]
        image = Image.open(uploaded_file.stream).convert("RGB")
    elif "image" in request.files:
        uploaded_file = request.files["image"]
        image = Image.open(uploaded_file.stream).convert("RGB")
    # 2. Check JSON payload (base64)
    elif request.is_json:
        data = request.get_json()
        b64_str = data.get("image_base64") or data.get("image_data") or data.get("image")
        if b64_str:
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            img_bytes = base64.b64decode(b64_str)
            image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    if image is None:
        return jsonify({"error": "No image provided. Please provide a file or base64 data."}), 400

    try:
        # Preprocessing: resize to target IMG_SIZE (224x224 for effnet, 160x160 for mobilenet)
        orig_w, orig_h = image.size
        resized_img = image.resize(IMG_SIZE, Image.Resampling.BILINEAR)
        # Feed RAW pixel values 0 to 255 as float32. REMOVE any / 255 or (x/127.5 - 1)
        img_array = np.array(resized_img, dtype="float32")
        input_tensor = np.expand_dims(img_array, axis=0)  # Shape (1, H, W, 3)

        # Run inference (with TTA average if enabled)
        if USE_TTA:
            pred_orig = model.predict(input_tensor, verbose=0)[0]
            flipped_img = np.fliplr(img_array)
            flip_tensor = np.expand_dims(flipped_img, axis=0)
            pred_flip = model.predict(flip_tensor, verbose=0)[0]
            predictions = (pred_orig + pred_flip) / 2.0
        else:
            predictions = model.predict(input_tensor, verbose=0)[0]

        # Softmax probabilities
        probs = np.array(predictions, dtype="float64")
        if np.max(probs) > 1.0 or np.min(probs) < 0.0 or abs(np.sum(probs) - 1.0) > 0.05:
            exp_preds = np.exp(probs - np.max(probs))
            probs = exp_preds / np.sum(exp_preds)

        top_indices = np.argsort(probs)[::-1]
        top_idx = int(top_indices[0])
        top_class = class_names[top_idx]
        top_conf = float(probs[top_idx])

        # Top 3 runner-ups formatted as [{rank, class, label, confidence, confidence_percent, category}]
        top_3 = []
        for rank, idx in enumerate(top_indices[:3]):
            cname = class_names[idx]
            conf = float(probs[idx])
            cat = CATEGORY_MAP.get(cname, CATEGORY_MAP.get(cname.replace("_", " "), "Produce / Grocery"))
            top_3.append({
                "rank": rank + 1,
                "class": cname,
                "label": format_display_name(cname),
                "confidence": round(conf, 4),
                "confidence_percent": round(conf * 100, 2),
                "category": cat
            })

        # Top 5 details
        top_5 = []
        for rank, idx in enumerate(top_indices[:5]):
            cname = class_names[idx]
            conf = float(probs[idx])
            top_5.append({
                "class": cname,
                "label": format_display_name(cname),
                "confidence": round(conf, 4),
                "confidence_percent": round(conf * 100, 2)
            })

        # Match to rich food details or fallback (does not crash if not in database)
        matched_food = get_food_nutrition_or_fallback(top_class)
        top_category = CATEGORY_MAP.get(top_class, CATEGORY_MAP.get(top_class.replace("_", " "), "Produce / Grocery"))

        # Low confidence check against threshold from model_card.json (0.50)
        needs_confirmation = bool(top_conf < CONFIDENCE_THRESHOLD)

        # Generate simple recipes directly for the detected food
        display_name = format_display_name(top_class)
        pref = None
        if request.is_json:
            pref = (request.get_json() or {}).get("diet_goal")
        if pref in ("Balanced", "All", "None", ""):
            pref = None

        try:
            simple_recipes = generate_simple_recipes(
                items=[display_name],
                llm_call=gemini_llm_call,
                n=3,
                categories=SIMPLE_CATEGORIES,
                preference=pref
            )
        except Exception as e:
            logger.warning(f"Could not generate LLM simple recipes in predict(): {e}")
            simple_recipes = generate_simple_recipes(
                items=[display_name],
                llm_call=lambda s, u: "{}",
                n=3,
                categories=SIMPLE_CATEGORIES,
                preference=pref
            )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

        return jsonify({
            "success": True,
            "model_version": MODEL_VERSION,
            "model": MODEL_NAME,
            "prediction": top_class,
            "prediction_display": display_name,
            "confidence": round(top_conf, 4),
            "confidence_percent": round(top_conf * 100, 2),
            "needs_confirmation": needs_confirmation,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "category": top_category,
            "top_match": matched_food,
            "simple_recipes": simple_recipes,
            "top_3": top_3,
            "top_5": top_5,
            "inference_time_ms": elapsed_ms,
            "input_resolution": f"{orig_w}x{orig_h} -> {IMG_SIZE[0]}x{IMG_SIZE[1]} RGB",
            "tta_applied": USE_TTA,
            "timestamp": time.time()
        })

    except Exception as e:
        logger.exception(f"Error during image prediction: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/corrections", methods=["POST"])
@app.route("/api/save-correction", methods=["POST"])
def save_correction():
    """
    Saves a user-corrected food image to data/corrections/<chosen_label>/<timestamp>.jpg
    for future training iterations.
    """
    data = request.get_json() or {}
    image_b64 = data.get("image_base64") or data.get("image")
    chosen_label = data.get("chosen_label") or data.get("label")

    if not chosen_label:
        return jsonify({"error": "Missing chosen_label parameter"}), 400

    image = None
    if "file" in request.files:
        image = Image.open(request.files["file"].stream).convert("RGB")
    elif "image" in request.files:
        image = Image.open(request.files["image"].stream).convert("RGB")
    elif image_b64:
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        img_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    if image is None:
        return jsonify({"error": "No image provided for correction"}), 400

    clean_label = chosen_label.lower().strip().replace(" ", "_")
    target_dir = os.path.join(BASE_DIR, "data", "corrections", clean_label)
    os.makedirs(target_dir, exist_ok=True)

    timestamp = int(time.time() * 1000)
    file_path = os.path.join(target_dir, f"{timestamp}.jpg")
    image.save(file_path, "JPEG", quality=92)
    logger.info(f"Saved corrected image for '{clean_label}' at {file_path}")

    matched_food = get_food_nutrition_or_fallback(chosen_label)

    return jsonify({
        "success": True,
        "saved_path": file_path,
        "chosen_label": chosen_label,
        "display_name": format_display_name(chosen_label),
        "top_match": matched_food
    })


@app.route("/api/generate-recipe", methods=["POST"])
@app.route("/api/simple-recipes", methods=["POST"])
def generate_simple_recipes_endpoint():
    """
    Simple recipe generation endpoint powered by generate_simple_recipes.
    Accepts detected or user-confirmed items (display names with spaces),
    optional preference filter, and exclude_names.
    """
    data = request.get_json() or {}
    raw_items = data.get("items") or data.get("foods") or data.get("ingredients") or []

    if not raw_items:
        return jsonify({"error": "Please provide at least one food item in 'items'."}), 400

    items = []
    for it in raw_items:
        if isinstance(it, str):
            items.append(it.replace("_", " ").strip())
        elif isinstance(it, dict):
            name = it.get("name") or it.get("label") or it.get("id") or it.get("class") or it.get("prediction") or ""
            if name:
                items.append(name.replace("_", " ").strip())

    preference = data.get("preference") or data.get("diet_goal")
    if preference in ("Balanced", "All", "None", ""):
        preference = None

    n = int(data.get("n", 3))
    exclude_names = data.get("exclude_names", [])

    try:
        recipes = generate_simple_recipes(
            items=items,
            llm_call=gemini_llm_call,
            n=n,
            categories=SIMPLE_CATEGORIES,
            preference=preference,
            exclude_names=exclude_names
        )
    except Exception as e:
        logger.warning(f"LLM simple recipe call failed, falling back to templates: {e}")
        recipes = generate_simple_recipes(
            items=items,
            llm_call=lambda s, u: "{}",
            n=n,
            categories=SIMPLE_CATEGORIES,
            preference=preference,
            exclude_names=exclude_names
        )

    return jsonify({
        "success": True,
        "recipes": recipes,
        "recipe": recipes[0] if recipes else None,
        "items": items,
        "count": len(recipes),
        "timestamp": time.time()
    })


@app.route("/api/llm/analyze-food", methods=["POST"])
def analyze_food_llm():
    """
    Multimodal food vision & simple recipe generation.
    """
    data = request.get_json() or {}
    items = data.get("items")
    if not items:
        # If image is uploaded without items, run prediction
        return predict()

    preference = data.get("preference") or data.get("diet_goal")
    if preference in ("Balanced", "All", "None", ""):
        preference = None

    recipes = generate_simple_recipes(
        items=items,
        llm_call=gemini_llm_call,
        n=int(data.get("n", 3)),
        categories=SIMPLE_CATEGORIES,
        preference=preference,
        exclude_names=data.get("exclude_names", [])
    )
    return jsonify({"success": True, "recipes": recipes})


@app.route("/api/llm/chat", methods=["POST"])
def chef_conversational_chat():
    """
    Multi-turn chef chat endpoint supporting Gemini and NVIDIA Nemotron 3.5 Super VL.
    """
    data = request.get_json() or {}
    messages = data.get("messages", [])
    recipe_ctx = data.get("recipe_context", {})
    provider = (data.get("provider") or "").lower()

    # Route to NVIDIA if requested or if NVIDIA key is available
    if provider == "nvidia":
        last_text = messages[-1].get("text", "") if messages else data.get("prompt", "")
        res = query_nemotron(
            prompt=last_text,
            messages=[{"role": m.get("role", "user"), "content": m.get("text", "")} for m in messages],
            system_prompt=f"You are NutriLens AI assistant powered by NVIDIA Nemotron. Current recipe context: {json.dumps(recipe_ctx)}. Answer politely and concisely."
        )
        if res.get("success"):
            return jsonify({"success": True, "reply": res["reply"], "model": res.get("model")})
        else:
            return jsonify(res), res.get("status_code", 500)

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            prompt = f"You are a helpful home-cooking culinary assistant. Current recipe context: {json.dumps(recipe_ctx)}. Answer the user politely, concisely, and keep suggestions simple."
            payload = {
                "contents": [{"parts": [{"text": f"{prompt}\nUser: {str(messages)}"}]}],
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 400}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                reply_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                return jsonify({"success": True, "reply": reply_text})
        except Exception as e:
            logger.warning(f"Gemini chat failed: {e}")

    last_msg = messages[-1].get("text", "") if messages else ""
    return jsonify({
        "success": True,
        "reply": f"As your culinary assistant, regarding {recipe_ctx.get('title', 'this dish')}: You can easily adapt this! For cooking tips, substitutions, or adjustments, feel free to ask."
    })


# -----------------------------------------------------------------
# NVIDIA Nemotron 3.5 Super VL 120B-A12B Endpoints
# -----------------------------------------------------------------
@app.route("/api/nvidia/chat", methods=["POST"])
def nvidia_chat_endpoint():
    """
    Natural-language question answering & conversation with NVIDIA Nemotron 3.5 Super VL.
    """
    data = request.get_json() if request.is_json else {}
    prompt = data.get("prompt") or request.form.get("prompt", "")
    messages = data.get("messages", [])
    image_b64 = data.get("image_base64") or request.form.get("image_base64")

    image_bytes = None
    if "image" in request.files:
        image_bytes = request.files["image"].read()
    elif "file" in request.files:
        image_bytes = request.files["file"].read()

    if not prompt and not messages and not image_bytes and not image_b64:
        return jsonify({"success": False, "error": "Please provide a text prompt, messages, or image for NVIDIA Nemotron."}), 400

    res = query_nemotron(
        prompt=prompt,
        image_bytes=image_bytes,
        image_base64=image_b64,
        messages=messages,
        max_tokens=int(data.get("max_tokens", 1024)),
        temperature=float(data.get("temperature", 0.2)),
        system_prompt=data.get("system_prompt")
    )

    status_code = res.get("status_code", 200)
    return jsonify(res), status_code


@app.route("/api/nvidia/vision", methods=["POST"])
def nvidia_vision_endpoint():
    """
    Multimodal image recognition & food culinary analysis with NVIDIA Nemotron 3.5 Super VL.
    """
    data = request.get_json() if request.is_json else {}
    prompt = data.get("prompt") or request.form.get("prompt") or "Identify this food item and provide a helpful description and cooking suggestions."
    image_b64 = data.get("image_base64") or request.form.get("image_base64")

    image_bytes = None
    if "image" in request.files:
        image_bytes = request.files["image"].read()
    elif "file" in request.files:
        image_bytes = request.files["file"].read()

    if not image_bytes and not image_b64:
        return jsonify({"success": False, "error": "No image provided. Please upload an image or provide base64 data."}), 400

    res = query_nemotron(
        prompt=prompt,
        image_bytes=image_bytes,
        image_base64=image_b64,
        max_tokens=int(data.get("max_tokens", 1024)),
        temperature=float(data.get("temperature", 0.2)),
        system_prompt=data.get("system_prompt")
    )

    status_code = res.get("status_code", 200)
    return jsonify(res), status_code



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting Food CNN & Recipe Generator server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)

