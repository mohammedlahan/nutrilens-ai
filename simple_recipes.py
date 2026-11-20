"""
simple_recipes.py  -  make the recipe LLM give SIMPLE ideas (apple juice, apple with milk),
not restaurant dishes (mustard garnish apple with spices).

Why the old version failed: the LLM was only told "give recipes for apple", so it tried to be
impressive. The fix has four layers, so one weak layer cannot let a fancy dish through:
  1. a strict system prompt (hard limits + examples of the style we want)
  2. a pantry whitelist (only everyday ingredients besides the detected food)
  3. a validator that REJECTS anything too long, too fancy or off-topic, and asks the LLM again
  4. ready-made simple templates as the last fallback, so the user always gets something sensible

Use it with ANY LLM: pass a function llm_call(system_prompt, user_prompt) -> str.
"""
import csv
import json
import logging
import re

logger = logging.getLogger("SimpleRecipes")

# ----------------------------- limits (change here) -----------------------------
MAX_EXTRA_INGREDIENTS = 3      # besides the detected food(s); water, ice and salt are free
MAX_TOTAL_INGREDIENTS = 5
MAX_STEPS = 5
MAX_STEP_WORDS = 25
MAX_MINUTES = 15
MAX_NAME_WORDS = 5

# Everyday ingredients allowed besides the detected food. Add your own (keep it short and common).
PANTRY = {
    "water", "ice", "salt", "sugar", "honey", "jaggery", "milk", "curd", "yoghurt", "yogurt", "butter", "oil", "ghee",
    "lemon", "lime", "bread", "oats", "rice", "cinnamon", "black pepper", "pepper", "cumin", "chilli powder",
    "chaat masala", "mint", "coconut", "peanut", "peanuts", "almond", "almonds", "banana", "onion", "tomato",
    "cucumber", "egg", "eggs", "cheese", "turmeric", "ginger", "garlic", "cocoa powder", "vanilla",
    # Added common local staples:
    "paneer", "spinach", "coriander", "coriander leaves", "green chilli", "green chili", "cardamom"
}

# Words that signal a fancy dish. A recipe whose name or steps contain one of these is rejected.
FANCY_WORDS = {
    "garnish", "garnished", "glaze", "glazed", "reduction", "coulis", "foam", "sous vide", "confit", "brine", "brined", "braise",
    "braised", "flambe", "flambé", "deglaze", "emulsion", "mustard", "gastrique", "chutney", "marinate overnight", "infuse",
    "infused", "spiced", "spices", "mélange", "melange", "medley", "fusion", "artisan", "gourmet", "rustic",
}

# Last-resort simple ideas. {x} = the detected food. Time in minutes.
TEMPLATES = {
    "Fruits": [
        dict(name="{X} juice", type="drink", time_minutes=5,
             ingredients=[("{x}", "2"), ("water", "1/2 cup"), ("sugar or honey", "1 tsp, optional")],
             steps=["Wash and chop the {x}.", "Blend with the water until smooth.", "Strain if you like, add sugar or honey, and serve cold."]),
        dict(name="{X} with milk", type="drink", time_minutes=5,
             ingredients=[("{x}", "1"), ("milk", "1 cup"), ("honey", "1 tsp, optional")],
             steps=["Wash and chop the {x}.", "Blend with cold milk until smooth.", "Add honey if you like and serve."]),
        dict(name="{X} with curd", type="snack", time_minutes=3,
             ingredients=[("{x}", "1"), ("curd", "1/2 cup"), ("honey", "1 tsp, optional")],
             steps=["Wash and chop the {x}.", "Mix it into the curd.", "Add honey if you like."]),
    ],
    "Vegetables": [
        dict(name="{X} salad", type="snack", time_minutes=5,
             ingredients=[("{x}", "1"), ("lemon juice", "1 tsp"), ("salt", "a pinch")],
             steps=["Wash and chop the {x}.", "Add lemon juice and salt.", "Toss and serve."]),
        dict(name="Pan-fried {x}", type="meal", time_minutes=12,
             ingredients=[("{x}", "1 cup, chopped"), ("oil", "1 tsp"), ("salt", "a pinch"), ("black pepper", "a pinch")],
             steps=["Wash and chop the {x}.", "Heat the oil in a pan.", "Cook the {x} for 6 to 8 minutes, stirring now and then.", "Add salt and pepper."]),
        dict(name="{X} soup", type="meal", time_minutes=15,
             ingredients=[("{x}", "1 cup, chopped"), ("water", "2 cups"), ("salt", "a pinch"), ("black pepper", "a pinch")],
             steps=["Wash and chop the {x}.", "Boil it in the water for 10 minutes until soft.", "Blend or mash, then add salt and pepper."]),
    ],
    "Dairy products": [
        dict(name="Warm {x} with honey", type="drink", time_minutes=4,
             ingredients=[("{x}", "1 cup"), ("honey", "1 tsp")],
             steps=["Warm the {x} gently. Do not boil.", "Stir in the honey and serve."]),
        dict(name="{X} with oats", type="breakfast", time_minutes=5,
             ingredients=[("{x}", "1 cup"), ("oats", "3 tbsp"), ("honey", "1 tsp, optional")],
             steps=["Mix the oats into the {x}.", "Rest 3 minutes (or warm it).", "Add honey if you like."]),
    ],
    "_default": [
        dict(name="Simple {x}", type="snack", time_minutes=5,
             ingredients=[("{x}", "as needed"), ("salt", "a pinch")],
             steps=["Prepare the {x} as you normally would.", "Add a pinch of salt if you like and serve."]),
    ],
}

