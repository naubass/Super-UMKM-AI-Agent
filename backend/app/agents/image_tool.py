# backend/app/agents/image_tool.py
import requests
import urllib.parse
import random
import base64
from app.core.config import settings

def generate_image_url(prompt: str) -> str:
    """
    Menerima Prompt Matang dan langsung mengirimnya.
    PENTING: Jangan tambahkan enhanced_prompt lagi di sini agar teks tidak rusak.
    """
    api_key = settings.POLLINATIONS_API_KEY
    
    if not api_key:
        return "https://placehold.co/800x600?text=API+Key+Missing"

    encoded_prompt = urllib.parse.quote(prompt)
    seed = random.randint(0, 999999)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&seed={seed}&model=flux&nologo=true"

    print(f"🔄 Mengunduh desain logo...")

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Super-UMKM-Agent/1.0"
        }
        
        response = requests.get(url, headers=headers, timeout=60)
        
        if response.status_code == 200:
            image_data = base64.b64encode(response.content).decode('utf-8')
            return f"data:image/jpeg;base64,{image_data}"
        else:
            print(f"❌ Error API: {response.text}")
            return "https://placehold.co/800x600?text=Gagal+Load"

    except Exception as e:
        print(f"❌ Exception: {e}")
        return "https://placehold.co/800x600?text=Server+Error"