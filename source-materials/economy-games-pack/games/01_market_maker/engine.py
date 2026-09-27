from __future__ import annotations
import copy, json
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

def eq(par):
    # Qd=a-bP, Qs=c+dP
    p=(par["a"]-par["c"])/(par["b"]+par["d"])
    q=par["a"]-par["b"]*p
    return round(p,2), round(q,2)

class Engine(GameEngine):
    game_id="market_maker"
    def __init__(self): self.scenarios=load()

    def start(self,seed=1):
        return Session(self.game_id,seed,{"scenario_index":0})

    def public_state(self,s):
        if s.finished: return {"finished":True,"score":s.score}
        x=self.scenarios[s.state["scenario_index"]]
        bp,bq=eq(x["before"])
        return {"finished":False,"round":s.round_index+1,"total":len(self.scenarios),
                "scenario":{"id":x["id"],"title":x["title"],"difficulty":x["difficulty"],
                            "shock":x["shock"],"before_equilibrium":{"price":bp,"quantity":bq},
                            "before":x["before"]}}

    def apply_action(self,s,action):
        if s.finished:
            return ActionResult(False,Feedback("neutral","Joc terminat","Sesiunea s-a încheiat.",[]),self.public_state(s))
        x=self.scenarios[s.state["scenario_index"]]
        fields=["curve","direction","price_dir","qty_dir"]
        correct=sum(str(action.get(k,""))==str(x[k]) for k in fields)
        ap,aq=eq(x["after"])
        score=correct/4*100
        # optional numerical bonus
        if "price" in action:
            score += max(0,10-abs(float(action["price"])-ap))
        if "quantity" in action:
            score += max(0,10-abs(float(action["quantity"])-aq)/2)
        score=min(100,round(score,2))
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"scenario":x["id"],"action":copy.deepcopy(action),"score":score,
                          "answer":{"curve":x["curve"],"direction":x["direction"],
                                    "price_dir":x["price_dir"],"qty_dir":x["qty_dir"],
                                    "price":ap,"quantity":aq}})
        s.round_index+=1; s.state["scenario_index"]+=1
        if s.state["scenario_index"]>=len(self.scenarios): s.finished=True
        explanation=f"Curba corectă este {x['curve']}, deplasarea este spre {x['direction']}. Noul echilibru este P={ap}, Q={aq}."
        return ActionResult(True,Feedback("correct" if correct==4 else "partial","Piața s-a recalculat",explanation,
                            ["cerere","ofertă","echilibru"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"shift_curve","curve":x["curve"],"direction":x["direction"]},
                                            {"type":"move_equilibrium","price":ap,"quantity":aq}])

    def report(self,s): return {"finished":s.finished,"score":s.score,"history":s.history}