SYSTEM_PROMPT = f"""You are a home-cooking helper for students and busy people. You give SIMPLE ideas that take minutes, not restaurant dishes.

HARD RULES (a program checks them; anything that breaks them is thrown away):
1. The detected food is the star of every idea. Use it as the main ingredient.
2. At most {MAX_EXTRA_INGREDIENTS} extra ingredients, only from this everyday list: {", ".join(sorted(PANTRY))}.
3. At most {MAX_STEPS} steps, each under {MAX_STEP_WORDS} words. Total time {MAX_MINUTES} minutes or less. No special equipment (a blender, a pan or a bowl is fine).
4. The name must be plain and short (at most {MAX_NAME_WORDS} words), like "Apple juice" or "Apple with milk".
5. Never use fancy words or techniques: {", ".join(sorted(w for w in FANCY_WORDS if " " not in w))}.
6. If several foods were detected, make at least one idea that combines them, and the others may use one of them.
7. Give a mix of types: for example one drink, one snack or breakfast, and one more.
8. Reply with JSON only, no other text.

STYLE EXAMPLES (copy this level of simplicity):
- apple -> "Apple juice" (apple, water, optional sugar), "Apple with milk" (apple, milk, optional honey), "Apple with curd".
- banana + milk -> "Banana milkshake", "Banana with oats and milk".
- tomato -> "Tomato salad" (tomato, lemon, salt), "Tomato soup" (tomato, water, salt, pepper).
- milk -> "Warm milk with honey", "Milk with oats".

JSON format:
{{"recipes": [{{"name": "...", "type": "drink|snack|breakfast|dessert|meal", "time_minutes": 5,
  "uses": ["detected food"], "ingredients": [{{"item": "...", "quantity": "..."}}], "steps": ["...", "..."]}}]}}"""


def build_user_prompt(items, n=3, preference=None, feedback=None):
    """items: detected foods, best guess first. preference: e.g. 'vegetarian', 'no sugar', 'high protein' (optional)."""
    text = f"Detected food(s): {', '.join(items)}.\nGive {n} simple ideas."
    if preference:
        text += f"\nUser preference: {preference}."
    if feedback:
        text += "\nYour previous answer was rejected for these reasons. Fix them and keep it SIMPLE:\n- " + "\n- ".join(feedback)
    return text


# ----------------------------- helpers -----------------------------
def _norm(s):
    return re.sub(r"[^a-z0-9 ]+", " ", str(s).lower().replace("_", " ")).strip()


def _toks(s):
    return {t[:-1] if len(t) > 3 and t.endswith("s") else t for t in _norm(s).split()}


def _mentions(ingredient, item):
    a, b = _toks(ingredient), _toks(item)
    return bool(b) and (b <= a or (a and a <= b))


def load_categories(csv_path):
    """class_to_category.csv from the notebook (columns: item, category) -> {item: category}."""
    with open(csv_path, newline="", encoding="utf-8") as f:
        return {_norm(r["item"]): r["category"] for r in csv.DictReader(f)}


def _category(item, categories):
    cat = (categories or {}).get(_norm(item))
    if cat in ("Fruits",):
        return "Fruits"
    if cat in ("Vegetables", "Leafy greens and fresh herbs"):
        return "Vegetables"
    if cat in ("Dairy products", "Milk alternatives"):
        return "Dairy products"
    return "_default"


