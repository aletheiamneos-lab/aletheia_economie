from __future__ import annotations
import json, copy
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

def f1(pred,true):
    p=set(pred);t=set(true)
    if not p and not t:return 1.0
    if not p or not t:return 0.0
    inter=len(p&t)
    precision=inter/len(p);recall=inter/len(t)
    return 0 if precision+recall==0 else 2*precision*recall/(precision+recall)

class Engine(GameEngine):
    game_id="inflation_detective"
    def __init__(self):self.scenarios=load()
    def start(self,seed=1):return Session(self.game_id,seed,{"scenario_index":0})
    def public_state(self,s):
        if s.finished:return {"finished":True,"score":s.score}
        x=self.scenarios[s.state["scenario_index"]]
        return {"finished":False,"round":s.round_index+1,"total":len(self.scenarios),
                "scenario":{"id":x["id"],"title":x["title"],"difficulty":x["difficulty"],"evidence":x["evidence"],
                            "diagnosis_options":["demand","cost","imported","monetary","spiral"],
                            "measure_options":["reduce_demand","targeted_support","increase_supply","monetary_restraint",
                                               "productivity","moderate_demand","stabilize_macro","fiscal_balance",
                                               "mixed_package","supply_measures","diversify_imports"]}}
    def apply_action(self,s,action):
        if s.finished:return ActionResult(False,Feedback("neutral","Joc terminat","Sesiunea s-a încheiat.",[]),self.public_state(s))
        x=self.scenarios[s.state["scenario_index"]]
        diag=list(action.get("diagnoses",[]));meas=list(action.get("measures",[]))
        ds=f1(diag,x["diagnoses"]);ms=f1(meas,x["measures"])
        score=round((ds*.75+ms*.25)*100,2)
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"scenario":x["id"],"diagnoses":diag,"measures":meas,"score":score,
                          "answer":{"diagnoses":x["diagnoses"],"measures":x["measures"]}})
        s.round_index+=1;s.state["scenario_index"]+=1
        if s.state["scenario_index"]>=len(self.scenarios):s.finished=True
        msg=f"Diagnosticul de referință: {', '.join(x['diagnoses'])}. Măsuri compatibile cu scenariul: {', '.join(x['measures'])}."
        return ActionResult(True,Feedback("correct" if score>=90 else "partial","Dosar închis",msg,
                            ["cauzele inflației","măsuri antiinflaționiste"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"causal_chain","diagnoses":x["diagnoses"]},{"type":"city_price_response"}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history}
