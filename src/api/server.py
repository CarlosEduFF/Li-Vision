from fastapi import FastAPI
from src.api.routes import detect_routes, collect_routes

app = FastAPI(title="Li-Vision API")

app.include_router(detect_routes.router)
app.include_router(collect_routes.router)