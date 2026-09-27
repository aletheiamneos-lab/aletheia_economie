from __future__ import annotations
import json, copy
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

def set_score(pred,true):
    p=set(pred);t=set(true)
    if not t:return 100.0
    return 100*len(p&t)/len(p|t) if p|t else 0

class Engine(GameEngine):
    game_id="economic_pulse"
    def __init__(self):self.scenarios=load()
    def start(self,seed=1):return Session(self.game_id,seed,{"scenario_index":0})
    def public_state(self,s):
        if s.finished:return {"finished":True,"score":s.score}
        x=self.scenarios[s.state["scenario_index"]]
        return {"finished":False,"round":s.round_index+1,"total":len(self.scenarios),
                "scenario":{"id":x["id"],"difficulty":x["difficulty"],"indicators":x["indicators"],
                            "phase_options":["crisis","depression","recovery","expansion"],
                            "policy_options":["monetary_ease","public_spending","tax_relief","support_investment",
                                              "neutral_or_tighten","targeted_support","tighten","balanced_anti_crisis"]}}
    def apply_action(self,s,action):
        if s.finished:return ActionResult(False,Feedback("neutral","Joc terminat","Nu mai sunt scenarii.",[]),self.public_state(s))
        x=self.scenarios[s.state["scenario_index"]]
        phase_score=100 if action.get("phase")==x["phase"] else 0
        policy_score=set_score(action.get("policies",[]),x["policies"])
        score=round(phase_score*.7+policy_score*.3,2)
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"scenario":x["id"],"action":copy.deepcopy(action),"answer":{"phase":x["phase"],"policies":x["policies"]},"score":score})
        s.round_index+=1;s.state["scenario_index"]+=1
        if s.state["scenario_index"]>=len(self.scenarios):s.finished=True
        msg=f"Faza de referință este {x['phase']}. Politici compatibile în scenariul didactic: {', '.join(x['policies'])}."
        return ActionResult(True,Feedback("correct" if score>=90 else "partial","Ciclul identificat",msg,
                            ["ciclu economic","politici anticiclice"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"highlight_cycle_phase","phase":x["phase"]},{"type":"macro_city_transition","phase":x["phase"]}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history}
