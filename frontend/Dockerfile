# Gunakan image Node.js yang ringan (Alpine Linux)
FROM node:18-alpine

# Set folder kerja di dalam container
WORKDIR /app

# Copy package.json dan package-lock.json dulu (biar cache install-nya awet)
COPY package*.json ./

# Install dependencies (node_modules)
RUN npm install

# Copy seluruh kodingan frontend dari laptop ke container
COPY . .

# Buka port 5173 (Port default Vite)
EXPOSE 5173

# Jalankan server development dengan flag --host (PENTING: biar bisa diakses dari luar container)
CMD ["npm", "run", "dev", "--", "--host"]