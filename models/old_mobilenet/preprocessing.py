"""
MobileNetV2 Preprocessing Reference & Backup
Input Resolution: 160 x 160
Normalization: Rescaling layer [0..255] -> [-1..1] or tf.keras.applications.mobilenet_v2.preprocess_input
"""

from PIL import Image
import numpy as np

IMG_SIZE = (160, 160)

def preprocess_image_mobilenet(image: Image.Image) -> np.ndarray:
    """
    Preprocess PIL image for MobileNetV2.
    Resizes to 160x160 and converts to float32 numpy array.
    """
    resized_img = image.resize(IMG_SIZE, Image.Resampling.BILINEAR)
    img_array = np.array(resized_img, dtype="float32")
    input_tensor = np.expand_dims(img_array, axis=0)  # Shape (1, 160, 160, 3)
    return input_tensor
