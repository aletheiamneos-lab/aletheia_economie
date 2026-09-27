from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any, Dict, List

from shared.base import GameEngine
from shared.models import ActionResult, Feedback, Session

BOUNDS = {
    "gdp_growth": (-12.0, 12.0),
    "inflation": (-2.0, 80.0),
    "unemployment": (1.0, 35.0),
    "budget_balance": (-15.0, 8.0),
    "debt_gdp": (0.0, 180.0),
    "purchasing_power": (0.0, 100.0),
    "business_confidence": (0.0, 100.0),
    "external_balance": (-20.0, 20.0),
    "approval": (0.0, 100.0),
}

INITIAL_STATE = {
    "gdp_growth": 2.6,
    "inflation": 5.2,
    "unemployment": 6.4,
    "budget_balance": -3.2,
    "debt_gdp": 49.0,
    "purchasing_power": 50.0,
    "business_confidence": 55.0,
    "external_balance": -2.1,
    "approval": 52.0,
}

def _clamp(name: str, value: float) -> float:
    lo, hi = BOUNDS[name]
    return round(max(lo, min(hi, value)), 3)

def _load_decisions() -> List[Dict[str, Any]]:
    path = Path(__file__).parent / "content" / "decisions.json"
    return json.loads(path.read_text(encoding="utf-8"))

