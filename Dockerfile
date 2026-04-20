# ===================================================
# Li-Vision API — Dockerfile para Render
# ===================================================
# MediaPipe precisa de bibliotecas OpenGL ES (libGLESv2)
# que nao vem instaladas em servidores headless.
# PyTorch CPU-only para o modelo GRU dinamico.
# ===================================================

FROM python:3.11-slim-bookworm

# Instala dependencias do sistema necessarias para:
# - MediaPipe (libGLESv2, libegl1, libgl1)
# - OpenCV headless (libglib2.0, libsm6, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libegl1-mesa \
    libgles2-mesa \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia e instala dependencias Python primeiro (cache de layer)
COPY requirements.txt .

# Instala PyTorch CPU-only separadamente (index proprio)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Instala o restante das dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia o codigo da aplicacao
COPY . .

# Porta padrao do Render explicita ou via Env
EXPOSE 10000

# Exec mode garante que seja PID 1 para scan do Render
CMD ["sh", "-c", "uvicorn src.api.server:app --host 0.0.0.0 --port ${PORT:-10000}"]
