from __future__ import annotations
import copy, json
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback
from shared.utils import best_discrete_bundle

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

class Engine(GameEngine):
    game_id="consumer_lab"
    def __init__(self): self.scenarios=load()
    def start(self,seed=1): return Session(self.game_id,seed,{"scenario_index":0})

    def _public_scenario(self,x):
        return {"id":x["id"],"title":x["title"],"difficulty":x["difficulty"],"budget":x["budget"],
                "products":[{"name":p["name"],"price":p["price"],"max_quantity":len(p["mu"])} for p in x["products"]]}

    def public_state(self,s):
        if s.finished:return {"finished":True,"score":s.score}
        x=self.scenarios[s.state["scenario_index"]]
        return {"finished":False,"round":s.round_index+1,"total":len(self.scenarios),"scenario":self._public_scenario(x)}

    def apply_action(self,s,action):
        if s.finished:
            return ActionResult(False,Feedback("neutral","Joc terminat","Sesiunea s-a încheiat.",[]),self.public_state(s))
        x=self.scenarios[s.state["scenario_index"]]
        qs=list(action.get("quantities",[]))
        if len(qs)!=len(x["products"]):
            return ActionResult(False,Feedback("incorrect","Coș invalid","Trimite o cantitate pentru fiecare produs.",[]),self.public_state(s))
        qs=[max(0,int(q)) for q in qs]
        spend=sum(qs[i]*x["products"][i]["price"] for i in range(len(qs)))
        utility=sum(sum(x["products"][i]["mu"][:qs[i]]) for i in range(len(qs)))
        prices=[p["price"] for p in x["products"]]
        mus=[p["mu"] for p in x["products"]]
        opt_bundle,opt_u=best_discrete_bundle(prices,mus,x["budget"])
        feasible=spend<=x["budget"] and all(qs[i]<=len(mus[i]) for i in range(len(qs)))
        ratio=0 if opt_u<=0 else max(0,min(1,utility/opt_u))
        score=round((ratio*90 + (10 if feasible else 0)) if feasible else max(0,ratio*40),2)
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"scenario":x["id"],"quantities":qs,"spend":spend,"utility":utility,
                          "optimal_bundle":opt_bundle,"optimal_utility":opt_u,"score":score})
        s.round_index+=1;s.state["scenario_index"]+=1
        if s.state["scenario_index"]>=len(self.scenarios):s.finished=True
        msg=f"Ai cheltuit {spend} din {x['budget']} și ai obținut UT={utility}. Optimul discret al scenariului este {opt_bundle}, cu UT={opt_u:.0f}."
        return ActionResult(True,Feedback("correct" if score>=95 else "partial","Coș evaluat",msg,
                            ["utilitate totală","utilitate marginală","buget"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"budget_meter","value":spend,"max":x["budget"]},
                                            {"type":"utility_meter","value":utility,"max":opt_u}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history}
