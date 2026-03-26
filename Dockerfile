# ===================================================
# Li-Vision API — Dockerfile para Render
# ===================================================
# MediaPipe precisa de bibliotecas OpenGL ES (libGLESv2)
# que não vêm instaladas em servidores headless.
# Este Dockerfile instala as dependências do sistema.
# ===================================================

FROM python:3.11-slim-bookworm

# Instala dependências do sistema necessárias para:
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

# Copia e instala dependências Python primeiro (cache de layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código da aplicação
COPY . .

# Porta padrão do Render
EXPOSE 10000

# Comando de inicialização (shell form para expandir $PORT do Render)
CMD uvicorn src.api.server:app --host 0.0.0.0 --port ${PORT:-10000}
