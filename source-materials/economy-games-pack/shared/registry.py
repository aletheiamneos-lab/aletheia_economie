from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

GAME_DIRS = {
    "market_maker":"01_market_maker",
    "consumer_lab":"02_consumer_lab",
    "factory_master":"03_factory_master",
    "inflation_detective":"04_inflation_detective",
    "central_bank":"05_central_bank",
    "job_market":"06_job_market",
    "wall_street_lab":"07_wall_street_lab",
    "global_trader":"08_global_trader",
    "economic_pulse":"09_economic_pulse",
    "president":"10_president",
}

_CACHE = {}

def get_engine(game_id: str):
    if game_id in _CACHE:
        return _CACHE[game_id]
    folder = GAME_DIRS.get(game_id)
    if not folder:
        raise KeyError(game_id)
    path = ROOT/"games"/folder/"engine.py"
    spec = importlib.util.spec_from_file_location(f"game_{game_id}_engine", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    engine = module.Engine() if hasattr(module, "Engine") else module.PresidentEngine()
    _CACHE[game_id] = engine
    return engine
