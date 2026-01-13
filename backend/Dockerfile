# 1. Gunakan Python versi ringan
FROM python:3.10-slim

# 2. Set folder kerja di dalam server
WORKDIR /app

# 3. Copy file requirements dulu
COPY requirements.txt .

# 4. Install library (tambah --no-cache-dir biar ringan)
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy semua sisa kode backend ke server
COPY . .

# 6. Buka port 7860 (Port WAJIB untuk Hugging Face)
EXPOSE 7860

# 7. Jalankan aplikasi (Perhatikan portnya 7860)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]