class PresidentEngine(GameEngine):
    game_id = "president"

    def __init__(self) -> None:
        self.decisions = _load_decisions()

    def start(self, seed: int = 1) -> Session:
        return Session(
            game_id=self.game_id,
            seed=seed,
            state=copy.deepcopy(INITIAL_STATE),
        )

    def public_state(self, session: Session) -> Dict[str, Any]:
        decision = None
        if not session.finished and session.round_index < len(self.decisions):
            d = self.decisions[session.round_index]
            decision = {
                "id": d["id"],
                "year": d["year"],
                "title": d["title"],
                "context": d["context"],
                "concepts": d["concepts"],
                "options": [{"id": o["id"], "label": o["label"]} for o in d["options"]],
            }
        return {
            "round": session.round_index + 1 if not session.finished else len(self.decisions),
            "total_rounds": len(self.decisions),
            "state": copy.deepcopy(session.state),
            "decision": decision,
            "finished": session.finished,
        }

    def _apply_effect_map(self, state: Dict[str, float], effects: Dict[str, float]) -> None:
        for key, delta in effects.items():
            if key in state:
                state[key] = _clamp(key, state[key] + float(delta))

    def _apply_due_delayed(self, session: Session) -> List[Dict[str, Any]]:
        cues = []
        remaining = []
        for item in session.delayed_effects:
            if item["due_round"] <= session.round_index:
                before = copy.deepcopy(session.state)
                self._apply_effect_map(session.state, item["effects"])
                cues.append({
                    "type": "delayed_effect",
                    "source_decision": item["source_decision"],
                    "before": before,
                    "after": copy.deepcopy(session.state),
                })
            else:
                remaining.append(item)
        session.delayed_effects = remaining
        return cues

    def _endogenous_dynamics(self, session: Session) -> None:
        s = session.state

        # Pedagogical inertia only; these are not forecasting equations.
        if s["inflation"] > 6:
            s["purchasing_power"] = _clamp(
                "purchasing_power",
                s["purchasing_power"] - min(1.0, (s["inflation"] - 6) * 0.06),
            )
            s["approval"] = _clamp(
                "approval",
                s["approval"] - min(0.8, (s["inflation"] - 6) * 0.04),
            )

        if s["unemployment"] > 8:
            s["approval"] = _clamp(
                "approval",
                s["approval"] - min(0.8, (s["unemployment"] - 8) * 0.08),
            )
            s["purchasing_power"] = _clamp(
                "purchasing_power",
                s["purchasing_power"] - 0.25,
            )

        if s["budget_balance"] < -3:
            debt_push = min(0.55, abs(s["budget_balance"] + 3) * 0.10)
            s["debt_gdp"] = _clamp("debt_gdp", s["debt_gdp"] + debt_push)

        if s["business_confidence"] > 65:
            s["gdp_growth"] = _clamp("gdp_growth", s["gdp_growth"] + 0.06)
        elif s["business_confidence"] < 40:
            s["gdp_growth"] = _clamp("gdp_growth", s["gdp_growth"] - 0.08)

        # Weak normalization so repeated effects do not diverge unrealistically.
        s["gdp_growth"] = _clamp("gdp_growth", s["gdp_growth"] * 0.985)
        s["budget_balance"] = _clamp("budget_balance", s["budget_balance"] * 0.99)

    @staticmethod
    def _band_score(x: float, low: float, high: float, outer: float) -> float:
        if low <= x <= high:
            return 1.0
        dist = (low - x) if x < low else (x - high)
        return max(0.0, 1.0 - dist / max(outer, 0.001))

    @staticmethod
    def _lower_better(x: float, good: float, bad: float) -> float:
        if x <= good:
            return 1.0
        if x >= bad:
            return 0.0
        return 1.0 - (x - good) / (bad - good)

    def _round_score(self, s: Dict[str, float]) -> float:
        stability = (
            self._band_score(s["inflation"], 2.0, 4.0, 12.0) * 0.30 +
            self._band_score(s["unemployment"], 3.0, 6.0, 18.0) * 0.25 +
            self._lower_better(s["debt_gdp"], 60.0, 120.0) * 0.20 +
            self._band_score(s["budget_balance"], -3.0, 1.0, 10.0) * 0.25
        )
        growth = (
            self._band_score(s["gdp_growth"], 2.0, 5.0, 10.0) * 0.55 +
            (s["business_confidence"] / 100.0) * 0.45
        )
        households = (
            (s["purchasing_power"] / 100.0) * 0.55 +
            self._lower_better(s["unemployment"], 6.0, 20.0) * 0.45
        )
        external = self._band_score(s["external_balance"], -2.0, 4.0, 15.0)
        governance = s["approval"] / 100.0

        total = (
            stability * 0.35 +
            growth * 0.25 +
            households * 0.15 +
            external * 0.10 +
            governance * 0.15
        )
        return max(0.0, min(100.0, total * 100.0))

    def apply_action(self, session: Session, action: Dict[str, Any]) -> ActionResult:
        if session.finished:
            return ActionResult(
                accepted=False,
                feedback=Feedback("neutral", "Mandatul s-a încheiat", "Nu mai pot fi luate decizii.", []),
                public_state=self.public_state(session),
            )

        current = self.decisions[session.round_index]
        option_id = str(action.get("option_id", ""))
        option = next((o for o in current["options"] if o["id"] == option_id), None)

        if option is None:
            return ActionResult(
                accepted=False,
                feedback=Feedback(
                    "incorrect",
                    "Opțiune invalidă",
                    "Alege una dintre cele trei variante disponibile.",
                    current["concepts"],
                ),
                public_state=self.public_state(session),
            )

        delayed_cues = self._apply_due_delayed(session)
        before = copy.deepcopy(session.state)
        self._apply_effect_map(session.state, option.get("effects", {}))

        for item in option.get("delayed", []):
            session.delayed_effects.append({
                "due_round": session.round_index + int(item["after"]),
                "effects": item["effects"],
                "source_decision": current["id"],
            })

        self._endogenous_dynamics(session)
        after = copy.deepcopy(session.state)
        round_score = self._round_score(after)

        history_item = {
            "round_index": session.round_index,
            "decision_id": current["id"],
            "title": current["title"],
            "option_id": option["id"],
            "option_label": option["label"],
            "concepts": current["concepts"],
            "before": before,
            "after": after,
            "round_score": round_score,
        }
        session.history.append(history_item)
        session.score = round(
            (session.score * session.round_index + round_score) / (session.round_index + 1),
            3,
        )

        for concept in current["concepts"]:
            session.mastery[concept] = min(
                1.0, round(session.mastery.get(concept, 0.0) + 0.04, 3)
            )

        session.round_index += 1
        if session.round_index >= len(self.decisions):
            self._apply_due_delayed(session)
            session.finished = True

        feedback_text = self._feedback_for_choice(option, before, after)
        cues = delayed_cues + [{
            "type": "macro_transition",
            "from": before,
            "to": after,
            "duration_ms": 900,
        }]

        return ActionResult(
            accepted=True,
            feedback=Feedback(
                type="neutral",
                title="Decizie aplicată",
                explanation=feedback_text,
                concepts=current["concepts"],
            ),
            public_state=self.public_state(session),
            score_delta=round_score,
            mastery_delta={c: 0.04 for c in current["concepts"]},
            animation_cues=cues,
        )

    def _feedback_for_choice(
        self,
        option: Dict[str, Any],
        before: Dict[str, float],
        after: Dict[str, float],
    ) -> str:
        labels = {
            "gdp_growth": "creșterea PIB",
            "inflation": "inflația",
            "unemployment": "șomajul",
            "budget_balance": "soldul bugetar",
            "debt_gdp": "datoria/PIB",
            "purchasing_power": "puterea de cumpărare",
            "business_confidence": "încrederea mediului de afaceri",
            "external_balance": "balanța externă",
            "approval": "popularitatea",
        }
        changes = []
        for key, label in labels.items():
            delta = after[key] - before[key]
            if abs(delta) >= 0.08:
                verb = "a crescut" if delta > 0 else "a scăzut"
                changes.append(f"{label} {verb}")

        summary = ", ".join(changes[:5]) if changes else "indicatorii s-au modificat puțin"
        return (
            f"Ai ales „{option['label']}”. Pe termen imediat, {summary}. "
            "Nu există o variantă universal corectă: urmărește simultan stabilitatea, "
            "creșterea, ocuparea, bugetul și puterea de cumpărare. "
            "Unele efecte apar abia în rundele următoare."
        )

    def report(self, session: Session) -> Dict[str, Any]:
        if not session.finished:
            return {"finished": False, "message": "Mandatul nu s-a încheiat."}

        final_score = round(self._round_score(session.state) * 0.65 + session.score * 0.35, 1)

        if final_score >= 90:
            grade = "Arhitect al stabilității și creșterii"
        elif final_score >= 80:
            grade = "Mandat foarte solid"
        elif final_score >= 70:
            grade = "Economie stabilă, cu vulnerabilități"
        elif final_score >= 60:
            grade = "Mandat mixt"
        elif final_score >= 50:
            grade = "Dezechilibre semnificative"
        else:
            grade = "Criză de politică economică"

        impacts = []
        for h in session.history:
            impact = 0.0
            impact += (h["after"]["gdp_growth"] - h["before"]["gdp_growth"]) * 2.0
            impact -= (h["after"]["inflation"] - h["before"]["inflation"]) * 1.1
            impact -= (h["after"]["unemployment"] - h["before"]["unemployment"]) * 1.5
            impact += (h["after"]["purchasing_power"] - h["before"]["purchasing_power"]) * 0.25
            impact += (h["after"]["business_confidence"] - h["before"]["business_confidence"]) * 0.15
            impacts.append((impact, h["title"], h["option_label"]))

        impacts.sort(key=lambda x: x[0], reverse=True)

        concept_counts: Dict[str, int] = {}
        for h in session.history:
            for c in h["concepts"]:
                concept_counts[c] = concept_counts.get(c, 0) + 1

        return {
            "finished": True,
            "final_score": final_score,
            "grade": grade,
            "final_state": copy.deepcopy(session.state),
            "best_decisions": [
                {"title": t, "choice": c, "impact_proxy": round(v, 2)}
                for v, t, c in impacts[:3]
            ],
            "costliest_decisions": [
                {"title": t, "choice": c, "impact_proxy": round(v, 2)}
                for v, t, c in impacts[-3:]
            ],
            "concepts_practiced": dict(
                sorted(concept_counts.items(), key=lambda kv: kv[1], reverse=True)
            ),
            "history": copy.deepcopy(session.history),
        }
