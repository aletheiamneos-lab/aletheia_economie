from abc import ABC, abstractmethod
from typing import Any, Dict
from shared.models import Session, ActionResult

class GameEngine(ABC):
    game_id: str

    @abstractmethod
    def start(self, seed: int = 1) -> Session:
        ...

    @abstractmethod
    def public_state(self, session: Session) -> Dict[str, Any]:
        ...

    @abstractmethod
    def apply_action(self, session: Session, action: Dict[str, Any]) -> ActionResult:
        ...

    @abstractmethod
    def report(self, session: Session) -> Dict[str, Any]:
        ...
