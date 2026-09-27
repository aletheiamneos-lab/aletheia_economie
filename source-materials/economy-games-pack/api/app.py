from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.models import Session
from shared.registry import get_engine, GAME_DIRS
from api.economy_games import InvalidGameResult, parse_game_result
from api.report_email import router as report_email_router

app = FastAPI(title="Economie Games — 10 Games", version="1.0.0")
app.include_router(report_email_router)
SESSIONS: Dict[str, Session] = {}
GAME_RESULTS: list[dict] = []
API_PREFIX = "/api/game-service"

class StartRequest(BaseModel):
    seed: int = 1

class ActionRequest(BaseModel):
    action: Dict[str, Any]

@app.post("/api/game-results")
def save_game_result(payload: Dict[str, Any]):
    try:
        result = parse_game_result(payload)
    except InvalidGameResult as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    GAME_RESULTS.append(result.to_dict())
    return {"ok": True, "result": result.to_dict()}

@app.get(f"{API_PREFIX}/health")
def health():
    return {"ok": True, "games": len(GAME_DIRS)}

@app.get(f"{API_PREFIX}/games")
def games():
    return [{"id":gid,"folder":folder} for gid,folder in GAME_DIRS.items()]

@app.post(f"{API_PREFIX}/games/{{game_id}}/sessions")
def start(game_id: str, body: StartRequest):
    try:
        engine=get_engine(game_id)
    except KeyError:
        raise HTTPException(404,"Game not found")
    s=engine.start(body.seed)
    SESSIONS[s.id]=s
    return {"session_id":s.id,"public_state":engine.public_state(s)}

@app.get(f"{API_PREFIX}/sessions/{{session_id}}")
def state(session_id: str):
    s=SESSIONS.get(session_id)
    if not s: raise HTTPException(404,"Session not found")
    return get_engine(s.game_id).public_state(s)

@app.post(f"{API_PREFIX}/sessions/{{session_id}}/actions")
def act(session_id: str, body: ActionRequest):
    s=SESSIONS.get(session_id)
    if not s: raise HTTPException(404,"Session not found")
    return get_engine(s.game_id).apply_action(s,body.action)

@app.post(f"{API_PREFIX}/sessions/{{session_id}}/restart")
def restart(session_id: str):
    old=SESSIONS.get(session_id)
    if not old: raise HTTPException(404,"Session not found")
    e=get_engine(old.game_id)
    s=e.start(old.seed);s.id=old.id
    SESSIONS[s.id]=s
    return {"session_id":s.id,"public_state":e.public_state(s)}

@app.get(f"{API_PREFIX}/sessions/{{session_id}}/report")
def report(session_id: str):
    s=SESSIONS.get(session_id)
    if not s: raise HTTPException(404,"Session not found")
    return get_engine(s.game_id).report(s)
