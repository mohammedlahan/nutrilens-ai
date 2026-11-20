"""
Unit and Integration Tests for NVIDIA Nemotron 3.5 Super VL 120B-A12B
Tests:
  1. Health check reports NVIDIA status
  2. Natural language question text endpoint (/api/nvidia/chat)
  3. Multimodal image recognition vision endpoint (/api/nvidia/vision)
  4. Image validation (size limits and file formats)
"""
import unittest
import base64
import io
import os
import sys
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app import app
from backend.nvidia_service import validate_image_data, NVIDIA_MODEL


class TestNvidiaNemotron(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()

    def test_1_health_check_nvidia(self):
        """Verify NVIDIA model and configuration status in /api/health."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("nvidia_configured"))
        self.assertEqual(data.get("nvidia_model"), NVIDIA_MODEL)

    def test_2_natural_language_question(self):
        """Test natural language question to /api/nvidia/chat."""
        res = self.client.post("/api/nvidia/chat", json={
            "prompt": "What is an orange fruit? Answer in one short sentence."
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("model"), NVIDIA_MODEL)
        self.assertTrue(len(data.get("reply", "")) > 5)

    def test_3_multimodal_image_recognition(self):
        """Test multimodal image input to /api/nvidia/vision."""
        # Create a simple test image
        img = Image.new("RGB", (80, 80), color=(255, 255, 255))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.rectangle((10, 10, 70, 70), fill=(34, 139, 34))  # Forest green square
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        res = self.client.post("/api/nvidia/vision", json={
            "prompt": "Describe the shape and color visible in this image in one brief sentence.",
            "image_base64": b64
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("model"), NVIDIA_MODEL)
        self.assertTrue(len(data.get("reply", "")) > 0)

    def test_4_image_validation(self):
        """Test image size and format validation rules."""
        # Valid JPEG
        valid_buf = io.BytesIO()
        Image.new("RGB", (10, 10)).save(valid_buf, format="JPEG")
        is_valid, err, mime = validate_image_data(valid_buf.getvalue())
        self.assertTrue(is_valid)
        self.assertEqual(mime, "image/jpeg")

        # Oversized (exceeds 10MB)
        oversized_bytes = b"X" * (11 * 1024 * 1024)
        is_valid_huge, err_huge, _ = validate_image_data(oversized_bytes)
        self.assertFalse(is_valid_huge)
        self.assertIn("exceeds 10MB limit", err_huge)

        # Corrupted / non-image
        is_valid_corrupt, err_corrupt, _ = validate_image_data(b"not an image file")
        self.assertFalse(is_valid_corrupt)
        self.assertIn("Invalid or corrupted", err_corrupt)


if __name__ == "__main__":
    unittest.main()
