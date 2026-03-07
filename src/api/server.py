from fastapi import FastAPI

from src.api.routes.admin_routes import router as admin_router
from src.api.routes.detect_routes import router as detect_router
from src.api.routes.collect_routes import router as collect_router

from src.api.app_state import AppState
from src.services.detection_service import DetectionService

app = FastAPI(title="Li-Vision API")

state = AppState("config.yaml")

state.start_pipeline()
state.build_detectors()

detection_service = DetectionService(state.pipeline, state.detector_manager)

# registrar rotas
app.include_router(admin_router)
app.include_router(detect_router)
app.include_router(collect_router)