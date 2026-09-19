# Multi-stage Dockerfile for Urban Intelligence Platform (SIH 2026 PS 26124)
# Stage 1: Build React Frontend Production SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install dependencies using exact lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend build configurations and sources
COPY tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Set production API base for same-origin routing
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 2: Python Backend & Single-URL Server
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for OpenCV and image operations
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python packages
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend and AI subsystem source code
COPY backend/ ./backend/
COPY ai/ ./ai/

# Copy compiled React production dist from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Environment configuration
ENV PORT=8000 \
    ENVIRONMENT=production \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Start single-URL FastAPI server
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
