# Começando

Este guia orienta a execução local dos três blocos principais: documentação, backend e aplicativo mobile.

## Pre-requisitos

| Área | Requisito |
| --- | --- |
| Documentação | Python 3.10+ e MkDocs Material. |
| Backend | Python 3.10+, ambiente virtual e dependências de `requirements.txt`. |
| App mobile | Node.js 18+, npm, Expo e ambiente Android/iOS para development build. |
| Câmera/MediaPipe | Permissões de câmera e dispositivo/emulador compatível. |

## Documentação

Entre em `Li-Vision_Docs`:

```bash
cd Li-Vision_Docs
```

Instale o MkDocs se ainda não estiver disponível:

```bash
pip install mkdocs mkdocs-material
```

Rode o site local:

```bash
mkdocs serve
```

Build estático:

```bash
mkdocs build
```

## Backend API

Entre em `Li-Vision_API`:

```bash
cd Li-Vision_API
```

Crie e ative um ambiente virtual:

```bash
python -m venv .venv
.venv\Scripts\activate
```

Instale dependências:

```bash
pip install -r requirements.txt
```

Execute a API com Uvicorn:

```bash
uvicorn src.api.server:app --reload
```

Verifique:

```bash
curl http://localhost:8000/healthz
```

Resposta esperada:

```json
{ "status": "ok" }
```

## Aplicativo mobile

Entre em `Li-Vision_App`:

```bash
cd Li-Vision_App
```

Instale dependências:

```bash
npm install
```

Inicie o Expo:

```bash
npx expo start
```

Para recursos nativos de câmera/MediaPipe, use development build:

```bash
npx expo run:android
```

ou:

```bash
npx expo run:ios
```

## Configurar API local no app

O app usa `EXPO_PUBLIC_API_URL` quando definida. Para apontar para uma API local, configure a variável antes de iniciar o Expo.

Exemplo:

```bash
set EXPO_PUBLIC_API_URL=http://localhost:8000
npx expo start
```

Observação: o WebSocket atual do app possui URL própria em `services/gestureWebSocket.ts`. Se o ambiente mudar, mantenha REST e WebSocket alinhados.

## Validação rápida

| Componente | Comando |
| --- | --- |
| Docs | `mkdocs build` |
| API | `uvicorn src.api.server:app --reload` e `GET /healthz` |
| App | `npm test` e `npx expo start` |

## Problemas comuns

| Sintoma | Possível causa |
| --- | --- |
| Câmera não abre | Permissão negada ou outro app usando a câmera. |
| MediaPipe falha no Expo Go | Recursos nativos exigem development build. |
| API não responde | Servidor não iniciado, porta incorreta ou URL errada no app. |
| WebSocket desconecta | Render free tier pode encerrar conexões ociosas; o app tenta reconectar. |
| Modelo não carrega | Arquivo ausente em `models/static`, `models/dynamic` ou `models/mediapipe`. |
