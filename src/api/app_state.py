# src/api/app_state.py
import threading
from src.core.config_loader import Config
from src.vision.pipeline import HandPipeline
from src.recognition.detector_factory import create_detectors
from src.recognition.detector_manager import DetectorManager

class AppState:
    def __init__(self, config_path="config.yaml"):
        self.lock = threading.RLock()
        self.config_path = config_path
        self.config = Config(config_path)
        # estado mutável
        self.run_mode = self.config["app"].get("run_mode", "inference")
        self.detection_cfg = self.config["detection"]
        self.pipeline = None
        self.detector_manager = None
        self.detectors = None
        self.timestamp = 0

    def start_pipeline(self):
        """Cria e abre o HandPipeline (se não existir)."""
        with self.lock:
            if self.pipeline is not None:
                return
            model_path = self.config["pipeline"]["model_path"]
            num_hands = self.config["pipeline"]["num_hands"]
            self.pipeline = HandPipeline(model_path=model_path, num_hands=num_hands)
            self.pipeline.__enter__()  # abre globalmente (manter vivo)

    def stop_pipeline(self):
        """Fecha pipeline se aberto."""
        with self.lock:
            if self.pipeline is None:
                return
            try:
                self.pipeline.__exit__(None, None, None)
            finally:
                self.pipeline = None
                self.timestamp = 0

    def build_detectors(self):
        """(Re)constroi detectores e manager com base na config atual."""
        with self.lock:
            # create_detectors espera um objeto config que seja indexável
            self.detectors = create_detectors(self.config)
            self.detector_manager = DetectorManager(
                self.detectors,
                min_score=self.config["detection"].get("min_score", 0.6),
                stability_frames=self.config["detection"].get("stability_frames", 3),
                cooldown_frames=self.config["detection"].get("cooldown_frames", 10),
            )

    def reload_config_from_disk(self):
        """Recarrega config.yaml do disco e aplica (não salva alterações)."""
        with self.lock:
            self.config = Config(self.config_path)
            self.run_mode = self.config["app"].get("run_mode", self.run_mode)
            self.detection_cfg = self.config["detection"]

    # helpers para chamadas externas
    def set_run_mode(self, mode):
        with self.lock:
            self.run_mode = mode

    def set_detection_mode(self, detection_subcfg: dict):
        """Recebe um dict parcial com keys para detection (mode, ml.path, etc)."""
        with self.lock:
            # atualiza a representação em memória da config
            self.config["detection"].update(detection_subcfg)
            # aplica reconstrução de detectores
            self.build_detectors()

state = AppState("config.yaml")