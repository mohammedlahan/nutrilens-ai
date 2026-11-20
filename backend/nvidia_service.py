"""
NVIDIA Nemotron 3.5 Super VL 120B-A12B Integration Service
Official OpenAI-compatible Python SDK for NVIDIA NIM
Model: nvidia/nemotron-3.5-super-vl-120b-a12b
Base URL: https://integrate.api.nvidia.com/v1
"""
import os
import io
import base64
import logging
from PIL import Image
from openai import OpenAI, RateLimitError, AuthenticationError, BadRequestError, APIError

logger = logging.getLogger("NvidiaNemotron")

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b"
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}


def get_nvidia_api_key():
    """Load NVIDIA_API_KEY from environment, backend/.env, or root .env."""
    key = os.environ.get("NVIDIA_API_KEY")
    if key and key.strip():
        return key.strip()

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(base_dir, ".env"),
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("NVIDIA_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if key:
                            os.environ["NVIDIA_API_KEY"] = key
                            return key
    return None


def get_nvidia_client():
    """Create official OpenAI-compatible client configured for NVIDIA NIM."""
    key = get_nvidia_api_key()
    if not key:
        raise ValueError("NVIDIA_API_KEY is not configured in environment variables.")
    return OpenAI(base_url=NVIDIA_BASE_URL, api_key=key)


def validate_image_data(img_bytes, mime_type=None):
    """
    Validate image file size and image integrity/format.
    Returns (is_valid, error_message, validated_mime)
    """
    if len(img_bytes) > MAX_IMAGE_SIZE_BYTES:
        return False, f"Image size ({len(img_bytes) / (1024*1024):.2f}MB) exceeds 10MB limit.", None

    try:
        image = Image.open(io.BytesIO(img_bytes))
        fmt = (image.format or "JPEG").upper()
        if fmt not in ALLOWED_FORMATS:
            return False, f"Unsupported image format: {fmt}. Allowed: JPEG, PNG, WEBP.", None
        
        detected_mime = f"image/{fmt.lower()}" if fmt != "JPG" else "image/jpeg"
        return True, None, detected_mime
    except Exception as e:
        return False, f"Invalid or corrupted image data: {e}", None


def query_nemotron(
    prompt="",
    image_bytes=None,
    image_base64=None,
    messages=None,
    max_tokens=1024,
    temperature=0.2,
    system_prompt=None
):
    """
    Query NVIDIA Nemotron 3.5 Super VL 120B-A12B with text prompt and/or image.
    Supports single prompt, image + prompt, or full conversation history.
    """
    client = get_nvidia_client()
    built_messages = []

    if system_prompt:
        built_messages.append({"role": "system", "content": system_prompt})

    # Prepare image data if provided
    img_data_url = None
    if image_bytes:
        is_valid, err, mime = validate_image_data(image_bytes)
        if not is_valid:
            return {"success": False, "error": err, "status_code": 400}
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        img_data_url = f"data:{mime};base64,{b64}"
    elif image_base64:
        clean_b64 = image_base64.split(",")[1] if "," in image_base64 else image_base64
        try:
            raw_bytes = base64.b64decode(clean_b64)
            is_valid, err, mime = validate_image_data(raw_bytes)
            if not is_valid:
                return {"success": False, "error": err, "status_code": 400}
            img_data_url = f"data:{mime};base64,{clean_b64}"
        except Exception as e:
            return {"success": False, "error": f"Invalid base64 image encoding: {e}", "status_code": 400}

    # Construct conversation payload
    if messages and isinstance(messages, list):
        for msg in messages:
            role = msg.get("role", "user")
            text = msg.get("content") or msg.get("text", "")
            built_messages.append({"role": role, "content": text})

    # Add current user prompt (multimodal or text)
    user_text = prompt or "Describe and analyze what you see in this image."
    if img_data_url:
        built_messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": user_text},
                {"type": "image_url", "image_url": {"url": img_data_url}}
            ]
        })
    elif not messages:
        built_messages.append({"role": "user", "content": user_text})

    try:
        response = client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=built_messages,
            max_tokens=max_tokens,
            temperature=temperature
        )

        choice = response.choices[0]
        msg = choice.message
        content = msg.content or ""
        reasoning = getattr(msg, "reasoning_content", None) or ""

        # If content was empty due to long reasoning, fall back to reasoning text
        final_reply = content if content.strip() else reasoning

        usage = {}
        if response.usage:
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

        return {
            "success": True,
            "reply": final_reply,
            "content": content,
            "reasoning": reasoning,
            "model": NVIDIA_MODEL,
            "finish_reason": choice.finish_reason,
            "usage": usage,
            "status_code": 200
        }

    except RateLimitError as e:
        logger.warning(f"NVIDIA API rate limit error: {e}")
        return {
            "success": False,
            "error": "NVIDIA API rate limit reached. Please wait a moment and try again.",
            "status_code": 429
        }
    except AuthenticationError as e:
        logger.error(f"NVIDIA API authentication error: {e}")
        return {
            "success": False,
            "error": "NVIDIA API key invalid or unauthorized. Please verify NVIDIA_API_KEY.",
            "status_code": 401
        }
    except BadRequestError as e:
        logger.error(f"NVIDIA API bad request: {e}")
        return {
            "success": False,
            "error": f"NVIDIA API bad request: {e.message if hasattr(e, 'message') else str(e)}",
            "status_code": 400
        }
    except APIError as e:
        logger.error(f"NVIDIA API service error: {e}")
        return {
            "success": False,
            "error": f"NVIDIA API service error: {e.message if hasattr(e, 'message') else str(e)}",
            "status_code": 502
        }
    except Exception as e:
        logger.exception(f"Unexpected error in query_nemotron: {e}")
        return {
            "success": False,
            "error": f"Internal error connecting to NVIDIA Nemotron: {str(e)}",
            "status_code": 500
        }
