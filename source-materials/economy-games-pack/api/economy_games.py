"""Economy Lab games: validation of results sent by the frontend.

Framework-agnostic (standard library only). Use it from FastAPI, Flask or Django.
Only the "finished" event is meant to be stored. Do not trust other fields.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict

# Must match public/games/games.json
MAX_COINS: dict[str, int] = {
    "01_market_maker": 23,
    "02_consumer_lab": 15,
    "03_factory_master": 20,
    "04_inflation_detective": 28,
    "05_central_bank": 10,
    "06_job_market": 23,
    "07_wall_street_lab": 17,
    "08_global_trader": 19,
    "09_economic_pulse": 16,
    "10_president": 10,
}


@dataclass(frozen=True)
class GameResult:
    game_id: str
    coins: int
    max_coins: int
    stars: int  # 1, 2 or 3

    def to_dict(self) -> dict:
        return asdict(self)


class InvalidGameResult(ValueError):
    pass


def parse_game_result(payload: dict) -> GameResult:
    """Validate the JSON body of a 'finished' event and return a GameResult.

    Expected payload (exactly what the game sends):
    {"source": "economy-lab", "version": 1, "gameId": "03_factory_master",
     "type": "finished", "coins": 17, "maxCoins": 20, "stars": 3}
    """
    if not isinstance(payload, dict):
        raise InvalidGameResult("body must be a JSON object")
    if payload.get("source") != "economy-lab" or payload.get("version") != 1:
        raise InvalidGameResult("unknown source/version")
    if payload.get("type") != "finished":
        raise InvalidGameResult("only 'finished' events are stored")
    game_id = payload.get("gameId")
    if game_id not in MAX_COINS:
        raise InvalidGameResult(f"unknown gameId: {game_id!r}")
    coins, max_coins, stars = payload.get("coins"), payload.get("maxCoins"), payload.get("stars")
    if not all(isinstance(v, int) and not isinstance(v, bool) for v in (coins, max_coins, stars)):
        raise InvalidGameResult("coins, maxCoins and stars must be integers")
    if max_coins != MAX_COINS[game_id]:
        raise InvalidGameResult("maxCoins does not match the game")
    if not 0 <= coins <= max_coins:
        raise InvalidGameResult("coins out of range")
    if stars not in (1, 2, 3):
        raise InvalidGameResult("stars must be 1, 2 or 3")
    return GameResult(game_id=game_id, coins=coins, max_coins=max_coins, stars=stars)


# --- FastAPI example (use only if the backend is FastAPI) ---------------------
# from fastapi import APIRouter, HTTPException, Request
# router = APIRouter()
# @router.post("/api/game-results")
# async def save_game_result(request: Request):
#     try:
#         result = parse_game_result(await request.json())
#     except InvalidGameResult as e:
#         raise HTTPException(status_code=400, detail=str(e))
#     # save result.to_dict() with the current user here
#     return {"ok": True}
#
# --- Flask example (use only if the backend is Flask) -------------------------
# from flask import Blueprint, request, jsonify
# bp = Blueprint("economy_games", __name__)
# @bp.post("/api/game-results")
# def save_game_result():
#     try:
#         result = parse_game_result(request.get_json(force=True))
#     except InvalidGameResult as e:
#         return jsonify(error=str(e)), 400
#     # save result.to_dict() with the current user here
#     return jsonify(ok=True)
