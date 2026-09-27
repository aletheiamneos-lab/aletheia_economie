from __future__ import annotations
import json, copy
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

def solution(x):
    mode=x["mode"]
    if mode=="bond_yield":
        coupon=x["nominal"]*x["coupon_rate"]
        return round(coupon/x["market_price"]*100,2)
    if mode=="share_yield":
        return round(x["dividend"]/x["market_price"]*100,2)
    if mode=="bond_price":
        return round(x["coupon"]/x["market_rate"],2)
    return x["answer"]

class Engine(GameEngine):
    game_id="wall_street_lab"
    def __init__(self):self.scenarios=load()
    def start(self,seed=1):return Session(self.game_id,seed,{"scenario_index":0})
    def public_state(self,s):
        if s.finished:return {"finished":True,"score":s.score}
        x=copy.deepcopy(self.scenarios[s.state["scenario_index"]])
        x.pop("answer",None)
        return {"finished":False,"round":s.round_index+1,"total":len(self.scenarios),"scenario":x}
    def apply_action(self,s,action):
        if s.finished:return ActionResult(False,Feedback("neutral","Joc terminat","Nu mai sunt titluri.",[]),self.public_state(s))
        x=self.scenarios[s.state["scenario_index"]];ans=solution(x)
        if isinstance(ans,(int,float)):
            try:pred=float(action.get("value"))
            except Exception:
                return ActionResult(False,Feedback("incorrect","Valoare lipsă","Introdu o valoare numerică.",[]),self.public_state(s))
            err=abs(pred-float(ans))
            score=round(max(0,100-err*8),2)
        else:
            pred=action.get("answer")
            score=100.0 if pred==ans else 0.0
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"scenario":x["id"],"mode":x["mode"],"solution":ans,"action":copy.deepcopy(action),"score":score})
        s.round_index+=1;s.state["scenario_index"]+=1
        if s.state["scenario_index"]>=len(self.scenarios):s.finished=True
        msg=f"Soluția de referință este {ans}. Modul exercițiului: {x['mode']}."
        return ActionResult(True,Feedback("correct" if score>=95 else "partial","Operațiune evaluată",msg,
                            ["acțiuni","obligațiuni","randament"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"asset_reveal","mode":x["mode"]},{"type":"portfolio_feedback","score":score}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history}
