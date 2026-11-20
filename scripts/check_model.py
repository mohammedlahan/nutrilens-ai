#!/usr/bin/env python3
"""
scripts/check_model.py
Side-by-side evaluation of EfficientNetV2-B0 (new) vs MobileNetV2 (old) on test sample photos.
Checks model and class counts, runs inference on tests/sample_images/, and prints comparison table.
"""

import os
import sys
import json
import re
from PIL import Image
import numpy as np

# Suppress verbose TF logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths
EFFNET_MODEL_PATH = os.path.join(BASE_DIR, "models", "effnet", "food_cnn_effnet.keras")
EFFNET_CLASSES_PATH = os.path.join(BASE_DIR, "models", "effnet", "class_names.json")
EFFNET_CARD_PATH = os.path.join(BASE_DIR, "models", "effnet", "model_card.json")

MOBILENET_MODEL_PATH = os.path.join(BASE_DIR, "models", "old_mobilenet", "food_cnn_mobilenetv2.keras")
if not os.path.exists(MOBILENET_MODEL_PATH):
    MOBILENET_MODEL_PATH = os.path.join(BASE_DIR, "models", "food_cnn_mobilenetv2.keras")

MOBILENET_CLASSES_PATH = os.path.join(BASE_DIR, "models", "old_mobilenet", "class_names.json")
if not os.path.exists(MOBILENET_CLASSES_PATH):
    MOBILENET_CLASSES_PATH = os.path.join(BASE_DIR, "models", "class_names.json")

SAMPLE_DIR = os.path.join(BASE_DIR, "tests", "sample_images")


def normalize_label(label: str) -> str:
    """Normalize label for comparison across spelling variations in datasets."""
    if not label:
        return ""
    clean = label.lower().replace("_", " ").strip()
    synonyms = {
        "chilli pepper": "chili pepper",
        "chili": "chili pepper",
        "jalepeno": "jalapeno",
        "raddish": "radish",
        "sweetpotato": "sweet potato",
        "sweet potato": "sweet potato",
        "soy beans": "soybean",
        "soybeans": "soybean",
        "grape": "grapes",
        "bell pepper": "bell pepper",
        "capsicum": "capsicum"
    }
    return synonyms.get(clean, clean)


def extract_expected_from_filename(filename: str, class_list: list) -> str:
    """
    Extracts the expected food class from filenames like 'apple_1.jpg' or 'bell_pepper_2.png'.
    """
    base = os.path.splitext(filename)[0].lower()
    # Remove trailing digits / suffixes like _1, -2, _test
    clean = re.sub(r'[-_]\d+$', '', base)
    clean = re.sub(r'[-_]test.*$', '', clean)
    clean_space = clean.replace("_", " ").strip()

    # Check against known classes
    norm_clean = normalize_label(clean_space)
    for c in class_list:
        if normalize_label(c) == norm_clean:
            return c

    # Fallback to the raw cleaned string
    return clean_space


