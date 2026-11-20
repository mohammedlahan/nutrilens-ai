import base64
import io
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app import app

client = app.test_client()

print("=" * 60)
print("TEST 1: /api/health (NVIDIA status)")
print("=" * 60)
res = client.get("/api/health")
print("Status:", res.status_code)
print("Health payload:", res.get_json())
assert res.get_json().get("nvidia_configured") is True, "nvidia_configured should be True"

print("\n" + "=" * 60)
print("TEST 2: /api/nvidia/chat (Natural language question)")
print("=" * 60)
res_chat = client.post("/api/nvidia/chat", json={
    "prompt": "What are 3 quick health benefits of eating an apple? Be very brief."
})
print("Status:", res_chat.status_code)
data_chat = res_chat.get_json()
print("Success:", data_chat.get("success"))
print("Model:", data_chat.get("model"))
print("Reply:\n", data_chat.get("reply"))
assert data_chat.get("success") is True, f"Chat failed: {data_chat}"

print("\n" + "=" * 60)
print("TEST 3: /api/nvidia/vision (Multimodal image + prompt)")
print("=" * 60)
# Create a test apple-like image
img = Image.new("RGB", (120, 120), color=(255, 255, 255))
from PIL import ImageDraw
draw = ImageDraw.Draw(img)
draw.ellipse((20, 20, 100, 100), fill=(200, 30, 30))
buf = io.BytesIO()
img.save(buf, format="JPEG")
b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

res_vision = client.post("/api/nvidia/vision", json={
    "prompt": "Identify what is in this image and describe its color in 1 brief sentence.",
    "image_base64": b64
})
print("Status:", res_vision.status_code)
data_vision = res_vision.get_json()
print("Success:", data_vision.get("success"))
print("Model:", data_vision.get("model"))
print("Reply:\n", data_vision.get("reply"))
assert data_vision.get("success") is True, f"Vision failed: {data_vision}"

print("\n" + "=" * 60)
print("TEST 4: Validation error (Oversized image check)")
print("=" * 60)
from backend.nvidia_service import validate_image_data
oversized_dummy = b"0" * (11 * 1024 * 1024)
is_valid, err_msg, _ = validate_image_data(oversized_dummy)
print("Is valid (11MB):", is_valid)
print("Error message:", err_msg)
assert not is_valid and "exceeds 10MB limit" in err_msg

print("\n" + "=" * 60)
print("ALL BACKEND ENDPOINTS PASSED CLEANLY!")
print("=" * 60)
