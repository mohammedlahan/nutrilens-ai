import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.environ.get("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={key}"
payload = {
    "contents": [{"parts": [{"text": "Reply with JSON: {\"status\": \"ok\"}"}]}],
    "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json", "maxOutputTokens": 800}
}
r = requests.post(url, json=payload, timeout=10)
print("Status:", r.status_code)
print("Response:", r.text[:200])
