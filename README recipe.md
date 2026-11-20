# Food Recognition, Recipe and Nutrition App: Project README

*Summary of the work done so far (October 2026)*

## 1. Project in brief

- **Idea:** the user photographs fruits, vegetables or other food items. A **CNN** recognises each item, the app lists **recipes** that use them, and a **nutrition tracker** shows calories and macros.
- **Type:** CNN project set by the mentor. Built by a team, for academic evaluation and as a portfolio piece for recruiters.
- **Market:** India and global users. **Platform:** web first, mobile later.
- **Main user for Version 1:** students and busy professionals. Other groups (fitness users, families) are handled with simple filters.

## 2. Documents created

| # | Document | Status | Link |
|---|---|---|---|
| 1 | Market Research | Final (Version 1.0), with sources | https://claude.ai/code/artifact/44d2203e-cb39-4dab-81ab-4d3e33b86ef7 |
| 2 | Problem Statement | Drafted | https://claude.ai/code/artifact/e384d969-afd5-4e51-a673-aec10eebc6e2 |
| 3 | Dataset Sources | Drafted | https://claude.ai/code/artifact/24530118-98d1-497f-b720-2953a9977450 |
| 4 | Colab notebook (`food_recognition_cnn_colab.ipynb`) | Built and tested on synthetic data | File in this folder |

## 3. How the project evolved

- Started as an "AI recipe generator and nutrition tracker" built on typed ingredients.
- Refocused when the mentor made it a **CNN image-recognition project**. The whole plan was reworked around photo → CNN → recipes → nutrition.
- The market research was simplified in plain language, with a glossary, and unneeded parts were removed on your request (pantry and expiry features, some market drivers, the Next steps section).
- "Optional" labels were removed for the final version.

## 4. Key findings from the market research

- **Market size** varies a lot between reports. Diet and nutrition apps range from about USD 6 to 14 billion (2025), recipe apps from about USD 1.4 to 6.1 billion. All grow at double-digit rates.
- **Competitors checked:**
  - MyFitnessPal has a photo Meal Scan feature (Premium).
  - Foodvisor, Cal AI and SnapCalorie log meals from photos.
  - **Samsung Food+** is the closest competitor. It recognises ingredients in a photo and suggests recipes, but it is a paid feature of a larger platform, and its supported languages listed in 2024 did not include Indian languages.
- **Project position:** a free, standalone tool that links ingredient photo, recipes and nutrition, built on a CNN, with Indian ingredient coverage.

## 5. Scope decisions

- **Version 1 (MVP):** one food item per photo, CNN recognition of 30 to 50 foods, user can correct the result, recipe list, nutrition per serving, simple daily summary.
- **Version 2:** several items per photo (object detection, for example YOLO), more Indian foods.
- **Version 3:** packaged products, portion size, mobile app.
- **Nutrition rule:** nutrition values always come from verified databases. The model only recognises the food.
- **Proposed targets (agree with mentor):** at least 85% top-1 and 95% top-3 accuracy on a separate test set, tested on real phone photos.

## 6. Datasets identified

| Need | Source |
|---|---|
| Food images | Fruits-360 (https://data.mendeley.com/datasets/rp73yg93n8/7), Kaggle 36-class Fruits and Vegetables set (https://hyper.ai/en/datasets/32609), your own phone photos |
| Indian vegetables | Nature's Best vs. Bruised (https://data.mendeley.com/datasets/b2mvj3kjfx), VegNet (https://data.mendeley.com/datasets/73n5hrn8hh) |
| Packaged products (Version 3) | Open Food Facts (https://huggingface.co/datasets/openfoodfacts/product-database) |
| Nutrition | USDA FoodData Central (https://fdc.nal.usda.gov/api-guide), Indian Food Composition Tables 2017 (https://nin.res.in/ebooks/IFCT2017.pdf) |
| Recipes | RecipeNLG (https://www.tensorflow.org/datasets/community_catalog/huggingface/recipe_nlg), Recipe1M+, plus 50 to 100 Indian recipes written by the team |

- **Known gap:** the Indian-specific image sets found cover only about ten vegetables. Okra, bitter gourd and drumstick were not found, so own photos are needed.
- **Licences** were read from search results, not from each dataset page. Confirm each one before use.

## 7. Colab notebook

- **Data connection:** three options. Kaggle download, Google Drive, or zip upload.
- **Data handling:** auto-detects folder layouts (train/validation/test, Training/Test, or a single folder), builds leak-free splits, shows samples and class counts.
- **Models:** a baseline CNN from scratch, and MobileNetV2 transfer learning (frozen stage, then fine-tuning).
- **Evaluation:** top-1 and top-3 accuracy, per-class precision, recall and F1, confusion matrix, wrong examples, model comparison.
- **Extras:** predict on an uploaded photo, save model and class list, copy to Drive, TFLite export.
- **Testing:** all non-Colab cells ran end to end on a small synthetic dataset. It has not yet been run on a real dataset or inside Colab.
- **How to run:** upload to colab.research.google.com, choose a T4 GPU runtime, run the cells from top to bottom, and use only one data option in Section 2.

## 8. Open items

- Run the notebook on a real dataset and record the results.
- Confirm the final class list, datasets and accuracy targets with the mentor.
- Check each dataset's licence on its own page.
- Collect your own phone photos (100 to 200 per class, especially Indian items) and keep a test set made only of them.
- Prepare the remaining project documentation: requirements (SRS), architecture and data-flow diagrams, dataset document, model evaluation report, test plan and user guide.
- Add team name and member details to the documents.
- Minor: the "India and global users" heading in the market research has no section number.

## 9. Update: 18-category dataset fetch

- **Target taxonomy:** 18 categories (fruits, vegetables, leafy greens and herbs, grains, pulses, nuts and seeds, dairy, milk alternatives, eggs and animal proteins, fish, oils, spices, sweeteners and baking, sauces, packaged staples, packaged snacks, beverages, prepared dishes), 143 items in total.
- **Dataset Sources document:** new Section 8 lists the best sources and links for each category, how each is fetched, and how well it covers the category.
- **Colab notebook, new Section 2B:** downloads or reads the datasets, maps their class names onto your item names, and builds one folder per item (`/content/data/<item>/`). It also writes `class_to_category.csv` and a coverage report that marks each item OK, LOW or MISSING.
- **Fetch methods:** Kaggle, Hugging Face, GitHub, manual zips from Google Drive (for Mendeley datasets), and the Open Food Facts API for packaged products.
- **Testing:** the matching, folder building, Open Food Facts flow (with mock data) and the hand-off to the training cells all ran on synthetic data. The real downloads were not run.
- **Known gaps:** no public set found for raw chicken, beef, mutton, pork or eggs, kale, or several grains. Categories 7, 8, 11, 13, 14, 15, 16 and 17 mostly give packaging photos. Own phone photos are needed for the gaps.
- **Unconfirmed names:** three Kaggle names and the Grocery Store GitHub repository were not confirmed on the sites. If a download fails, search the dataset name and fix it in the notebook.
- **Design note:** an image classifier can recognise a category such as milk or cooking oil, not the brand or nutrition facts. For branded products, scan the barcode or read the label and look the product up.
