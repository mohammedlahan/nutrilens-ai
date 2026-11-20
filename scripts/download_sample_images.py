"""
Downloads real sample food images for testing models in tests/sample_images/
"""
import os
import requests

SAMPLE_IMAGES = {
    "apple_1.jpg": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80",
    "banana_1.jpg": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80",
    "carrot_1.jpg": "https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=400&q=80",
    "cucumber_1.jpg": "https://images.unsplash.com/photo-1449339854873-750e6913301b?auto=format&fit=crop&w=400&q=80",
    "lemon_1.jpg": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=400&q=80",
    "orange_1.jpg": "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=400&q=80",
    "potato_1.jpg": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80",
    "tomato_1.jpg": "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=400&q=80",
    "watermelon_1.jpg": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80"
}

def download_samples():
    target_dir = os.path.join("tests", "sample_images")
    os.makedirs(target_dir, exist_ok=True)
    print(f"Downloading sample images to {target_dir}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    for filename, url in SAMPLE_IMAGES.items():
        dest = os.path.join(target_dir, filename)
        if not os.path.exists(dest):
            try:
                resp = requests.get(url, headers=headers, timeout=10)
                if resp.status_code == 200:
                    with open(dest, "wb") as f:
                        f.write(resp.content)
                    print(f"  Downloaded: {filename}")
                else:
                    print(f"  Failed ({resp.status_code}): {filename}")
            except Exception as e:
                print(f"  Error downloading {filename}: {e}")
        else:
            print(f"  Already exists: {filename}")

if __name__ == "__main__":
    download_samples()