# ----------------------------- validator -----------------------------
def validate_recipe(r, detected):
    """Return a list of problems. An empty list means the recipe is simple enough."""
    problems = []
    try:
        name = str(r["name"])
        ings = [str(i["item"]) if isinstance(i, dict) else str(i) for i in r["ingredients"]]
        steps = [str(s) for s in r["steps"]]
        minutes = float(r.get("time_minutes", 0))
    except Exception:
        return ["recipe is missing name, ingredients or steps"]

    if len(name.split()) > MAX_NAME_WORDS:
        problems.append(f"name '{name}' is too long (max {MAX_NAME_WORDS} words)")
    text = _norm(name + " " + " ".join(steps))
    bad = [w for w in FANCY_WORDS if _norm(w) in text]
    if bad:
        problems.append(f"'{name}' uses fancy words: {', '.join(sorted(bad))}")
    if len(steps) > MAX_STEPS:
        problems.append(f"'{name}' has {len(steps)} steps (max {MAX_STEPS})")
    if any(len(s.split()) > MAX_STEP_WORDS for s in steps):
        problems.append(f"'{name}' has a step longer than {MAX_STEP_WORDS} words")
    if minutes > MAX_MINUTES:
        problems.append(f"'{name}' takes {minutes:.0f} minutes (max {MAX_MINUTES})")

    main = [i for i in ings if any(_mentions(i, d) for d in detected)]
    if not main:
        problems.append(f"'{name}' does not use the detected food ({', '.join(detected)})")
    extras = [i for i in ings if i not in main]
    off_list = [i for i in extras if not any(_mentions(i, p) or _norm(p) in _norm(i) for p in PANTRY)]
    if off_list:
        problems.append(f"'{name}' uses ingredients outside the everyday list: {', '.join(off_list)}")
    counted = [i for i in extras if _norm(i) not in ("water", "ice", "salt")]
    if len(counted) > MAX_EXTRA_INGREDIENTS or len(ings) > MAX_TOTAL_INGREDIENTS + 1:
        problems.append(f"'{name}' has too many ingredients ({len(ings)})")
    return problems


def _parse_json(text):
    text = re.sub(r"^```(?:json)?|```$", "", str(text).strip(), flags=re.M).strip()
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1])["recipes"]


def _from_templates(items, categories, need, taken):
    out = []
    main = items[0]
    for tpl in TEMPLATES[_category(main, categories)] + TEMPLATES["_default"]:
        r = dict(tpl)
        x = main.replace("_", " ")
        sub = lambda s: s.replace("{x}", x).replace("{X}", x[:1].upper() + x[1:])
        r = dict(name=sub(tpl["name"]), type=tpl["type"], time_minutes=tpl["time_minutes"], uses=[main],
                 ingredients=[dict(item=sub(a), quantity=sub(b)) for a, b in tpl["ingredients"]],
                 steps=[sub(s) for s in tpl["steps"]], source="template")
        if _norm(r["name"]) not in taken and not validate_recipe(r, items):
            out.append(r)
            taken.add(_norm(r["name"]))
        if len(out) >= need:
            break
    return out


# ----------------------------- main entry -----------------------------
def generate_simple_recipes(items, llm_call, n=3, categories=None, preference=None, max_tries=2, exclude_names=None):
    """items: detected foods (best first). llm_call(system, user) -> str. Returns up to n valid simple recipes.
    Each recipe has source = 'llm' or 'template'."""
    items = [i.replace("_", " ") for i in items]
    good, taken, feedback = [], set(), None
    all_rejections = []

    if exclude_names:
        for en in exclude_names:
            taken.add(_norm(en))

    for _ in range(max_tries):
        try:
            raw = llm_call(SYSTEM_PROMPT, build_user_prompt(items, n, preference, feedback))
            recipes = _parse_json(raw)
        except Exception as e:                      # bad JSON or the call failed: try once more, then fall back
            err_msg = f"your reply was not valid JSON ({type(e).__name__}); reply with JSON only"
            feedback = [err_msg]
            all_rejections.append(err_msg)
            continue
        problems = []
        for r in recipes:
            p = validate_recipe(r, items)
            if p:
                problems += p
                all_rejections += p
            elif _norm(r["name"]) not in taken:
                r["source"] = "llm"
                good.append(r)
                taken.add(_norm(r["name"]))
        if len(good) >= n:
            break
        feedback = problems or ["not enough valid ideas"]
    
    good = good[:n]
    template_count = 0
    if len(good) < n:                               # top up with safe templates
        templates_added = _from_templates(items, categories, n - len(good), taken)
        template_count = len(templates_added)
        good += templates_added

    llm_count = sum(1 for r in good if r.get("source") == "llm")
    
    # Requirement 6: Log for each request
    logger.info(f"[SimpleRecipes] items={items}, preference={preference}")
    logger.info(f"[SimpleRecipes] Result: {llm_count} from LLM, {template_count} from templates (Total: {len(good)})")
    if all_rejections:
        logger.info(f"[SimpleRecipes] Rejections encountered: {all_rejections}")

    return good[:n]