def run_checks():
    print("=" * 80)
    print("NutriLens AI — Dual Model Evaluation & Verification")
    print("=" * 80)

    # 1. Check EfficientNet model & class list
    print("\n[Step 1] Loading EfficientNetV2-B0 Model & Config...")
    if not os.path.exists(EFFNET_MODEL_PATH):
        print(f"ERROR: EfficientNet model not found at {EFFNET_MODEL_PATH}")
        sys.exit(1)

    if not os.path.exists(EFFNET_CLASSES_PATH):
        print(f"ERROR: EfficientNet class_names.json not found at {EFFNET_CLASSES_PATH}")
        sys.exit(1)

    with open(EFFNET_CLASSES_PATH, "r", encoding="utf-8") as f:
        effnet_classes = json.load(f)

    effnet_card = {}
    if os.path.exists(EFFNET_CARD_PATH):
        with open(EFFNET_CARD_PATH, "r", encoding="utf-8") as f:
            effnet_card = json.load(f)

    import keras

    effnet_model = keras.models.load_model(EFFNET_MODEL_PATH)
    effnet_units = effnet_model.output_shape[-1]
    print(f"  Model: {effnet_card.get('model', 'EfficientNetV2B0')}")
    print(f"  Model Input Shape: {effnet_model.input_shape}")
    print(f"  Model Output Units: {effnet_units}")
    print(f"  Class Names Count: {len(effnet_classes)}")

    # Step 4c requirement: Verify len(class_names) == model's output size, and fail loudly if not
    if len(effnet_classes) != effnet_units:
        print(f"FATAL: Class count mismatch! Expected {effnet_units}, got {len(effnet_classes)}")
        sys.exit(1)
    print("  [OK] EfficientNet class count matches model output units exactly!")

    # 2. Check MobileNet model & class list
    print("\n[Step 2] Loading MobileNetV2 (Old Baseline) Model...")
    mobilenet_model = None
    mobilenet_classes = []
    if os.path.exists(MOBILENET_MODEL_PATH) and os.path.exists(MOBILENET_CLASSES_PATH):
        try:
            with open(MOBILENET_CLASSES_PATH, "r", encoding="utf-8") as f:
                mobilenet_classes = json.load(f)
            mobilenet_model = keras.models.load_model(MOBILENET_MODEL_PATH)
            mobilenet_units = mobilenet_model.output_shape[-1]
            print(f"  Model Input Shape: {mobilenet_model.input_shape}")
            print(f"  Model Output Units: {mobilenet_units}")
            print(f"  Class Names Count: {len(mobilenet_classes)}")
            if len(mobilenet_classes) == mobilenet_units:
                print("  [OK] MobileNetV2 class count matches model output units!")
        except Exception as e:
            print(f"  Warning loading old MobileNet model: {e}")
    else:
        print(f"  Notice: MobileNet model or classes missing at {MOBILENET_MODEL_PATH}")

    # 3. Locate Sample Images
    print(f"\n[Step 3] Scanning {SAMPLE_DIR} for test photos...")
    if not os.path.exists(SAMPLE_DIR):
        print(f"ERROR: {SAMPLE_DIR} does not exist.")
        sys.exit(1)

    image_files = sorted([
        f for f in os.listdir(SAMPLE_DIR)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ])

    if not image_files:
        print(f"No test images found in {SAMPLE_DIR}.")
        print("Please place test images like 'apple_1.jpg' into tests/sample_images/ and rerun.")
        sys.exit(1)

    print(f"Found {len(image_files)} test images.\n")

    # 4. Predict each sample image on both models
    results = []
    eff_correct_count = 0
    mob_correct_count = 0

    eff_img_size = tuple(effnet_card.get("img_size", [224, 224]))

    for fname in image_files:
        fpath = os.path.join(SAMPLE_DIR, fname)
        expected = extract_expected_from_filename(fname, effnet_classes)
        expected_norm = normalize_label(expected)

        # Open and ensure RGB
        with Image.open(fpath) as img:
            img_rgb = img.convert("RGB")

            # A. EfficientNet Prediction (224x224, RAW 0..255 float32, TTA)
            eff_resized = img_rgb.resize(eff_img_size, Image.Resampling.BILINEAR)
            eff_arr = np.array(eff_resized, dtype="float32")
            eff_t1 = np.expand_dims(eff_arr, axis=0)
            eff_p1 = effnet_model.predict(eff_t1, verbose=0)[0]

            # Horizontal flip TTA
            eff_flipped = np.fliplr(eff_arr)
            eff_t2 = np.expand_dims(eff_flipped, axis=0)
            eff_p2 = effnet_model.predict(eff_t2, verbose=0)[0]
            eff_preds = (eff_p1 + eff_p2) / 2.0

            eff_top_idx = int(np.argmax(eff_preds))
            eff_top_class = effnet_classes[eff_top_idx]
            eff_conf = float(eff_preds[eff_top_idx])
            eff_correct = (normalize_label(eff_top_class) == expected_norm) or (expected_norm in normalize_label(eff_top_class))
            if eff_correct:
                eff_correct_count += 1

            # B. MobileNetV2 Prediction (160x160, RAW 0..255 float32)
            mob_top_class = "N/A"
            mob_conf = 0.0
            mob_correct = False
            if mobilenet_model is not None:
                mob_resized = img_rgb.resize((160, 160), Image.Resampling.BILINEAR)
                mob_arr = np.array(mob_resized, dtype="float32")
                mob_t = np.expand_dims(mob_arr, axis=0)
                mob_preds = mobilenet_model.predict(mob_t, verbose=0)[0]
                mob_top_idx = int(np.argmax(mob_preds))
                mob_top_class = mobilenet_classes[mob_top_idx]
                mob_conf = float(mob_preds[mob_top_idx])
                mob_correct = (normalize_label(mob_top_class) == expected_norm) or (expected_norm in normalize_label(mob_top_class))
                if mob_correct:
                    mob_correct_count += 1

            results.append({
                "file": fname,
                "expected": expected,
                "eff_top1": eff_top_class,
                "eff_conf": eff_conf,
                "eff_correct": eff_correct,
                "mob_top1": mob_top_class,
                "mob_conf": mob_conf,
                "mob_correct": mob_correct
            })

    # Print Table
    header = f"{'File':<18} | {'Expected':<12} | {'EffNet Top-1':<14} | {'Conf':<7} | {'Eff?':<5} | {'MobileNet Top-1':<16} | {'Conf':<7} | {'Mob?'}"
    separator = "-" * len(header)
    print(header)
    print(separator)

    for r in results:
        eff_mark = "YES" if r["eff_correct"] else "NO"
        mob_mark = "YES" if r["mob_correct"] else "NO"
        print(f"{r['file']:<18} | {r['expected']:<12} | {r['eff_top1']:<14} | {r['eff_conf']*100:>5.1f}% | {eff_mark:<5} | {r['mob_top1']:<16} | {r['mob_conf']*100:>5.1f}% | {mob_mark}")

    print(separator)
    total = len(results)
    eff_acc = (eff_correct_count / total) * 100
    print(f"\n[Summary Evaluation on {total} sample images]")
    print(f"  * EfficientNetV2-B0 Accuracy: {eff_correct_count}/{total} ({eff_acc:.1f}%)")
    if mobilenet_model is not None:
        mob_acc = (mob_correct_count / total) * 100
        print(f"  * MobileNetV2 Accuracy:       {mob_correct_count}/{total} ({mob_acc:.1f}%)")
        diff = eff_acc - mob_acc
        print(f"  * Delta Improvement:          {'+' if diff >= 0 else ''}{diff:.1f}%")

    print("\nEvaluation complete!\n")


if __name__ == "__main__":
    run_checks()
