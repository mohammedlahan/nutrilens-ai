# NutriLens AI — Intelligent Food Recognition, USDA Nutrition & Chef Recipe Generator

[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Flask Backend](https://img.shields.io/badge/Backend-Python%20Flask-3776AB?logo=python&logoColor=white)](https://flask.palletsprojects.com/)
[![TensorFlow / Keras](https://img.shields.io/badge/AI%2FML-TensorFlow%20%2F%20MobileNetV2-FF6F00?logo=tensorflow&logoColor=white)](https://tensorflow.org/)
[![Google Gemini](https://img.shields.io/badge/Multimodal-Gemini%202.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![USDA FoodData Central](https://img.shields.io/badge/Nutrition-USDA%20FoodData%20Central-4CAF50)](https://fdc.nal.usda.gov/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **NutriLens AI** is an end-to-end computer vision and culinary intelligence system. The user photographs or scans fresh produce, grocery items, or prepared dishes. The system instantly classifies the food item, retrieves verified macro- and micronutrients from authoritative nutrition standards, and synthesizes practical, realistic chef recipes tailored to the user's available pantry and dietary goals.

---

## Table of Contents

1. [Executive Summary & Concept](#1-executive-summary--concept)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [How the Project Works](#3-how-the-project-works)
4. [Frameworks & Technologies Used](#4-frameworks--technologies-used)
5. [Database & Data Storage Architecture](#5-database--data-storage-architecture)
6. [AI & Computer Vision Models](#6-ai--computer-vision-models)
7. [Repository Structure](#7-repository-structure)
8. [Backend API Reference](#8-backend-api-reference)
9. [Installation & Local Setup](#9-installation--local-setup)
10. [Configuration & Environment Variables](#10-configuration--environment-variables)
11. [Training Pipeline & Colab Notebook](#11-training-pipeline--colab-notebook)
12. [Project Roadmap (v1 to v3)](#12-project-roadmap-v1-to-v3)

---

## 1. Executive Summary & Concept

- **The Problem:** People frequently have raw fruits, vegetables, or pantry staples at home but do not know their precise nutritional value (calories, proteins, vitamins) or what practical recipes they can cook without purchasing expensive, exotic ingredients.
- **The Solution:** A unified multimodal web platform where users can either take a live photo using their phone/laptop camera, upload a photo from their gallery, or ask via voice/text. The system identifies the food via a fine-tuned **MobileNetV2 CNN** or **Google Gemini Multimodal Vision**, looks up lab-verified nutritional values from **USDA FoodData Central** and the **Indian Food Composition Tables (IFCT 2017)**, and crafts simple, realistic recipes that use household pantry essentials.
- **Academic & Industry Relevance:** Built as a computer vision capstone project demonstrating transfer learning, edge model serving, RESTful API design, multimodal LLM orchestration, and modern responsive web development.

---

## 2. End-to-End System Architecture

```text
                               +-------------------------------------------------+
                               |           NutriLens Web User Interface          |
                               |  (React 19 + Vite + Glassmorphic Responsive UI) |
                               +-----------------------+-------------------------+
                                                       |
                  +------------------------------------+-----------------------------------+
                  |                                    |                                   |
                  v                                    v                                   v
         [Live Camera Modal]                 [Gallery File Upload]                [Voice / Text Chat]
     WebRTC / getUserMedia API              Base64 FileReader Engine           HTML5 Speech Recognition
                  |                                    |                                   |
                  +------------------------------------+-----------------------------------+
                                                       |
                                                       v
                                     +-----------------------------------+
                                     |    nutriLensService.js Orchestrator|
                                     +-----------------+-----------------+
                                                       |
                       +-------------------------------+-------------------------------+
                       | (Provider: Google / OpenAI)                                   | (Provider: Local Backend)
                       v                                                               v
         +---------------------------+                                   +---------------------------+
         |   Multimodal Cloud LLM    |                                   |     Flask Python Server   |
         |  - Google Gemini 2.5 Flash|                                   |      (localhost:5000)     |
         |  - OpenAI GPT-4o / mini   |                                   +-------------+-------------+
         +-------------+-------------+                                                 |
                       |                                                 +-------------+-------------+
                       |                                                 v                           v
                       |                                     +-----------------------+   +-------------------+
                       |                                     |  MobileNetV2 CNN Keras|   | USDA & IFCT Local |
                       |                                     | (36 Produce Classes)  |   | Database Cache    |
                       |                                     +-----------+-----------+   +---------+---------+
                       |                                                 |                         |
                       +-------------------------------+-----------------+-------------------------+
                                                       |
                                                       v
                                     +-----------------------------------+
                                     |  Strict Culinary Recipe Engine    |
                                     |  - 2 to 4 Realistic Ingredients   |
                                     |  - Verified Macros / Micronutrients|
                                     |  - Cooking & Prep Step Instructions|
                                     +-----------------+-----------------+
                                                       |
                                                       v
                                     +-----------------------------------+
                                     |   Interactive Chat Presentation   |
                                     |  - Interactive Checklist & Macros |
                                     |  - Text-to-Speech (Read Aloud)    |
                                     |  - Copy Markdown Recipe           |
                                     |  - Saved to LocalStorage Sessions |
                                     +-----------------------------------+
```

---

## 3. How the Project Works

### Step 1: Image Capture & Preprocessing
1. **Live Camera Capture:** Utilizing HTML5 `navigator.mediaDevices.getUserMedia`, the app provides a full-screen camera viewfinder with real-time video streaming, front/rear camera switching (`facingMode: 'environment'`), and torch/flashlight toggle.
2. **Gallery Pick:** Users can upload food images directly from their device.
3. **Format Normalization:** Captured canvas frames or files are converted to JPEG Base64 and sent to the inference pipeline.

### Step 2: Intelligent Dual-Engine Food Classification
The application implements an intelligent dual-engine fallback pipeline:
1. **Cloud Multimodal Vision (Primary):** Powered by **Google Gemini 2.5 Flash** (via `@google/genai` or direct Google AI Studio REST API) or **OpenAI GPT-4o**. It identifies raw produce, branded groceries, or cooked dishes with zero-shot generalization.
2. **Local Deep Learning Backend (Secondary / Offline):** If no API key is provided or the network is limited, requests route to the Flask server at `http://localhost:5000/api/predict`. The image is resized to `160x160x3`, normalized to `[-1, 1]`, and classified by a transfer-learned **MobileNetV2** model across 36 food classes.
3. **Client-Side Heuristic Fallback (Tertiary):** Built-in catalog matching guarantees zero UI downtime even without server connectivity.

### Step 3: Verified Nutritional Lookup (No Hallucinations)
A cardinal rule of NutriLens AI is: **Nutritional values are never generated or hallucinated by an LLM.**
- Every recognized food item is linked to lab-verified databases:
  - **USDA FoodData Central (FDC)** foundation foods (FDC IDs).
  - **Indian Food Composition Tables (IFCT 2017)** for regional Indian produce (bitter gourd, okra, drumstick, etc.).
  - **OpenFoodFacts REST API** for barcode-scanned packaged staples.
- Nutrients calculated include calories, protein, carbohydrates, fats, dietary fiber, sugars, sodium, potassium, vitamin C, calcium, and iron per 100g and per standard unit (e.g., 1 medium apple ~182g).

### Step 4: Strict Ingredient Realism & Recipe Synthesis
Standard AI recipe generators frequently hallucinate exotic, expensive ingredients (e.g., suggesting a user needs chia seeds, walnut oil, or saffron when they only scanned a banana). NutriLens AI enforces **Strict Ingredient Realism**:
- Single fruits default to fresh juices, simple fruit salads, or 2-ingredient purees.
- Single vegetables default to simple homestyle sautés, fresh crisp salads, or quick soups.
- Total recipe ingredients are capped at 2 to 4 items.
- Non-scanned ingredients are strictly limited to universal household staples (water, salt, pepper, lemon, cooking oil).

### Step 5: Multi-Turn Conversational Chef Guidance
Users can continue the conversation with the AI chef:
- Ask for ingredient substitutions ("I don't have olive oil, can I use butter?").
- Ask for storage advice ("How do I store cut apples so they don't turn brown?").
- Adjust dietary goals (High Protein, Keto, Low Calorie, Vegan, Balanced).
- Listen to recipes aloud using speech synthesis, copy recipes as GitHub Flavored Markdown, or track completed steps using interactive checkboxes.

---

## 4. Frameworks & Technologies Used

### Frontend Stack
| Layer | Technology | Description |
|---|---|---|
| **Core Framework** | **React 19** (`react@^19.2.8`, `react-dom@^19.2.8`) | Latest React architecture utilizing modern hooks (`useRef`, `useState`, `useEffect`). |
| **Build Tool & Dev Server**| **Vite 8** (`vite@^8.3.0`) | Lightning-fast ESM dev server with Hot Module Replacement (HMR). |
| **Styling** | **Pure Vanilla CSS** | Clean CSS architecture with custom CSS custom properties (`--gemini-surface`, `--gemini-emerald`), responsive layout, and mobile drawer. |
| **Iconography** | **Lucide React** (`lucide-react@^1.58.0`) | Modern feather-style SVG icon set. |
| **Animations & Confetti** | **Canvas-Confetti** (`canvas-confetti@^1.9.4`) | Interactive celebration animations for goal completion. |
| **Linting & Code Quality** | **Oxlint** (`oxlint@^1.81.0`) | Ultra-fast Rust-based JavaScript and JSX linter. |
| **Hardware APIs** | **HTML5 Web APIs** | `MediaDevices.getUserMedia`, `SpeechRecognition`, `SpeechSynthesis`, `Clipboard API`. |

### Backend Stack
| Layer | Technology | Description |
|---|---|---|
| **Framework** | **Python Flask** (`flask`, `flask-cors`) | Lightweight, production-ready micro-framework exposing REST endpoints. |
| **Deep Learning** | **TensorFlow 2.16+ / Keras 3** | Neural network runtime executing MobileNetV2 inference. |
| **Image Processing** | **Pillow (PIL)** & **NumPy** | High-performance image decoding, bilinear resizing, and array transformations. |
| **GenAI Integration** | **Google GenAI SDK** (`google.genai`) | Official client SDK for Google Gemini 2.5 Flash and Gemini 3.5 Flash Lite. |

---

## 5. Database & Data Storage Architecture

NutriLens AI uses a **hybrid multi-tier database and caching architecture** designed for sub-second response times, verified nutrition integrity, and offline resiliency:

```text
+-----------------------------------------------------------------------------------+
|                            DATABASE & DATA ARCHITECTURE                           |
+-----------------------------------------------------------------------------------+
|  1. Client-Side Persistent Database (Browser LocalStorage)                         |
|     - `nutrilens_chat_sessions`: Full conversation history, messages, recipes     |
|     - `nutrilens_google_api_key`: Encrypted/stored Google AI Studio API key       |
|     - `nutrilens_openai_api_key`: Stored OpenAI API key                           |
|     - `nutrilens_active_provider`: Active LLM provider selection ('google'/'openai')|
+-----------------------------------------------------------------------------------+
|  2. In-Memory Embedded Relational Datasets                                        |
|     - `FOOD_DATABASE` (src/data/foodDatasets.js): 36 complete produce entries     |
|       (USDA FDC IDs, scientific names, macro/micronutrients, unit ratios)         |
|     - `RECIPES_DATABASE` (src/data/foodDatasets.js): Curated base recipes         |
|     - `NUTRITION_DATABASE` (backend/app.py): Python server nutrition mirror       |
|     - `class_to_category.csv` (models/): 18 food categories across 143 items     |
|     - `class_names.json` (models/): 36 target neural network classes              |
+-----------------------------------------------------------------------------------+
|  3. Authoritative External Nutrition & Product APIs                               |
|     - USDA FoodData Central (FDC) REST API (api.nal.usda.gov)                     |
|     - Indian Food Composition Tables 2017 (ICMR - National Institute of Nutrition) |
|     - OpenFoodFacts REST API (world.openfoodfacts.org) for Barcode / GTIN products|
|     - RecipeNLG & Recipe1M+ corpora for culinary pattern grounding                |
+-----------------------------------------------------------------------------------+
|  4. Binary Model Weights & Feature Artifacts                                      |
|     - `food_cnn_mobilenetv2.keras`: Serialized Keras 3 deep learning weights     |
+-----------------------------------------------------------------------------------+
```

### Detailed Breakdown of Databases:

#### 1. Browser Client Storage (`localStorage`)
- **Key: `nutrilens_chat_sessions`**: Persists conversation history as JSON. Each session holds:
  - `id`: Unique timestamped identifier (`chat-<timestamp>`)
  - `title`: Extracted dish or ingredient title
  - `date`: Localized date of scan
  - `messages`: Complete chat thread, including detected produce name, confidence score, verified nutrition object, structured recipe (title, ingredients list with checkboxes, step-by-step instructions, chef tips), and timestamps.
- **Key: `nutrilens_google_api_key`**: User-configured Google AI Studio API key.
- **Key: `nutrilens_openai_api_key`**: User-configured OpenAI API key.
- **Key: `nutrilens_active_provider`**: Active LLM provider toggle (`google` or `openai`).

#### 2. Local In-Memory Produce & Nutrition Database (`src/data/foodDatasets.js` & `backend/app.py`)
A comprehensive, verified catalog of 36 primary fruits and vegetables containing:
- **Identifier & Taxonomy:** Common name, scientific botanical name (`Malus domestica`, `Solanum lycopersicum`, etc.), produce category.
- **USDA FDC Reference ID:** Official identifier corresponding to the USDA FoodData Central foundation database.
- **Serving Standards:** Standard serving size (100g reference) and customary household unit description with unit multiplier ratio (e.g., 1 medium banana ~118g, ratio `1.18`).
- **Complete Macro & Micro Nutrient Profile:**
  - Calories (kcal), Protein (g), Carbohydrates (g), Total Fat (g), Dietary Fiber (g), Natural Sugars (g)
  - Sodium (mg), Potassium (mg), Vitamin C (mg), Calcium (mg), Iron (mg)
- **Dietary & Health Tags:** High Fiber, Low Calorie, Heart Healthy, Potassium Rich, Vegan, etc.
- **Agricultural Storage Tips:** Optimal temperature and humidity storage recommendations.

#### 3. 18-Category Comprehensive Food Taxonomy (`models/class_to_category.csv`)
An expanded taxonomy mapping 143 items across 18 culinary categories:
- Fruits, Vegetables, Leafy Greens & Herbs, Grains, Pulses/Legumes, Nuts & Seeds, Dairy, Milk Alternatives, Eggs & Animal Proteins, Fish & Seafood, Oils & Cooking Fats, Spices & Seasonings, Sweeteners & Baking, Condiments & Sauces, Packaged Staples, Packaged Snacks, Beverages, and Prepared Dishes.

#### 4. External Live Database APIs
- **USDA FoodData Central API (`src/services/nutritionApi.js`):** Queries live USDA foundation food items using `https://api.nal.usda.gov/fdc/v1/foods/search`.
- **OpenFoodFacts API (`src/services/nutritionApi.js`):** Queries packaged food items and barcodes using `https://world.openfoodfacts.org/api/v3/product/{barcode}.json`.

---

## 6. AI & Computer Vision Models

### 1. MobileNetV2 Transfer Learning CNN (`models/food_cnn_mobilenetv2.keras`)
- **Base Architecture:** Google MobileNetV2 pretrained on ImageNet.
- **Design Rationale:** MobileNetV2 uses inverted residual blocks and depthwise separable convolutions, delivering high accuracy with minimal parameter overhead (`~5.4M` total parameters, `~1.57M` trainable parameters), making it ideal for low-latency web serving and edge deployment.
- **Input Resolution:** `160 x 160 x 3` RGB image normalized via an internal rescaling layer (`[-1, 1]`).
- **Output:** Softmax distribution over 36 classes with top-1, top-3, and top-5 confidence intervals.
- **Classes Covered (36):**
  `apple`, `banana`, `beetroot`, `bell pepper`, `cabbage`, `capsicum`, `carrot`, `cauliflower`, `chili pepper`, `corn`, `cucumber`, `eggplant`, `garlic`, `ginger`, `grapes`, `jalapeno`, `kiwi`, `lemon`, `lettuce`, `mango`, `onion`, `orange`, `paprika`, `pear`, `peas`, `pineapple`, `pomegranate`, `potato`, `radish`, `soybean`, `spinach`, `sweetcorn`, `sweet potato`, `tomato`, `turnip`, `watermelon`.

### 2. Google Gemini 2.5 Flash Multimodal Engine
- **Model:** `gemini-2.5-flash` / `gemini-3.5-flash-lite` via Google GenAI SDK.
- **Role:** Handles arbitrary food photos (multi-ingredient dishes, plated meals, packaged snacks) and powers conversational multi-turn cooking assistance.

---

## 7. Repository Structure

```text
recipe/
├── backend/                              # Python Flask backend
│   ├── .env                              # Backend environment secrets (PORT, GEMINI_API_KEY)
│   └── app.py                            # Flask server, model inference, & culinary endpoints
├── models/                               # Machine Learning models and mappings
│   ├── class_names.json                  # JSON list of 36 classification target classes
│   ├── class_to_category.csv             # 18-category taxonomy across 143 food items
│   └── food_cnn_mobilenetv2.keras        # Serialized MobileNetV2 Keras 3 neural network model
├── public/                               # Static web assets
├── src/                                  # React 19 Frontend source code
│   ├── assets/                           # SVG icons and visual assets
│   ├── components/                       # Reusable React UI components
│   │   ├── CameraScannerModal.jsx        # Live camera viewfinder with WebRTC video stream
│   │   ├── DatasetExplorer.jsx           # Dataset browsing & taxonomy inspect modal
│   │   ├── GeminiLogo.jsx                # SVG logo for Google Gemini AI
│   │   ├── Header.jsx                    # Top navigation bar
│   │   ├── ImageScanner.jsx              # Standalone drag-and-drop image analyzer
│   │   ├── MealTracker.jsx               # Daily calorie and macro progress tracker
│   │   ├── NutriLensLogo.jsx             # Animated brand logo component
│   │   ├── NutritionCard.jsx             # Detailed nutrition breakdown card
│   │   ├── RecipeDetailModal.jsx         # Full-screen recipe view with cooking instructions
│   │   ├── RecipeFinder.jsx              # Ingredient-matching recipe search engine
│   │   ├── SamplePickerModal.jsx         # Quick-test sample produce picker
│   │   └── SettingsModal.jsx             # API keys configuration & dietary preferences modal
│   ├── data/
│   │   └── foodDatasets.js               # In-memory USDA & IFCT food & recipe database (50KB)
│   ├── services/
│   │   ├── foodClassifier.js             # MobileNetV2 backend client & local fallback
│   │   ├── nutriLensService.js           # Multi-provider LLM & culinary orchestrator (Gemini/OpenAI)
│   │   ├── nutritionApi.js               # USDA FoodData Central & OpenFoodFacts API clients
│   │   └── recipeEngine.js               # Algorithmic ingredient matching & culinary generator
│   ├── App.css                           # Component-specific styles
│   ├── App.jsx                           # Main application layout, chat loop, & state manager
│   ├── index.css                         # Global CSS tokens, dark theme, & responsive rules
│   └── main.jsx                          # React application root entry point
├── .env                                  # Frontend environment variables (VITE_GOOGLE_API_KEY, etc.)
├── .gitignore                            # Git exclusion rules
├── .oxlintrc.json                        # Oxlint rules configuration
├── food_recognition_cnn_colab.ipynb      # Google Colab notebook for training MobileNetV2
├── index.html                            # HTML entry point with metadata and Google Fonts
├── package.json                          # Node.js dependencies and build scripts
├── requirements.txt                      # Python backend dependencies
└── vite.config.js                        # Vite configuration
```

---

## 8. Backend API Reference

The Flask backend runs on `http://localhost:5000` (or `PORT` specified in environment).

### 1. Health Check
- **Endpoint:** `GET /api/health`
- **Response:**
  ```json
  {
    "status": "online",
    "model_loaded": true,
    "model_path": "models/food_cnn_mobilenetv2.keras",
    "classes_count": 36,
    "timestamp": 1729761000.0
  }
  ```

### 2. Model Metadata
- **Endpoint:** `GET /api/model-info`
- **Response:** Details on input resolution (`160x160x3`), parameter count (`5,449,134`), framework, and class names list.

### 3. Food Catalog
- **Endpoint:** `GET /api/foods`
- **Response:** Array of all 36 produce items with USDA FDC IDs, scientific names, calories, macros, and diet tags.

### 4. CNN Food Image Prediction
- **Endpoint:** `POST /api/predict`
- **Payload:** Multipart form (`file` or `image`) OR JSON (`{ "image_base64": "<base64_string>" }`).
- **Response:**
  ```json
  {
    "success": true,
    "prediction": "apple",
    "confidence": 0.9842,
    "confidence_percent": 98.42,
    "top_match": {
      "id": "apple",
      "name": "Fresh Apple",
      "category": "Fruit",
      "scientificName": "Malus domestica",
      "nutrients": { "calories": 52, "protein_g": 0.26, "carbs_g": 13.81, "fat_g": 0.17, "fiber_g": 2.4 }
    },
    "top_3": [
      { "rank": 1, "class": "apple", "confidence_percent": 98.42 },
      { "rank": 2, "class": "pear", "confidence_percent": 1.15 },
      { "rank": 3, "class": "bell pepper", "confidence_percent": 0.21 }
    ],
    "inference_time_ms": 38.4
  }
  ```

### 5. AI Recipe Generation
- **Endpoint:** `POST /api/generate-recipe`
- **Payload:**
  ```json
  {
    "ingredients": ["apple"],
    "diet_goal": "Balanced",
    "cuisine": "Indian Fusion",
    "target_calories": 300
  }
  ```
- **Response:** Synthesized recipe with accurate macro distribution and step-by-step instructions.

### 6. Multimodal LLM Vision Analysis
- **Endpoint:** `POST /api/llm/analyze-food`
- **Payload:** `{ "image_base64": "<base64_string>", "prompt": "Identify food and suggest recipe", "diet_goal": "High Protein" }`
- **Response:** Gemini vision output with graceful fallback to local MobileNetV2.

### 7. NVIDIA Nemotron 3.5 Super VL Endpoints
- **Natural-Language Chat Endpoint:** `POST /api/nvidia/chat`
  - **Payload:**
    ```json
    {
      "prompt": "What are the health benefits of an orange?",
      "messages": [{"role": "user", "content": "Hello"}],
      "max_tokens": 1024,
      "temperature": 0.2
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "model": "nvidia/nemotron-3.5-super-vl-120b-a12b",
      "reply": "Oranges are rich in vitamin C, boost immunity, and provide dietary fiber.",
      "reasoning": "...",
      "status_code": 200
    }
    ```

- **Multimodal Food Vision Endpoint:** `POST /api/nvidia/vision`
  - **Payload:** Multipart form (`image` or `file`) OR JSON:
    ```json
    {
      "prompt": "Identify this food item and suggest a recipe.",
      "image_base64": "<base64_jpeg_or_png_string>",
      "max_tokens": 1500
    }
    ```
  - **Validation & Limits:** Supports JPEG, PNG, WEBP up to 10MB. Returns HTTP 400 for invalid formats/sizes and HTTP 429 for rate limits.
  - **Response:** Multimodal reasoning, food identification, and culinary recipe suggestions.

### 8. Conversational Chef Chat
- **Endpoint:** `POST /api/llm/chat`
- **Payload:** `{ "messages": [...], "recipe_context": { "title": "Fresh Apple Slices" }, "provider": "nvidia" }`

---

## 9. Installation & Local Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Python:** v3.10 or higher
- **Git**

### Step 1: Clone or Navigate to Repository
```bash
cd d:/akumen/recipe
```

### Step 2: Set Up & Run Frontend
```bash
# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend will start at **`http://localhost:5173`**.

### Step 3: Set Up & Run Python Backend
In a separate terminal:
```bash
# Create Python virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
pip install openai pillow flask flask-cors

# Start the Flask API server
python backend/app.py
```
The backend will start at **`http://localhost:5000`** with EfficientNetV2-B0 / MobileNetV2 and the official NVIDIA Nemotron 3.5 Super VL service pre-configured.

### Step 4: Run Verification Tests
```bash
# Run NVIDIA unit and integration tests (health check, natural language question, multimodal vision, validation)
python -m unittest tests/test_nvidia.py

# Run live endpoint verification script
python scripts/test_nvidia_endpoints.py
```

---

## 10. Configuration & Environment Variables

### Environment Configuration (`.env`)
Create or edit `.env` in the root and/or `backend/.env` (see `.env.example`):
```env
# Server & Model Configuration
PORT=5000
MODEL_VERSION=effnet

# NVIDIA NIM API (Nemotron 3.5 Super VL 120B-A12B)
# Loaded strictly by backend; NEVER exposed in frontend code or browser requests
NVIDIA_API_KEY=nvapi-your-key-here

# Google AI Studio API Key (optional alternative)
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_API_KEY=your_google_api_key_here

# OpenAI API Key (optional alternative)
OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```
> *Note: Users can also input or change their Google AI Studio or OpenAI API key directly within the app using the **Settings Modal** (gear icon).*

### Backend Configuration (`backend/.env`)
```env
PORT=5000
GEMINI_API_KEY=your_google_api_key_here
```

---

## 11. Training Pipeline & Colab Notebook

The project includes an end-to-end training notebook: **`food_recognition_cnn_colab.ipynb`**.

### Key Highlights of the Training Pipeline:
1. **Data Acquisition:** Supports automated fetching from Kaggle (`Fruits and Vegetables Image Recognition Dataset` by Kritik Seth), Hugging Face, or custom Google Drive zip archives.
2. **Data Pipeline:** `tf.keras.utils.image_dataset_from_directory` with automatic train/validation/test split validation (80/10/10).
3. **Data Augmentation:** Random flip, rotation (`0.15`), zoom (`0.15`), and contrast adjustments to simulate real smartphone camera lighting conditions.
4. **Model Architecture:**
   - Pretrained `MobileNetV2(weights='imagenet', include_top=False)`
   - Global Average Pooling 2D
   - Dropout (`0.25`)
   - Dense Softmax Output (`36` classes)
5. **Two-Stage Training:**
   - **Stage 1 (Feature Extraction):** MobileNetV2 base frozen, training top classifier with Adam optimizer (`lr=1e-3`) for 10 epochs.
   - **Stage 2 (Fine-Tuning):** Unfreezing top 40 layers of MobileNetV2 with low learning rate (`lr=1e-5`) for 15 epochs.
6. **Evaluation Metrics:** Top-1 Accuracy, Top-3 Accuracy, Per-class Precision/Recall/F1-Score, and Confusion Matrix.
7. **Model Export:** Exports both full Keras 3 format (`food_cnn_mobilenetv2.keras`) and quantized TensorFlow Lite (`.tflite`) for mobile edge devices.

---

## 12. Project Roadmap (v1 to v3)

| Milestone | Scope & Capabilities | Status |
|---|---|---|
| **Version 1 (MVP - Current)** | Single food item per photo, 36-class MobileNetV2 CNN, Google Gemini multimodal vision, USDA FDC & IFCT verified nutrition, strict ingredient realism recipe synthesis, live WebRTC camera scanner, voice input, responsive UI with dark glassmorphic theme. | **Completed & Operational** |
| **Version 2 (Q4 2026)** | Multi-item detection on a single plate/cutting board using YOLOv8/v11 object detection bounding boxes; expanded Indian produce dataset (bitter gourd, okra, drumstick); multi-ingredient basket recipe matching. | In Planning |
| **Version 3 (2027)** | Barcode scanner integration for packaged goods via OpenFoodFacts, visual portion/volume estimation using monocular depth estimation, native mobile application (React Native / Flutter) running quantized TFLite on-device. | Future Release |

---

## Authors & Acknowledgments

- **Developed for:** Academic Evaluation, Mentor Capstone Review, and Engineering Portfolio.
- **Nutritional Standards:** USDA FoodData Central (FDC) & ICMR-National Institute of Nutrition (IFCT 2017).
- **Vision Datasets:** Fruits and Vegetables Image Recognition Dataset (Kaggle), Fruits-360, VegNet.
