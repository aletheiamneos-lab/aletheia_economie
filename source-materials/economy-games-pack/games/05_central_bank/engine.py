from __future__ import annotations
import json, copy
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback
from shared.utils import clamp

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

class Engine(GameEngine):
    game_id="central_bank"
    def __init__(self):self.scenarios=load()

    def start(self,seed=1):
        x=self.scenarios[seed % len(self.scenarios)]
        st=copy.deepcopy(x["initial"]);st["scenario_id"]=x["id"];st["quarter"]=1
        return Session(self.game_id,seed,st)

    def public_state(self,s):
        return {"finished":s.finished,"quarter":s.state.get("quarter",8),"total_quarters":8,
                "state":{k:v for k,v in s.state.items() if k!="scenario_id"},
                "controls":{"rate_change_min":-2.0,"rate_change_max":2.0,"step":0.5}}

    def stability(self,st):
        inflation_pen=abs(st["inflation"]-3.0)*7
        growth_pen=max(0,1.5-st["growth"])*9
        unemp_pen=max(0,st["unemployment"]-6.0)*5
        return round(clamp(100-inflation_pen-growth_pen-unemp_pen,0,100),2)

    def apply_action(self,s,action):
        if s.finished:return ActionResult(False,Feedback("neutral","Mandat monetar încheiat","Nu mai sunt trimestre.",[]),self.public_state(s))
        change=clamp(float(action.get("rate_change",0)),-2,2)
        before=copy.deepcopy(s.state)
        s.state["rate"]=round(clamp(s.state["rate"]+change,0,30),2)
        # Pedagogical dynamic assumptions, not forecasting equations.
        s.state["credit_growth"]=round(clamp(s.state["credit_growth"]-1.8*change,-20,40),2)
        s.state["growth"]=round(clamp(s.state["growth"]-0.18*change+0.015*s.state["credit_growth"],-10,12),2)
        s.state["inflation"]=round(clamp(s.state["inflation"]-0.12*change+0.02*max(0,s.state["credit_growth"]-8),-2,50),2)
        s.state["unemployment"]=round(clamp(s.state["unemployment"]-0.10*s.state["growth"]+0.05*change,1,35),2)
        score=self.stability(s.state)
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"quarter":s.state["quarter"],"rate_change":change,"before":before,"after":copy.deepcopy(s.state),"score":score})
        s.round_index+=1;s.state["quarter"]+=1
        if s.round_index>=8:s.finished=True
        msg=f"Rata a fost modificată cu {change:+.1f} pp. Creditul, creșterea, inflația și șomajul au reacționat în modelul pedagogic."
        return ActionResult(True,Feedback("neutral","Trimestru simulat",msg,["dobândă","credit","inflație"]),
                            self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"rate_dial","from":before["rate"],"to":s.state["rate"]},
                                            {"type":"macro_transition","before":before,"after":copy.deepcopy(s.state)}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history,"final_state":s.state}
