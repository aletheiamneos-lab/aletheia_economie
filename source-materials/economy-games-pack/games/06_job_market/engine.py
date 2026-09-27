from __future__ import annotations
import json, copy
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

def expected(x):
    pam=x["population"]["PAM"]
    inactive=x["population"]["inactive_available"]
    pad=pam-inactive
    employed=x["population"]["employed"]
    delta=x.get("shock_unemployed",0)
    # positive delta = people become unemployed; negative = unemployed get jobs
    employed_after=max(0,min(pad,employed-delta))
    unemployed=max(0,pad-employed_after)
    rate=0 if pad==0 else unemployed/pad*100
    return {"PAM":pam,"PAD":pad,"employed":employed_after,"unemployed":unemployed,"unemployment_rate":round(rate,2)}

class Engine(GameEngine):
    game_id="job_market"
    def __init__(self):self.scenarios=load()
    def start(self,seed=1):return Session(self.game_id,seed,{"scenario_index":0})
    def public_state(self,s):
        if s.finished:return {"finished":True,"score":s.score}
        x=self.scenarios[s.state["scenario_index"]]
        return {"finished":False,"round":s.round_index+1,"total":len(self.scenarios),
                "scenario":{"id":x["id"],"title":x["title"],"difficulty":x["difficulty"],
                            "population":x["population"],"shock":x["shock"],
                            "type_options":["frictional","structural","technological","seasonal","cyclical","technical"]}}
    def apply_action(self,s,action):
        if s.finished:return ActionResult(False,Feedback("neutral","Joc terminat","Nu mai sunt scenarii.",[]),self.public_state(s))
        x=self.scenarios[s.state["scenario_index"]];ans=expected(x)
        rate_pred=float(action.get("unemployment_rate",-999))
        rate_score=max(0,100-abs(rate_pred-ans["unemployment_rate"])*12)
        if x["unemployment_type"] is None:
            type_score=100
        else:
            type_score=100 if action.get("unemployment_type")==x["unemployment_type"] else 0
        score=round(rate_score*.65+type_score*.35,2)
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"scenario":x["id"],"answer":ans|{"type":x["unemployment_type"]},"action":copy.deepcopy(action),"score":score})
        s.round_index+=1;s.state["scenario_index"]+=1
        if s.state["scenario_index"]>=len(self.scenarios):s.finished=True
        msg=f"PAD={ans['PAD']}, persoane ocupate={ans['employed']}, șomeri={ans['unemployed']}, rata șomajului={ans['unemployment_rate']}%."
        if x["unemployment_type"]:msg+=f" Tipul urmărit în scenariu: {x['unemployment_type']}."
        return ActionResult(True,Feedback("correct" if score>=90 else "partial","Piața muncii recalculată",msg,
                            ["PAD","șomaj","rata șomajului"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"move_population_tokens","unemployed":ans["unemployed"],"employed":ans["employed"]},
                                            {"type":"unemployment_meter","value":ans["unemployment_rate"]}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history}
