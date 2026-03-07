from fastapi import FastAPI

from src.api.app_state import state

from src.api.routes.admin_routes import router as admin_router
from src.api.routes.detect_routes import router as detect_router
from src.api.routes.collect_routes import router as collect_router

app = FastAPI(title="Li-Vision API")

state.start_pipeline()
state.build_detectors()

app.include_router(admin_router)
app.include_router(detect_router)
app.include_router(collect_router)