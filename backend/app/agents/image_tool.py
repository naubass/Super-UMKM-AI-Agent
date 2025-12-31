import requests
import time
import os
from app.core.config import settings

def generate_image_url(prompt: str, is_poster: bool = False) -> str:
    """
    Generate Image menggunakan REPLICATE (Flux 1.1 Pro) via Direct API.
    Teknik ini MENGHINDARI error library 'pydantic' yang bentrok.
    """
    
    api_token = settings.REPLICATE_API_TOKEN 
    
    # Validasi Token
    if not api_token:
        print("❌ Error: REPLICATE_API_TOKEN belum diisi di .env")
        return "https://placehold.co/800x600?text=Token+Replicate+Missing"

    aspect_ratio = "3:4" if is_poster else "1:1"
    
    print(f"🚀 Replicate: Mengirim prompt ke Flux 1.1 Pro ({aspect_ratio})...")

    url = "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions"
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }

    data = {
        "input": {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": "jpg",
            "output_quality": 90,
            "safety_tolerance": 2
        }
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        
        if response.status_code != 201:
            print(f"❌ Gagal Start Replicate: {response.text}")
            return "https://placehold.co/800x600?text=Error+Start+Replicate"
        
        prediction = response.json()
        get_url = prediction["urls"]["get"] 
        
        print("⏳ Menunggu Flux menggambar...", end="", flush=True)
        
        start_time = time.time()
        while True:
            status_response = requests.get(get_url, headers=headers, timeout=30)
            status_data = status_response.json()
            
            status = status_data["status"]
            
            if status == "succeeded":
                print(" ✅ Selesai!")
                final_image_url = status_data["output"]
                return final_image_url
            
            elif status == "failed":
                print(f" ❌ Gagal! Error: {status_data.get('error')}")
                return "https://placehold.co/800x600?text=Replicate+Failed"
            
            elif status == "canceled":
                return "https://placehold.co/800x600?text=Replicate+Canceled"
            
            if time.time() - start_time > 120:
                print(" ❌ Timeout!")
                return "https://placehold.co/800x600?text=Timeout+Replicate"

            print(".", end="", flush=True)
            time.sleep(2)

    except Exception as e:
        print(f"\n❌ Exception System: {e}")
        return "https://placehold.co/800x600?text=System+Error"