# ----------------------------- self-test -----------------------------
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    fancy = json.dumps({"recipes": [dict(
        name="Mustard-Glazed Apple Garnish with Spiced Reduction", type="meal", time_minutes=45, uses=["apple"],
        ingredients=[dict(item="apple", quantity="2"), dict(item="whole grain mustard", quantity="2 tbsp"),
                     dict(item="garam masala", quantity="1 tsp"), dict(item="saffron", quantity="1 pinch"),
                     dict(item="white wine", quantity="1/2 cup"), dict(item="shallots", quantity="2")],
        steps=["Make a reduction.", "Glaze the apple.", "Garnish with spices."])]})
    good = json.dumps({"recipes": [
        dict(name="Apple juice", type="drink", time_minutes=5, uses=["apple"],
             ingredients=[dict(item="apple", quantity="2"), dict(item="water", quantity="1/2 cup"), dict(item="sugar", quantity="1 tsp")],
             steps=["Wash and chop the apples.", "Blend with water.", "Strain and serve cold."]),
        dict(name="Apple with milk", type="drink", time_minutes=5, uses=["apple"],
             ingredients=[dict(item="apple", quantity="1"), dict(item="milk", quantity="1 cup"), dict(item="honey", quantity="1 tsp")],
             steps=["Chop the apple.", "Blend with cold milk.", "Add honey and serve."])]})

    # 1) fancy first, good second -> the fancy one is rejected and the retry is accepted
    calls = iter([fancy, good])
    seen = []
    def llm(system, user):
        seen.append(user)
        return next(calls)
    out = generate_simple_recipes(["apple"], llm, n=3)
    assert [r["name"] for r in out[:2]] == ["Apple juice", "Apple with milk"], out
    assert out[2]["source"] == "template" and "rejected" in seen[1], "third idea should come from a template and retry should carry feedback"
    print("1. fancy rejected, retry used, template topped up:", [r["name"] for r in out])

    # 2) LLM always fancy / always broken -> only safe templates
    out = generate_simple_recipes(["apple"], lambda s, u: fancy, n=3, categories={"apple": "Fruits"})
    assert all(r["source"] == "template" for r in out) and len(out) == 3
    print("2. LLM keeps failing, templates:", [r["name"] for r in out])
    out = generate_simple_recipes(["tomato"], lambda s, u: "sorry, no json", n=2, categories={"tomato": "Vegetables"})
    assert len(out) == 2 and all(not validate_recipe(r, ["tomato"]) for r in out)
    print("3. broken JSON, templates:", [r["name"] for r in out])

    # 4) validator catches each rule
    base = dict(name="Apple juice", time_minutes=5, ingredients=[dict(item="apple", quantity="1"), dict(item="water", quantity="1 cup")], steps=["Blend."])
    assert validate_recipe(base, ["apple"]) == []
    assert validate_recipe({**base, "time_minutes": 40}, ["apple"])
    assert validate_recipe({**base, "name": "Apple garnish"}, ["apple"])
    assert validate_recipe({**base, "ingredients": [dict(item="water", quantity="1")]}, ["apple"])
    assert validate_recipe({**base, "ingredients": base["ingredients"] + [dict(item="saffron", quantity="1")]}, ["apple"])
    assert validate_recipe({**base, "steps": ["a"] * 8}, ["apple"])
    print("4. validator rules ok")

    # 5) two foods: apple + milk, soy milk is not mistaken for plain milk-only recipes
    both = json.dumps({"recipes": [dict(name="Apple milkshake", type="drink", time_minutes=5, uses=["apple", "milk"],
        ingredients=[dict(item="apple", quantity="1"), dict(item="milk", quantity="1 cup")], steps=["Chop.", "Blend.", "Serve."])]})
    out = generate_simple_recipes(["apple", "milk"], lambda s, u: both, n=1)
    assert out[0]["name"] == "Apple milkshake" and out[0]["source"] == "llm"
    print("5. multi-food ok:", out[0]["name"])
    print("\nAll self-tests passed.")
