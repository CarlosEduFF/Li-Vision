# src/api/server.py (exemplo)
from fastapi import FastAPI, HTTPException, BackgroundTasks
from src.api.app_state import AppState
from src.services.detection_service import DetectionService


app = FastAPI(title="Li-Vision API")

state = AppState("config.yaml")
# start pipeline + detectors at boot (opcional)
state.start_pipeline()
state.build_detectors()

detection_service = DetectionService(state.pipeline, state.detector_manager)