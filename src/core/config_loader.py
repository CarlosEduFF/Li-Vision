import yaml
from pathlib import Path


class Config:
    def __init__(self, path: str):
        with open(Path(path), "r", encoding="utf-8") as f:
            self.data = yaml.safe_load(f)

    def __getitem__(self, item):
        return self.data[item]