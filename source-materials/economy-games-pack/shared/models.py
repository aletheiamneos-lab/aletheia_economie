from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List
import uuid

@dataclass
class Feedback:
    type: str
    title: str
    explanation: str
    concepts: List[str] = field(default_factory=list)

@dataclass
class ActionResult:
    accepted: bool
    feedback: Feedback
    public_state: Dict[str, Any]
    score_delta: float = 0.0
    mastery_delta: Dict[str, float] = field(default_factory=dict)
    animation_cues: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Session:
    game_id: str
    seed: int
    state: Dict[str, Any]
    round_index: int = 0
    score: float = 0.0
    mastery: Dict[str, float] = field(default_factory=dict)
    history: List[Dict[str, Any]] = field(default_factory=list)
    delayed_effects: List[Dict[str, Any]] = field(default_factory=list)
    finished: bool = False
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
