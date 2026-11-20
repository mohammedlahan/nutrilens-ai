import os
import requests

def get_api_key():
    for env_file in ["backend/.env", ".env"]:
        if os.path.exists(env_file):
            with open(env_file, "r") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip()
    return os.environ.get("GEMINI_API_KEY", "")

key = get_api_key()
candidates = [
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.5-pro",
    "gemini-3.8-flash"
]

for model in candidates:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": "Hello, respond with JSON {\"status\": \"ok\"}"}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 100, "responseMimeType": "application/json"}
    }
    try:
        r = requests.post(url, json=payload, timeout=8)
        if r.status_code == 200:
            print(f"[SUCCESS] Model: {model} -> {r.json()['candidates'][0]['content']['parts'][0]['text']}")
            break
        else:
            print(f"[FAILED] Model: {model} (Status {r.status_code}) -> {r.json().get('error', {}).get('message', '')[:100]}")
    except Exception as e:
        print(f"[ERROR] Model: {model} -> {e}")
