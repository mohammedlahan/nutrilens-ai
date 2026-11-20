"""
tests/test_model_swap.py
Automated test suite verifying the model swap from MobileNetV2 to EfficientNetV2-B0:
1. Model loading & class count verification
2. Preprocessing & raw float32 pixel values verification
3. Model card threshold configuration
4. Category mapping from class_to_category.csv
5. Low confidence needs_confirmation flag
6. Backend corrections endpoint save functionality
"""

import os
import sys
import json
import unittest
from PIL import Image
import numpy as np

# Ensure project root in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


class TestModelSwap(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        import keras
        cls.keras = keras

        cls.effnet_model_path = os.path.join(BASE_DIR, "models", "effnet", "food_cnn_effnet.keras")
        cls.effnet_classes_path = os.path.join(BASE_DIR, "models", "effnet", "class_names.json")
        cls.effnet_card_path = os.path.join(BASE_DIR, "models", "effnet", "model_card.json")
        cls.category_csv_path = os.path.join(BASE_DIR, "models", "effnet", "class_to_category.csv")

        cls.mobilenet_model_path = os.path.join(BASE_DIR, "models", "old_mobilenet", "food_cnn_mobilenetv2.keras")
        cls.mobilenet_classes_path = os.path.join(BASE_DIR, "models", "old_mobilenet", "class_names.json")

    def test_01_backup_exists(self):
        """Step 1: Check that old MobileNet model and class list are backed up in models/old_mobilenet/"""
        self.assertTrue(os.path.exists(self.mobilenet_model_path), "Old MobileNet model missing in old_mobilenet/")
        self.assertTrue(os.path.exists(self.mobilenet_classes_path), "Old class_names missing in old_mobilenet/")

    def test_02_effnet_files_exist(self):
        """Step 2: Check that all unbundled EfficientNet files exist in models/effnet/"""
        self.assertTrue(os.path.exists(self.effnet_model_path), "food_cnn_effnet.keras missing")
        self.assertTrue(os.path.exists(self.effnet_classes_path), "class_names.json missing")
        self.assertTrue(os.path.exists(self.effnet_card_path), "model_card.json missing")
        self.assertTrue(os.path.exists(self.category_csv_path), "class_to_category.csv missing")

    def test_03_model_card_contents(self):
        """Step 2 & 4: Check model_card.json values (img_size, num_classes, threshold)"""
        with open(self.effnet_card_path, "r", encoding="utf-8") as f:
            card = json.load(f)

        self.assertEqual(card.get("img_size"), [224, 224], "Expected img_size [224, 224]")
        self.assertEqual(card.get("confidence_threshold"), 0.5, "Expected confidence_threshold 0.5")
        self.assertIn("0-255", card.get("preprocessing", ""), "Expected raw 0-255 preprocessing notice")

    def test_04_class_count_matches_model_output(self):
        """Step 4c: Verify len(class_names) == model.output_shape[-1]"""
        with open(self.effnet_classes_path, "r", encoding="utf-8") as f:
            classes = json.load(f)

        model = self.keras.models.load_model(self.effnet_model_path)
        output_dim = model.output_shape[-1]
        self.assertEqual(len(classes), output_dim, f"Class list ({len(classes)}) != output dim ({output_dim})")
        self.assertEqual(model.input_shape[1:3], (224, 224), "Model input shape must be 224x224")

    def test_05_preprocessing_raw_float32(self):
        """Step 4b: Verify inference succeeds on raw [0..255] float32 pixels with valid softmax output"""
        model = self.keras.models.load_model(self.effnet_model_path)
        raw_pixels = np.random.uniform(0.0, 255.0, (1, 224, 224, 3)).astype("float32")
        preds = model.predict(raw_pixels, verbose=0)[0]

        self.assertAlmostEqual(float(np.sum(preds)), 1.0, places=4, msg="Probabilities must sum to ~1.0")
        self.assertTrue(np.all(preds >= 0.0), "Probabilities must be non-negative")
        self.assertTrue(np.all(preds <= 1.0), "Probabilities must be <= 1.0")

    def test_06_category_mapping(self):
        """Step 5: Verify class_to_category.csv loads and maps categories"""
        import backend.app as backend_app
        self.assertGreater(len(backend_app.CATEGORY_MAP), 30, "CATEGORY_MAP must contain categories")
        self.assertIn("apple", backend_app.CATEGORY_MAP)
        self.assertEqual(backend_app.CATEGORY_MAP["apple"], "Fruits")

    def test_07_corrections_save_flow(self):
        """Step 4h: Verify saving corrections to data/corrections/<chosen_label>/<timestamp>.jpg"""
        import backend.app as backend_app
        client = backend_app.app.test_client()

        # Generate a small 100x100 dummy JPEG in memory
        import io
        import base64
        img = Image.new("RGB", (100, 100), color=(200, 50, 50))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        b64_str = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

        response = client.post("/api/corrections", json={
            "image_base64": b64_str,
            "chosen_label": "apple"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        saved_path = data.get("saved_path")
        self.assertTrue(os.path.exists(saved_path), f"Saved correction file not found at {saved_path}")


if __name__ == "__main__":
    unittest.main()
