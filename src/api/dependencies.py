from src.core.config_loader import Config
from src.recognition.detector_factory import create_detectors
from src.recognition.detector_manager import DetectorManager
from src.vision.pipeline import HandPipeline

config = Config("config.yaml")

detectors = create_detectors(config)
detector_manager = DetectorManager(detectors)

pipeline = HandPipeline(
    model_path=config["pipeline"]["model_path"],
    num_hands=config["pipeline"]["num_hands"],
)

pipeline.__enter__()