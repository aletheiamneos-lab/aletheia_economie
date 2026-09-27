from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK_ROOT = ROOT / "source-materials" / "economy-games-pack"
sys.path.insert(0, str(PACK_ROOT))

from shared.registry import GAME_DIRS, get_engine  # noqa: E402


def action_for(game_id: str, public_state: dict) -> dict:
    scenario = public_state.get("scenario") or {}
    if game_id == "market_maker":
        return {"curve": "demand", "direction": "right", "price_dir": "up", "qty_dir": "up"}
    if game_id == "consumer_lab":
        return {"quantities": [1 for _ in scenario.get("products", [])]}
    if game_id == "factory_master":
        return {"workers": min(3, scenario.get("max_workers", 3))}
    if game_id == "inflation_detective":
        return {
            "diagnoses": scenario.get("diagnosis_options", [])[:1],
            "measures": scenario.get("measure_options", [])[:1],
        }
    if game_id == "central_bank":
        return {"rate_change": 0}
    if game_id == "job_market":
        return {"unemployment_rate": 0, "unemployment_type": (scenario.get("type_options") or [""])[0]}
    if game_id == "wall_street_lab":
        return {"value": 0} if scenario.get("mode") in {"bond_yield", "share_yield", "bond_price"} else {"answer": "share"}
    if game_id == "global_trader":
        return {"policy": "no_action"}
    if game_id == "economic_pulse":
        return {
            "phase": (scenario.get("phase_options") or ["crisis"])[0],
            "policies": (scenario.get("policy_options") or ["monetary_ease"])[:1],
        }
    decision = public_state.get("decision") or {}
    return {"option_id": decision["options"][0]["id"]}


def assert_private_data_is_hidden(game_id: str, public_state: dict) -> None:
    scenario = public_state.get("scenario") or {}
    if game_id == "market_maker":
        assert "after" not in scenario
        assert "curve" not in scenario
    elif game_id == "consumer_lab":
        assert all("mu" not in product for product in scenario.get("products", []))
    elif game_id == "wall_street_lab":
        assert "answer" not in scenario
    elif game_id == "president":
        assert all("effects" not in option for option in (public_state.get("decision") or {}).get("options", []))


def main() -> None:
    results = []
    for game_id in GAME_DIRS:
        engine = get_engine(game_id)
        session = engine.start(seed=0)
        rounds = 0
        while not session.finished:
            public_state = engine.public_state(session)
            assert_private_data_is_hidden(game_id, public_state)
            result = engine.apply_action(session, action_for(game_id, public_state))
            assert result.accepted, f"{game_id}: acțiunea rundei {rounds + 1} a fost respinsă"
            rounds += 1
            assert rounds <= 30, f"{game_id}: sesiunea nu se încheie"
        report = engine.report(session)
        assert report.get("finished") is True
        results.append({"game": game_id, "rounds": rounds, "score": round(float(session.score), 2), "report": True})

    print(json.dumps({"ok": True, "games": len(results), "sessions": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

