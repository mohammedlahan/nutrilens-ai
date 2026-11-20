import sys
import os

try:
    import tensorflow as tf
    print("TensorFlow version:", tf.__version__)
except Exception as e:
    print("Error importing TensorFlow:", e)

try:
    import keras
    print("Keras version:", keras.__version__)
except Exception as e:
    print("Error importing Keras:", e)

model_path = os.path.join("models", "effnet", "food_cnn_effnet.keras")
print(f"Testing model load from: {model_path}")
if not os.path.exists(model_path):
    print("File does not exist:", model_path)
    sys.exit(1)

try:
    model = keras.models.load_model(model_path)
    print("SUCCESS: EfficientNetV2-B0 model loaded cleanly!")
    print("Model Input Shape:", model.input_shape)
    print("Model Output Shape:", model.output_shape)
except Exception as e:
    print("FAILED TO LOAD MODEL:")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {e}")
    sys.exit(1)
