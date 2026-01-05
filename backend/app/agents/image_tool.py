import os
import uuid
from huggingface_hub import InferenceClient
from app.core.config import settings

# Setup Folder Penyimpanan
STATIC_DIR = "static/images"
os.makedirs(STATIC_DIR, exist_ok=True)

MODEL_ID = "black-forest-labs/FLUX.1-schnell" 

client = InferenceClient(model=MODEL_ID, token=settings.HUGGINGFACE_API_TOKEN)

def generate_image_url(prompt: str, is_poster: bool = False) -> str:
    """
    Generate gambar menggunakan Hugging Face Free API.
    Gambar disimpan lokal, lalu fungsi mengembalikan URL lokal.
    """
    try:
        print(f"🎨 Generating image via HuggingFace ({MODEL_ID})...")
        print(f"📝 Prompt: {prompt[:50]}...")

        enhanced_prompt = prompt
        if is_poster:
            enhanced_prompt += ", professional advertisement poster, high quality, 4k, sharp focus, vibrant colors"
        else:
            enhanced_prompt += ", minimalist modern logo, vector style, flat design, white background, high resolution"

        image = client.text_to_image(enhanced_prompt)

        filename = f"image_{uuid.uuid4().hex[:6]}.png"
        file_path = os.path.join(STATIC_DIR, filename)
        
        image.save(file_path)
        print(f"✅ Gambar tersimpan di: {file_path}")

        return f"http://localhost:8000/static/images/{filename}"

    except Exception as e:
        print(f"❌ Error HuggingFace: {str(e)}")
        return "https://via.placeholder.com/1024x1024.png?text=Gagal+Generate+Gambar"